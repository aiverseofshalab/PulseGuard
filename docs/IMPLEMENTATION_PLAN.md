# PulseGuard — Detailed Implementation Plan

## Phase 0: Repository Audit & Baseline Verification (Completed)
- [x] Inspect existing workspace (confirmed clean, empty Git repository).
- [x] Audit runtime environment: Node.js v24.14.0, npm 11.9.0, Python 3.14.0, Homebrew available.
- [x] Establish documentation directory and foundation tracking documents (`PROJECT_STATUS.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `DECISIONS.md`).

---

## Phase 1: Architecture & Project Foundation
- [ ] Initialize monorepo directory structure:
  - `frontend/` (Vite, React, TypeScript, Tailwind)
  - `backend/` (FastAPI, Pydantic v2, SQLAlchemy, Uvicorn)
  - `iot/` (Tinkercad circuit diagram specs, Arduino Uno firmware, Virtual Sensor Bridge)
  - `training/` (MIMII loader, preprocessing, CAE training pipeline, kNN evaluator)
  - `experiments/` (Model evaluation metrics, figures)
  - `docs/` (Architecture, security, API specs, datasets)
- [ ] Create root `.gitignore`, `.env.example`, and environment configuration schemas.
- [ ] Setup backend core (`config.py`, database connector with SQLite / PostgreSQL fallback support for local verification, security utilities).
- [ ] Create SQLAlchemy ORM models (`User`, `Machine`, `Analysis`, `AnalysisMetric`, `MachineTelemetry`, `OperatorNote`, `ModelVersion`).
- [ ] Verify backend server boots and passes health checks.

---

## Phase 2: UI Foundation & Design System
- [ ] Scaffold React + Vite + TypeScript frontend.
- [ ] Configure Tailwind CSS with dark industrial SaaS tokens (deep slate/charcoal backgrounds `#0b0f17`, `#111827`, subtle cyan/blue accents `#06b6d4`, `#3b82f6`, industrial amber `#f59e0b`, and alert red `#ef4444`).
- [ ] Install and configure component infrastructure (shadcn/ui, Skiper UI component integration `@skiper-ui/skiper40`, Lucide icons).
- [ ] Build responsive layout:
  - Top navigation bar with system status, active machine indicator, user profile.
  - Collapsible industrial sidebar with routing (`Dashboard`, `Machines`, `Acoustic Analysis`, `Virtual IoT Simulator`, `Historical Trends`, `Reports`).
- [ ] Implement Landing Page (marketing, architectural explanation, deep learning overview, interactive preview, zero-hardware statement).
- [ ] Implement Dashboard Shell with metric summary cards and empty states.

---

## Phase 3: Dataset Preparation & Deep Learning Pipeline
- [ ] Implement audio processing module (`backend/app/ml/preprocessing/audio_processor.py`):
  - Audio validation (WAV format, 16kHz resample, duration 3-10s, RMS silence check, clipping check).
  - Mel spectrogram generation (1024 FFT, 512 hop, 128 Mel bands, dB scaling).
- [ ] Implement MIMII dataset synthetic synthesizer & loader for industrial acoustic simulation (`training/scripts/prepare_mimii_data.py`).
- [ ] Implement Convolutional Autoencoder architecture (`backend/app/ml/architectures/autoencoder.py`):
  - 4-layer 2D CNN encoder + latent bottleneck + 4-layer 2D transposed CNN decoder.
- [ ] Implement training script with MSE reconstruction loss, early stopping, checkpointing (`training/scripts/train_autoencoder.py`).
- [ ] Implement kNN embedding feature baseline (`backend/app/ml/architectures/knn_detector.py`).
- [ ] Calibrate percentile thresholds (Normal 95th/99th percentiles) and package trained model weights and calibration metadata in `backend/app/ml/artifacts/`.
- [ ] Validate ML inference and reproducibility with automated unit tests.

---

## Phase 4: Backend Integration & APIs
- [ ] Create Pydantic v2 schemas for all requests, responses, and paginated collections.
- [ ] Implement `/api/v1/auth` endpoints (Registration, Login, JWT verification, `/me`).
- [ ] Implement `/api/v1/machines` CRUD endpoints with tenant isolation.
- [ ] Implement `/api/v1/analyses` endpoints:
  - Multi-part WAV upload & browser microphone audio processing.
  - Feature extraction, autoencoder reconstruction error calculation, kNN distance score, calibrated threshold comparison.
  - Spectrogram image generation (base64 or data array for UI rendering).
- [ ] Implement `/api/v1/telemetry` & `/api/v1/simulator` endpoints:
  - Ingestion endpoint for IoT sensor bridge (`POST /api/v1/telemetry/ingest`).
  - WebSocket endpoint (`/api/v1/telemetry/ws/{machine_id}`) for live telemetry streaming.
  - Machine simulation scenario controller (Normal, Warning, Overheat, High Vibration, Speed Surge).
- [ ] Implement `/api/v1/reports` for CSV export and audit summaries.

---

## Phase 5: Frontend Functionality & Advanced Visualization
- [ ] Setup TanStack Query for caching and asynchronous state management.
- [ ] Build Machine Management module (Add, Edit, Delete, Filter by Category: Fan, Pump, Valve, Slide Rail).
- [ ] Build Audio Analysis Module:
  - File drag-and-drop WAV uploader.
  - Browser microphone Web Audio API recorder (with live waveform visualizer).
  - Detailed results view: original waveform, input spectrogram, reconstructed spectrogram, residual error map, anomaly score meter, explainable recommendation card.
- [ ] Build Virtual Industrial IoT Module:
  - Tinkercad circuit interactive documentation & schematic viewer.
  - Live telemetry dashboard (RPM gauge, Temperature line chart, Vibration proxy meter).
  - Simulation scenario trigger buttons (Overheat, Bearing Friction, Cavitation, Imbalance).
  - Explainable multi-sensor health fusion (combines audio anomaly score + telemetry deviations).
- [ ] Build Machine History & Trend Analytics module:
  - Interactive anomaly score timeline (Recharts).
  - Repeated warning detection & maintenance recommendation logic.
  - Operator notes annotation modal.
  - CSV report download.

---

## Phase 6: Cybersecurity & Hardening
- [ ] JWT authentication with bcrypt/PBKDF2 password hashing.
- [ ] File upload guards (MIME sniffing, size restrictions, content byte validation).
- [ ] SQL injection prevention via SQLAlchemy parameterized queries.
- [ ] User tenant data isolation enforcement on every database query.
- [ ] Rate limiting on analysis and telemetry ingestion routes.
- [ ] Comprehensive `SECURITY.md` audit report.

---

## Phase 7: System Integration & Automated Testing
- [ ] Backend test suite:
  - Audio preprocessing & feature extraction tests (`test_audio.py`).
  - Model inference & threshold scoring tests (`test_ml.py`).
  - Machine & analysis API integration tests (`test_api.py`).
  - Telemetry ingestion & simulation tests (`test_telemetry.py`).
- [ ] Frontend build verification (`npm run build`, TypeScript checking).
- [ ] End-to-end user workflow validation.

---

## Phase 8: Deployment & Production Preparation
- [ ] Dockerfile for backend containerization.
- [ ] Render / Vercel deployment configurations.
- [ ] Production environment variable validation.
- [ ] Database migration scripts and initial seed data.

---

## Phase 9: Final Documentation & Academic Major Project Deliverables
- [ ] Comprehensive `README.md` with system overview, architecture, quickstart, and demo credentials.
- [ ] `docs/dataset.md` (MIMII industrial dataset details, spectrogram parameters).
- [ ] `docs/methodology.md` (Deep learning formulation, autoencoder loss, threshold calibration).
- [ ] `docs/api.md` (OpenAPI specification & endpoint documentation).
- [ ] `docs/iot_simulation.md` (Tinkercad circuit diagram, Arduino Uno C++ code, virtual bridge architecture).
- [ ] `docs/PROJECT_REPORT.md` (Major project report outline and viva defense guide).
