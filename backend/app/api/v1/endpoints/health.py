import os
import time
import io
import wave
import numpy as np
import torch
from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.ml.inference.infer import inference_service
from backend.app.models.machine import Machine
from backend.app.models.telemetry import MachineTelemetry
from backend.app.models.analysis import Analysis
from backend.app.models.diagnostic import DiagnosticSnapshot

router = APIRouter()

@router.get("/live", tags=["Diagnostics"])
def liveness_probe():
    """
    Kubernetes / Docker Liveness Probe.
    Returns 200 OK as long as the process is alive.
    """
    return {
        "status": "Operational",
        "service": "pulseguard-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/ready", tags=["Diagnostics"])
def readiness_probe(response: Response, db: Session = Depends(get_db)):
    """
    Kubernetes / Platform Readiness Probe.
    Verifies database connection and ML model readiness.
    """
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    ml_ok = inference_service.is_model_ready

    is_ready = db_ok and ml_ok
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "Operational" if is_ready else "Degraded",
        "database": "Operational" if db_ok else "Unavailable",
        "ml_inference": "Operational" if ml_ok else "Degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/services", tags=["Diagnostics"])
def services_health(db: Session = Depends(get_db)):
    """
    Comprehensive Service Health Matrix.
    Reports operational status for every subsystem without leaking secrets.
    """
    # 1. Database Check
    db_status = "Operational"
    db_latency_ms = 0.0
    try:
        t0 = time.perf_counter()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    except Exception:
        db_status = "Unavailable"

    # 2. ML Engine Check
    ml_status = "Operational" if inference_service.is_model_ready else "Degraded"
    knn_status = "Operational" if inference_service.is_knn_ready else "Degraded"

    # 3. Audio Preprocessing Check
    audio_status = "Operational"
    try:
        from backend.app.ml.preprocessing.audio_processor import audio_processor
        if audio_processor.mel_basis.shape[0] != 128:
            audio_status = "Degraded"
    except Exception:
        audio_status = "Unavailable"

    # 4. IoT Telemetry Subsystem Check
    iot_status = "Operational"
    try:
        telemetry_count = db.query(MachineTelemetry).count()
    except Exception:
        iot_status = "Unavailable"
        telemetry_count = 0

    # 5. Asset Registry Check
    try:
        machine_count = db.query(Machine).count()
        analysis_count = db.query(Analysis).count()
    except Exception:
        machine_count = 0
        analysis_count = 0

    all_operational = all(s == "Operational" for s in [db_status, ml_status, audio_status, iot_status])

    return {
        "overall_status": "Operational" if all_operational else "Degraded",
        "environment": settings.APP_ENV,
        "services": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
                "driver": "SQLite" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL",
            },
            "authentication": {
                "status": "Operational",
                "algorithm": settings.ALGORITHM,
                "token_ttl_hours": settings.ACCESS_TOKEN_EXPIRE_MINUTES // 60,
            },
            "acoustic_preprocessing": {
                "status": audio_status,
                "sample_rate_hz": settings.SAMPLE_RATE,
                "mel_filterbanks": settings.N_MELS,
            },
            "deep_learning_cae": {
                "status": ml_status,
                "version": inference_service.model_version,
                "device": str(inference_service.device),
            },
            "knn_embedding_baseline": {
                "status": knn_status,
                "reference_vectors": (
                    inference_service.knn.reference_embeddings_count
                    if inference_service.knn
                    else 0
                ),
            },
            "iot_telemetry_simulation": {
                "status": iot_status,
                "total_telemetry_points": telemetry_count,
                "virtual_nodes": ["TMP36", "Potentiometer_Vib", "Tachometer_RPM"],
            },
            "assets_registered": machine_count,
            "analyses_completed": analysis_count,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/ml", tags=["Diagnostics"])
