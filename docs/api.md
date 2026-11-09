# PulseGuard — REST & WebSocket API Specification

All application endpoints are versioned with the base path `/api/v1`.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a new user account and returns a JWT access token.
- **Request Body:**
  ```json
  {
    "email": "engineer@plant.com",
    "password": "Minimum8Characters!",
    "full_name": "Senior Plant Engineer",
    "role": "engineer"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": "uuid-v4",
    "email": "engineer@plant.com",
    "full_name": "Senior Plant Engineer",
    "role": "engineer"
  }
  ```

### `POST /api/v1/auth/login`
Authenticates existing user credentials and returns a JWT access token.
- **Request Body:**
  ```json
  {
    "email": "demo@pulseguard.ai",
    "password": "IndustrialDemo2026!"
  }
  ```
- **Response (200 OK):** Token object.

### `GET /api/v1/auth/me`
Fetches authenticated user profile from token claims.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** User profile object.

---

## 2. Machine Management Endpoints (`/api/v1/machines`)

### `GET /api/v1/machines`
Lists machines owned by the authenticated tenant.
- **Query Params:** `machine_type` (optional: `fan`, `pump`, `valve`, `slide_rail`)
- **Headers:** `Authorization: Bearer <token>`

### `POST /api/v1/machines`
Registers a new industrial machine asset.
- **Request Body:**
  ```json
  {
    "machine_identifier": "FAN-BAY-05",
    "machine_name": "East Wing Ventilation Blower",
    "machine_type": "fan",
    "description": "5-blade exhaust fan cooling workshop zone C"
  }
  ```
- **Response (201 Created):** Created machine object.

### `PATCH /api/v1/machines/{machine_id}`
Updates machine metadata or operational status.

### `DELETE /api/v1/machines/{machine_id}`
Deletes a machine and cascades to delete all associated analysis history and telemetry logs.

---

## 3. Acoustic Analysis Endpoints (`/api/v1/analyses`)

### `POST /api/v1/analyses`
Uploads an audio recording (multi-part form-data) and runs deep learning inference.
- **Form Data:**
  - `machine_id`: String (UUID)
  - `file`: Binary WAV file (max 15 MB)
- **Response (201 Created):**
  ```json
  {
    "id": "analysis-uuid",
    "machine_id": "machine-uuid",
    "anomaly_score": 42.4,
    "threshold": 0.003104,
    "status": "normal",
    "audio_quality": "valid",
    "model_version": "cae-mimii-v1.0.0",
    "recording_duration": 3.0,
    "recommendation": "Acoustic emissions match expected normal baseline...",
    "metrics": {
      "reconstruction_error": 0.002632,
      "knn_distance": 0.6894,
      "inference_time_ms": 1.54
    }
  }
  ```

### `GET /api/v1/analyses/{analysis_id}/visualizations`
Returns downsampled waveform amplitude arrays and 2D Log-Mel spectrogram preview matrices for canvas/SVG rendering.

### `POST /api/v1/analyses/{analysis_id}/notes`
Appends a physical maintenance inspection note to the analysis record.

---

## 4. IoT Telemetry & Ingestion (`/api/v1/telemetry`)

### `POST /api/v1/telemetry/ingest`
Hardware / bridge ingestion endpoint for Autodesk Tinkercad serial streams and virtual sensor bridges.
- **Headers:** `X-API-KEY: pulseguard-iot-device-secret-key-demo-2026`
- **Request Body:**
  ```json
  {
    "machine_identifier": "FAN-BAY-01",
    "rpm": 2415.0,
    "temperature": 43.1,
    "vibration_indicator": 18.6,
    "operating_status": "running",
    "source": "tinkercad_bridge"
  }
  ```
- **Response (201 Created):** Telemetry record. Broadcasts record to connected WebSocket clients.

### `GET /api/v1/telemetry/machines/{machine_id}/health-fusion`
Returns explainable multi-sensor health assessment combining deep learning acoustic anomaly scores with telemetry deviations.

### `WebSocket /api/v1/telemetry/ws/{machine_id}`
Real-time WebSocket connection streaming live telemetry updates directly to connected browser dashboards.

---

## 5. Model Specs & Dashboard (`/api/v1/model`, `/api/v1/dashboard`)

### `GET /api/v1/model/info`
Returns active model architecture details, latent dimensions, preprocessing specifications, and calibrated threshold matrices.

### `GET /api/v1/dashboard/summary`
Returns aggregated metrics (total assets, analyses, normal, warning, critical counts, and recent activity).

### `GET /api/v1/reports/export`
Exports historical analysis records as a standard CSV file for enterprise auditing.
