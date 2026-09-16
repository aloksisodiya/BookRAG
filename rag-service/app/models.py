"""Pydantic request/response schemas for the RAG service's internal API."""
from typing import Literal, Optional
from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    book_id: str
    job_id: str
    status: Literal["queued", "processing", "ready", "failed"]


class StatusResponse(BaseModel):
    book_id: str
    status: Literal["queued", "processing", "ready", "failed"]
    progress: float = 0.0
    pages: Optional[int] = None
    chunks: Optional[int] = None
    error: Optional[str] = None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class QueryRequest(BaseModel):
    book_id: str
    question: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list)


class Source(BaseModel):
    page_start: int
    page_end: int
    section: Optional[str] = None
    score: float
    snippet: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]
    grounded: bool
    latency_ms: int


class DeleteResponse(BaseModel):
    book_id: str
    deleted: bool
