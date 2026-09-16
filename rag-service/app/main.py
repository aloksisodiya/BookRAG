"""FastAPI application entrypoint for the Python RAG service."""
from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(title="Book RAG Assistant - RAG Service", version="1.0.0")
app.include_router(router)


@app.get("/")
def root():
    return {"service": "book-rag-assistant-rag-service", "docs": "/docs"}
