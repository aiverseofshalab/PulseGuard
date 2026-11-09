import os
import json
from typing import Dict, Any, Tuple, Optional
from backend.app.core.config import settings

class AnomalyScorer:
    """
    Transparent Industrial Machine Acoustic Anomaly Scoring Engine.
    Maps reconstruction errors and kNN distances to calibrated status tiers and explainable recommendations.
    """
    def __init__(self, thresholds: Optional[Dict[str, Any]] = None):
        if thresholds:
            self.thresholds = thresholds
        elif os.path.exists(settings.THRESHOLDS_CONFIG_PATH):
            try:
                with open(settings.THRESHOLDS_CONFIG_PATH, "r") as f:
                    self.thresholds = json.load(f)
            except Exception:
                self.thresholds = self.default_thresholds()
        else:
            self.thresholds = self.default_thresholds()

    @staticmethod
    def default_thresholds() -> Dict[str, Any]:
        return {
            "fan": {
                "warning_threshold": 0.042,
                "critical_threshold": 0.075,
                "knn_warning_threshold": 1.45,
                "knn_critical_threshold": 2.20,
            },
            "pump": {
                "warning_threshold": 0.048,
                "critical_threshold": 0.082,
                "knn_warning_threshold": 1.55,
                "knn_critical_threshold": 2.35,
            },
            "valve": {
                "warning_threshold": 0.038,
                "critical_threshold": 0.068,
                "knn_warning_threshold": 1.35,
                "knn_critical_threshold": 2.10,
            },
            "slide_rail": {
                "warning_threshold": 0.045,
                "critical_threshold": 0.079,
                "knn_warning_threshold": 1.50,
                "knn_critical_threshold": 2.25,
            },
            "default": {
                "warning_threshold": 0.045,
                "critical_threshold": 0.078,
                "knn_warning_threshold": 1.50,
                "knn_critical_threshold": 2.25,
            }
        }

    def get_thresholds_for_machine(self, machine_type: str) -> Dict[str, float]:
        norm_type = machine_type.lower().replace(" ", "_")
        return self.thresholds.get(norm_type, self.thresholds.get("default"))

    def score_analysis(
        self,
        reconstruction_error: float,
        knn_distance: Optional[float],
        machine_type: str,
        audio_quality: str,
    ) -> Tuple[str, float, float, str]:
        """
        Determines machine operational status, normalized score, threshold, and recommendation.
        Returns: (status, normalized_score, active_threshold, recommendation)
        """
        if audio_quality != "valid":
            return (
                "insufficient_quality",
                0.0,
                0.0,
                f"Audio recording quality issue detected ({audio_quality}). "
                "Ensure microphone is properly positioned, background noise is minimized, and re-record audio."
            )

        thresh = self.get_thresholds_for_machine(machine_type)
        warn_th = thresh["warning_threshold"]
        crit_th = thresh["critical_threshold"]

        # Normalized anomaly score: 0 to 100 scale (50 is warning threshold, 80+ is critical)
        if reconstruction_error <= warn_th:
            normalized_score = (reconstruction_error / max(warn_th, 1e-6)) * 50.0
            status = "normal"
            recommendation = (
                f"Acoustic emissions match expected normal baseline for {machine_type.title()}. "
                "Continue standard preventive maintenance schedule."
            )
        elif reconstruction_error <= crit_th:
            ratio = (reconstruction_error - warn_th) / max((crit_th - warn_th), 1e-6)
            normalized_score = 50.0 + ratio * 30.0
            status = "warning"
            recommendation = (
                f"Unusual acoustic spectral energy detected in {machine_type.title()} operating sound "
                f"(reconstruction error {reconstruction_error:.4f} exceeded baseline warning threshold {warn_th:.4f}). "
                "Inspect bearings, airflow path, and repeat recording in 24 hours."
            )
        else:
            ratio = min(2.0, (reconstruction_error - crit_th) / max(crit_th, 1e-6))
            normalized_score = min(100.0, 80.0 + ratio * 20.0)
            status = "critical"
            recommendation = (
                f"High-magnitude acoustic anomaly detected in {machine_type.title()} "
                f"(error {reconstruction_error:.4f} significantly exceeds critical threshold {crit_th:.4f}). "
                "Request immediate on-site maintenance inspection to prevent mechanical failure."
            )

        # Consider secondary kNN evidence if available
        if knn_distance is not None and status == "normal":
            knn_crit = thresh.get("knn_critical_threshold", 2.20)
            if knn_distance >= knn_crit:
                status = "warning"
                normalized_score = max(normalized_score, 55.0)
                recommendation += " (Secondary kNN latent embedding also indicated atypical acoustic distance)."

        return status, round(normalized_score, 2), warn_th, recommendation

anomaly_scorer = AnomalyScorer()
