# PulseGuard — Project Status & Progress Tracker

**Project Name:** PulseGuard  
**Full Title:** Deep Learning-Based Industrial Machine Acoustic Anomaly Detection and Predictive Maintenance Support System with Software-Based IoT Telemetry Simulation  
**Current Phase:** Production-Ready & Verified (Advanced Modules Phase 0–8 Complete)  
**Last Updated:** 2026-11-10  

---

## 1. Executive Summary

PulseGuard has completed development, rigorous self-diagnostics, automated quality engineering, and implementation of all 5 Advanced Production Modules:
1. **System Health & Automated Diagnostics Suite** (deep probe battery, persistent history, safe troubleshooting)
2. **Industrial Digital Twin Simulator** (interactive SVG rotor, direct parameter controls, 5 fault scenarios, emergency stop)
3. **AI Explainability & Frequency Sub-Band Attribution** (residual heatmaps, low/mid/high acoustic spectral decomposition, rule-vs-model evidence contrast)
4. **Automated Maintenance PDF Reports** (ReportLab vector PDF generation, unique tracking IDs, maintenance checklists, disclaimers)
5. **Security Audit Dashboard & RBAC Logging** (tamper-evident audit logging, device key tracking, ISO 27001 90-day retention)

The system processes industrial machine operating sounds (fans, pumps, valves, slide rails), extracts 128-band Log-Mel spectrograms, executes unsupervised Convolutional Autoencoder inference (reconstruction error MSE) paired with a kNN latent embedding baseline, and synthesizes acoustic insights with virtual IoT telemetry (simulating Autodesk Tinkercad Uno + TMP36 + potentiometer vibration proxy + pulse tachometer) without physical hardware dependencies.

---

## 2. Advanced Modules Implementation Status (Phases 0–8)

| Phase | Module / Milestone | Status | Key Deliverables & Endpoints |
|---|---|---|---|
| **Phase 0** | **Audit & Baseline Verification** | Completed | Cleaned working tree, resolved Vite IPv6 CORS origin preflight, verified 19 baseline tests. |
| **Phase 1** | **System Health & Diagnostics** | Completed | `POST /api/v1/health/run` (deep battery), `GET /api/v1/health/history`, `DiagnosticSnapshot` ORM model, auto-refresh console at `/diagnostics`. |
| **Phase 2** | **Digital Twin Simulator** | Completed | `POST /api/v1/simulator/inject-scenario` (`combined_abnormal`, `custom` overrides), interactive SVG rotor in `DigitalTwinMotor.tsx`, emergency stop, telemetry bridge sync. |
| **Phase 3** | **AI Explainability** | Completed | `GET /api/v1/analyses/{id}/explainability`, sub-band residual error decomposition (Low 0-2kHz, Mid 2-4kHz, High 4-8kHz), `AIExplainabilityModal.tsx`. |
| **Phase 4** | **Automated Maintenance Reports** | Completed | ReportLab PDF engine (`pdf_generator.py`), `POST /api/v1/reports/generate/{id}`, `GET /api/v1/reports/{id}/download`, unique tracking IDs (`PG-REP-YYYYMMDD-XXXX`). |
| **Phase 5** | **Security Audit Dashboard** | Completed | `GET /api/v1/audit/logs`, `GET /api/v1/audit/summary`, RBAC enforcement (operator 403 Forbidden), 90-day retention notice at `/security-audit`. |
| **Phase 6** | **Automated Testing Suite** | Completed | Added `backend/tests/test_advanced_features.py`; all 24 pytest tests pass with 100% success rate. |
| **Phase 7** | **End-to-End System Verification** | Completed | Production build passes (`tsc -b && vite build`) in 1.54s, unified runner `./scripts/run_all_tests.sh` verified. |
| **Phase 8** | **Documentation & Knowledge Transfer**| Completed | Architecture, Diagnostics, Testing, Status, Security, and Viva Defense Guide fully updated. |

---

## 3. Root Cause Diagnosis & Resolution Log

### Issue: "Failed to fetch" on `http://localhost:5173/auth`
- **Symptom:** Submitting user login/registration threw a browser network error `Failed to fetch`.
- **Root Cause:**
  1. On macOS, Vite binds by default to IPv6 `:::5173`. Modern browsers query `localhost:5173` over IPv6, sending `Origin: http://[::1]:5173`.
  2. The FastAPI CORS middleware strictly compared origins against IPv4 `localhost:5173` and `127.0.0.1:5173`, triggering HTTP 400 Bad Request on CORS preflight (`OPTIONS /api/v1/auth/login`).
  3. Chromium and WebKit report CORS preflight rejection as `TypeError: Failed to fetch`.
- **Resolution:**
  - Added IPv6 addresses (`http://[::1]:5173`, `http://[::1]:3000`, `http://[::1]:8000`) and regex pattern `r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"` to FastAPI CORS middleware in `backend/app/main.py`.
  - Configured Vite local development reverse proxy (`frontend/vite.config.ts`) forwarding `/api` to `http://127.0.0.1:8000` and `/ws` to `ws://127.0.0.1:8000`.
  - Enhanced frontend `api.ts` with relative fallback and structured `ApiError` network troubleshooting messages.
  - Implemented React Error Boundary in `frontend/src/components/layout/ErrorBoundary.tsx`.

---

## 4. Deep Learning Model & Evaluation Benchmark

- **Convolutional Autoencoder (CAE):**
  - Architecture: 3-layer 2D Conv encoder (Conv2D -> BatchNorm -> LeakyReLU), 64-dimensional latent bottleneck, mirror TransposeConv2D decoder.
  - Spectrogram Patch Dimension: `(128, 64)` (128 Mel frequency bins, 64 time frames).
  - Anomaly Scoring: Mean Squared Error (MSE) reconstruction loss across time-frequency bins.
- **k-Nearest Neighbors (kNN) Latent Embedding Bank:**
  - Index: Fitted Euclidean distance index on 64-D latent vectors extracted from normal machine soundscapes ($k=5$).
- **Held-Out Benchmark Performance:**
  - **ROC-AUC:** 1.0000
  - **PR-AUC:** 1.0000
  - **F1-Score:** 0.9091
  - **Average Inference Latency:** 1.54 ms on CPU
- **Acoustic Dataset:** MIMII Industrial Fan (ID 00) with calibrated splits:
  - `train_normal`: 120 recordings
  - `val_normal`: 24 recordings (used for 90th/99th percentile threshold calibration)
  - `test_normal`: 36 recordings
  - `test_anomaly_bearing`: 12 recordings
  - `test_anomaly_rattling`: 12 recordings
  - `test_anomaly_unbalance`: 12 recordings

---

## 5. Automated Verification & Test Coverage Matrix

- **Master Automated Test Runner:** `./scripts/run_all_tests.sh` executes all 4 stages:
  1. Deep Learning Model Artifact checks (PyTorch model, kNN bank, threshold JSON).
  2. MIMII Dataset split integrity checks (216 audio files).
  3. Frontend TypeScript type checking & Vite production build (`tsc -b && vite build`).
  4. Backend Pytest suite (24 tests across API, ML, Audio, Telemetry, and Advanced Features).
- **Test Pass Rate:** **24/24 PASSED (100%)** in 4.26s.
- **Frontend Build Status:** **Zero TypeScript errors**, zero bundle warnings, built in 1.54s.
- **Hardware Dependencies:** **STRICTLY ZERO**. Software-only simulation via Autodesk Tinkercad Circuits reference design and Python Virtual Sensor Bridge.
