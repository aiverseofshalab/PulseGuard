import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings

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

def test_diagnostics_battery_and_history(client):
    # 1. Run live diagnostic battery
    res_run = client.post("/api/v1/health/run")
    assert res_run.status_code == 200
    data = res_run.json()
    assert "id" in data
    assert data["overall_status"] in ["Operational", "Degraded"]
    assert data["execution_time_ms"] > 0
    assert "database" in data["results"]
    assert "audio_preprocessing" in data["results"]
    assert "ml_inference" in data["results"]
    assert "dataset_availability" in data["results"]
    assert "environment_configuration" in data["results"]

    # 2. Retrieve persisted diagnostic history
    res_hist = client.get("/api/v1/health/history?limit=5")
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert isinstance(hist, list)
    assert len(hist) >= 1
    assert "id" in hist[0]
    assert "overall_status" in hist[0]

def test_digital_twin_scenarios_and_custom_controls(client, auth_headers):
    # Get test machine
    mach_res = client.get("/api/v1/machines", headers=auth_headers)
    assert mach_res.status_code == 200
    machine_id = mach_res.json()["items"][0]["id"]

    # 1. Trigger Combined Abnormal Operation scenario
    res_comb = client.post(
        f"/api/v1/simulator/machines/{machine_id}/trigger",
        headers=auth_headers,
        json={"scenario": "combined_abnormal"},
    )
    assert res_comb.status_code == 200
    d_comb = res_comb.json()
    assert d_comb["operating_status"] == "critical"
    assert d_comb["rpm"] > 3000
    assert d_comb["temperature"] > 80
    assert d_comb["vibration_indicator"] > 70
    assert d_comb["is_simulated"] is True

    # 2. Trigger Custom Manual Direct Telemetry Override
    res_cust = client.post(
        f"/api/v1/simulator/machines/{machine_id}/trigger",
        headers=auth_headers,
        json={
            "scenario": "custom",
            "base_rpm": 3150.0,
            "base_temperature": 82.5,
            "base_vibration": 64.0,
        },
    )
    assert res_cust.status_code == 200
    d_cust = res_cust.json()
    assert d_cust["rpm"] == 3150.0
    assert d_cust["temperature"] == 82.5
    assert d_cust["vibration_indicator"] == 64.0
    assert d_cust["operating_status"] == "critical"

    # 3. Trigger Emergency Stop / Machine Stopped
    res_stop = client.post(
        f"/api/v1/simulator/machines/{machine_id}/trigger",
        headers=auth_headers,
        json={"scenario": "stopped"},
    )
    assert res_stop.status_code == 200
    assert res_stop.json()["rpm"] == 0.0
    assert res_stop.json()["operating_status"] == "stopped"

def test_ai_explainability_endpoint(client, auth_headers):
    # Retrieve an existing analysis
    an_res = client.get("/api/v1/analyses?limit=1", headers=auth_headers)
    assert an_res.status_code == 200
    analyses = an_res.json()["items"]
    assert len(analyses) > 0
    analysis_id = analyses[0]["id"]

    # Query AI Explainability details
    exp_res = client.get(f"/api/v1/analyses/{analysis_id}/explainability", headers=auth_headers)
    assert exp_res.status_code == 200
    exp = exp_res.json()
    assert exp["analysis_id"] == analysis_id
    assert "cae" in exp["model_version"].lower()
    assert exp["reconstruction_error"] > 0
    assert len(exp["frequency_bands_attribution"]) == 3

    # Check frequency bands sum up to ~100%
    total_pct = sum(b["residual_percentage"] for b in exp["frequency_bands_attribution"])
    assert 98.0 <= total_pct <= 102.0

    # Verify quantitative evidence lists and disclaimer
    assert len(exp["model_based_evidence"]) >= 2
    assert len(exp["iot_telemetry_evidence"]) >= 1
    assert "probability" in exp["disclaimer"].lower()

def test_pdf_report_generation_and_download(client, auth_headers):
    an_res = client.get("/api/v1/analyses?limit=1", headers=auth_headers)
    assert an_res.status_code == 200
    analysis_id = an_res.json()["items"][0]["id"]

    # 1. Generate Formal Maintenance Report Record
    gen_res = client.post(f"/api/v1/reports/generate/{analysis_id}", headers=auth_headers)
    assert gen_res.status_code == 200
    rep_data = gen_res.json()
    assert "PG-REP-" in rep_data["report_identifier"]
    report_id = rep_data["id"]

    # 2. List Reports
    list_res = client.get("/api/v1/reports", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Download Generated PDF Stream
    dl_res = client.get(f"/api/v1/reports/{report_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")
    assert len(dl_res.content) > 1000

    # 4. Direct PDF Download by Analysis ID
    direct_res = client.get(f"/api/v1/reports/analysis/{analysis_id}/pdf", headers=auth_headers)
    assert direct_res.status_code == 200
    assert direct_res.headers["content-type"] == "application/pdf"
    assert direct_res.content.startswith(b"%PDF")

def test_security_audit_logging_and_rbac(client, auth_headers):
    # 1. Query audit logs with Engineer credentials (should succeed)
    logs_res = client.get("/api/v1/audit/logs", headers=auth_headers)
    assert logs_res.status_code == 200
    data = logs_res.json()
    assert "total" in data
    assert "items" in data

    # 2. Query security summary with Engineer credentials
    sum_res = client.get("/api/v1/audit/summary", headers=auth_headers)
    assert sum_res.status_code == 200
    s_data = sum_res.json()
    assert "security_posture" in s_data
    assert s_data["total_events"] >= 1

    # 3. Create Operator user (role: operator) and verify RBAC block on audit dashboard
    import uuid
    op_email = f"operator_{uuid.uuid4().hex[:6]}@pulseguard.ai"
    reg_op = client.post(
        "/api/v1/auth/register",
        json={
            "email": op_email,
            "password": "SecurePassword123!",
            "full_name": "Shift Operator",
            "role": "operator",
        },
    )
    assert reg_op.status_code == 201
    op_token = reg_op.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # Operator should be rejected with 403 Forbidden
    op_audit_res = client.get("/api/v1/audit/logs", headers=op_headers)
    assert op_audit_res.status_code == 403

    # 4. Ingest with invalid device key -> generates audit entry
    bad_key_res = client.post(
        "/api/v1/telemetry/ingest",
        headers={"X-API-KEY": "malicious-fake-key"},
        json={
            "machine_identifier": "FAN-BAY-01",
            "rpm": 2400.0,
            "temperature": 42.0,
            "vibration_indicator": 18.0,
        },
    )
    assert bad_key_res.status_code == 403
