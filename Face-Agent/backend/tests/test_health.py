"""
Tests — Health Check Endpoint
================================
Verifies that /health returns HTTP 200 with the expected JSON shape.
These tests run without a real database (status may show 'degraded').
"""

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_response_shape(client: TestClient) -> None:
    data = client.get("/api/v1/health").json()
    assert "status" in data
    assert "app_name" in data
    assert "version" in data
    assert "environment" in data
    assert "database" in data


def test_health_app_name(client: TestClient) -> None:
    data = client.get("/api/v1/health").json()
    assert data["app_name"] == "FaceAttendance AI"
