# PulseGuard — Known Issues, Limitations & Operating Considerations

This document catalogues known platform constraints, intentional architectural boundaries, and operational considerations.

---

## 1. Architectural Boundaries & Non-Goals

### 1.1 Strict Software-Only Design (No Physical Hardware)
- **Constraint:** Physical microcontrollers (e.g. physical ESP32, physical Arduino Uno, physical MPU6050 accelerometers) are intentionally not supported or connected.
- **Rationale:** Compliance with project master specification. All IoT functionality is simulated through the Autodesk Tinkercad Circuits reference design (`iot/tinkercad/arduino_firmware.ino`) and the Python Virtual Sensor Bridge (`iot/bridge/virtual_sensor_bridge.py`).
- **User Notice:** Telemetry readings (RPM, temperature, vibration) are clearly labeled as **"Simulated Telemetry"** across all UI tables, cards, and export CSVs.

### 1.2 Decision Support Disclaimer (Not Certified Fault Diagnosis)
- **Constraint:** Anomaly scores ($0 - 100$) represent the mathematical reconstruction error and embedding distance from healthy machine baseline audio. They **do not** represent a probability of mechanical failure or certify industrial equipment safety.
- **Mitigation:** The application includes persistent disclaimer badges and human-in-the-loop review capabilities (operator note logging).

---

## 2. Browser & Environment Nuances

### 2.1 Browser Microphone Permissions
- **Issue:** The browser microphone feature in the Audio Analyzer uses the Web Audio API (`navigator.mediaDevices.getUserMedia`).
- **Requirement:** Modern browsers (Chrome, Firefox, Safari) enforce security restrictions where microphone access is strictly restricted to secure contexts (`https://` or `http://localhost`).
- **Workaround:** If accessing from a remote IP (e.g., `http://192.168.x.x:5173`), microphone recording will be disabled by the browser. In that scenario, use the **Upload WAV File** mode or test with the preloaded MIMII demo samples.

### 2.2 macOS IPv6 Localhost Discrepancy
- **Issue:** On macOS systems, Node.js and Vite default to binding on IPv6 (`:::5173`), causing web browsers to submit requests with `Origin: http://[::1]:5173`.
- **Mitigation:** PulseGuard backend configuration has an explicit regex CORS policy (`allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"`) and Vite uses a local dev reverse proxy (`/api` -> `http://127.0.0.1:8000`) to guarantee cross-origin immunity.

### 2.3 Cloud Hosting Cold Starts (Render / Supabase Free Tier)
- **Issue:** When deployed on free-tier web hosting (e.g., Render free instance), the service may spin down after 15 minutes of inactivity. The initial HTTP request may experience a 30-50 second delay while the container starts and loads PyTorch model weights into memory.
- **Mitigation:** The frontend Diagnostics page (`/diagnostics`) detects cold-start states and provides a countdown/retry banner instead of an error crash.

---

## 3. Audio Processing Considerations

### 3.1 Audio File Duration
- **Recommendation:** Machine audio recordings between 2.0 and 10.0 seconds provide the most reliable spectrogram representation.
- **Behavior:** Files shorter than 1.0 second are rejected with a structured HTTP 400 error. Files longer than 15 MB are rejected to prevent server memory saturation.

### 3.2 Acoustic Quality Flags
- **Silent Audio:** Audio with RMS energy below $-50\text{ dBFS}$ is flagged with `silent` status. The anomaly score is suppressed.
- **Clipped Audio:** Audio with more than 1% saturated digital samples is flagged with `clipped` status to prevent artificial harmonic reconstruction distortion.

