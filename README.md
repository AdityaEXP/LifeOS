# LifeOS

LifeOS is an AI-powered academic document assistant for Retrieval-Augmented Generation (RAG) over user-uploaded PDFs. It combines FastAPI, PostgreSQL + pgvector, Redis, and OpenAI models to ingest documents, build semantic indexes, and answer user questions with context retrieved from each user's own files.

The project is built as a backend-first system with a lightweight frontend dashboard, focused on practical AI infrastructure patterns: async ingestion, vector search, auth boundaries, and transactional persistence.

## Architecture Overview

```mermaid
flowchart LR
    U[User] --> F[Frontend]
    F --> A[FastAPI API]

    A --> R[(Redis rate limit store)]
    A --> P[(PostgreSQL)]
    P --> V[(pgvector embeddings)]

    A --> O[OpenAI API]

    subgraph Ingestion Pipeline
        A --> UP[Upload PDF]
        UP --> TX[Extract text with PyMuPDF]
        TX --> CH[Chunk text recursive splitter]
        CH --> EM[Generate embeddings]
        EM --> ST[Store chunks vectors transaction]
    end

    subgraph Query Pipeline
        A --> QE[Embed query]
        QE --> VS[Vector similarity search]
        VS --> AG[Compose grounded prompt]
        AG --> ANS[Answer]
    end
```

## Features

- JWT-based authentication with access + refresh token flow
- Protected routes using bearer token dependency
- Login rate-limit guard backed by Redis
- PDF upload endpoint with size and MIME checks
- Async file writes via aiofiles
- PDF text extraction using PyMuPDF
- Recursive chunking for context-preserving segmentation
- Embedding generation with OpenAI (`text-embedding-3-small`)
- Vector storage and similarity search with pgvector
- User-level document isolation in retrieval queries
- AI-generated answers constrained by retrieved chunks
- Document processing pipeline with status tracking (`processing`, `completed`, `error`)
- Transaction-safe chunk writes for ingestion integrity
- Lightweight dashboard/chat/file management frontend

## Tech Stack

### Backend
- FastAPI
- PostgreSQL
- pgvector
- Redis
- asyncpg
- OpenAI API
- PyMuPDF
- aiofiles

### Frontend
- HTML
- TailwindCSS
- Vanilla JavaScript

### Infrastructure
- Docker (target platform)
- Docker Compose (target platform)

> Note: Docker/Docker Compose manifests are not currently committed in this repository yet.

## Folder Structure

```text
LifeOS/
├── backend/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   └── openaiclient.py
│   ├── database/
│   │   ├── db.py
│   │   ├── reddis_core.py
│   │   └── sql.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── upload.py
│   │   └── query.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── query.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── security.py
│   │   ├── rate_limit.py
│   │   ├── user.py
│   │   ├── pdf_processing.py
│   │   └── query.py
│   └── uploads/
├── frontend/
│   ├── home.html
│   ├── auth.html
│   ├── dashboard.html
│   ├── files.html
│   ├── chatbot.html
│   └── assets/js/
│       ├── config.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── files.js
│       └── chatbot.js
└── requiremets.txt
```

## Database Schema Overview

### `users`
- `id` (SERIAL, PK)
- `username` (UNIQUE)
- `email` (UNIQUE)
- `hashed_password`

### `refresh_tokens`
- `id` (SERIAL, PK)
- `user_id` (UNIQUE, FK -> users.id, ON DELETE CASCADE)
- `token`

### `files`
- `id` (SERIAL, PK)
- `user_id` (FK -> users.id, ON DELETE CASCADE)
- `original_filename`
- `stored_filename`
- `status`
- `upload_time` (default `CURRENT_TIMESTAMP`)

### `document_chunks`
- `id` (SERIAL, PK)
- `file_id` (FK -> files.id, ON DELETE CASCADE)
- `chunk_index`
- `chunk_text`
- `embedding` (`VECTOR(1536)`)
- `page_number`
- `created_at` (default `CURRENT_TIMESTAMP`)

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 14+
- pgvector extension enabled
- Redis 6+
- OpenAI API key

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/AdityaEXP/LifeOS.git
cd LifeOS
pip install -r requiremets.txt
pip install fastapi uvicorn asyncpg python-dotenv bcrypt pyjwt redis pgvector pydantic[email] langchain-text-splitters
```

### 3. Configure Environment
Create a `.env` file in project root:

```env
DB_URL=postgresql://postgres:postgres@localhost:5432/lifeos
SECRET_KEY=replace_with_a_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_MINUTES=10080
REDIS_HOST=localhost
OPENAI_API_KEY=sk-...
```

### 4. Enable pgvector in PostgreSQL
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Run API Server
```bash
cd backend
uvicorn main:app --reload
```

### 6. Run Frontend
Serve the `frontend` directory through any static server (for example VS Code Live Server on port `5500`) so CORS origin defaults match current backend config.

## Environment Variables Example

| Variable | Required | Description |
|---|---|---|
| `DB_URL` | Yes | Async Postgres connection string |
| `SECRET_KEY` | Yes | JWT signing key |
| `ALGORITHM` | Yes | JWT algorithm (e.g. `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | Yes | Refresh token lifetime |
| `REDIS_HOST` | Yes | Redis host used for rate limiting |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings and generation |

## API Endpoints

### Auth
- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login and receive access token (+ refresh cookie)
- `POST /auth/refresh` - Rotate refresh cookie and issue new access token
- `POST /auth/logout` - Revoke refresh token and clear cookie

### Users
- `GET /users/me` - Get current authenticated user profile

### Files
- `POST /files/` - Upload PDF and trigger processing pipeline
- `GET /files/` - List current user's uploaded files and statuses

### Query
- `POST /query/` - Ask a question against current user's indexed documents

## Example Workflow: PDF Ingestion and Querying

### 1. Authenticate
1. Call `POST /auth/signup` (once) and `POST /auth/login`.
2. Store returned `access_token` for bearer auth.

### 2. Upload Document
1. Send multipart PDF to `POST /files/`.
2. Backend stores file metadata with `processing` status.
3. Pipeline extracts text, chunks content, generates embeddings, and writes vectors.
4. File status transitions to `completed` (or `error` if ingestion fails).

### 3. Query Documents
1. Send user query to `POST /query/` with bearer token.
2. Query is embedded using same embedding model.
3. Top-k similar chunks are retrieved from pgvector.
4. Retrieved chunks are passed to chat model for grounded answer generation.

## Screenshots

- `[Placeholder]` Authentication page
- `[Placeholder]` Dashboard view
- `[Placeholder]` File upload + processing status
- `[Placeholder]` Chat/query results panel

## Roadmap

- Add background job queue for ingestion (Celery/RQ/Arq)
- Stream query responses and token usage metrics
- Add per-document filtering in query endpoint
- Add hybrid retrieval (keyword + vector)
- Add observability (structured logs, traces, latency dashboards)
- Add automated tests (unit/integration/e2e)
- Add production Docker + Compose manifests
- Add CI pipeline (lint, type checks, tests)

## Engineering Notes

- Current retrieval prompt enforces chunk-grounded answers and abstains when context is missing.
- Vector dimensions are pinned to `1536` for `text-embedding-3-small`.
- Refresh token persistence is single-token-per-user and rotated on login/refresh.
- Rate limiting currently applies to login attempts keyed by email in Redis.