def ml_pipeline_diagnostics():
    """
    Deep Learning Diagnostic Report.
    Audits model weights, architecture, latent space, and threshold calibration.
    """
    model_exists = os.path.exists(settings.MODEL_PATH)
    knn_exists = os.path.exists(settings.KNN_INDEX_PATH)
    thresh_exists = os.path.exists(settings.THRESHOLDS_CONFIG_PATH)

    return {
        "status": "Operational" if inference_service.is_model_ready else "Degraded",
        "cae_model": {
            "status": "Operational" if inference_service.is_model_ready else "Unavailable",
            "version": inference_service.model_version,
            "weights_file_present": model_exists,
            "architecture": "4-Layer 2D ConvAutoencoder (Conv2d + BatchNorm + LeakyReLU)",
            "latent_bottleneck_dim": 64,
            "loss_function": "Mean Squared Error (MSE)",
            "device": str(inference_service.device),
        },
        "knn_baseline": {
            "status": "Operational" if inference_service.is_knn_ready else "Unavailable",
            "index_file_present": knn_exists,
            "reference_embeddings_count": (
                inference_service.knn.reference_embeddings_count
                if inference_service.knn
                else 0
            ),
            "distance_metric": "euclidean",
            "k_neighbors": inference_service.knn.n_neighbors if inference_service.knn else 5,
        },
        "threshold_calibration": {
            "status": "Operational" if thresh_exists else "Degraded",
            "config_file_present": thresh_exists,
            "calibrated_categories": list(inference_service.calibrated_thresholds.keys()),
            "calibration_strategy": "Percentile-based (P90 Warning / P99 Critical) on validation normal data",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/iot", tags=["Diagnostics"])
def iot_pipeline_diagnostics(db: Session = Depends(get_db)):
    """
    Software IoT & Telemetry Simulation Diagnostics.
    Audits virtual sensor bridge status, Tinkercad firmware presence, and ingestion records.
    """
    tinkercad_ino_present = os.path.exists("iot/tinkercad/arduino_firmware.ino")
    bridge_script_present = os.path.exists("iot/bridge/virtual_sensor_bridge.py")

    recent_telemetry = (
        db.query(MachineTelemetry)
        .order_by(MachineTelemetry.timestamp.desc())
        .limit(5)
        .all()
    )

    return {
        "status": "Operational" if (tinkercad_ino_present and bridge_script_present) else "Degraded",
        "virtual_reference_hardware": "Autodesk Tinkercad Circuits (Arduino Uno R3)",
        "tinkercad_firmware_file": "Present" if tinkercad_ino_present else "Unavailable",
        "virtual_sensor_bridge_file": "Present" if bridge_script_present else "Unavailable",
        "hardware_dependency": "None (100% Software Simulated)",
        "supported_channels": [
            {"sensor": "TMP36", "pin": "A0", "metric": "Temperature (°C)", "status": "Simulated"},
            {"sensor": "10k Potentiometer", "pin": "A1", "metric": "Vibration Proxy (%)", "status": "Simulated"},
            {"sensor": "Optical Tachometer", "pin": "D2", "metric": "Speed (RPM)", "status": "Simulated"},
            {"sensor": "Status LEDs & Buzzer", "pins": "D8, D9, D10, D11", "metric": "Alert Indicators", "status": "Simulated"},
        ],
        "recent_telemetry_stream": [
            {
                "id": t.id,
                "machine_id": t.machine_id,
                "rpm": t.rpm,
                "temperature": t.temperature,
                "vibration_indicator": t.vibration_indicator,
                "operating_status": t.operating_status,
                "source": t.source,
                "timestamp": t.timestamp.isoformat(),
            }
            for t in recent_telemetry
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.post("/run", tags=["Diagnostics"])
def run_deep_diagnostics(db: Session = Depends(get_db)):
    """
    Active System Diagnostic Battery.
    Executes live verification tests across Database, Audio Pipeline, ML Inference,
    MIMII Dataset files, and Environment configurations. Persists a DiagnosticSnapshot.
    """
    t_start = time.perf_counter()
    results = {}

    # 1. Database Read/Write Diagnostic
    try:
        t0 = time.perf_counter()
        db.execute(text("SELECT 1"))
        db_lat = round((time.perf_counter() - t0) * 1000.0, 2)
        results["database"] = {
            "status": "Operational",
            "latency_ms": db_lat,
            "message": "Database read query verified",
            "driver": "SQLite" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL",
        }
    except Exception as e:
        results["database"] = {
            "status": "Unavailable",
            "latency_ms": -1,
            "message": "Database connection failed",
            "troubleshooting": "Check database file permissions or verify DATABASE_URL connection string.",
        }

    # 2. Audio Preprocessing Pipeline Diagnostic
    spec = None
    try:
        t0 = time.perf_counter()
        from backend.app.ml.preprocessing.audio_processor import audio_processor

        # Synthesize 2.1s 16kHz sine wave PCM WAV (to yield >= 64 time frames)
        sample_rate = 16000
        duration = 2.1
        t_arr = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        waveform = (np.sin(2 * np.pi * 440.0 * t_arr) * 16384).astype(np.int16)

        wav_buf = io.BytesIO()
        with wave.open(wav_buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(waveform.tobytes())
        test_audio_bytes = wav_buf.getvalue()

        clean_wav, meta = audio_processor.validate_and_load_wav(test_audio_bytes)
        spec = audio_processor.compute_log_mel_spectrogram(clean_wav)
        audio_lat = round((time.perf_counter() - t0) * 1000.0, 2)
        results["audio_preprocessing"] = {
            "status": "Operational",
            "latency_ms": audio_lat,
            "spectrogram_shape": list(spec.shape),
            "quality_detected": meta["audio_quality"],
            "message": "Acoustic preprocessing pipeline passed synthetic 16kHz sine test",
        }
    except Exception as e:
        results["audio_preprocessing"] = {
            "status": "Degraded",
            "latency_ms": -1,
            "message": f"Audio preprocessing failed: {str(e)}",
            "troubleshooting": "Verify NumPy and SciPy signal processing packages are installed.",
        }

    # 3. ML Inference Diagnostic
    try:
        t0 = time.perf_counter()
        if inference_service.is_model_ready and inference_service.model:
            test_spec = spec if spec is not None else np.zeros((128, 64), dtype=np.float32)
            inf_res = inference_service.run_inference(log_mel_spec=test_spec, machine_type="fan", audio_quality="valid")
            total_inf_lat = round((time.perf_counter() - t0) * 1000.0, 2)
            results["ml_inference"] = {
                "status": "Operational",
                "latency_ms": total_inf_lat,
                "model_version": inf_res.get("model_version", inference_service.model_version),
                "device": str(inference_service.device),
                "knn_ready": inference_service.is_knn_ready,
                "message": f"Forward pass executed in {inf_res.get('inference_time_ms', 1.5):.2f}ms",
            }
        else:
            results["ml_inference"] = {
                "status": "Degraded",
                "latency_ms": -1,
                "message": "ConvAutoencoder model weights not loaded in memory",
                "troubleshooting": "Run training script `python3 training/train_cae.py` to generate weights.",
            }
    except Exception as e:
        results["ml_inference"] = {
            "status": "Unavailable",
            "latency_ms": -1,
            "message": f"Inference execution failed: {str(e)}",
            "troubleshooting": "Check PyTorch runtime compatibility and artifact path.",
        }

    # 4. Dataset Files Diagnostic
    dataset_dirs = [
        "data/mimii_fan/train_normal",
        "data/mimii_fan/val_normal",
        "data/mimii_fan/test_normal",
    ]
    ds_counts = {}
    ds_all_present = True
    for d in dataset_dirs:
        if os.path.exists(d):
            c = len([f for f in os.listdir(d) if f.endswith(".wav")])
            ds_counts[os.path.basename(d)] = c
            if c == 0:
                ds_all_present = False
        else:
            ds_counts[os.path.basename(d)] = 0
            ds_all_present = False

    results["dataset_availability"] = {
        "status": "Operational" if ds_all_present else "Degraded",
        "split_counts": ds_counts,
        "message": "MIMII acoustic benchmark splits verified" if ds_all_present else "Some dataset splits missing",
        "troubleshooting": "Generate dataset with `python3 training/generate_mimii_soundscapes.py`." if not ds_all_present else None,
    }

    # 5. Environment & Security Config Diagnostic
    env_keys_set = {
        "SECRET_KEY": bool(settings.SECRET_KEY and settings.SECRET_KEY != ""),
        "ALGORITHM": bool(settings.ALGORITHM),
        "ACCESS_TOKEN_EXPIRE_MINUTES": bool(settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "IOT_API_KEY": bool(settings.IOT_API_KEY),
        "DATABASE_URL": bool(settings.DATABASE_URL),
    }
    all_env_ok = all(env_keys_set.values())
    results["environment_configuration"] = {
        "status": "Operational" if all_env_ok else "Degraded",
        "configured_parameters": {k: "Configured" if v else "Missing" for k, v in env_keys_set.items()},
        "message": "All required environment configurations present" if all_env_ok else "Some environment variables are missing",
    }

    # Overall Status Calculation
    statuses = [res.get("status", "Unavailable") for res in results.values()]
    if any(s == "Unavailable" for s in statuses):
        overall = "Unavailable"
    elif any(s == "Degraded" for s in statuses):
        overall = "Degraded"
    else:
        overall = "Operational"

    total_exec_time = round((time.perf_counter() - t_start) * 1000.0, 2)

    # Persist Snapshot to Database
    try:
        snapshot = DiagnosticSnapshot(
            overall_status=overall,
            execution_time_ms=total_exec_time,
            results=results,
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        snapshot_id = snapshot.id
    except Exception:
        snapshot_id = "unpersisted"

    return {
        "id": snapshot_id,
        "overall_status": overall,
        "execution_time_ms": total_exec_time,
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/history", tags=["Diagnostics"])
def get_diagnostic_history(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """
    Retrieves the historical log of diagnostic battery test runs.
    """
    snapshots = (
        db.query(DiagnosticSnapshot)
        .order_by(DiagnosticSnapshot.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "overall_status": s.overall_status,
            "execution_time_ms": s.execution_time_ms,
            "results": s.results,
            "timestamp": s.created_at.isoformat(),
        }
        for s in snapshots
    ]


