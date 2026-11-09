# PulseGuard — Architecture Decision Records (ADR)

## ADR 001: Pure Software-Only IoT Simulation Architecture
- **Context:** The project requires industrial IoT monitoring of machine telemetry (temperature, vibration, RPM, operating status), but physical microcontrollers/sensors (ESP32, Arduino, MPU6050) are explicitly prohibited.
- **Decision:** Use Autodesk Tinkercad Circuits as the virtual hardware reference design (Arduino Uno + TMP36 + potentiometer vibration proxy + pulse tachometer) coupled with an asynchronous Python Virtual Sensor Bridge (`iot/bridge/virtual_sensor_bridge.py`). The bridge streams simulated telemetry to FastAPI via REST and WebSockets.
- **Consequences:** Eliminates hardware costs and physical lab dependencies; ensures deterministic, repeatable academic demonstrations; preserves full architectural fidelity of real-world industrial IoT data pipelines.

---

## ADR 002: Dual Acoustic Anomaly Detection (CAE + kNN Baseline)
- **Context:** Machine condition monitoring relies primarily on acoustic emissions. True positive anomalies must be identified without requiring large labeled sets of rare fault recordings.
- **Decision:** Implement unsupervised Convolutional Autoencoders (CAE) as the primary anomaly detector (trained solely on normal operating acoustic soundscapes) using log-Mel spectrograms. Pair this with a kNN latent embedding distance baseline to benchmark reconstruction residuals against nearest normal neighbors.
- **Consequences:** Unsupervised learning matches industrial reality where fault data is scarce. Calibrated percentile thresholds (95th/99th percentiles) prevent subjective decision boundaries.

---

## ADR 003: Hybrid Database Support (PostgreSQL / Supabase with Local SQLite Fallback)
- **Context:** Production deployment targets Supabase PostgreSQL, but the system must run reliably in local offline environments and automated CI/CD test runners without requiring an active external database connection.
- **Decision:** Use SQLAlchemy with dynamic database URL resolution: defaults to `sqlite:///./pulseguard.db` in development/testing if `DATABASE_URL` is unset or points to SQLite, while seamlessly connecting to Supabase PostgreSQL in staging/production.
- **Consequences:** Zero-friction local startup and instant test suite execution while maintaining 100% production compatibility with PostgreSQL schema and migrations.

---

## ADR 004: Audio Preprocessing Standardization
- **Context:** Spectral representations must remain identical across offline dataset training and real-time browser/API inference.
- **Decision:** Standardize on:
  - Audio sampling rate: 16,000 Hz (mono).
  - STFT Window: Hann window, 1024 points.
  - Hop length: 512 samples.
  - Mel Filterbank: 128 Mel bands spanning 0 Hz to 8,000 Hz.
  - Power Scale: Log-Mel scale normalized to [-80 dB, 0 dB] and scaled to [0, 1].
- **Consequences:** Ensures numerical consistency between training representations and inference inputs; eliminates data leakage and distribution shift.

---

## ADR 005: Explainable Multi-Modal Health Assessment
- **Context:** Combining audio anomaly scores with simulated IoT telemetry could easily lead to misleading claims if not properly decoupled.
- **Decision:** The audio acoustic anomaly score remains the authoritative primary deep-learning metric. IoT sensor readings (temperature, vibration proxy, RPM) act as complementary contextual evidence. The diagnostic engine outputs a transparent, rule-based explanation detailing exact contributions from acoustic residuals vs. telemetry deviations.
- **Consequences:** Prevents false claims of failure probability while delivering actionable, explainable maintenance recommendations for plant engineers.
