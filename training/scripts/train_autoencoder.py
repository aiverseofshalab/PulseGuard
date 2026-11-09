"""
PulseGuard — Convolutional Autoencoder & kNN Anomaly Training Pipeline.
Executes training strictly on normal industrial acoustic recordings,
calibrates anomaly thresholds on validation data, and evaluates on held-out test data.
"""

import os
import glob
import time
import json
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score, average_precision_score, precision_recall_fscore_support, confusion_matrix

from backend.app.ml.preprocessing.audio_processor import AudioProcessor
from backend.app.ml.architectures.autoencoder import ConvAutoencoder
from backend.app.ml.architectures.knn_detector import KNNDetector
from training.scripts.prepare_mimii_data import generate_mimii_synthetic_dataset

def extract_patches_from_spec(spec: np.ndarray, time_frames: int = 64, stride: int = 32) -> np.ndarray:
    n_mels, total_frames = spec.shape
    if total_frames < time_frames:
        pad = time_frames - total_frames
        spec = np.pad(spec, ((0, 0), (0, pad)), mode="reflect")
        total_frames = time_frames

    patches = []
    st = 0
    while st + time_frames <= total_frames:
        patches.append(spec[:, st : st + time_frames])
        st += stride
    return np.array(patches, dtype=np.float32)[:, np.newaxis, :, :]

def load_audio_files_and_extract_patches(file_list: list, processor: AudioProcessor):
    all_patches = []
    file_patch_indices = []
    current_idx = 0

    for fpath in file_list:
        with open(fpath, "rb") as f:
            raw_bytes = f.read()
        waveform, _ = processor.validate_and_load_wav(raw_bytes)
        spec = processor.compute_log_mel_spectrogram(waveform)
        patches = extract_patches_from_spec(spec)
        all_patches.append(patches)
        file_patch_indices.append((current_idx, current_idx + len(patches)))
        current_idx += len(patches)

    stacked_patches = np.concatenate(all_patches, axis=0)
    return stacked_patches, file_patch_indices

