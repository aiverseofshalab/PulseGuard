import numpy as np
import pickle
from typing import Optional, Tuple
from sklearn.neighbors import NearestNeighbors

class KNNDetector:
    """
    k-Nearest Neighbors Acoustic Anomaly Baseline.
    Indexes normal latent embeddings and scores anomalies by distance to nearest normal clusters.
    """
    def __init__(self, n_neighbors: int = 5, metric: str = "euclidean"):
        self.n_neighbors = n_neighbors
        self.metric = metric
        self.knn: Optional[NearestNeighbors] = None
        self.is_fitted: bool = False
        self.reference_embeddings_count: int = 0

    def fit(self, normal_embeddings: np.ndarray):
        """Fits NearestNeighbors on a bank of normal latent feature vectors."""
        if len(normal_embeddings) < self.n_neighbors:
            self.n_neighbors = max(1, len(normal_embeddings))
        
        self.knn = NearestNeighbors(n_neighbors=self.n_neighbors, metric=self.metric)
        self.knn.fit(normal_embeddings)
        self.is_fitted = True
        self.reference_embeddings_count = len(normal_embeddings)

    def score(self, test_embeddings: np.ndarray) -> np.ndarray:
        """
        Computes the mean distance to k-nearest normal neighbors.
        test_embeddings: (N, latent_dim)
        Returns: (N,) distance scores
        """
        if not self.is_fitted or self.knn is None:
            raise RuntimeError("KNN Detector has not been fitted with normal reference embeddings.")
        
        distances, _ = self.knn.kneighbors(test_embeddings)
        # Average distance across k nearest neighbors
        return np.mean(distances, axis=1)

    def save(self, filepath: str):
        with open(filepath, "wb") as f:
            pickle.dump({
                "knn": self.knn,
                "n_neighbors": self.n_neighbors,
                "metric": self.metric,
                "reference_embeddings_count": self.reference_embeddings_count,
            }, f)

    @classmethod
    def load(cls, filepath: str) -> "KNNDetector":
        with open(filepath, "rb") as f:
            data = pickle.load(f)
        detector = cls(n_neighbors=data["n_neighbors"], metric=data["metric"])
        detector.knn = data["knn"]
        detector.is_fitted = True
        detector.reference_embeddings_count = data.get("reference_embeddings_count", 0)
        return detector

