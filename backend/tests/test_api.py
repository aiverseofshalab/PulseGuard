import io
import wave
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_headers(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@pulseguard.ai", "password": "IndustrialDemo2026!"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_health_endpoints(client):
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "PulseGuard" in res_root.json()["app"]

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

def test_machine_lifecycle(client, auth_headers):
    # Create Machine
    create_res = client.post(
        "/api/v1/machines",
        headers=auth_headers,
        json={
            "machine_identifier": "TEST-FAN-99",
            "machine_name": "Test Ventilation Fan",
            "machine_type": "fan",
            "description": "Integration test asset",
        },
    )
    assert create_res.status_code == 201
    machine_id = create_res.json()["id"]

    # Read Machine
    get_res = client.get(f"/api/v1/machines/{machine_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["machine_identifier"] == "TEST-FAN-99"

    # Update Machine
    update_res = client.patch(
        f"/api/v1/machines/{machine_id}",
        headers=auth_headers,
        json={"machine_name": "Updated Ventilation Fan"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["machine_name"] == "Updated Ventilation Fan"

    # Delete Machine
    del_res = client.delete(f"/api/v1/machines/{machine_id}", headers=auth_headers)
    assert del_res.status_code == 204

def test_dashboard_summary(client, auth_headers):
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_machines"] >= 4
    assert data["total_recordings_analyzed"] >= 0

def test_export_csv(client, auth_headers):
    res = client.get("/api/v1/reports/export", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Analysis_ID,Machine_ID" in res.text

