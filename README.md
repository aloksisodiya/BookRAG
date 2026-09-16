# Book RAG Assistant

Upload a book as a PDF, ask questions about it, and get answers grounded in
the book's actual text — with page-level citations.

```
React → Node.js (Express) → Python (FastAPI RAG service) → ChromaDB
                                        │
                                        ▼
                                     Groq LLM
```

- **React** — upload UI, book list, chat interface
- **Node.js / Express** — API gateway: validation, the book registry, upload handling, error mapping
- **Python / FastAPI** — the RAG engine: PDF parsing, chunking, embeddings, retrieval, prompting, Groq calls
- **ChromaDB** — one vector collection per book
- **Groq** — generates the final answer from retrieved context

The Groq API key lives only in the Python service. It is never sent to Node or to the browser.

---

## 1. Prerequisites

- Node.js 20+
- Python 3.11+
- A free Groq API key: https://console.groq.com/keys
- Docker + Docker Compose (optional, for the one-command setup)

---

## 2. Configuration

Every service reads its own `.env` file. Copy the example files and fill them in:

```bash
cp rag-service/.env.example rag-service/.env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit **`rag-service/.env`**:

```ini
GROQ_API_KEY=your-groq-api-key-here      # required
GROQ_MODEL=llama-3.3-70b-versatile       # answer generation
GROQ_REWRITE_MODEL=llama-3.1-8b-instant  # cheap model for follow-up rewriting
CHROMA_DB_PATH=../data/chroma
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
TOP_K=5
MIN_SIMILARITY=0.35
INTERNAL_API_KEY=change-me-to-a-long-random-string
```

Edit **`server/.env`** — `INTERNAL_API_KEY` must be the **exact same value** as in `rag-service/.env` (it's the shared secret between the two backend services):

```ini
PORT=4000
RAG_SERVICE_URL=http://localhost:8000
INTERNAL_API_KEY=change-me-to-a-long-random-string   # must match rag-service
MAX_UPLOAD_MB=50
UPLOAD_DIR=../data/books
CLIENT_ORIGIN=http://localhost:5173
```

`client/.env` usually needs no changes for local development:

```ini
VITE_API_BASE_URL=http://localhost:4000/api
```

Generate a random `INTERNAL_API_KEY` with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 3. Run it — Option A: Docker Compose (recommended)

From the project root, create a root `.env` with the two values compose needs:

```bash
cp .env.example .env
# then edit .env and set GROQ_API_KEY and INTERNAL_API_KEY
```

Then:

```bash
docker compose up --build
```

This builds and starts all three services:

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Node API | http://localhost:4000 |
| Python RAG service | http://localhost:8000 (internal; docs at /docs) |

First startup will take a few minutes — the RAG service downloads the
embedding model (`BAAI/bge-small-en-v1.5`, ~130 MB) on first run.

To stop: `docker compose down`. Vector data and uploaded books persist in `./data/` between runs since they're mounted as volumes.

---

## 4. Run it — Option B: manually, three terminals

**Terminal 1 — Python RAG service**

```bash
cd rag-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Wait for it to finish loading the embedding model, then confirm it's healthy:

```bash
curl http://localhost:8000/health
```

**Terminal 2 — Node backend**

```bash
cd server
npm install
npm run dev
```

Confirm it can see the RAG service:

```bash
curl http://localhost:4000/health
```

**Terminal 3 — React frontend**

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

---

## 5. Using it

1. Drag a PDF onto the shelf on the left, or click **browse**.
2. The book shows **Processing** while it's extracted, chunked and embedded — this takes roughly 5–30 seconds per 100 pages, mostly the embedding step.
3. Once it says **Ready**, select it and start asking questions.
4. Each answer shows its source pages below it — click a source to expand the exact excerpt it came from.
5. If a question can't be answered from the book, the assistant says so rather than guessing.

**Note on scanned PDFs:** if a PDF is a set of scanned page images with no real text layer, ingestion will fail with "No readable text was found." OCR isn't included in this MVP (see the spec's Future Features).

---

## 6. Project structure

```
book-rag-assistant/
├── client/         # React frontend
├── server/         # Node.js/Express API gateway
├── rag-service/     # Python/FastAPI RAG engine
│   └── eval/        # small evaluation harness (see below)
├── data/
│   ├── books/       # uploaded PDFs (Node-managed)
│   └── chroma/       # persistent vector store (Python-managed)
└── docker-compose.yml
```

---

## 7. API reference (Node — what the frontend talks to)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/books/upload` | multipart upload, field `file` (PDF), optional `title` |
| GET | `/api/books` | list books and their status |
| GET | `/api/books/:id/status` | poll ingestion progress |
| DELETE | `/api/books/:id` | delete a book, its file, and its vectors |
| POST | `/api/chat` | `{ bookId, question, history }` → `{ answer, sources, grounded, latency_ms }` |
| GET | `/health` | Node + downstream RAG service health |

Every error response has the shape `{ "error": { "code": "...", "message": "..." } }`.

---

## 8. Running the evaluation harness

Once a book has been ingested, edit `rag-service/eval/dataset.json` with real
questions and expected page ranges for that book, then run (with the
rag-service virtualenv active):

```bash
cd rag-service
python eval/run_eval.py book_XXXXXXXXXX   # the book_id from the UI or GET /api/books
```

This reports retrieval recall (did the right pages get retrieved?) and
refusal accuracy (does it correctly decline unanswerable questions?).

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Upload fails immediately with `RAG_UNAVAILABLE` | Python service isn't running or `RAG_SERVICE_URL` is wrong |
| Ingestion stuck at "queued" forever | Check the rag-service terminal/logs for a startup error (often a missing `GROQ_API_KEY` or model download failure) |
| `401` errors between Node and Python | `INTERNAL_API_KEY` doesn't match between `server/.env` and `rag-service/.env` |
| "No readable text was found" | The PDF is scanned images with no text layer — OCR isn't supported yet |
| Answers ignore the book / seem generic | Check `MIN_SIMILARITY` isn't set too low, and confirm the book status is actually "Ready" before asking |
| Slow first request | The embedding model loads lazily on first use — subsequent requests are fast |

---

## 10. What's next

See section 21 ("Future Features") of the project specification: streaming
responses, multi-book search, reranking, hybrid search, OCR for scanned
books, page-level PDF viewing, and authentication.
