"""Embedding model wrapper.

Loaded once as a module-level singleton — sentence-transformers models are
expensive to load, and every ingest/query call reuses this instance.

BGE models expect different prefixes for indexed passages vs. search
queries; using the same text for both directions measurably hurts
retrieval quality, so the two are kept as separate methods rather than one
generic `embed()` that's easy to call wrong.
"""
from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None

_BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def _uses_bge_prefix() -> bool:
    return "bge" in settings.embedding_model.lower()


def embed_passages(texts: list[str]) -> list[list[float]]:
    model = get_model()
    vectors = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def embed_query(text: str) -> list[float]:
    model = get_model()
    if _uses_bge_prefix():
        text = _BGE_QUERY_PREFIX + text
    vector = model.encode([text], normalize_embeddings=True, show_progress_bar=False)
    return vector[0].tolist()
