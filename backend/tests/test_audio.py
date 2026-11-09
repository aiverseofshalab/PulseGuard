import io
import wave
import numpy as np
import pytest
from backend.app.ml.preprocessing.audio_processor import AudioProcessor, AudioValidationError

@pytest.fixture
def processor():
    return AudioProcessor()

def create_synthetic_wav(
    duration: float = 3.0,
    sr: int = 16000,
    amplitude: float = 0.5,
    freq: float = 440.0,
    channels: int = 1
) -> bytes:
    total_samples = int(duration * sr)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    waveform = amplitude * np.sin(2 * np.pi * freq * t)

    if channels == 2:
        waveform = np.column_stack([waveform, waveform])

    int_data = (waveform * 32767.0).astype(np.int16)
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(int_data.tobytes())
    return bio.getvalue()

def test_valid_audio_processing(processor):
    wav_bytes = create_synthetic_wav(duration=3.0, sr=16000, amplitude=0.6)
    waveform, meta = processor.validate_and_load_wav(wav_bytes)

    assert meta["audio_quality"] == "valid"
    assert meta["original_sample_rate"] == 16000
    assert meta["duration_seconds"] == 3.0
    assert len(waveform) == 48000

    spec = processor.compute_log_mel_spectrogram(waveform)
    assert spec.shape[0] == 128
    assert 0.0 <= spec.min() <= spec.max() <= 1.0

def test_stereo_downmix(processor):
    wav_bytes = create_synthetic_wav(duration=2.0, sr=16000, channels=2)
    waveform, meta = processor.validate_and_load_wav(wav_bytes)

    assert meta["original_channels"] == 2
    assert meta["processed_sample_rate"] == 16000
    assert len(waveform.shape) == 1  # Flattened to mono

def test_resampling_from_44100(processor):
    wav_bytes = create_synthetic_wav(duration=2.0, sr=44100)
    waveform, meta = processor.validate_and_load_wav(wav_bytes)

    assert meta["original_sample_rate"] == 44100
    assert meta["processed_sample_rate"] == 16000
    assert len(waveform) == 32000

def test_corrupt_audio_rejection(processor):
    corrupt_bytes = b"NOT_A_WAV_FILE_JUST_RANDOM_GARBAGE_PAYLOAD"
    with pytest.raises(AudioValidationError):
        processor.validate_and_load_wav(corrupt_bytes)

def test_silent_audio_detection(processor):
    silent_bytes = create_synthetic_wav(duration=3.0, amplitude=0.0001)
    waveform, meta = processor.validate_and_load_wav(silent_bytes)

    assert meta["audio_quality"] == "silent"
    assert "silent" in meta["quality_issues"][0].lower()

def test_clipped_audio_detection(processor):
    clipped_bytes = create_synthetic_wav(duration=3.0, amplitude=1.0)
    waveform, meta = processor.validate_and_load_wav(clipped_bytes)

    assert meta["clipping_ratio"] > 0.0