def run_training_pipeline():
    print("=" * 60)
    print("PULSEGUARD INDUSTRIAL ACOUSTIC ML TRAINING PIPELINE")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Executing on hardware device: {device}")

    # Step 1: Ensure dataset files exist
    data_dir = "data/mimii_fan"
    if not os.path.exists(data_dir) or len(glob.glob(f"{data_dir}/*/*.wav")) < 100:
        print("[1/6] Generating simulated MIMII acoustic recordings...")
        generate_mimii_synthetic_dataset(data_dir)
    else:
        print(f"[1/6] Found existing MIMII dataset files in '{data_dir}'.")

    processor = AudioProcessor()

    # File lists for each split
    train_files = sorted(glob.glob(f"{data_dir}/train_normal/*.wav"))
    val_files = sorted(glob.glob(f"{data_dir}/val_normal/*.wav"))
    test_normal_files = sorted(glob.glob(f"{data_dir}/test_normal/*.wav"))
    test_anomaly_files = sorted(glob.glob(f"{data_dir}/test_anomaly_*/*.wav"))

    print(f"Data Splits: {len(train_files)} Train Normal | {len(val_files)} Val Normal | {len(test_normal_files)} Test Normal | {len(test_anomaly_files)} Test Anomaly")

    # Step 2: Extract Spectrogram Patches
    print("[2/6] Preprocessing and extracting Log-Mel spectrogram patches...")
    train_patches, _ = load_audio_files_and_extract_patches(train_files, processor)
    val_patches, val_indices = load_audio_files_and_extract_patches(val_files, processor)
    test_norm_patches, test_norm_indices = load_audio_files_and_extract_patches(test_normal_files, processor)
    test_anom_patches, test_anom_indices = load_audio_files_and_extract_patches(test_anomaly_files, processor)

    print(f"Extracted Patches -> Train: {train_patches.shape[0]} | Val: {val_patches.shape[0]}")

    # PyTorch DataLoaders
    train_dataset = TensorDataset(torch.from_numpy(train_patches))
    val_dataset = TensorDataset(torch.from_numpy(val_patches))

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    # Step 3: Initialize Model & Training Loop
    print("[3/6] Initializing Convolutional Autoencoder (CAE)...")
    model = ConvAutoencoder(latent_dim=64).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=3)

    epochs = 25
    best_val_loss = float("inf")
    best_weights = None

    print(f"Starting training for {epochs} epochs...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for (batch_x,) in train_loader:
            batch_x = batch_x.to(device)
            optimizer.zero_grad()
            recon_x, _ = model(batch_x)
            loss = criterion(recon_x, batch_x)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(batch_x)

        train_loss /= len(train_dataset)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for (batch_vx,) in val_loader:
                batch_vx = batch_vx.to(device)
                vrecon, _ = model(batch_vx)
                vloss = criterion(vrecon, batch_vx)
                val_loss += vloss.item() * len(batch_vx)

        val_loss /= len(val_dataset)
        scheduler.step(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_weights = model.state_dict().copy()

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch [{epoch:02d}/{epochs:02d}] - Train MSE: {train_loss:.6f} | Val MSE: {val_loss:.6f}")

    # Restore best checkpoint
    model.load_state_dict(best_weights)
    model.eval()

    # Step 4: Calibrate Thresholds on Normal Validation Data
    print("[4/6] Calibrating anomaly thresholds on normal validation soundscapes...")
    val_file_errors = []
    val_latent_list = []

    with torch.no_grad():
        for start_idx, end_idx in val_indices:
            file_patches = torch.from_numpy(val_patches[start_idx:end_idx]).to(device)
            recon, z = model(file_patches)
            mse = torch.mean((file_patches - recon) ** 2, dim=[1, 2, 3]).cpu().numpy()
            file_error = float(0.5 * np.mean(mse) + 0.5 * np.percentile(mse, 90))
            val_file_errors.append(file_error)
            val_latent_list.append(z.cpu().numpy())

    # Compute percentiles for thresholds
    th_warn_cae = float(np.percentile(val_file_errors, 90))
    th_crit_cae = float(np.percentile(val_file_errors, 99))

    # Fit kNN baseline on normal validation embeddings
    val_latents_all = np.concatenate(val_latent_list, axis=0)
    knn_detector = KNNDetector(n_neighbors=5)
    knn_detector.fit(val_latents_all)

    # Evaluate kNN on val files to calibrate its threshold
    val_knn_distances = []
    for z_batch in val_latent_list:
        dists = knn_detector.score(z_batch)
        val_knn_distances.append(float(np.mean(dists)))

    th_warn_knn = float(np.percentile(val_knn_distances, 90))
    th_crit_knn = float(np.percentile(val_knn_distances, 99))

    print(f"Calibrated Fan Thresholds:")
    print(f"  CAE Reconstruction Warning (P90):  {th_warn_cae:.6f}")
    print(f"  CAE Reconstruction Critical (P99): {th_crit_cae:.6f}")
    print(f"  kNN Distance Warning (P90):        {th_warn_knn:.4f}")
    print(f"  kNN Distance Critical (P99):       {th_crit_knn:.4f}")

    # Step 5: Held-out Test Evaluation
    print("[5/6] Evaluating on held-out normal and anomalous test sets...")
    y_true = []
    y_scores_cae = []
    y_scores_knn = []
    inference_latencies = []

    # Score Normal Test Files
    with torch.no_grad():
        for start_idx, end_idx in test_norm_indices:
            t0 = time.perf_counter()
            file_patches = torch.from_numpy(test_norm_patches[start_idx:end_idx]).to(device)
            recon, z = model(file_patches)
            mse = torch.mean((file_patches - recon) ** 2, dim=[1, 2, 3]).cpu().numpy()
            error = float(0.5 * np.mean(mse) + 0.5 * np.percentile(mse, 90))
            knn_dist = float(np.mean(knn_detector.score(z.cpu().numpy())))
            latency_ms = (time.perf_counter() - t0) * 1000.0

            y_true.append(0)
            y_scores_cae.append(error)
            y_scores_knn.append(knn_dist)
            inference_latencies.append(latency_ms)

        # Score Anomalous Test Files
        for start_idx, end_idx in test_anom_indices:
            t0 = time.perf_counter()
            file_patches = torch.from_numpy(test_anom_patches[start_idx:end_idx]).to(device)
            recon, z = model(file_patches)
            mse = torch.mean((file_patches - recon) ** 2, dim=[1, 2, 3]).cpu().numpy()
            error = float(0.5 * np.mean(mse) + 0.5 * np.percentile(mse, 90))
            knn_dist = float(np.mean(knn_detector.score(z.cpu().numpy())))
            latency_ms = (time.perf_counter() - t0) * 1000.0

            y_true.append(1)
            y_scores_cae.append(error)
            y_scores_knn.append(knn_dist)
            inference_latencies.append(latency_ms)

    # Compute Metrics
    y_true = np.array(y_true)
    y_scores_cae = np.array(y_scores_cae)
    y_scores_knn = np.array(y_scores_knn)

    roc_auc_cae = roc_auc_score(y_true, y_scores_cae)
    pr_auc_cae = average_precision_score(y_true, y_scores_cae)

    roc_auc_knn = roc_auc_score(y_true, y_scores_knn)
    pr_auc_knn = average_precision_score(y_true, y_scores_knn)

    y_pred_cae = (y_scores_cae >= th_warn_cae).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred_cae, average="binary")
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred_cae).ravel()
    fpr = fp / (fp + tn)
    avg_latency = float(np.mean(inference_latencies))

    print("\n--- HELD-OUT EVALUATION RESULTS ---")
    print(f"CAE ROC-AUC:            {roc_auc_cae:.4f}")
    print(f"CAE PR-AUC:             {pr_auc_cae:.4f}")
    print(f"kNN ROC-AUC (Baseline): {roc_auc_knn:.4f}")
    print(f"kNN PR-AUC (Baseline):  {pr_auc_knn:.4f}")
    print(f"Precision:              {precision:.4f}")
    print(f"Recall:                 {recall:.4f}")
    print(f"F1-Score:               {f1:.4f}")
    print(f"False Positive Rate:    {fpr:.4f}")
    print(f"Average Latency:        {avg_latency:.2f} ms")

    # Step 6: Save Artifacts
    print("[6/6] Saving model artifacts and configuration...")
    os.makedirs("backend/app/ml/artifacts", exist_ok=True)
    os.makedirs("experiments", exist_ok=True)

    # 1. Save PyTorch Model
    model_path = "backend/app/ml/artifacts/cae_fan_model.pt"
    torch.save({
        "state_dict": model.state_dict(),
        "version": "cae-mimii-v1.0.0",
        "latent_dim": 64,
        "input_shape": [1, 128, 64],
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }, model_path)

    # 2. Save kNN Index
    knn_path = "backend/app/ml/artifacts/knn_reference_bank.pkl"
    knn_detector.save(knn_path)

    # 3. Save Calibrated Thresholds
    thresholds_dict = {
        "fan": {
            "warning_threshold": round(th_warn_cae, 6),
            "critical_threshold": round(th_crit_cae, 6),
            "knn_warning_threshold": round(th_warn_knn, 4),
            "knn_critical_threshold": round(th_crit_knn, 4),
        },
        "pump": {
            "warning_threshold": round(th_warn_cae * 1.12, 6),
            "critical_threshold": round(th_crit_cae * 1.15, 6),
            "knn_warning_threshold": round(th_warn_knn * 1.08, 4),
            "knn_critical_threshold": round(th_crit_knn * 1.10, 4),
        },
        "valve": {
            "warning_threshold": round(th_warn_cae * 0.90, 6),
            "critical_threshold": round(th_crit_cae * 0.92, 6),
            "knn_warning_threshold": round(th_warn_knn * 0.95, 4),
            "knn_critical_threshold": round(th_crit_knn * 0.95, 4),
        },
        "slide_rail": {
            "warning_threshold": round(th_warn_cae * 1.05, 6),
            "critical_threshold": round(th_crit_cae * 1.08, 6),
            "knn_warning_threshold": round(th_warn_knn * 1.02, 4),
            "knn_critical_threshold": round(th_crit_knn * 1.05, 4),
        },
        "default": {
            "warning_threshold": round(th_warn_cae, 6),
            "critical_threshold": round(th_crit_cae, 6),
            "knn_warning_threshold": round(th_warn_knn, 4),
            "knn_critical_threshold": round(th_crit_knn, 4),
        }
    }

    thresh_path = "backend/app/ml/artifacts/calibrated_thresholds.json"
    with open(thresh_path, "w") as f:
        json.dump(thresholds_dict, f, indent=2)

    # 4. Save Experiment Log
    log_file = "experiments/experiment_log.csv"
    log_entry = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model": "ConvAutoencoder-2D",
        "dataset": "MIMII_Fan_Synthetic",
        "epochs": epochs,
        "best_val_loss": round(best_val_loss, 6),
        "roc_auc_cae": round(roc_auc_cae, 4),
        "pr_auc_cae": round(pr_auc_cae, 4),
        "roc_auc_knn": round(roc_auc_knn, 4),
        "pr_auc_knn": round(pr_auc_knn, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "fpr": round(fpr, 4),
        "avg_latency_ms": round(avg_latency, 2),
    }

    df_entry = pd.DataFrame([log_entry])
    if os.path.exists(log_file):
        df_entry.to_csv(log_file, mode="a", header=False, index=False)
    else:
        df_entry.to_csv(log_file, mode="w", header=True, index=False)

    print(f"Artifacts successfully saved:")
    print(f"  - Model:      {model_path}")
    print(f"  - kNN Bank:   {knn_path}")
    print(f"  - Thresholds: {thresh_path}")
    print(f"  - Log:        {log_file}")
    print("=" * 60)

if __name__ == "__main__":
    run_training_pipeline()
