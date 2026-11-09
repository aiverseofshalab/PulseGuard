# PulseGuard — MIMII Industrial Acoustic Dataset Specifications

## 1. Overview: The MIMII Dataset

The **MIMII (Malfunctioning Industrial Machine Investigation and Inspection)** dataset is the premier academic and industrial benchmark for acoustic anomalous sound detection (ASD) in machine condition monitoring.
- **Official Zenodo Archive:** https://zenodo.org/records/3384388
- **Published Research Paper:** Purohit et al., *"MIMII Dataset: Sound Dataset for Malfunctioning Industrial Machine Investigation and Inspection"*, arXiv:1909.09347.

The dataset captures operating sounds from four machine categories:
1. **Fan:** Industrial ventilation and cooling blowers.
2. **Pump:** Centrifugal water and chemical slurry pumps.
3. **Valve:** Solenoid and pneumatic valves operating under repeated cycling.
4. **Slide Rail:** Linear CNC guides and ball-screw feed mechanisms.

---

## 2. Acoustic Feature Extraction Configuration

To guarantee exact numerical alignment between training and real-time browser/API inference, the following pipeline parameters are strictly standardized:

| Parameter | Value | Engineering Justification |
|---|---|---|
| **Audio Format** | PCM WAV (16-bit) | Lossless temporal preservation without compression artifacts |
| **Sampling Rate ($f_s$)** | 16,000 Hz | Captures acoustic frequencies up to the 8,000 Hz Nyquist boundary |
| **Audio Channels** | Mono (1 channel) | Multi-channel recordings are downmixed to channel-invariant mono |
| **STFT Window** | 1024 points (Hann) | Optimal trade-off between frequency resolution ($\Delta f = 15.625\text{ Hz}$) and time resolution |
| **Hop Size** | 512 samples | 50% window overlap ensuring smooth spectral continuity |
| **Mel Filterbanks** | 128 Mel bands | Psychoacoustically spaced filters matching auditory sensitivity |
| **Frequency Range** | 0 Hz – 8,000 Hz | Covers motor harmonics, blade-pass, and high-frequency friction |
| **Amplitude Scale** | Normalized Log-Mel | Decibel power capped at [-80 dB, 0 dB] and scaled to $[0.0, 1.0]$ |

---

## 3. Physical Soundscape Generator (Synthetic MIMII Subset)

PulseGuard's `training/scripts/prepare_mimii_data.py` implements a physics-based soundscape generator modeling the exact spectral components of industrial rotating fans:

1. **Shaft Rotation Fundamental ($1\times$):** Continuous sinusoidal wave at $\frac{\text{RPM}}{60} = 40\text{ Hz}$.
2. **Blade Pass Frequency (BPF):** Dominant aerodynamic pressure peak at $\text{BPF} = \text{Blades} \times \text{Fund} = 5 \times 40 = 200\text{ Hz}$, with secondary harmonics at 400 Hz, 600 Hz, and 800 Hz.
3. **Aerodynamic Turbulence:** Filtered pink broadband airflow noise.
4. **Mechanical Fault Injections:**
   - **Bearing Friction:** High-frequency impulsive acoustic bursts (2500–4500 Hz) modulated at ball-pass outer race frequencies (BPFO).
   - **Blade Unbalance:** Amplitude modulation of the $1\times$ fundamental shaft frequency.
   - **Mechanical Rattling:** Impact pulse trains with exponential resonant decay.
