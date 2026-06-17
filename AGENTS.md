# FaceAttendance AI

## Structure

```
backend/     ← FastAPI app (all source code)
frontend/    ← React SPA (Vite + TS 6 + MUI + React Router + TanStack Query + Zustand)
```

All commands run from their respective directory (`backend/` or `frontend/`).

## Commands

### Backend
```bash
python -m venv .venv                     # create venv
.venv\Scripts\activate                   # activate (Windows)
python -m pip install -r requirements.txt
cp .env.example .env                     # then fill in DB values
alembic upgrade head                     # run migrations (4 exist)
python -m uvicorn app.main:app --reload  # dev server (http://localhost:8000)
pytest tests/ -v                         # all tests
alembic revision --autogenerate -m "msg" # new migration
```

### Frontend
```bash
npm install
npm run dev      # Vite dev server (default :5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
```

`VITE_API_URL` env var (default `http://localhost:8000/api/v1`), stored in `frontend/.env`.

## Stack

- **Framework**: FastAPI (sync routes), loguru for logging
- **ORM**: SQLAlchemy 2.0 (sync) + Alembic (url overridden from `.env` via `alembic/env.py`)
- **DB**: PostgreSQL (Aiven cloud), config via `.env`, `?sslmode=require` appended if not localhost
- **Face**: DeepFace (ArcFace) + OpenCV; embeddings stored as JSON
- **Config**: Pydantic Settings v2 from `.env`
- **Auth**: python-jose + passlib (not implemented yet)
- **AI**: Groq SDK (llama-3.1-8b-instant) for chat endpoint

## Missing dependencies (not in requirements.txt)

- `deepface` — required by `services/face_service.py` at import time; install manually
- `groq` — required by `services/groq_service.py` at import time; install manually

## Architecture

- **Spanish naming** for business domains: `empleados/`, `rostros/`, `reconocimiento/`, `asistencias/`, `horarios/`, `reportes/`
- **Module-per-domain**: each domain has `router.py`, `schemas.py`, `service.py` under `app/<dominio>/`
- **`app/services/`** holds shared services (`face_service.py`, `recognition_service.py`, `groq_service.py`)
- **`app/models/`** holds SQLAlchemy models; `__init__.py` imports all so Alembic autogenerate finds them
- **`app/api/v1/router.py`** aggregates all domain routers; register new features there
- DB columns Spanish (`fecha_creacion`), Python attributes English (mapped via `column("nombre_es")`)
- Soft delete via `activo` boolean; queries filter `activo == True`
- `Empleado` uses UUID PK via `UUIDMixin`; other models (Rostro, Asistencia, Horario) declare UUID inline
- `seg_nombres` / `seg_apellido` default to `""` (schema default), but service layer only handles None→"" on update, not create (minor inconsistency)
- Face threshold: `0.65` cosine similarity (hardcoded in `services/recognition_service.py:53`); `face_similarity_threshold` in Settings (0.40) is unused
- Rostro service enforces max 4 face photos per employee (`MAX_TOMAS = 4`)
- `.vscode/settings.json` adds backend root to `python.analysis.extraPaths` for editor resolution; `.vscode/` is gitignored

## API endpoints (`/api/v1`)

| Prefix | File | Purpose |
|---|---|---|
| `/health` | api/v1/endpoints/health.py | Health check (DB status → ok/degraded) |
| `/empleados` | empleados/router.py | CRUD employees (soft delete) |
| `/rostros` | rostros/router.py | Register face (base64→embedding), list by employee, count |
| `/reconocimiento/identificar` | reconocimiento/router.py | Match face against DB |
| `/reconocimiento/marcar` | reconocimiento/router.py | Recognize + auto entry/exit (toggles) |
| `/asistencias` | asistencias/router.py | Entry/exit, today's list, employee history, stats |
| `/horarios` | horarios/router.py | CRUD schedules per weekday |
| `/reportes` | reportes/router.py | Daily summary, today's attendance report, employee stats |
| `/chat` | chat/router.py | AI chat via Groq (builds context from live DB) |

## Testing

- `conftest.py` adds `backend/` to `sys.path`, provides sync `TestClient` fixture (module scope)
- Health test works without real DB (returns `degraded` status)
- Empleado test covers full CRUD + soft delete + empty-string defaults
- No tests for rostros, reconocimiento, asistencias, horarios, reportes, chat
- No coverage config, no pytest config file

## Gotchas

- DeepFace `represent(img_path, model_name="ArcFace", enforce_detection=False, detector_backend="opencv")` — `detector_backend="opencv"` means no GPU even if available
- `generar_embedding` returns `np.round(resultado[0]["embedding"], 5).tolist()` (list of floats)
- `insightface` + `onnxruntime` pinned in requirements but not yet used directly (DeepFace wraps them)
- DB unreachable → app starts (no crash) but health returns `degraded`; all DB-dependent endpoints return 500
- `marcaciones/` directory exists but is empty (stub, no models or routes)
- All external imports annotated with `# pyrefly: ignore [missing-import]`
- Alembic migration chain: `001` (marcaciones) → `1803fadc9b9f` (drop marcaciones) → `002` (empleados/rostros/asistencias) → `003` (horarios)
