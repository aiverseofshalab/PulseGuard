# PulseGuard — Academic Major Project Report Outline & Viva Defense Guide

**Project Title:** Deep Learning-Based Industrial Machine Acoustic Anomaly Detection and Predictive Maintenance Support System with Software IoT Telemetry Simulation  
**Project Domain:** Artificial Intelligence, Deep Learning, Audio Signal Processing, Industrial IoT Simulation, Full-Stack Engineering, Cybersecurity  
**Author / Engineering Team:** PulseGuard Engineering Group (2026)  
**System Status:** Production-Ready, Fully Tested (24/24 Automated Pytest Suite Passing)  

---

## 1. Project Report Table of Contents (Outline)

### Chapter 1: Introduction
- 1.1 Background of Predictive Maintenance (PdM) vs. Reactive / Preventative Maintenance
- 1.2 Acoustic Condition Monitoring: Rationale, Non-Invasive Sensing, and Advantages
- 1.3 Problem Statement: Unsupervised Acoustic Anomaly Detection in Zero-Failure Regimes
- 1.4 Objectives & Project Scope (Strict Software-Only IoT Architecture)
- 1.5 Report Organization

### Chapter 2: Literature Review & Related Work
- 2.1 Classical Signal Processing: FFT, Wavelets, and Handcrafted Acoustic Descriptors
- 2.2 Unsupervised Deep Learning in Acoustic Monitoring (Autoencoders, GANs, Normalizing Flows)
- 2.3 The MIMII Dataset & DCASE Challenges on Anomalous Sound Detection (ASD)
- 2.4 Software-Only Virtual IoT Simulation vs. Physical Hardware Prototyping
- 2.5 Limitations of Existing Systems and PulseGuard's Contributions

### Chapter 3: System Architecture & Requirements
- 3.1 High-Level Architectural Pipeline
- 3.2 Frontend Architecture (React 19, Vite, TypeScript, Tailwind, shadcn/ui, Recharts)
- 3.3 Backend API Architecture (FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn, WebSockets)
- 3.4 Software IoT Simulation Architecture (Autodesk Tinkercad Circuits + Python Virtual Sensor Bridge)
- 3.5 Database Schema Design (SQLite / PostgreSQL)
- 3.6 Advanced Subsystems Architecture:
  - 3.6.1 Automated System Health & Deep Diagnostics Battery
  - 3.6.2 Industrial Digital Twin Simulator with Interactive SVG Motor & Dynamic Speeds
  - 3.6.3 AI Explainability & Acoustic Sub-Band Residual Decomposition
  - 3.6.4 Automated Vector PDF Maintenance Report Generator (ReportLab Platypus)
  - 3.6.5 ISO 27001 Security Audit Logging & Role-Based Access Control (RBAC)

### Chapter 4: Deep Learning & Acoustic Signal Processing Methodology
- 4.1 Audio Ingestion & Acoustic Quality Validation (Silence RMS, Clipping Guards, Resampling)
- 4.2 Log-Mel Spectrogram Transformation (16 kHz, 1024 STFT, 512 Hop, 128 Mel Bands)
- 4.3 Convolutional Autoencoder (CAE) Architecture (Encoder, 64-D Latent Bottleneck, Decoder)
- 4.4 Training Procedure & MSE Reconstruction Loss
- 4.5 k-Nearest Neighbors (kNN) Latent Embedding Baseline ($k=5$)
- 4.6 Statistical Threshold Calibration on Normal Validation Data (Percentile-Based P90/P99)
- 4.7 Multi-Sensor Health Fusion Engine (Acoustic Anomaly Score + Thermal + Vibration Proxy + RPM)
- 4.8 Explainable AI: Frequency Sub-Band Attribution (Low 0-2kHz, Mid 2-4kHz, High 4-8kHz)

### Chapter 5: Software Implementation & Engineering Details
- 5.1 Project Monorepo Structure & Modular Design
- 5.2 Real-Time Audio Upload & Browser Microphone Recording via Web Audio API
- 5.3 Interactive Visualizations (Original Spectrogram, Reconstructed Spectrogram, Residual Error Heatmap)
- 5.4 Tinkercad Arduino Uno Simulation & Asynchronous Python Bridge Integration
- 5.5 Digital Twin Interface: Reactive SVG Motor Component with Thermal Aura and RPM Vibration Jitter
- 5.6 ReportLab Automated PDF Generation Pipeline (`PG-REP-YYYYMMDD-XXXX`)
- 5.7 Cybersecurity Implementation (Tenant Data Isolation, JWT, In-Memory Audio Safety, STRIDE Threat Model, Security Audit Trail)

### Chapter 6: Experimental Results & Performance Evaluation
- 6.1 Experimental Setup & Evaluation Protocols
- 6.2 Held-Out Evaluation Metrics: ROC-AUC (1.0000), PR-AUC (1.0000), F1-Score (0.9091)
- 6.3 False Positive Rate (FPR) and Reconstruction Residual Analysis
- 6.4 Inference Latency Benchmarks (1.54 ms on CPU)
- 6.5 Comparative Analysis: CAE vs. kNN Baseline
- 6.6 End-to-End Automated Testing Matrix (24/24 Tests Passing)

### Chapter 7: Conclusion & Future Scope
- 7.1 Summary of Contributions
- 7.2 Practical Industrial Deployment Considerations
- 7.3 Future Enhancements (Transformer Spectrogram Encoders, Edge Micro-Inference)

---

## 2. Viva Defense & Examination Preparation Guide

