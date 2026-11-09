import io
import wave
import numpy as np
import scipy.signal
from typing import Tuple, Dict, Any, Optional

class AudioValidationError(Exception):
    """Raised when uploaded audio fails format, size, or acoustic quality checks."""
    pass

class AudioProcessor:
    def __init__(
        self,
        sample_rate: int = 16000,
        n_fft: int = 1024,
        hop_length: int = 512,
        n_mels: int = 128,
        f_min: float = 0.0,
        f_max: float = 8000.0,
        min_duration_sec: float = 1.0,
        max_duration_sec: float = 15.0,
        clipping_threshold: float = 0.995,
        max_clipping_ratio: float = 0.015,
        silence_rms_threshold: float = 0.005,
    ):
        self.sample_rate = sample_rate
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.n_mels = n_mels
        self.f_min = f_min
        self.f_max = f_max
        self.min_duration_sec = min_duration_sec
        self.max_duration_sec = max_duration_sec
        self.clipping_threshold = clipping_threshold
        self.max_clipping_ratio = max_clipping_ratio
        self.silence_rms_threshold = silence_rms_threshold

        
        self.mel_basis = self._build_mel_basis()

    def _hz_to_mel(self, hz: np.ndarray) -> np.ndarray:
        return 2595.0 * np.log10(1.0 + hz / 700.0)

    def _mel_to_hz(self, mel: np.ndarray) -> np.ndarray:
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

    def _build_mel_basis(self) -> np.ndarray:
        """Constructs an exact triangular Mel filterbank matrix."""
        n_freqs = self.n_fft // 2 + 1
        fft_freqs = np.linspace(0, self.sample_rate / 2.0, n_freqs)

        min_mel = self._hz_to_mel(self.f_min)
        max_mel = self._hz_to_mel(self.f_max)
        mel_points = np.linspace(min_mel, max_mel, self.n_mels + 2)
        hz_points = self._mel_to_hz(mel_points)

        # Convert Hz points to FFT bin indices
        bins = np.floor((self.n_fft + 1) * hz_points / self.sample_rate).astype(int)
        bins = np.clip(bins, 0, n_freqs - 1)

        weights = np.zeros((self.n_mels, n_freqs), dtype=np.float32)
        for i in range(1, self.n_mels + 1):
            left = bins[i - 1]
            center = bins[i]
            right = bins[i + 1]

            if center > left:
                weights[i - 1, left:center] = (np.arange(left, center) - left) / (center - left)
            if right > center:
                weights[i - 1, center:right] = (right - np.arange(center, right)) / (right - center)

        # Slaney area normalization
        enorm = 2.0 / (hz_points[2 : self.n_mels + 2] - hz_points[: self.n_mels])
        weights *= enorm[:, np.newaxis]
        return weights

    def validate_and_load_wav(self, audio_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Validates WAV header, decodes audio, performs audio quality tests,
        and resamples to standardized 16 kHz mono waveform.
        """
        if not audio_bytes:
            raise AudioValidationError("Audio file is completely empty.")

        # Check RIFF/WAVE signature
        if len(audio_bytes) < 44 or not audio_bytes.startswith(b"RIFF") or b"WAVE" not in audio_bytes[:16]:
            raise AudioValidationError("Invalid audio format. Only PCM WAV audio files are accepted.")

        try:
            with io.BytesIO(audio_bytes) as bio:
                with wave.open(bio, "rb") as wf:
                    n_channels = wf.getnchannels()
                    sampwidth = wf.getsampwidth()
                    orig_sr = wf.getframerate()
                    n_frames = wf.getnframes()
                    raw_data = wf.readframes(n_frames)
        except Exception as e:
            raise AudioValidationError(f"Corrupt or unreadable WAV structure: {str(e)}")

        if n_frames == 0:
            raise AudioValidationError("Audio file contains zero audio frames.")

        # Decode raw PCM bytes based on sample width
        if sampwidth == 2:  # 16-bit PCM
            data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
        elif sampwidth == 1:  # 8-bit unsigned PCM
            data = (np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
        elif sampwidth == 4:  # 32-bit float or int
            data = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32) / 2147483648.0
        else:
            raise AudioValidationError(f"Unsupported bit depth: {sampwidth * 8}-bit PCM.")

        # Multi-channel to mono downmixing
        if n_channels > 1:
            data = data.reshape(-1, n_channels)
            data = np.mean(data, axis=1)

        # Duration validation
        duration = len(data) / float(orig_sr)
        if duration < self.min_duration_sec:
            raise AudioValidationError(
                f"Audio duration ({duration:.2f}s) is too short. Minimum duration is {self.min_duration_sec}s."
            )
        if duration > self.max_duration_sec:
            # Safely truncate to max_duration
            data = data[: int(self.max_duration_sec * orig_sr)]
            duration = self.max_duration_sec

        # High-quality polyphase or linear resampling to self.sample_rate (16,000 Hz)
        if orig_sr != self.sample_rate:
            target_length = int(round(len(data) * float(self.sample_rate) / orig_sr))
            data = scipy.signal.resample(data, target_length)

        # Acoustic Quality Checks
        abs_data = np.abs(data)
        rms = float(np.sqrt(np.mean(data**2) + 1e-12))
        clipping_ratio = float(np.mean(abs_data >= self.clipping_threshold))

        audio_quality = "valid"
        quality_issues = []

        if rms < self.silence_rms_threshold:
            audio_quality = "silent"
            quality_issues.append("Low signal amplitude / silent recording detected")
        elif clipping_ratio > self.max_clipping_ratio:
            audio_quality = "clipped"
            quality_issues.append(f"Excessive clipping detected ({clipping_ratio*100:.1f}% samples clipped)")

        meta = {
            "original_sample_rate": orig_sr,
            "processed_sample_rate": self.sample_rate,
            "original_channels": n_channels,
            "duration_seconds": round(duration, 3),
            "total_samples": len(data),
            "rms_energy": round(rms, 5),
            "clipping_ratio": round(clipping_ratio, 4),
            "audio_quality": audio_quality,
            "quality_issues": quality_issues,
        }

        return data.astype(np.float32), meta

    def compute_log_mel_spectrogram(self, waveform: np.ndarray) -> np.ndarray:
        """
        Generates calibrated Log-Mel Spectrogram:
        - 1024-point Hann window
        - 512 hop length
        - 128 Mel bands
        - Log power representation scaled to [0, 1]
        Returns: 2D array of shape (n_mels, time_steps)
        """
        # Short-Time Fourier Transform (STFT)
        window = np.hanning(self.n_fft)
        frequencies, times, zxx = scipy.signal.stft(
            waveform,
            fs=self.sample_rate,
            window=window,
            nperseg=self.n_fft,
            noverlap=self.n_fft - self.hop_length,
            boundary="zeros",
            padded=True
        )

        # Compute power spectrum: |STFT|^2
        power_spec = np.abs(zxx) ** 2

        # Project power onto Mel filterbank
        # mel_basis: (128, 513), power_spec: (513, time_steps) -> mel_spec: (128, time_steps)
        mel_spec = np.dot(self.mel_basis, power_spec)

        # Convert to Decibels: 10 * log10(max(S, 1e-10))
        mel_spec = np.maximum(mel_spec, 1e-10)
        log_mel = 10.0 * np.log10(mel_spec)

        # Normalize to dynamic range [-80 dB, 0 dB] relative to peak, then map to [0, 1]
        ref_db = np.max(log_mel)
        norm_mel = (log_mel - ref_db + 80.0) / 80.0
        norm_mel = np.clip(norm_mel, 0.0, 1.0)

        return norm_mel.astype(np.float32)

audio_processor = AudioProcessor()
