# PulseGuard — Cybersecurity & Threat Model Documentation

## 1. Security Architecture Overview

PulseGuard is engineered with defence-in-depth across the API gateway, deep learning inference engine, database repository, IoT telemetry ingestion bridge, and security audit layer. The application handles acoustic audio recordings and simulated sensor telemetry; strict isolation safeguards are implemented to prevent data contamination, tenant enumeration, unauthorized privilege escalation, and resource exhaustion.

---

## 2. Implemented Security Controls

### 2.1 Authentication & Session Management
- **Stateless JWT Tokens:** Bearer tokens are signed using HMAC-SHA256 (`HS256`) with a cryptographically secure, user-configurable `SECRET_KEY`.
- **Password Hashing:** Passwords are salted and hashed using standard `bcrypt` with automatic work factor derivation. Plaintext passwords are never logged or stored.
- **Credential Separation:** IoT ingestion uses a dedicated device API key (`X-API-KEY`) verified in `verify_iot_api_key`, decoupled from user JWT authentication.

### 2.2 Multi-Tenant Data Isolation & RBAC
- **Row-Level Tenant Boundary:** Every database query for machines, analyses, and operator notes filters strictly on `user_id == current_user.id`.
- **Enumeration Prevention:** Attempting to query an asset ID belonging to another user returns a clean `404 Not Found` rather than a `403 Forbidden`, preventing resource ID enumeration.
- **Role-Based Access Control (RBAC):**
  - `admin`: Full administrative access, user management, and security audit log inspection.
  - `engineer`: Diagnostic execution, digital twin scenario injection, analysis report generation, and security audit viewing.
  - `operator`: Routine operational monitoring, audio analysis execution, and report downloading. **Operator access to `/security-audit` is strictly blocked with HTTP 403 Forbidden**.

### 2.3 Audio Upload & Memory Safety
- **Magic Byte Verification:** The ingestion parser checks for `RIFF....WAVE` signatures within the first 44 bytes of the binary payload. Arbitrary binary files or scripts disguised as audio are immediately rejected with `400 Bad Request`.
- **File Size Caps:** Upload size is bounded at 15 MB in FastAPI endpoint guards, preventing memory exhaustion and denial-of-service (DoS) attacks.
- **In-Memory Streaming:** Audio is decoded directly from memory buffers using Python's standard `wave` and `io.BytesIO`. Temporary audio files are not written to shared system directories, eliminating local file inclusion (LFI) and symlink race conditions.
- **Acoustic Integrity Checks:** Before running deep learning models, the audio processor runs RMS energy tests and clipping ratios (>1.5% clipped samples). Degraded recordings are tagged as `insufficient_quality` rather than generating false anomaly alerts.

### 2.4 SQL Injection & Database Hardening
- **Parameterized Queries:** All database interactions are executed through SQLAlchemy ORM, ensuring parameter binding and neutralizing SQL injection vectors.
- **Foreign Key Cascades:** Database constraints enforce referential integrity (`ondelete="CASCADE"`).

### 2.5 Cross-Origin Resource Sharing (CORS) & Error Sanitization
- **CORS Restriction:** Only explicitly whitelisted client origins (`ALLOWED_ORIGINS` including IPv4 and IPv6 localhost loopbacks) are permitted.
- **Exception Sanitization:** A centralized FastAPI global exception handler logs full stack traces internally to secure logger sinks while returning generic, safe error payloads to clients (`Internal server error. Incident logged.`).
- **Request Tracing:** Unique `X-Request-ID` and timing headers accompany every HTTP transaction for incident forensics.

### 2.6 Comprehensive Security Audit Logging Subsystem
PulseGuard maintains a persistent, tamper-evident security audit log stored in the `security_audit_logs` table (`SecurityAuditLog` model).

#### Event Taxonomy
The audit logger captures high-risk security, authentication, and state-altering operational events:
- `auth_login_success`: Successful operator/engineer/admin authentication.
- `auth_login_failed`: Bad password or non-existent account attempts (recording target email and client IP).
- `auth_register_success`: Registration of new user accounts.
- `auth_unauthorized_access`: Unauthorized access attempt to privileged routes (e.g. operator querying `/audit/logs`).
- `iot_api_key_invalid`: IoT telemetry ingestion attempt with a missing, corrupted, or invalid `X-API-KEY`.
- `machine_created`, `machine_updated`, `machine_deleted`: Machine asset lifecycle changes.
- `scenario_injected`: Digital Twin fault injection (overheating, vibration, combined abnormal).
- `report_generated`: Official PDF maintenance report compilation and export.

#### Sanitization & PII Rules
To prevent sensitive credential leakage into log stores:
1. **Passwords and Bearer tokens are NEVER persisted or logged.**
2. **Device API keys are masked or stripped** (only validation boolean outcome logged).
3. **Raw binary audio buffers and file streams are excluded from event payloads.**
4. **Metadata payloads are stored as sanitized JSON dictionaries.**

#### 90-Day Retention & Compliance
In alignment with ISO/IEC 27001 (A.12.4 Logging and Monitoring) and SOC 2 Type II audit trail standards:
- Security audit logs are maintained for a minimum 90-day active retention period.
- An automated pruning task flags records older than 90 days for archival and cold storage.
- The Security Audit Dashboard (`/security-audit`) prominently displays the active retention policy and security posture indicators.

---

## 3. Threat Model & Mitigations (STRIDE Matrix)

| Threat Category | Potential Attack Vector | PulseGuard Mitigation |
|---|---|---|
| **Spoofing** | Forged JWT token or unauthorized IoT telemetry | Cryptographically signed JWT tokens with expiration; separate `X-API-KEY` device header for telemetry streams. |
| **Tampering** | Corrupt audio payload injection | In-memory wave validation, magic byte checks, and float normalization to `[-1.0, 1.0]`. |
| **Repudiation** | Operator denying inspection action or scenario injection | Immutable `SecurityAuditLog` records with user ID, client IP, action timestamp, and sanitized metadata. |
| **Information Disclosure** | Cross-tenant asset inspection or audit log exposure | Mandatory `user_id` filtering; strict RBAC checks (operator blocked with 403 Forbidden from `/api/v1/audit`). |
| **Denial of Service** | Gigabyte-sized WAV file upload | 15 MB file size limit enforced before audio decoding; batch size constraints on model inference. |
| **Elevation of Privilege** | Normal operator attempting administrative reconfiguration | Role-based permission checks stored in JWT claims (`role: operator | engineer | admin`) verified at dependency injection level. |

---

## 4. Operational Recommendations for Production

1. Enforce HTTPS / TLS 1.3 on reverse proxies (e.g. Cloudflare / Nginx / Render).
2. Set `SECRET_KEY` and `IOT_API_KEY` to high-entropy strings (minimum 64 hex characters) generated via `openssl rand -hex 32`.
3. Configure rate-limiting filters (e.g. `slowapi` or reverse-proxy WAF) on `POST /api/v1/analyses` to limit audio uploads to 20 requests per minute per IP.
4. Establish periodic database backup schedules for `pulseguard.db` and audit log exports.
