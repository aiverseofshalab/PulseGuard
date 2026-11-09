import torch
import numpy as np
import pytest
from backend.app.ml.architectures.autoencoder import ConvAutoencoder
from backend.app.ml.architectures.knn_detector import KNNDetector
from backend.app.ml.scoring.scorer import AnomalyScorer

def test_conv_autoencoder_architecture():
    model = ConvAutoencoder(latent_dim=64)
    x = torch.randn(2, 1, 128, 64)
    recon, z = model(x)

    assert recon.shape == (2, 1, 128, 64)
    assert z.shape == (2, 64)
    assert 0.0 <= recon.min() <= recon.max() <= 1.0  # Bounded by Sigmoid

def test_knn_detector():
    knn = KNNDetector(n_neighbors=3)
    normal_embeddings = np.random.normal(loc=0.0, scale=0.1, size=(50, 64))
    knn.fit(normal_embeddings)

    assert knn.is_fitted
    assert knn.reference_embeddings_count == 50

    # Normal test embeddings should have low distance
    normal_test = np.random.normal(loc=0.0, scale=0.1, size=(5, 64))
    normal_scores = knn.score(normal_test)

    # Outlier test embeddings should have high distance
    outlier_test = np.random.normal(loc=5.0, scale=0.5, size=(5, 64))
    outlier_scores = knn.score(outlier_test)

    assert np.mean(normal_scores) < np.mean(outlier_scores)

def test_anomaly_scorer():
    scorer = AnomalyScorer()

    # Normal case
    status_n, score_n, th_n, rec_n = scorer.score_analysis(
        reconstruction_error=0.002,
        knn_distance=0.6,
        machine_type="fan",
        audio_quality="valid",
    )
    assert status_n == "normal"
    assert score_n < 50.0

    # Warning case
    status_w, score_w, th_w, rec_w = scorer.score_analysis(
        reconstruction_error=0.00315,
        knn_distance=0.75,
        machine_type="fan",
        audio_quality="valid",
    )
    assert status_w in ["warning", "critical"]

    # Critical case
    status_c, score_c, th_c, rec_c = scorer.score_analysis(
        reconstruction_error=0.015,
        knn_distance=4.5,
        machine_type="fan",
        audio_quality="valid",
    )
    assert status_c == "critical"
    assert score_c >= 80.0

    # Insufficient quality case
    status_q, score_q, _, _ = scorer.score_analysis(
        reconstruction_error=0.002,
        knn_distance=0.6,
        machine_type="fan",
        audio_quality="silent",
    )
    assert status_q == "insufficient_quality"
