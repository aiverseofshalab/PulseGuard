# PulseGuard — System Diagnostics & Health Monitoring

This document details the automated diagnostic architecture, health check probes, frontend diagnostic dashboard, and verification procedures in PulseGuard.

---

## 1. Overview & Architecture

PulseGuard implements a decoupled, defense-in-depth diagnostic suite. Health and readiness are evaluated across five specialized vectors:
1. **Liveness Probe (`/live`)**: Confirms process execution, memory availability, and HTTP router loop.
2. **Readiness Probe (`/ready`)**: Verifies operational capability, database read/write access, and ML model weight availability.
3. **Services Diagnostic (`/services`)**: Inspects runtime dependencies (database latency, ML inference engine, IoT bridge, audio pipeline, security config).
4. **Machine Learning Diagnostic (`/ml`)**: Verifies PyTorch weight presence, device type (CPU/CUDA/MPS), kNN reference vectors, and calibration thresholds.
5. **IoT & Telemetry Diagnostic (`/iot`)**: Audits telemetry ingestion status, WebSocket connection manager, and Autodesk Tinkercad virtual bridge readiness.

```
+-----------------------------------------------------------------------+
|                   PulseGuard Frontend (/diagnostics)                  |
|  - Real-Time Probe Polling   - Health Badges   - Latency Meters       |
|  - One-Click Deep Self-Test  - Error Recovery Guides                  |
+-----------------------------------+-----------------------------------+
                                    | HTTP / JSON (X-Request-ID)
                                    v
+-----------------------------------------------------------------------+
|                    FastAPI Diagnostic Router                          |
|  /api/v1/health/live     /ready     /services     /ml     /iot        |
+----------+-------------------+-------------------+--------------------+
           |                   |                   |
           v                   v                   v
   +---------------+   +---------------+   +-------------------+
   | SQLite / PG   |   | PyTorch CAE   |   | WebSocket Manager |
   | Database Ping |   | & kNN Memory  |   | & Telemetry Cache |
   +---------------+   +---------------+   +-------------------+
```

---

## 2. API Diagnostic Endpoints

### 2.1 GET `/api/v1/health/live`
*Purpose:* Kubernetes / container liveness check. Confirms HTTP listener is healthy.
- **Access:** Public (no authentication required)
- **Response Format:**
```json
{
  "status": "healthy",
  "app": "PulseGuard Backend",
  "version": "1.0.0",
  "environment": "development"
}
```

---

### 2.2 GET `/api/v1/health/ready`
*Purpose:* Readiness probe. Returns HTTP 200 if database and ML weights are ready; HTTP 503 if any core subsystem is unavailable.
- **Access:** Public
- **Response Format:**
```json
{
  "status": "ready",
  "database": "connected",
  "ml_model": "loaded",
  "knn_baseline": "loaded"
}
```

---

### 2.3 GET `/api/v1/health/services`
*Purpose:* Exhaustive status of all system components with latency measurements.
- **Access:** Public (sensitive tokens/passwords sanitized)
- **Sample Output:**
```json
{
  "system_status": "healthy",
  "timestamp": "2026-11-09T17:15:00Z",
  "services": {
    "api_gateway": {
      "status": "operational",
      "latency_ms": 0.12,
      "version": "1.0.0",
      "cors_enabled": true
    },
    "database": {
      "status": "operational",
      "latency_ms": 1.25,
      "dialect": "sqlite",
      "target": "pulseguard.db"
    },
    "ml_inference_engine": {
      "status": "operational",
      "model_type": "4-Layer 2D ConvAutoencoder",
      "device": "cpu",
      "weights_loaded": true,
      "knn_bank_loaded": true,
      "calibrated_thresholds": {
        "fan": { "warning": 0.003104, "critical": 0.003168 }
      }
    },
    "audio_pipeline": {
      "status": "operational",
      "supported_formats": ["WAV (PCM)", "WebM (Browser Mic)"],
      "sample_rate": 16000,
      "n_mels": 64
    },
    "iot_telemetry": {
      "status": "operational",
      "active_websockets": 0,
      "simulated_only": true,
      "virtual_bridge_supported": true
    }
  }
}
```

---

### 2.4 GET `/api/v1/health/ml`
*Purpose:* Specialized health check for AI / Deep Learning components.
- **Fields Checked:**
  - Checkpoint existence on disk (`backend/app/ml/artifacts/cae_fan_model.pt`)
  - Latent dimension configuration (64 dimensions)
  - kNN memory baseline bank (`knn_reference_bank.pkl`)
  - Calibrated warning and critical reconstruction thresholds

---

### 2.5 GET `/api/v1/health/iot`
*Purpose:* Real-time status of the Software-Only IoT Telemetry bridge.
- **Fields Checked:**
  - Device authentication scheme (`X-API-KEY`)
  - Virtual sensor simulation engine
  - Active WebSocket listeners

---

## 3. Frontend System Diagnostics UI

Located at `http://localhost:5173/diagnostics` (also linked in the sidebar with an Activity icon).

### Features:
1. **Interactive Probe Cards:** Shows status badges (`Operational`, `Degraded`, `Unavailable`), response times in milliseconds, and detailed sub-properties.
2. **One-Click Diagnostic Refresh:** Allows operators to trigger an immediate live poll across all diagnostic endpoints.
3. **Automated Verification Action:** Runs an end-to-end integration check against both the API and database.
4. **Structured Error Recovery:** If any service reports degraded or unavailable status, an actionable troubleshooting guide is displayed with specific resolution steps.

---

## 4. Verification CLI Commands

You can verify all probes directly via `curl`:

```bash
# Liveness
curl -s http://127.0.0.1:8000/api/v1/health/live | jq .

# Readiness
curl -s http://127.0.0.1:8000/api/v1/health/ready | jq .

# Comprehensive Services
curl -s http://127.0.0.1:8000/api/v1/health/services | jq .

# Deep Learning Health
curl -s http://127.0.0.1:8000/api/v1/health/ml | jq .

# Software IoT Health
curl -s http://127.0.0.1:8000/api/v1/health/iot | jq .
```
