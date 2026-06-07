import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports from root of project/IDE
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Returns a synchronous TestClient for the FastAPI application."""
    with TestClient(app) as c:
        yield c
