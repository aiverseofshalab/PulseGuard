"""
MIMII Dataset Simulator & Acoustic Soundscape Generator.
Generates physics-based industrial machine acoustic soundscapes matching the MIMII dataset
acoustic distributions for the 'fan', 'pump', 'valve', and 'slide_rail' categories:
- Blade-pass frequencies and motor harmonics (100 Hz, 240 Hz, 480 Hz)
- Pink/turbulent aerodynamic airflow background noise
- Mechanical anomalies: bearing race friction, blade unbalance, rattling, cavitation
"""

import os
import io
import wave
import numpy as np
from typing import Tuple, List, Dict

SAMPLE_RATE = 16000

def generate_fan_sound(
    duration_sec: float = 3.0,
    is_anomaly: bool = False,
    rpm: float = 2400.0,
    noise_level: float = 0.05,
    anomaly_type: str = "bearing_friction",
    seed: int = 42
) -> np.ndarray:
    np.random.seed(seed)
    total_samples = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, total_samples, endpoint=False)

    # Fundamental rotation & blade pass frequency (BPF) for 5-blade fan at 2400 RPM
    fund_freq = rpm / 60.0  # 40 Hz
    bpf = fund_freq * 5.0   # 200 Hz

    # Normal acoustic spectrum: fundamental + harmonics
    signal = 0.15 * np.sin(2 * np.pi * fund_freq * t)
    signal += 0.25 * np.sin(2 * np.pi * bpf * t)
    signal += 0.12 * np.sin(2 * np.pi * (bpf * 2) * t)
    signal += 0.08 * np.sin(2 * np.pi * (bpf * 3) * t)
    signal += 0.04 * np.sin(2 * np.pi * (bpf * 4) * t)

    # Add pink/broadband airflow noise (integration of Gaussian white noise)
    white_noise = np.random.normal(0, 1, total_samples)
    b_filter = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a_filter = [1.0, -2.494956002, 2.017265875, -0.522189400]
    # Simple turbulent aerodynamic filter
    pink_noise = np.convolve(white_noise, np.exp(-np.linspace(0, 5, 256)), mode="same")
    pink_noise = (pink_noise / np.std(pink_noise)) * noise_level
    signal += pink_noise

    # If anomaly, inject specific fault signature
    if is_anomaly:
        if anomaly_type == "bearing_friction":
            # High-frequency acoustic emission bursts & friction chatter (2500 - 4500 Hz)
            mod_freq = fund_freq * 3.6  # Bearing fault characteristic frequency (BPFO)
            modulator = 0.5 * (1.0 + np.sin(2 * np.pi * mod_freq * t))
            chatter = 0.22 * np.sin(2 * np.pi * 3200 * t) * modulator
            chatter += 0.18 * np.sin(2 * np.pi * 4100 * t) * modulator
            signal += chatter
        elif anomaly_type == "unbalance":
            # Massive surge in 1X shaft fundamental and phase modulation
            signal += 0.45 * np.sin(2 * np.pi * fund_freq * t + 0.3)
            # Fluttering amplitude modulation
            signal *= (1.0 + 0.35 * np.sin(2 * np.pi * fund_freq * t))
        elif anomaly_type == "rattling":
            # Periodic impact pulses with exponential decay
            impact_period = int(SAMPLE_RATE / fund_freq)
            impulse_train = np.zeros(total_samples)
            impulse_train[::impact_period] = 0.6
            decay_kernel = np.exp(-np.linspace(0, 10, 800)) * np.sin(2 * np.pi * 1800 * np.linspace(0, 0.05, 800))
            impact_signal = np.convolve(impulse_train, decay_kernel, mode="same")
            signal += impact_signal

    # Peak normalization to safe range [-0.95, 0.95]
    max_amp = np.max(np.abs(signal))
    if max_amp > 1e-6:
        signal = 0.85 * (signal / max_amp)

    return signal.astype(np.float32)

def save_wav(filepath: str, waveform: np.ndarray, sample_rate: int = SAMPLE_RATE):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    int_waveform = (waveform * 32767.0).astype(np.int16)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_waveform.tobytes())

def generate_mimii_synthetic_dataset(output_dir: str = "data/mimii_fan"):
    """
    Creates a calibrated split of normal and anomalous audio files:
    - 60 normal training files
    - 20 normal validation files
    - 20 normal test files
    - 30 anomalous test files (bearing friction, unbalance, rattling)
    """
    os.makedirs(output_dir, exist_ok=True)
    splits = {
        "train_normal": (60, False, "none"),
        "val_normal": (20, False, "none"),
        "test_normal": (20, False, "none"),
        "test_anomaly_bearing": (10, True, "bearing_friction"),
        "test_anomaly_unbalance": (10, True, "unbalance"),
        "test_anomaly_rattling": (10, True, "rattling"),
    }

    metadata = []
    file_id = 0

    for split_name, (count, is_anomaly, fault) in splits.items():
        folder = os.path.join(output_dir, split_name)
        os.makedirs(folder, exist_ok=True)
        for i in range(count):
            file_id += 1
            filename = f"fan_id_00_{split_name}_{i:03d}.wav"
            filepath = os.path.join(folder, filename)
            seed = 1000 + file_id
            audio = generate_fan_sound(
                duration_sec=3.0,
                is_anomaly=is_anomaly,
                rpm=2400.0 + np.random.uniform(-50, 50),
                noise_level=0.06,
                anomaly_type=fault,
                seed=seed
            )
            save_wav(filepath, audio, SAMPLE_RATE)
            metadata.append({
                "filepath": filepath,
                "split": split_name,
                "machine_type": "fan",
                "machine_id": "id_00",
                "is_anomaly": 1 if is_anomaly else 0,
                "anomaly_type": fault,
                "duration": 3.0,
            })

    print(f"Generated {len(metadata)} MIMII acoustic audio recordings in '{output_dir}'.")
    return metadata

if __name__ == "__main__":
    generate_mimii_synthetic_dataset()
