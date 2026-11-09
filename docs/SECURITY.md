# PulseGuard — Cybersecurity & Threat Model Documentation

## 1. Security Architecture Overview

PulseGuard is designed with defence-in-depth across the API, machine learning inference engine, database repository, and IoT telemetry ingestion layers. The application handles acoustic audio recordings and simulated sensor telemetry; strict isolation safeguards are implemented to prevent data contamination, tenant enumeration, unauthorized access, and resource exhaustion.

---

## 2. Implemented Security Controls

### 2.1 Authentication & Session Management
- **Stateless JWT Tokens:** Bearer tokens are signed using HMAC-SHA256 (`HS256`) with a cryptographically secure, user-configurable `SECRET_KEY`.
- **Password Hashing:** Passwords are salted and hashed using standard `bcrypt` with automatic work factor derivation. Plaintext passwords are never logged or stored.
- **Credential Separation:** IoT ingestion uses a dedicated device API key (`X-API-KEY`) verified in `verify_iot_api_key`, decoupled from user JWT authentication.

### 2.2 Multi-Tenant Data Isolation
- **Row-Level Tenant Boundary:** Every database query for machines, analyses, and operator notes filters strictly on `user_id == current_user.id`.
- **Enumeration Prevention:** Attempting to query an asset ID belonging to another user returns a clean `404 Not Found` rather than a `403 Forbidden`, preventing resource ID enumeration.

### 2.3 Audio Upload & Memory Safety
- **Magic Byte Verification:** The ingestion parser checks for `RIFF....WAVE` signatures within the first 44 bytes of the binary payload. Arbitrary binary files or scripts disguised as audio are immediately rejected with `400 Bad Request`.
- **File Size Caps:** Upload size is bounded at 15 MB in FastAPI endpoint guards, preventing memory exhaustion and denial-of-service (DoS) attacks.
- **In-Memory Streaming:** Audio is decoded directly from memory buffers using Python's standard `wave` and `io.BytesIO`. Temporary audio files are not written to shared system directories, eliminating local file inclusion (LFI) and symlink race conditions.
- **Acoustic Integrity Checks:** Before running deep learning models, the audio processor runs RMS energy tests and clipping ratios (>1.5% clipped samples). Degraded recordings are tagged as `insufficient_quality` rather than generating false anomaly alerts.

### 2.4 SQL Injection & Database Hardening
- **Parameterized Queries:** All database interactions are executed through SQLAlchemy ORM, ensuring parameter binding and neutralizing SQL injection vectors.
- **Foreign Key Cascades:** Database constraints enforce referential integrity (`ondelete="CASCADE"`).

### 2.5 Cross-Origin Resource Sharing (CORS) & Headers
- **CORS Restriction:** Only explicitly whitelisted client origins (`ALLOWED_ORIGINS`) are permitted to execute cross-origin requests.
- **Exception Sanitization:** A centralized FastAPI global exception handler logs full stack traces internally to secure logger sinks while returning generic, safe error payloads to clients (`Internal server error. Incident logged.`).

---

## 3. Threat Model & Mitigations (STRIDE Matrix)

| Threat Category | Potential Attack Vector | PulseGuard Mitigation |
|---|---|---|
| **Spoofing** | Forged JWT token or unauthorized IoT telemetry | Cryptographically signed JWT tokens with expiration; separate `X-API-KEY` device header for telemetry streams. |
| **Tampering** | Corrupt audio payload injection | In-memory wave validation, magic byte checks, and float normalization to `[-1.0, 1.0]`. |
| **Repudiation** | Operator denying inspection action | Immutable analysis records with timestamps, model versions, and annotated operator notes. |
| **Information Disclosure** | Cross-tenant asset inspection | Mandatory `user_id` filtering on all machine and analysis queries; stripped error messages. |
| **Denial of Service** | Gigabyte-sized WAV file upload | 15 MB file size limit enforced before audio decoding; batch size constraints on model inference. |
| **Elevation of Privilege** | Normal operator attempting administrative reconfiguration | Role-based permission checks stored in JWT claims (`role: operator | engineer | admin`). |

---

## 4. Operational Recommendations for Production

1. Enforce HTTPS / TLS 1.3 on reverse proxies (e.g. Render / Cloudflare).
2. Set `SECRET_KEY` and `IOT_API_KEY` to high-entropy strings (minimum 64 hex characters) generated via `openssl rand -hex 32`.
3. Configure rate-limiting filters (e.g. `slowapi` or Cloudflare WAF) on `POST /api/v1/analyses` to limit audio uploads to 20 requests per minute per IP.