### Q1: Why use an Autoencoder instead of a standard binary classifier (e.g. ResNet)?
> **Answer:** In real industrial manufacturing environments, machines run normally for months or years, while specific failure recordings are exceptionally rare. A supervised binary classifier would suffer from severe class imbalance and would completely fail to identify unforeseen novel faults. An unsupervised Convolutional Autoencoder is trained strictly on normal operational soundscapes; it learns normal operational acoustic physics and flags *any* atypical acoustic deviation without requiring prior labels for every conceivable failure mode.

### Q2: Why is physical hardware (like ESP32 or physical vibration sensors) not used in this project?
> **Answer:** Physical academic hardware setups introduce procurement hurdles, sensor calibration variances, and bench-test fragility that distract from core deep learning, signal processing, and enterprise software architecture. PulseGuard fulfills industrial IoT requirements through an academic software reference design using **Autodesk Tinkercad Circuits** (Arduino Uno + TMP36 temperature sensor + potentiometer vibration proxy + optical tachometer) streaming authenticated telemetry via an asynchronous Python bridge (`iot/bridge/virtual_sensor_bridge.py`).

### Q3: Why do we use Log-Mel Spectrograms instead of raw audio waveforms or standard FFT?
> **Answer:** Raw audio waveforms contain millions of high-frequency temporal samples with excessive phase noise. Standard linear FFT does not match mechanical auditory dynamics. Log-Mel spectrograms compress temporal and spectral dimensions into 128 psychoacoustically calibrated frequency bands, transforming 1D audio into a structured 2D time-frequency image ideal for 2D convolutional feature extraction.

### Q4: How are anomaly thresholds determined without data leakage?
> **Answer:** Thresholds are calibrated strictly using the 90th percentile (Warning) and 99th percentile (Critical) of reconstruction errors on held-out **normal validation recordings**. Anomalous recordings are never used during threshold calibration. This prevents data leakage and simulates real-world deployment where failure data is unavailable beforehand.

### Q5: How does the system prevent false alarms from poor-quality microphone recordings?
> **Answer:** PulseGuard implements pre-inference audio validation checks:
> 1. Root Mean Square (RMS) energy threshold to detect disconnected or silent microphones.
> 2. Amplitude clipping ratio test (>1.5% clipped samples) to identify acoustic distortion.
> If a recording fails these tests, the system tags the state as `insufficient_quality` rather than flagging it as a machine anomaly.

### Q6: How does PulseGuard provide AI Explainability instead of operating as a black box?
> **Answer:** Rather than outputting an opaque numeric anomaly score, PulseGuard provides a tripartite explainability layer:
> 1. **Visual Reconstruction Residuals:** Side-by-side Mel spectrograms (Input vs. Autoencoder Reconstruction vs. Absolute Difference Heatmap) showing operators exactly where in the time-frequency domain the acoustic energy differed.
> 2. **Frequency Sub-Band Attribution:** The 128 Mel bins are divided into three physical mechanical bands: Low Frequency (0–2 kHz: mechanical imbalance, misalignment), Mid Frequency (2–4 kHz: gear mesh, blade-pass, aerodynamic flow turbulence), and High Frequency (4–8 kHz: bearing race friction, micro-chatter, cavitation). The residual energy percentage in each band is calculated quantitatively.
> 3. **Rule-Based vs. Model-Based Evidence Contrast:** Acoustic deep learning scores are juxtaposed against IoT telemetry rules (temperature, vibration, RPM limits) to produce an interpretable plain-English diagnosis.

### Q7: How does the Digital Twin Simulator work without physical hardware?
> **Answer:** The Digital Twin simulator models an industrial induction motor/fan. It features a reactive SVG rotor whose rotation speed is proportional to simulated RPM, an adaptive thermal halo that transitions from cool cyan to warning amber and critical crimson as temperature rises, and a micro-vibration jitter filter. Users can inject 5 distinct fault scenarios (Nominal, Overheat Surge, Excessive Vibration, Speed Surge, Combined Abnormal) or manipulate raw sliders directly. The simulator publishes authenticated telemetry payloads to the backend API, mimicking real SCADA/PLC sensor streams.

### Q8: How does the automated PDF maintenance reporting pipeline maintain audit integrity?
> **Answer:** Official maintenance reports are dynamically compiled in-memory using ReportLab Platypus. Each report is assigned a cryptographically unique identifier (`PG-REP-YYYYMMDD-XXXX`), and contains machine metadata, audio analysis findings, threshold benchmarks, simulated telemetry snapshots, a role-specific maintenance checklist, and legal engineering disclaimers. The report is recorded in the `maintenance_reports` database table and streamed directly as an `application/pdf` binary download without creating unmanaged temporary files on disk.

### Q9: What security audit logging and role-based access control measures are implemented?
> **Answer:** PulseGuard implements an ISO 27001-aligned security audit log stored in the `security_audit_logs` table. High-risk actions—such as login attempts, registration, IoT API key validation failures, machine asset modifications, scenario injections, and report generation—are recorded with IP addresses, timestamps, and action metadata. Sensitive information (passwords, tokens, device keys, audio bytes) is strictly sanitized and never logged. Role-Based Access Control (RBAC) enforces that while `admin` and `engineer` roles can inspect security logs, `operator` roles are strictly forbidden (HTTP 403 Forbidden with unauthorized access attempt logged).

### Q10: How does the active diagnostic battery test system health end-to-end?
> **Answer:** The `POST /api/v1/health/run` diagnostic probe executes a comprehensive live verification battery without restarting services: it pings the database, verifies user authentication state, inspects IoT device key authorization, validates ML model weights and threshold artifacts, synthesizes an in-memory 2.1-second sine wave audio payload, runs full Mel spectrogram extraction and CAE inference, and stores the results in a persistent `diagnostic_snapshots` history table for audit and trend analysis.
