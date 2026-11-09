# PulseGuard — Troubleshooting & Debugging Guide

This guide is designed for developers, operators, and evaluators to diagnose and resolve common setup, connectivity, and execution issues in PulseGuard.

---

## 1. The "Failed to fetch" Authentication Error

### Symptom:
When navigating to `http://localhost:5173/auth` and submitting the Login or Register form, the browser console shows:
```
TypeError: Failed to fetch
```
and the UI displays a connection error.

### Root Cause Analysis:
1. **IPv6 vs IPv4 Origin Mismatch:** Vite dev server on modern macOS systems binds to `:::5173`. When accessing the page via `localhost:5173`, modern Chromium/WebKit browsers resolve `localhost` to IPv6 `[::1]:5173`. During CORS preflight requests (`OPTIONS /api/v1/auth/login`), the browser sends `Origin: http://[::1]:5173`. If the backend CORS whitelist only contains `http://localhost:5173` and `http://127.0.0.1:5173`, FastAPI rejects the preflight with `HTTP 400 Bad Request (Disallowed CORS origin)`. The browser converts this preflight rejection into `TypeError: Failed to fetch`.
2. **Backend Server Inactive:** The Uvicorn backend process is not running on port 8000.

### Resolution:
1. **Verify Backend Status:**
   ```bash
   curl -I http://127.0.0.1:8000/api/v1/health/live
   # Expected response: HTTP/1.1 200 OK
   ```
2. **Confirm CORS Configuration:**
   In `backend/app/main.py`, verify `allow_origin_regex` is present:
   ```python
   allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"
   ```
3. **Verify Vite Reverse Proxy:**
   In `frontend/vite.config.ts`, verify proxy forwarding:
   ```ts
   server: {
     port: 5173,
     proxy: {
       "/api": {
         target: "http://127.0.0.1:8000",
         changeOrigin: true,
       },
       "/ws": {
         target: "ws://127.0.0.1:8000",
         ws: true,
       },
     },
   }
   ```
4. **Use Frontend System Diagnostics:**
   Navigate directly to `http://localhost:5173/diagnostics` to inspect backend reachability, database response times, and model health.

---

## 2. Port Conflicts & Server Startup

### Symptom:
Starting the backend or frontend outputs `Error: listen EADDRINUSE: address already in use :::5173` or `[Errno 48] Address already in use 8000`.

### Resolution:
Identify and terminate the lingering process:

```bash
# Check what is using port 8000
lsof -ti :8000
# Terminate process if necessary
kill -9 $(lsof -ti :8000)

# Check what is using port 5173
lsof -ti :5173
# Terminate process if necessary
kill -9 $(lsof -ti :5173)
```

Restart services:
```bash
# Terminal 1: Backend
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 3. Database Reset & Reseeding

### Symptom:
Inconsistent machine records or authentication credential corruption.

### Resolution:
Delete the local SQLite database file and re-run the backend. The startup event in `backend/app/main.py` will automatically recreate all tables and seed the demonstration accounts:

```bash
rm -f pulseguard.db
# Restart backend, or run seed script:
PYTHONPATH=. python3 -c "from backend.app.database.session import SessionLocal; from backend.app.database.seed import seed_demo_data_if_empty; seed_demo_data_if_empty(SessionLocal())"
```

Demo Credentials:
- **Email:** `demo@pulseguard.ai`
- **Password:** `IndustrialDemo2026!`

---

## 4. Deep Learning Model & Artifact Verification

### Symptom:
Acoustic inference fails with `ModelUnavailable` or `WeightsNotFound`.

### Verification Steps:
Check that the 3 required model artifacts are in `backend/app/ml/artifacts/`:
1. `cae_fan_model.pt` (~8.2 MB)
2. `knn_reference_bank.pkl` (~5.5 KB)
3. `calibrated_thresholds.json` (~821 B)

To verify weight health via CLI:
```bash
python3 -c "import torch; m = torch.load('backend/app/ml/artifacts/cae_fan_model.pt', map_location='cpu'); print('Weights loaded:', len(m))"
```

If missing, train the model using the synthetic MIMII generator:
```bash
PYTHONPATH=. python3 training/train_cae.py
PYTHONPATH=. python3 training/train_knn.py
```

---

## 5. Software IoT Virtual Sensor Bridge Testing

### Symptom:
Bridge outputs `Network/Backend unreachable`.

### Step-by-Step Check:
1. Ensure the FastAPI backend is running on port 8000.
2. Ingest a test packet:
   ```bash
   python3 iot/bridge/virtual_sensor_bridge.py --machine FAN-BAY-01 --scenario normal --iterations 2
   ```
3. Check the response in the terminal. You should see `Emitted -> RPM: ... | Temp: ... | Vib: ...`.
4. Open the frontend Telemetry Simulator page (`http://localhost:5173/simulator`) to watch live WebSocket telemetry updates stream in real time.
