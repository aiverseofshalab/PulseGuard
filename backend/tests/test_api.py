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

def test_diagnostic_endpoints(client):
    # Live
    res_live = client.get("/api/v1/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "Operational"

    # Ready
    res_ready = client.get("/api/v1/health/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "Operational"
    assert res_ready.json()["database"] == "Operational"

    # Services Matrix
    res_services = client.get("/api/v1/health/services")
    assert res_services.status_code == 200
    assert res_services.json()["overall_status"] == "Operational"
    assert "database" in res_services.json()["services"]

    # ML Pipeline
    res_ml = client.get("/api/v1/health/ml")
    assert res_ml.status_code == 200
    assert res_ml.json()["cae_model"]["status"] == "Operational"
    assert res_ml.json()["cae_model"]["latent_bottleneck_dim"] == 64

    # IoT Diagnostics
    res_iot = client.get("/api/v1/health/iot")
    assert res_iot.status_code == 200
    assert res_iot.json()["hardware_dependency"] == "None (100% Software Simulated)"
    assert res_iot.json()["tinkercad_firmware_file"] == "Present"

def test_user_registration_and_auth_failures(client):
    # Unique user registration
    import uuid
    test_email = f"user_{uuid.uuid4().hex[:8]}@pulseguard.ai"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": "Password12345!",
            "full_name": "Test Operator",
            "role": "operator"
        }
    )
    assert reg_res.status_code == 201
    assert "access_token" in reg_res.json()

    # Reject duplicate email
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": "Password12345!",
        }
    )
    assert dup_res.status_code == 400

    # Reject invalid password
    bad_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_email,
            "password": "WrongPassword999!"
        }
    )
    assert bad_login.status_code == 401

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

