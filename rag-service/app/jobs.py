"""In-memory ingestion job/status tracking.

This is intentionally simple for the MVP: a single-process dict keyed by
book_id. If the service is ever run with multiple workers, swap this for a
shared store (Redis, or a row in the application DB) — job state would
otherwise be invisible to the worker that didn't create it.
"""
import threading
from typing import Optional

_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def create_job(book_id: str, job_id: str) -> None:
    with _lock:
        _jobs[book_id] = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0.0,
            "pages": None,
            "chunks": None,
            "error": None,
        }


def update_job(book_id: str, **fields) -> None:
    with _lock:
        if book_id in _jobs:
            _jobs[book_id].update(fields)


def get_job(book_id: str) -> Optional[dict]:
    with _lock:
        return dict(_jobs[book_id]) if book_id in _jobs else None


def delete_job(book_id: str) -> None:
    with _lock:
        _jobs.pop(book_id, None)
