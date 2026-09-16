"""ChromaDB access, one collection per book (collection name: book_<book_id>).

Scoping storage per book keeps retrieval naturally filtered, makes deletion
a single `delete_collection` call, and avoids any risk of one book's chunks
leaking into another book's answers.
"""
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_db_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def _collection_name(book_id: str) -> str:
    return f"book_{book_id}"


def create_or_reset_collection(book_id: str):
    client = get_client()
    name = _collection_name(book_id)
    try:
        client.delete_collection(name)
    except Exception:
        pass  # collection didn't exist yet — fine
    return client.create_collection(
        name=name,
        metadata={
            "embedding_model": settings.embedding_model,
            "hnsw:space": "cosine",
        },
    )


def get_collection(book_id: str):
    client = get_client()
    return client.get_collection(_collection_name(book_id))


def add_chunks(book_id: str, ids: list[str], embeddings: list[list[float]],
               documents: list[str], metadatas: list[dict]) -> None:
    collection = get_collection(book_id)
    # Chroma has a practical upper bound per add() call; batch defensively
    # for very large books.
    batch_size = 200
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i + batch_size],
            embeddings=embeddings[i:i + batch_size],
            documents=documents[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )


def query(book_id: str, query_embedding: list[float], top_k: int) -> dict:
    collection = get_collection(book_id)
    return collection.query(query_embeddings=[query_embedding], n_results=top_k)


def delete_book(book_id: str) -> bool:
    client = get_client()
    try:
        client.delete_collection(_collection_name(book_id))
        return True
    except Exception:
        return False


def book_exists(book_id: str) -> bool:
    client = get_client()
    try:
        client.get_collection(_collection_name(book_id))
        return True
    except Exception:
        return False
