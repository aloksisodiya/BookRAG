"""Central configuration for the RAG service, loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_rewrite_model: str = "llama-3.1-8b-instant"

    chroma_db_path: str = "../data/chroma"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    chunk_size: int = 1000
    chunk_overlap: int = 150
    top_k: int = 5
    min_similarity: float = 0.35

    internal_api_key: str = "change-me-to-a-long-random-string"
    rag_port: int = 8000

    # Below this average characters-of-text-per-page, a PDF is treated as
    # scanned/image-only and rejected rather than silently ingested empty.
    min_chars_per_page: int = 40


settings = Settings()
