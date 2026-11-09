import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AudioWaveform,
  Upload,
  Mic,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Info,
  Clock,
  Sparkles,
  MessageSquare,
  FileAudio,
} from "lucide-react";
import { api } from "../../services/api";
import { Machine, Analysis, VisualizationData } from "../../types";
import { AudioRecorder } from "../../components/audio/AudioRecorder";
import { WaveformViewer } from "../../components/audio/WaveformViewer";
import { SpectrogramViewer } from "../../components/audio/SpectrogramViewer";

export const AnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedMachineId = searchParams.get("machine_id");

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [inputMode, setInputMode] = useState<"upload" | "microphone">("upload");

  const [audioFile, setAudioFile] = useState<Blob | File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Analysis | null>(null);
  const [visData, setVisData] = useState<VisualizationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Operator Note Form
  const [noteText, setNoteText] = useState("");
  const [noteSubmitted, setNoteSubmitted] = useState(false);

  useEffect(() => {
    const loadMachines = async () => {
      try {
        const res = await api.listMachines();
        setMachines(res.items);
        if (res.items.length > 0) {
          if (preselectedMachineId && res.items.some((m) => m.id === preselectedMachineId)) {
            setSelectedMachineId(preselectedMachineId);
          } else {
            setSelectedMachineId(res.items[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadMachines();
  }, [preselectedMachineId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setAudioFileName(file.name);
      setErrorMsg(null);
    }
  };

  const handleAudioFromRecorder = (blob: Blob) => {
    setAudioFile(blob);
    setAudioFileName("microphone_recording.wav");
    setErrorMsg(null);
  };

  const handleRunAnalysis = async () => {
    if (!selectedMachineId) {
      setErrorMsg("Please select an industrial machine asset first.");
      return;
    }
    if (!audioFile) {
      setErrorMsg("Please upload a WAV file or record audio using the microphone.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setVisData(null);
    setNoteSubmitted(false);

    try {
      const analysis = await api.analyzeAudio(selectedMachineId, audioFile);
      setAnalysisResult(analysis);

      // Fetch rich visual spectrogram and waveform previews
      const visuals = await api.getVisualizations(analysis.id);
      setVisData(visuals);
    } catch (err: any) {
      setErrorMsg(err.message || "Acoustic analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisResult || !noteText.trim()) return;

    try {
      await api.addNote(analysisResult.id, noteText.trim());
      setNoteSubmitted(true);
      setNoteText("");
    } catch (err) {
      console.error(err);
    }
  };

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Acoustic Anomaly Analysis</h1>
        <p className="text-xs text-slate-400">
          Upload machine operating sound recordings or record live audio to run deep-learning inference.
        </p>
      </div>

      {/* Configuration Card */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Machine Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Industrial Machine</label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_identifier} — {m.machine_name} ({m.machine_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Acoustic Input Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  inputMode === "upload"
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold"
                    : "bg-[#070a0f] text-slate-400 border border-[#1f293d] hover:text-white"
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Upload WAV File</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode("microphone")}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  inputMode === "microphone"
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold"
                    : "bg-[#070a0f] text-slate-400 border border-[#1f293d] hover:text-white"
                }`}
              >
                <Mic className="h-4 w-4" />
                <span>Browser Microphone</span>
              </button>
            </div>
          </div>
        </div>

        {/* Input Methods */}
        {inputMode === "upload" ? (
          <div className="border-2 border-dashed border-[#1f293d] hover:border-cyan-500/50 rounded-xl p-8 text-center space-y-3 bg-[#070a0f]/60 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <FileAudio className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {audioFileName ? audioFileName : "Select or drag an industrial WAV file"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                PCM WAV format • Minimum 1.0s • Maximum 15 MB
              </p>
            </div>
            <label className="inline-block px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors border border-slate-700">
              <span>Browse Local Files</span>
              <input
                type="file"
                accept=".wav,audio/wav"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <AudioRecorder onAudioReady={handleAudioFromRecorder} targetDurationSeconds={3} />
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Execute Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={handleRunAnalysis}
            disabled={!audioFile || isAnalyzing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-950/40"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Deep Learning Inference...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Execute Deep Learning Anomaly Detection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Top Result Card */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f293d] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Inference Diagnosis Result
                </span>
                <h3 className="text-lg font-bold text-white">
                  {analysisResult.machine_identifier} — {analysisResult.machine_name}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-white">
                    {analysisResult.anomaly_score.toFixed(1)}
                    <span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Normalized Anomaly Score</div>
                </div>

                <span
                  className={`text-xs font-mono uppercase px-3 py-1 rounded-full font-bold border ${
                    analysisResult.status === "critical"
                      ? "bg-red-500/10 text-red-400 border-red-500/40"
                      : analysisResult.status === "warning"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {analysisResult.status}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">CAE Reconstruction MSE</span>
                <div className="text-sm font-bold font-mono text-cyan-300">
                  {analysisResult.metrics?.reconstruction_error.toFixed(6) || "N/A"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">kNN Embedding Distance</span>
                <div className="text-sm font-bold font-mono text-blue-300">
                  {analysisResult.metrics?.knn_distance?.toFixed(4) || "N/A"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Calibrated Threshold</span>
                <div className="text-sm font-bold font-mono text-slate-300">
                  {analysisResult.threshold.toFixed(6)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Inference Latency</span>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {analysisResult.metrics?.inference_time_ms.toFixed(2)} ms
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Info className="h-4 w-4 shrink-0" />
                <span>Explainable Maintenance Recommendation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">
                {analysisResult.recommendation}
              </p>
            </div>
          </div>

          {/* Spectrogram & Waveform Visualizations */}
          {visData && (
            <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Acoustic Spectral Analysis
              </h3>

              {/* Waveform */}
              <WaveformViewer
                waveform={visData.waveform}
                durationSeconds={visData.duration_seconds}
              />

              {/* 3 Spectrograms: Original vs Reconstructed vs Residual Error */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <SpectrogramViewer
                  title="1. Original Log-Mel Spectrogram"
                  matrix={visData.mel_spectrogram_preview}
                  colormap="magma"
                />
                <SpectrogramViewer
                  title="2. CAE Reconstructed Spectrogram"
                  matrix={visData.reconstructed_preview || visData.mel_spectrogram_preview}
                  colormap="magma"
                />
                <SpectrogramViewer
                  title="3. Residual Error Heatmap (|Original - Recon|)"
                  matrix={visData.error_residual_preview || visData.mel_spectrogram_preview}
                  colormap="error"
                />
              </div>
            </div>
          )}

          {/* Operator Annotation Form */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              <span>Plant Operator Maintenance Log</span>
            </div>

            {noteSubmitted ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                Operator note appended to permanent analysis history.
              </div>
            ) : (
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Annotate physical inspection notes, bearing temperature cross-checks, or maintenance actions taken..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!noteText.trim()}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50"
                  >
                    Save Maintenance Note
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
