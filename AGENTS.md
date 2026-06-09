# AGENTS.md — FaceAttendance AI

## Project structure

```
backend/       ← all source code (FastAPI app)
```

All commands run from `backend/`. No monorepo, no frontend yet.

## Stack

- **Framework**: FastAPI (sync, not async routes yet)
- **ORM**: SQLAlchemy 2.0 (sync) + Alembic
- **DB**: PostgreSQL (Aiven cloud), config via `.env`
- **Face**: DeepFace (Facenet512) + OpenCV, embeddings stored as JSON
- **Config**: Pydantic Settings v2 from `.env`
- **Auth**: python-jose + passlib (no actual auth implemented yet)
- **No pyproject.toml, no ruff, no formatter, no pre-commit, no CI**

## Commands

```bash
python -m venv .venv                     # create venv
.venv\Scripts\activate                   # activate (Windows)
python -m pip install -r requirements.txt
cp .env.example .env                     # then fill in DB values
alembic upgrade head                     # run migrations
python -m uvicorn app.main:app --reload  # dev server
pytest tests/ -v                         # all tests
alembic revision --autogenerate -m "msg" # new migration
```

## Architecture conventions

- **Spanish naming** for business domains: `empleados/`, `rostros/`, `reconocimiento/`
- **Module-per-domain** layout: each domain has its own `router.py`, `schemas.py`, `service.py` under `app/<domain>/`
- **`app/services/`** holds shared services (face_service, recognition_service)
- **`app/models/`** holds SQLAlchemy models; alembic autogenerate relies on `app/models/__init__.py` importing all models
- **`app/api/v1/router.py`** aggregates domain routers; new feature routers get registered there
- DB column names are Spanish (`fecha_creacion`, `fecha_actualizacion`) but Python attributes are English
- Soft delete: `activo` boolean flag, queries always filter `activo == True`
- Employees use UUID PK via `UUIDMixin`; Rostro model declares its own UUID PK inline
- `TimestampMixin` available but not used; `Empleado` maps audit columns manually
- All external imports annotated with `# pyrefly: ignore [missing-import]`

## API endpoints

| Prefix | Module | Purpose |
|---|---|---|
| `/api/v1/health` | health.py | Health check |
| `/api/v1/empleados` | empleados/ | CRUD employees |
| `/api/v1/rostros` | rostros/ | Register face (base64 image → embedding) |
| `/api/v1/reconocimiento/identificar` | reconocimiento/ | Match face against DB embeddings |

## Testing quirks

- `conftest.py` adds `backend/` to `sys.path` so imports work from root
- Uses sync `TestClient` (not async)
- Health test works without a real DB (`degraded` status)
- No tests yet for empleados, rostros, or reconocimiento endpoints
- No coverage config, no pytest config file

## Important gotchas

- **No migrations exist yet** — `alembic/versions/` only has `.gitkeep`; first `alembic revision --autogenerate` will create initial schema
- DB must be reachable or health check returns `degraded`; app still starts
- Face embedding uses DeepFace `represent()` with `detector_backend="opencv"`, `model_name="Facenet512"`
- Recognition threshold is `0.70` cosine similarity (hardcoded in `recognition_service.py`)
- `face_similarity_threshold` in Settings (0.40) is unused — the actual threshold lives in code
- Secondary name/surname fields default to `""` not `None` in service layer
- `seg_nombres` and `seg_apellido` in `EmpleadoResponse` are `str` (not Optional)
- `convertir.py` and `foto.jpg` at root of `backend/` are utility artifacts
