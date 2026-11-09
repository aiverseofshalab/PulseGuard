# PulseGuard — Deep Learning Methodology & Formulation

## 1. Problem Formulation: Unsupervised Acoustic Anomaly Detection

In industrial machine health monitoring, operational failure data is rare, unpredictable, and expensive to produce under supervised conditions. Training supervised binary classifiers leads to extreme class imbalance and failure to detect unmodelled novel fault modes.

PulseGuard utilizes **Unsupervised Acoustic Anomaly Detection (ASD)**:
The model is trained solely on acoustic emissions from normal operating machinery. The model learns the compact manifold of normal acoustic signatures. When anomalous sounds occur (bearing damage, unbalance, rattling, cavitation), the model cannot accurately reconstruct the novel frequency distribution, generating elevated reconstruction residuals.

---

## 2. Signal Processing & Feature Extraction

### 2.1 Acoustic Resampling & Framing
- Audio signals $x(t)$ are resampled to $f_s = 16,000\text{ Hz}$ using polyphase filtering.
- Short-Time Fourier Transform (STFT) is applied using a 1024-point Hann window $w(n)$ with a hop size of $R = 512$ samples (50% overlap):
  $$X(m, k) = \sum_{n=0}^{N-1} x(n + mR) w(n) e^{-j \frac{2\pi k n}{N}}$$

### 2.2 Log-Mel Filterbank Projection
- The power spectrum $|X(m, k)|^2$ is projected onto $M = 128$ triangular Mel filterbanks $H_m(k)$ spanning $0\text{ Hz}$ to $8,000\text{ Hz}$:
  $$\text{Mel}(m, f) = \sum_{k=0}^{N/2} |X(m, k)|^2 H_m(k)$$
- The Mel power is converted to decibel scale and normalized to $[0, 1]$:
  $$S_{\text{norm}}(m, f) = \frac{\max(10 \log_{10} \text{Mel}(m, f), -80) + 80}{80}$$

---

## 3. Deep Learning Architecture: Convolutional Autoencoder (CAE)

The primary anomaly detector is a 2D Convolutional Autoencoder consisting of an encoder $E_\theta$ and a decoder $D_\phi$:

```text
Input (1, 128, 64)
  │
  ▼ Conv2d(1 -> 32, k=3, s=2, p=1) + BatchNorm + LeakyReLU(0.2)   -> (32, 64, 32)
  ▼ Conv2d(32 -> 64, k=3, s=2, p=1) + BatchNorm + LeakyReLU(0.2)  -> (64, 32, 16)
  ▼ Conv2d(64 -> 128, k=3, s=2, p=1) + BatchNorm + LeakyReLU(0.2) -> (128, 16, 8)
  ▼ Conv2d(128 -> 256, k=3, s=2, p=1) + BatchNorm + LeakyReLU(0.2)-> (256, 8, 4)
  │
  ▼ Flatten (8192) -> Linear(8192 -> 64) -> Latent Bottleneck z ∈ R^64
  │
  ▼ Linear(64 -> 8192) -> Reshape (256, 8, 4)
  │
  ▼ ConvTranspose2d(256 -> 128, k=4, s=2, p=1) + LeakyReLU(0.2)   -> (128, 16, 8)
  ▼ ConvTranspose2d(128 -> 64, k=4, s=2, p=1) + LeakyReLU(0.2)    -> (64, 32, 16)
  ▼ ConvTranspose2d(64 -> 32, k=4, s=2, p=1) + LeakyReLU(0.2)     -> (32, 64, 32)
  ▼ ConvTranspose2d(32 -> 1, k=4, s=2, p=1) + Sigmoid              -> Output (1, 128, 64)
```

### 3.1 Loss Function
The model optimizes Mean Squared Error (MSE) over normal spectrogram patches:
$$\mathcal{L}(X, \hat{X}) = \frac{1}{B \cdot F \cdot T} \sum_{b=1}^B \sum_{f=1}^F \sum_{t=1}^T (X_{b,f,t} - \hat{X}_{b,f,t})^2$$

---

## 4. Secondary Baseline: kNN Latent Embedding Distance

To provide independent acoustic benchmarking, the 64-dimensional latent embedding $z = E_\theta(X)$ is extracted from the trained bottleneck.
A reference bank of normal validation embeddings $\{z_i^{(norm)}\}_{i=1}^N$ is indexed using a k-Nearest Neighbors tree.
For test sample $z$, anomaly distance is computed as:
$$d_{kNN}(z) = \frac{1}{k} \sum_{j=1}^k \|z - z_{(j)}^{(norm)}\|_2$$

---

## 5. Statistical Threshold Calibration

Thresholds are never tuned on anomalous test data. Calibration is performed exclusively on normal validation recordings:
- **Warning Threshold ($\tau_{warn}$):** 90th percentile of validation normal reconstruction errors.
- **Critical Threshold ($\tau_{crit}$):** 99th percentile of validation normal reconstruction errors.

The operational status is categorized:
$$\text{Status} = \begin{cases} 
\text{Normal}, & \text{Error} \le \tau_{warn} \\ 
\text{Warning}, & \tau_{warn} < \text{Error} \le \tau_{crit} \\ 
\text{Critical}, & \text{Error} > \tau_{crit} 
\end{cases}$$

