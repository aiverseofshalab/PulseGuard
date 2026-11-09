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
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_telemetry_ingest_auth_failure(client):
    # Ingest without X-API-KEY should fail 401
    res = client.post(
        "/api/v1/telemetry/ingest",
        json={
            "machine_identifier": "FAN-BAY-01",
            "rpm": 2400.0,
            "temperature": 42.0,
            "vibration_indicator": 18.0,
        },
    )
    assert res.status_code == 401

def test_telemetry_ingest_success(client):
    # Ingest with valid X-API-KEY
    headers = {"X-API-KEY": "pulseguard-iot-device-secret-key-demo-2026"}
    res = client.post(
        "/api/v1/telemetry/ingest",
        headers=headers,
        json={
            "machine_identifier": "FAN-BAY-01",
            "rpm": 2420.5,
            "temperature": 43.2,
            "vibration_indicator": 19.1,
            "operating_status": "running",
            "source": "tinkercad_bridge",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["rpm"] == 2420.5
    assert data["source"] == "tinkercad_bridge"
    assert data["is_simulated"] is True

def test_simulator_trigger_scenario(client, auth_headers):
    # Get a machine id
    mach_res = client.get("/api/v1/machines", headers=auth_headers)
    machine_id = mach_res.json()["items"][0]["id"]

    res = client.post(
        f"/api/v1/simulator/machines/{machine_id}/trigger",
        headers=auth_headers,
        json={"scenario": "overheat"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["temperature"] > 80.0
    assert data["operating_status"] == "critical"

def test_health_fusion(client, auth_headers):
    mach_res = client.get("/api/v1/machines", headers=auth_headers)
    machine_id = mach_res.json()["items"][0]["id"]

    res = client.get(
        f"/api/v1/telemetry/machines/{machine_id}/health-fusion",
        headers=auth_headers,
    )
    assert res.status_code == 200
    fusion = res.json()
    assert "combined_health_state" in fusion
    assert len(fusion["evidence_breakdown"]) > 0
