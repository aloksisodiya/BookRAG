"""Query-time retrieval: rewrite -> embed -> search -> threshold -> generate."""
import time

from app.config import settings
from app.embeddings.embedder import embed_query
from app.vectorstore import chroma_store
from app.llm.groq_client import rewrite_query, generate_answer
from app.llm.prompts import build_context_block

NOT_FOUND_MESSAGE = "I could not find this information in this book."


def answer_question(book_id: str, question: str, history: list[dict]) -> dict:
    start = time.perf_counter()

    standalone_question = rewrite_query(question, history) if history else question

    query_embedding = embed_query(standalone_question)
    raw = chroma_store.query(book_id, query_embedding, top_k=settings.top_k)

    sources = _to_sources(raw)
    relevant = [s for s in sources if s["score"] >= settings.min_similarity]

    if not relevant:
        latency_ms = int((time.perf_counter() - start) * 1000)
        return {
            "answer": NOT_FOUND_MESSAGE,
            "sources": [],
            "grounded": False,
            "latency_ms": latency_ms,
        }

    context_block = build_context_block(
        [{"page_start": s["page_start"], "page_end": s["page_end"], "text": s["snippet"]} for s in relevant]
    )
    answer = generate_answer(standalone_question, context_block)

    latency_ms = int((time.perf_counter() - start) * 1000)
    return {
        "answer": answer,
        "sources": [
            {k: v for k, v in s.items() if k != "snippet_full"} for s in relevant
        ],
        "grounded": True,
        "latency_ms": latency_ms,
    }


def _to_sources(raw: dict) -> list[dict]:
    """Chroma returns cosine *distance*; convert to a similarity score in [0, 1]."""
    if not raw.get("ids") or not raw["ids"][0]:
        return []

    ids = raw["ids"][0]
    documents = raw["documents"][0]
    metadatas = raw["metadatas"][0]
    distances = raw["distances"][0]

    sources = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        similarity = max(0.0, 1.0 - dist)
        snippet = doc if len(doc) <= 400 else doc[:400].rsplit(" ", 1)[0] + "..."
        sources.append({
            "page_start": meta["page_start"],
            "page_end": meta["page_end"],
            "section": meta.get("section"),
            "score": round(similarity, 4),
            "snippet": snippet,
        })
    return sources
