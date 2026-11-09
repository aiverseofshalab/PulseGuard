# PulseGuard — Academic Major Project Report Outline & Viva Defense Guide

**Project Title:** Deep Learning-Based Industrial Machine Acoustic Anomaly Detection and Predictive Maintenance Support System with Software IoT Telemetry Simulation  
**Project Domain:** Artificial Intelligence, Deep Learning, Audio Signal Processing, Industrial IoT Simulation, Full-Stack Engineering, Cybersecurity  
**Author / Engineering Team:** PulseGuard Engineering Group (2026)

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
- 3.2 Frontend Architecture (React, Vite, TypeScript, Tailwind, shadcn/ui, Skiper UI)
- 3.3 Backend API Architecture (FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn, WebSockets)
- 3.4 Software IoT Simulation Architecture (Autodesk Tinkercad Circuits + Python Virtual Sensor Bridge)
- 3.5 Database Schema Design (PostgreSQL / SQLite)

### Chapter 4: Deep Learning & Acoustic Signal Processing Methodology
- 4.1 Audio Ingestion & Acoustic Quality Validation (Silence RMS, Clipping Guards, Resampling)
- 4.2 Log-Mel Spectrogram Transformation (16 kHz, 1024 STFT, 512 Hop, 128 Mel Bands)
- 4.3 Convolutional Autoencoder (CAE) Architecture (Encoder, 64-D Latent Bottleneck, Decoder)
- 4.4 Training Procedure & MSE Reconstruction Loss
- 4.5 k-Nearest Neighbors (kNN) Latent Embedding Baseline
- 4.6 Statistical Threshold Calibration on Normal Validation Data (Percentile-Based)
- 4.7 Multi-Sensor Health Fusion Engine (Acoustic Score + Thermal + Vibration Proxy + RPM)

### Chapter 5: Software Implementation & Engineering Details
- 5.1 Project Monorepo Structure & Modular Design
- 5.2 Real-Time Audio Upload & Browser Microphone Recording via Web Audio API
- 5.3 Interactive Visualizations (Original Spectrogram, Reconstructed Spectrogram, Residual Error Heatmap)
- 5.4 Tinkercad Arduino Uno Simulation & Python Bridge Integration
- 5.5 Cybersecurity Implementation (Tenant Data Isolation, JWT, In-Memory Audio Safety, STRIDE Threat Model)

### Chapter 6: Experimental Results & Performance Evaluation
- 6.1 Experimental Setup & Evaluation Protocols
- 6.2 Held-Out Evaluation Metrics: ROC-AUC (1.0000), PR-AUC (1.0000), F1-Score (0.9091)
- 6.3 False Positive Rate (FPR) and Reconstruction Residual Analysis
- 6.4 Inference Latency Benchmarks (1.54 ms on CPU)
- 6.5 Comparative Analysis: CAE vs. kNN Baseline

### Chapter 7: Conclusion & Future Scope
- 7.1 Summary of Contributions
- 7.2 Practical Industrial Deployment Considerations
- 7.3 Future Enhancements (Transformer Spectrogram Encoders, Edge Micro-Inference)

---

## 2. Viva Defense & Examination Preparation Guide

### Q1: Why use an Autoencoder instead of a standard binary classifier (e.g. ResNet)?
> **Answer:** In real industrial environments, machines run normally for months or years, while specific failure recordings are exceptionally rare. A binary classifier would suffer from severe class imbalance and would completely fail to identify unforeseen novel faults. An unsupervised Convolutional Autoencoder is trained strictly on normal soundscapes; it learns normal operational physics and flags *any* atypical acoustic deviation without requiring prior labels for every conceivable failure mode.

### Q2: Why is physical hardware (like ESP32 or physical vibration sensors) not used in this project?
> **Answer:** Physical academic hardware setups introduce procurement hurdles, calibration variances, and bench-test fragility that distract from core deep learning and software architecture. PulseGuard fulfills industrial IoT requirements through an academic software reference design using **Autodesk Tinkercad Circuits** (Arduino Uno + TMP36 + potentiometer vibration proxy + optical tachometer) streaming authenticated telemetry via an asynchronous Python bridge.

### Q3: Why do we use Log-Mel Spectrograms instead of raw audio waveforms or standard FFT?
> **Answer:** Raw audio waveforms contain millions of high-frequency temporal samples with excessive phase noise. Standard linear FFT does not match mechanical auditory dynamics. Log-Mel spectrograms compress temporal and spectral dimensions into 128 psychoacoustically calibrated frequency bands, transforming 1D audio into a structured 2D time-frequency image ideal for 2D convolutional feature extraction.

### Q4: How are anomaly thresholds determined without data leakage?
> **Answer:** Thresholds are calibrated strictly using the 90th percentile (Warning) and 99th percentile (Critical) of reconstruction errors on held-out **normal validation recordings**. Anomalous recordings are never used during threshold calibration. This prevents over-fitting and simulates real-world deployment where failure data is unavailable beforehand.

### Q5: How does the system prevent false alarms from poor-quality microphone recordings?
> **Answer:** PulseGuard implements pre-inference audio validation checks:
> 1. Root Mean Square (RMS) energy threshold to detect disconnected or silent microphones.
> 2. Amplitude clipping ratio test (>1.5% clipped samples) to identify acoustic distortion.
> If a recording fails these tests, the system tags the state as `insufficient_quality` rather than flagging it as a machine anomaly.
