# Book RAG Assistant

Upload a PDF, ask questions about it, and receive answers grounded in the
book's text with page-level citations.

```text
React -> Node.js/Express + LangChain.js -> PostgreSQL/pgvector -> Groq
```

The Node.js service now owns the complete RAG pipeline:

- `PDFLoader` and `RecursiveCharacterTextSplitter` extract and chunk books.
- Transformers.js generates local `BAAI/bge-small-en-v1.5`-compatible embeddings.
- PostgreSQL stores books, ingestion state, chunks, and `vector(384)` embeddings.
- LangChain.js orchestrates retrieval, query rewriting, and Groq prompts.

## Prerequisites

- Node.js 20+
- Docker Desktop and Docker Compose, or PostgreSQL with the `vector` extension
- A Groq API key

## Configuration

Copy the example environment files:

```text
copy server\.env.example server\.env
copy client\.env.example client\.env
```

For local PostgreSQL, configure `server/.env`:

```ini
DATABASE_URL=postgres://bookrag:bookrag@127.0.0.1:5432/bookrag
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_REWRITE_MODEL=openai/gpt-oss-20b
EMBEDDING_MODEL=Xenova/bge-small-en-v1.5
EMBEDDING_DTYPE=q8
EMBEDDING_BATCH_SIZE=8
```

See [`server/.env.example`](server/.env.example) for all settings.

## Run with Docker Compose

Create a root `.env` containing at least:

```ini
GROQ_API_KEY=your-groq-api-key-here
POSTGRES_PASSWORD=choose-a-password
```

Then run:

```bash
docker compose up --build
```

The services are:

| Service | URL |
| --- | --- |
| React frontend | http://localhost:5173 |
| Node API | http://localhost:4000 |
| PostgreSQL/pgvector | localhost:5432 |

Uploaded PDFs are stored in `data/books`. PostgreSQL data is stored in the
Docker volume `postgres_data`. The first ingestion downloads the embedding
model.

## Run manually

Start PostgreSQL with the `vector` extension, set `DATABASE_URL`, and then:

```bash
cd server
npm install
npm run dev
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

The API initializes the `books` and `book_chunks` tables on startup.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/books/upload` | Upload a PDF (`file`) and optional `title` |
| GET | `/api/books` | List books |
| GET | `/api/books/:id/status` | Read ingestion progress |
| DELETE | `/api/books/:id` | Delete a book, its PDF, and vectors |
| POST | `/api/chat` | Ask `{ bookId, question, history }` |
| GET | `/health` | Check Node and PostgreSQL |

Embeddings and chunks are stored in PostgreSQL's `book_chunks` table. Existing
Chroma data is not automatically imported; re-upload PDFs to generate vectors
with the new Node.js pipeline.
