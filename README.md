# PulseGuard — Deep Learning Industrial Acoustic Anomaly Detection & Predictive Maintenance System

[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-v2.2+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Autodesk Tinkercad](https://img.shields.io/badge/Tinkercad-IoT_Simulation-005596?logo=autodesk&logoColor=white)](https://tinkercad.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Major Project Domain:** Artificial Intelligence • Deep Learning • Audio Signal Processing • Industrial IoT Software Simulation • Full-Stack Web Development • Cybersecurity

---

## 1. Executive Summary

**PulseGuard** is an industrial predictive maintenance and acoustic anomaly detection platform built entirely using software-based architectures. The system processes operating sounds from industrial rotating machinery (fans, pumps, valves, slide rails), extracts 128-band Log-Mel spectrograms, and executes unsupervised **Convolutional Autoencoder (CAE)** reconstruction alongside a **k-Nearest Neighbors (kNN)** latent embedding baseline.

By comparing reconstruction residuals against calibrated validation thresholds, PulseGuard detects mechanical degradation (bearing friction, blade unbalance, shaft misalignment, cavitation) before physical failure occurs. Concurrently, it models an industrial IoT sensor environment using **Autodesk Tinkercad Circuits** (Arduino Uno + TMP36 + potentiometer vibration proxy + tachometer) and streams live telemetry via WebSockets and REST without requiring physical hardware.

---

## 2. Key Architectural Features

- **Standardized Log-Mel Acoustic Pipeline:**
  - 16,000 Hz polyphase resampling, 1024-point Hann window STFT, 512-sample hop size, 128 Mel-scale filter banks (0–8,000 Hz).
  - Robust audio validation: PCM WAV format verification, file size limits (15 MB), RMS energy silence detection, and amplitude clipping guards.
- **Unsupervised Deep Learning Engine:**
  - **Primary Model:** 4-stage 2D Convolutional Autoencoder with symmetrical transposed convolutions and a 64-dimensional latent bottleneck.
  - **Loss Function:** Mean Squared Error (MSE) on normalized Log-Mel spectrograms.
  - **Secondary Baseline:** kNN latent embedding distance to verify acoustic cluster separation.
  - **Threshold Calibration:** Calibrated using 90th (Warning) and 99th (Critical) percentiles strictly on normal validation soundscapes.
  - **Held-out Benchmark:** **ROC-AUC: 1.0000**, **PR-AUC: 1.0000**, **F1-Score: 0.9091**, Average Inference Latency: **1.54 ms**.
- **Software-Only Industrial IoT Simulation:**
  - Complete Autodesk Tinkercad Circuits reference schematic (Arduino Uno, TMP36 temperature, potentiometer vibration proxy, tachometer pulses).
  - Decoupled Python Virtual Sensor Bridge (`iot/bridge/virtual_sensor_bridge.py`) streaming authenticated telemetry via REST and WebSockets.
  - Explainable Multi-Sensor Health Fusion Engine combining acoustic anomaly scores with telemetry evidence.
- **Industrial SaaS UI/UX:**
  - Polished dark industrial theme (`#070a0f`, `#0b0f17`, `#111827`) with cyan accents.
  - Integrated with **Skiper UI** animated link components (`@skiper-ui/skiper40`).
  - Interactive spectrogram heatmaps, audio waveform visualizers, real-time Recharts sensor streams, and CSV report export.
- **Cybersecurity & Data Governance:**
  - Multi-tenant data isolation (`user_id` enforced on all ORM queries).
  - Stateless JWT authentication with salted bcrypt password hashing.
  - Separate `X-API-KEY` device header verification for IoT streams.
  - In-memory audio parsing eliminating temporary file vulnerability vectors.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Skiper UI, Lucide React, Recharts, TanStack Query |
| **Backend** | Python 3.14 / 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn, WebSockets, Pytest |
| **Deep Learning** | PyTorch, SciPy, NumPy, Scikit-learn, Pandas |
| **IoT Simulation** | Autodesk Tinkercad Circuits (Arduino C++), Python Virtual Sensor Bridge |
| **Database** | SQLite (Local Development) / PostgreSQL & Supabase (Production) |
| **Deployment** | Vercel (Frontend), Render (FastAPI Backend Container) |

---

## 4. Quickstart Guide

### 4.1 Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- Git

### 4.2 Backend Installation & Boot

```bash
# 1. Clone repository
git clone https://github.com/shalabksr23/PULSEGUARD.git
cd PULSEGUARD

# 2. Install backend dependencies
python3 -m pip install -r backend/requirements.txt

# 3. Train model & calibrate thresholds (if not already trained)
PYTHONPATH=. python3 training/scripts/train_autoencoder.py

# 4. Run automated test suite
PYTHONPATH=. python3 -m pytest backend/tests -v

# 5. Start FastAPI Backend Server
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend interactive API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4.3 Frontend Installation & Boot

```bash
# In a new terminal window
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

Frontend application will be accessible at: [http://localhost:5173](http://localhost:5173)

---

## 5. Demonstration Credentials

For instant platform evaluation, the database auto-seeds a pre-configured industrial engineer account:

- **Email:** `demo@pulseguard.ai`
- **Password:** `IndustrialDemo2026!`
- *(Or click the "One-Click Demo Access" button directly on the login screen)*

Pre-seeded Assets:
1. `FAN-BAY-01` — Primary Aeration Blower Fan #1 (Fan)
2. `PUMP-LINE-02` — Centrifugal Slurry Coolant Pump (Pump)
3. `VALVE-CHAMBER-03` — Pneumatic Solenoid Valve (Valve)
4. `SLIDE-RAIL-04` — Precision CNC Linear Guideway Rail (Slide Rail)

---

## 6. Autodesk Tinkercad Circuits Simulation

To run the virtual microcontroller simulation:
1. Open [Autodesk Tinkercad Circuits](https://www.tinkercad.com/).
2. Create an Arduino Uno circuit with a TMP36 (Pin A0), Potentiometer (Pin A1), Tachometer switch (Pin D2), and status LEDs.
3. Paste the code from `iot/tinkercad/arduino_firmware.ino` into the code editor.
4. Launch the local Python bridge to feed the stream into PulseGuard:
   ```bash
   PYTHONPATH=. python3 iot/bridge/virtual_sensor_bridge.py --machine FAN-BAY-01 --scenario normal
   ```
5. Observe live telemetry, WebSocket streams, and health fusion assessment update in real time on the dashboard!

---

## 7. Project Documentation Directory

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — High-level architecture and system flowcharts
- [`docs/methodology.md`](docs/methodology.md) — Deep learning formulation, loss equations, and threshold calibration
- [`docs/dataset.md`](docs/dataset.md) — MIMII dataset description and acoustic preprocessing standards
- [`docs/api.md`](docs/api.md) — Full REST and WebSocket API endpoint documentation
- [`docs/SECURITY.md`](docs/SECURITY.md) — Cybersecurity controls, threat model (STRIDE), and mitigations
- [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) — Academic major project report outline and viva defense guide
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — Phase-by-phase implementation verification log

---

## 8. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
