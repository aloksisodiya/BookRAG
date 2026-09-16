"""Ingestion pipeline: PDF -> pages -> chunks -> embeddings -> ChromaDB.

Runs in a background thread per book so the /rag/ingest call returns
immediately with a job id; progress is polled via /rag/status/{book_id}.
"""
import hashlib
import uuid

from app.loaders.pdf_loader import extract_pages, extract_outline, section_for_page, ScannedPDFError
from app.chunking.chunker import chunk_pages
from app.embeddings.embedder import embed_passages
from app.vectorstore import chroma_store
from app import jobs


def file_hash(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def run_ingestion(book_id: str, file_path: str) -> None:
    try:
        jobs.update_job(book_id, status="processing", progress=0.05)

        pages = extract_pages(file_path)  # raises ScannedPDFError if unreadable
        outline = extract_outline(file_path)
        jobs.update_job(book_id, progress=0.25, pages=len(pages))

        chunks = chunk_pages(pages, outline)
        if not chunks:
            raise ScannedPDFError("No text content found after chunking.")
        jobs.update_job(book_id, progress=0.45)

        texts = [c.text for c in chunks]
        embeddings = embed_passages(texts)
        jobs.update_job(book_id, progress=0.75)

        collection = chroma_store.create_or_reset_collection(book_id)
        ids = [f"{book_id}:{i:05d}" for i in range(len(chunks))]
        metadatas = [
            {
                "book_id": book_id,
                "page_start": c.page_start,
                "page_end": c.page_end,
                "section": section_for_page(outline, c.page_start) or "",
            }
            for c in chunks
        ]
        chroma_store.add_chunks(book_id, ids, embeddings, texts, metadatas)

        jobs.update_job(book_id, status="ready", progress=1.0, chunks=len(chunks))

    except ScannedPDFError as e:
        jobs.update_job(book_id, status="failed", error=f"NO_TEXT_FOUND: {e}")
    except Exception as e:  # noqa: BLE001 - surface any failure as a failed job, not a crash
        jobs.update_job(book_id, status="failed", error=f"INGEST_ERROR: {e}")


def new_job_id() -> str:
    return uuid.uuid4().hex[:12]
