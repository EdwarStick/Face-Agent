"""
FaceAttendance AI — Test Configuration
========================================
Shared pytest fixtures available to all test modules via conftest.py.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Returns a synchronous TestClient for the FastAPI application."""
    with TestClient(app) as c:
        yield c
