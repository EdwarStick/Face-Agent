# AGENTS.md — FaceAttendance AI

## Project structure

```
backend/     FastAPI app (all Python source code)
frontend/    React SPA (Vite + TS 6 + MUI + React Router + TanStack Query + Zustand)
```

Commands run from `backend/` or `frontend/`.

## Commands — backend

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
cp .env.example .env                    # fill DB values
alembic upgrade head                    # 4 migrations exist
uvicorn app.main:app --reload           # http://localhost:8000
pytest tests/ -v                        # 2 test files only
alembic revision --autogenerate -m "msg"
```

## Commands — frontend

```bash
npm install
npm run dev                              # Vite :5173
npm run build                            # tsc -b && vite build
npm run lint                             # eslint .
```

`VITE_API_URL=http://localhost:8000/api/v1` in `frontend/.env`.

## Stack

- **Framework**: FastAPI (sync routes), loguru, Pydantic Settings v2 from `app/core/config.py`
- **ORM**: SQLAlchemy 2.0 (sync) + Alembic (URL overridden via `alembic/env.py` from Settings)
- **DB**: PostgreSQL; `?sslmode=require` appended in `database_url` property when not localhost
- **Face**: DeepFace (ArcFace) + OpenCV; embeddings stored as JSON (`list[float]`)
- **Auth**: python-jose + passlib in requirements but **not implemented**
- **AI**: Groq SDK (`llama-3.1-8b-instant`) for chat endpoint

## Missing from requirements.txt

`deepface` and `groq` — install manually; imports use `# pyrefly: ignore [missing-import]`

## .env.example gaps

`GROQ_API_KEY` / `GROQ_MODEL` not documented — must be added manually for chat to work. `FACE_RECOGNITION_MODEL` says `Facenet512` but actual code uses `ArcFace`.

## Architecture

- **Spanish naming** for domains: `empleados/`, `rostros/`, `reconocimiento/`, `asistencias/`, `horarios/`, `reportes/`
- **Module-per-domain**: each has `router.py`, `schemas.py`, `service.py` under `app/<domain>/`
- **`app/services/`** shared services: `face_service.py`, `recognition_service.py`, `groq_service.py`
- **`app/models/__init__.py`** imports all models (needed by Alembic autogenerate)
- **`app/api/v1/router.py`** aggregates all domain routers
- Soft delete via `activo` boolean; queries filter `activo == True`
- `Empleado` uses UUID PK via `UUIDMixin`; other models declare UUID inline
- Face threshold: `0.65` cosine similarity (hardcoded in `recognition_service.py:53`); `face_similarity_threshold` in Settings (0.40) is unused
- Rostro service enforces max 4 face photos per employee (`MAX_TOMAS = 4` in `rostros/service.py`)
- `marcaciones/` directory is empty stub; `reportes/` also a stub (no router wired yet)

## API endpoints (`/api/v1`)

| Prefix | File | Purpose |
|--------|------|---------|
| `/health` | api/v1/endpoints/health.py | DB status → ok/degraded |
| `/empleados` | empleados/router.py | CRUD (soft delete) |
| `/rostros` | rostros/router.py | Register face base64→embedding |
| `/reconocimiento` | reconocimiento/router.py | `/identificar` match, `/marcar` recognize+toggle |
| `/asistencias` | asistencias/router.py | Entry/exit, today's list, stats |
| `/horarios` | horarios/router.py | CRUD schedules per weekday |
| `/chat` | chat/router.py | AI chat via Groq with live DB context |

## Testing

- `conftest.py` adds `backend/` to `sys.path`; sync `TestClient` fixture (module scope)
- 2 test files: `test_health.py` (works without real DB, returns `degraded`), `test_empleados.py` (full CRUD + soft delete)
- No coverage/pytest config; no tests for rostros, reconocimiento, asistencias, horarios, chat

## Gotchas

- DeepFace: `represent(img, model_name="ArcFace", enforce_detection=False, detector_backend="opencv")` — `opencv` = no GPU
- `generar_embedding` returns `np.round(resultado[0]["embedding"], 5).tolist()`
- `insightface` + `onnxruntime` pinned in requirements but unused directly (DeepFace wraps them)
- DB unreachable → app starts fine; health returns `degraded`; all DB endpoints 500
- Alembic chain: `001` (marcaciones) → `1803fadc9b9f` (drop marcaciones) → `002` (empleados/rostros/asistencias) → `003` (horarios)
- `seg_nombres` / `seg_apellido` default to `""` in schema; service handles `None→""` on update but not create
