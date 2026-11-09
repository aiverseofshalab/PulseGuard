import os
import time
import json
import torch
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from backend.app.core.config import settings
from backend.app.ml.architectures.autoencoder import ConvAutoencoder
from backend.app.ml.architectures.knn_detector import KNNDetector
from backend.app.ml.scoring.scorer import anomaly_scorer

class ModelInferenceService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.patch_time_frames = 64
        self.patch_stride = 32
        self.model: Optional[ConvAutoencoder] = None
        self.knn: Optional[KNNDetector] = None
        self.is_model_ready: bool = False
        self.is_knn_ready: bool = False
        self.model_version: str = "cae-mimii-v1.0"
        self.calibrated_thresholds: Dict[str, Any] = {}

        self.load_artifacts()

    def load_artifacts(self):
        """Loads trained autoencoder weights, kNN reference bank, and threshold configs if present."""
        # 1. Load Thresholds
        if os.path.exists(settings.THRESHOLDS_CONFIG_PATH):
            try:
                with open(settings.THRESHOLDS_CONFIG_PATH, "r") as f:
                    self.calibrated_thresholds = json.load(f)
                    anomaly_scorer.thresholds = self.calibrated_thresholds
            except Exception as e:
                print(f"[WARN] Failed loading thresholds file: {e}")

        # 2. Load PyTorch CAE Model
        if os.path.exists(settings.MODEL_PATH):
            try:
                checkpoint = torch.load(settings.MODEL_PATH, map_location=self.device)
                model = ConvAutoencoder(latent_dim=64)
                if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                    model.load_state_dict(checkpoint["state_dict"])
                    self.model_version = checkpoint.get("version", "cae-mimii-v1.0")
                elif isinstance(checkpoint, dict):
                    model.load_state_dict(checkpoint)
                else:
                    model = checkpoint
                model.to(self.device)
                model.eval()
                self.model = model
                self.is_model_ready = True
                print(f"[INFO] Loaded trained ConvAutoencoder from {settings.MODEL_PATH}")
            except Exception as e:
                print(f"[WARN] Failed loading model checkpoint: {e}")
                self.is_model_ready = False
        else:
            self.is_model_ready = False

        # 3. Load kNN Reference Index
        if os.path.exists(settings.KNN_INDEX_PATH):
            try:
                self.knn = KNNDetector.load(settings.KNN_INDEX_PATH)
                self.is_knn_ready = True
                print(f"[INFO] Loaded kNN normal reference bank from {settings.KNN_INDEX_PATH}")
            except Exception as e:
                print(f"[WARN] Failed loading kNN index: {e}")
                self.is_knn_ready = False
        else:
            self.is_knn_ready = False

    def extract_patches(self, spec: np.ndarray) -> Tuple[np.ndarray, List[Tuple[int, int]]]:
        """
        Extracts overlapping patches of shape (n_mels=128, patch_time_frames=64).
        spec shape: (128, total_time_frames)
        Returns: patches array (num_patches, 1, 128, 64) and list of (start_col, end_col)
        """
        n_mels, total_frames = spec.shape
        if total_frames < self.patch_time_frames:
            # Pad with reflection or zeros
            pad_width = self.patch_time_frames - total_frames
            spec = np.pad(spec, ((0, 0), (0, pad_width)), mode="reflect")
            total_frames = self.patch_time_frames

        patches = []
        positions = []
        start = 0
        while start + self.patch_time_frames <= total_frames:
            patch = spec[:, start : start + self.patch_time_frames]
            patches.append(patch)
            positions.append((start, start + self.patch_time_frames))
            start += self.patch_stride

        # Always include the tail window
        if start - self.patch_stride + self.patch_time_frames < total_frames:
            start = total_frames - self.patch_time_frames
            patch = spec[:, start : total_frames]
            patches.append(patch)
            positions.append((start, total_frames))

        patches_arr = np.array(patches, dtype=np.float32)[:, np.newaxis, :, :]
        return patches_arr, positions

    def run_inference(
        self,
        log_mel_spec: np.ndarray,
        machine_type: str,
        audio_quality: str,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end deep learning inference and scoring:
        1. Breaks spectrogram into patches
        2. Computes CAE reconstruction and latent embeddings
        3. Computes reconstruction error (MSE)
        4. Queries kNN normal distance
        5. Computes calibrated status and recommendation
        """
        start_time = time.perf_counter()

        if not self.is_model_ready or self.model is None:
            return {
                "status": "model_unavailable",
                "anomaly_score": 0.0,
                "threshold": 0.0,
                "reconstruction_error": 0.0,
                "knn_distance": None,
                "inference_time_ms": 0.0,
                "model_version": "unavailable",
                "recommendation": (
                    "Model weights not found. Please train or provide trained weights "
                    f"at '{settings.MODEL_PATH}'."
                ),
                "reconstructed_preview": None,
                "error_residual_preview": None,
            }

        # If audio quality was marked silent or severely clipped, avoid false anomaly
        if audio_quality != "valid":
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            status, score, th, rec = anomaly_scorer.score_analysis(
                reconstruction_error=0.0,
                knn_distance=None,
                machine_type=machine_type,
                audio_quality=audio_quality,
            )
            return {
                "status": status,
                "anomaly_score": score,
                "threshold": th,
                "reconstruction_error": 0.0,
                "knn_distance": None,
                "inference_time_ms": round(elapsed_ms, 2),
                "model_version": self.model_version,
                "recommendation": rec,
                "reconstructed_preview": None,
                "error_residual_preview": None,
            }

        patches_np, positions = self.extract_patches(log_mel_spec)
        patches_tensor = torch.from_numpy(patches_np).to(self.device)

        with torch.no_grad():
            recon_tensor, latent_tensor = self.model(patches_tensor)
            recon_np = recon_tensor.cpu().numpy()
            latent_np = latent_tensor.cpu().numpy()

        # Compute MSE per patch: mean across (1, 128, 64)
        patch_errors = np.mean((patches_np - recon_np) ** 2, axis=(1, 2, 3))
        # Overall reconstruction error: weighted average emphasizing peak atypical patches
        mean_mse = float(np.mean(patch_errors))
        p90_mse = float(np.percentile(patch_errors, 90))
        final_recon_error = 0.5 * mean_mse + 0.5 * p90_mse

        # Secondary kNN distance
        knn_distance: Optional[float] = None
        if self.is_knn_ready and self.knn is not None:
            try:
                knn_distances = self.knn.score(latent_np)
                knn_distance = float(np.mean(knn_distances))
            except Exception as e:
                print(f"[WARN] kNN scoring error: {e}")

        # Compute status and recommendation
        status, anomaly_score, active_threshold, recommendation = anomaly_scorer.score_analysis(
            reconstruction_error=final_recon_error,
            knn_distance=knn_distance,
            machine_type=machine_type,
            audio_quality=audio_quality,
        )

        # Assemble full 2D reconstructed spectrogram & residual error for UI visualization
        recon_full = np.zeros_like(log_mel_spec)
        weight_count = np.zeros_like(log_mel_spec)
        for i, (st, en) in enumerate(positions):
            recon_full[:, st:en] += recon_np[i, 0]
            weight_count[:, st:en] += 1.0
        weight_count = np.maximum(weight_count, 1e-6)
        recon_full /= weight_count
        residual_full = np.abs(log_mel_spec - recon_full)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "status": status,
            "anomaly_score": anomaly_score,
            "threshold": active_threshold,
            "reconstruction_error": round(final_recon_error, 6),
            "knn_distance": round(knn_distance, 4) if knn_distance is not None else None,
            "inference_time_ms": round(elapsed_ms, 2),
            "model_version": self.model_version,
            "recommendation": recommendation,
            "reconstructed_preview": recon_full,
            "error_residual_preview": residual_full,
        }

inference_service = ModelInferenceService()
