import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  X,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Cpu,
  Radio,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../services/api";
import { AnalysisExplainability, VisualizationData } from "../../../types";
import { SpectrogramViewer } from "../../../components/audio/SpectrogramViewer";

interface AIExplainabilityModalProps {
  analysisId: string;
  onClose: () => void;
}

export const AIExplainabilityModal: React.FC<AIExplainabilityModalProps> = ({
  analysisId,
  onClose,
}) => {
  const [data, setData] = useState<AnalysisExplainability | null>(null);
  const [visData, setVisData] = useState<VisualizationData | null>(null);
  const [activeSpecTab, setActiveSpecTab] = useState<"original" | "reconstructed" | "residual">("original");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExplainability = async () => {
      try {
        setLoading(true);
        const [expRes, visRes] = await Promise.all([
          api.getExplainability(analysisId),
          api.getVisualizations(analysisId),
        ]);
        setData(expRes);
        setVisData(visRes);
      } catch (err: any) {
        setError(err.message || "Failed to load AI explainability details.");
      } finally {
        setLoading(false);
      }
    };
    fetchExplainability();
  }, [analysisId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b0f17] border border-[#1f293d] shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#1f293d] flex items-center justify-between bg-[#070a0f]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">AI Acoustic Decision Explainability</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {data?.model_version || "cae-mimii-v1.0.0"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quantitative spectrogram decomposition & multi-sensor evidence attribution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
              <span>Synthesizing neural model explainability...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">ANOMALY SCORE</span>
                  <span className={`text-xl font-bold ${data.status === "critical" ? "text-red-400" : data.status === "warning" ? "text-amber-400" : "text-emerald-400"}`}>
                    {data.anomaly_score.toFixed(1)} / 100
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RECONSTRUCTION MSE</span>
                  <span className="text-xl font-bold text-white">
                    {data.reconstruction_error.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CALIBRATED THRESHOLD</span>
                  <span className="text-xl font-bold text-cyan-400">
                    {data.threshold.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">INFERENCE TIME</span>
                  <span className="text-xl font-bold text-slate-300">
                    {data.inference_time_ms.toFixed(2)} ms
                  </span>
                </div>
              </div>

              {/* Interpretable Plain-English Synthesis */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-300 uppercase">
                  <Sparkles className="h-4 w-4" />
                  <span>Model Decision Narrative</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {data.interpretable_summary}
                </p>
              </div>

              {/* Interactive Spectrogram Reconstruction Comparison */}
              {visData && (
                <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono text-slate-200 uppercase">
                      Neural Spectrogram Reconstruction Comparison
                    </span>
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
                      <button
                        onClick={() => setActiveSpecTab("original")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          activeSpecTab === "original"
                            ? "bg-cyan-500/20 text-cyan-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Original Audio Mel
                      </button>
                      <button
                        onClick={() => setActiveSpecTab("reconstructed")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          activeSpecTab === "reconstructed"
                            ? "bg-cyan-500/20 text-cyan-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        CAE Reconstructed
                      </button>
                      <button
                        onClick={() => setActiveSpecTab("residual")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          activeSpecTab === "residual"
                            ? "bg-red-500/20 text-red-300 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Residual Error Matrix
                      </button>
                    </div>
                  </div>

                  <SpectrogramViewer
                    matrix={
                      activeSpecTab === "original"
                        ? visData.mel_spectrogram_preview
                        : activeSpecTab === "reconstructed"
                        ? visData.reconstructed_preview || visData.mel_spectrogram_preview
                        : visData.error_residual_preview || visData.mel_spectrogram_preview
                    }
                    colormap={activeSpecTab === "residual" ? "error" : "magma"}
                    title={
                      activeSpecTab === "original"
                        ? "Input Log-Mel Spectrogram (128 Bands, 0–8,000 Hz)"
                        : activeSpecTab === "reconstructed"
                        ? "ConvAutoencoder Nominal Reconstruction Filter"
                        : "Absolute Squared Error Residual (|Original - Reconstructed|²)"
                    }
                  />
                </div>
              )}

              {/* Spectral Frequency Sub-Band Attribution */}
              <div className="space-y-3">
                <span className="text-xs font-bold font-mono text-slate-200 uppercase">
                  Frequency Sub-Band Residual Decomposition
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.frequency_bands_attribution.map((band, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-200">{band.band_name}</span>
                        <span className="text-cyan-400 font-bold">{band.residual_percentage}%</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{band.freq_range}</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full transition-all duration-500"
                          style={{ width: `${band.residual_percentage}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug font-sans">
                        {band.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dual-Column Quantitative Evidence Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Model-Based Evidence */}
                <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-300 uppercase">
                    <BrainCircuit className="h-4 w-4" />
                    <span>Acoustic Deep Learning Evidence</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
                    {data.model_based_evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Rule-Based IoT Evidence */}
                <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-emerald-300 uppercase">
                    <Cpu className="h-4 w-4" />
                    <span>Condition Telemetry Evidence (Simulated)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
                    {data.iot_telemetry_evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Legal Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <Info className="h-4 w-4 text-slate-500 shrink-0" />
                <span>
                  <strong>Scientific Methodology Notice:</strong> {data.disclaimer}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
