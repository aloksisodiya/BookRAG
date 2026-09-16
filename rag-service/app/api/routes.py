"""FastAPI routes for the internal RAG service API.

This service is not meant to be public: every route (except /health) checks
a shared internal API key set via the X-Internal-Api-Key header, which only
the Node backend is configured with.
"""
import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile

from app.config import settings
from app.models import (
    IngestResponse, StatusResponse, QueryRequest, QueryResponse,
    DeleteResponse, Source,
)
from app import jobs
from app.api.ingest import run_ingestion, new_job_id, file_hash
from app.vectorstore import chroma_store
from app.retrieval.retriever import answer_question

router = APIRouter()

_seen_hashes: dict[str, str] = {}  # file hash -> book_id, for dedup


def require_internal_key(x_internal_api_key: str = Header(default="")) -> None:
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")


@router.get("/health")
def health():
    ok = {
        "status": "ok",
        "groq_key_configured": bool(settings.groq_api_key),
        "chroma_path": settings.chroma_db_path,
        "embedding_model": settings.embedding_model,
    }
    return ok


@router.post("/rag/ingest", response_model=IngestResponse, dependencies=[Depends(require_internal_key)])
async def ingest(book_id: str = Query(...), file: UploadFile = File(...)):
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="INVALID_FILE: only PDF files are accepted")

    tmp_dir = tempfile.mkdtemp(prefix="bookrag_")
    tmp_path = os.path.join(tmp_dir, "book.pdf")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    digest = file_hash(tmp_path)
    if digest in _seen_hashes and _seen_hashes[digest] != book_id:
        existing = _seen_hashes[digest]
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return IngestResponse(book_id=existing, job_id="duplicate", status="ready")
    _seen_hashes[digest] = book_id

    job_id = new_job_id()
    jobs.create_job(book_id, job_id)

    # Run synchronously-but-in-thread via FastAPI's threadpool by calling
    # directly here would block the request; instead we hand off and return.
    import threading
    thread = threading.Thread(target=_ingest_and_cleanup, args=(book_id, tmp_path, tmp_dir), daemon=True)
    thread.start()

    return IngestResponse(book_id=book_id, job_id=job_id, status="queued")


def _ingest_and_cleanup(book_id: str, tmp_path: str, tmp_dir: str) -> None:
    try:
        run_ingestion(book_id, tmp_path)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/rag/status/{book_id}", response_model=StatusResponse, dependencies=[Depends(require_internal_key)])
def status(book_id: str):
    job = jobs.get_job(book_id)
    if job is None:
        if chroma_store.book_exists(book_id):
            return StatusResponse(book_id=book_id, status="ready", progress=1.0)
        raise HTTPException(status_code=404, detail="Unknown book_id")
    return StatusResponse(
        book_id=book_id,
        status=job["status"],
        progress=job["progress"],
        pages=job["pages"],
        chunks=job["chunks"],
        error=job["error"],
    )


@router.post("/rag/query", response_model=QueryResponse, dependencies=[Depends(require_internal_key)])
def query(body: QueryRequest):
    if not chroma_store.book_exists(body.book_id):
        raise HTTPException(status_code=404, detail="BOOK_NOT_READY: book not found or not yet processed")

    try:
        result = answer_question(
            body.book_id,
            body.question,
            [h.model_dump() for h in body.history],
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"LLM_UNAVAILABLE: {e}")

    return QueryResponse(
        answer=result["answer"],
        sources=[Source(**s) for s in result["sources"]],
        grounded=result["grounded"],
        latency_ms=result["latency_ms"],
    )


@router.delete("/rag/books/{book_id}", response_model=DeleteResponse, dependencies=[Depends(require_internal_key)])
def delete_book(book_id: str):
    deleted = chroma_store.delete_book(book_id)
    jobs.delete_job(book_id)
    return DeleteResponse(book_id=book_id, deleted=deleted)
