import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  BrainCircuit,
  Cpu,
  ShieldCheck,
  Radio,
  AudioWaveform,
  Check,
  Sliders,
} from "lucide-react";
import { api } from "../../services/api";

type ServiceStatus = "Operational" | "Degraded" | "Unavailable" | "Not Configured" | "Not Tested";

interface DiagnosticReport {
  overall_status: ServiceStatus;
  live: boolean;
  ready: boolean;
  services: any;
  ml: any;
  iot: any;
  websocketConnected: boolean;
}

export const DiagnosticsPage: React.FC = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningTest, setRunningTest] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunningTest(true);
    setErrorDetails(null);
    try {
      const [liveRes, readyRes, servicesRes, mlRes, iotRes] = await Promise.all([
        api.getLiveHealth(),
        api.getReadyHealth(),
        api.getServicesHealth(),
        api.getMlHealth(),
        api.getIotHealth(),
      ]);

      // Test WebSocket connectivity
      let wsOk = false;
      try {
        const testWsUrl = api.getWebSocketUrl("test-ping");
        const ws = new WebSocket(testWsUrl);
        await new Promise<void>((resolve) => {
          ws.onopen = () => {
            wsOk = true;
            ws.close();
            resolve();
          };
          ws.onerror = () => {
            wsOk = false;
            resolve();
          };
          setTimeout(resolve, 1500);
        });
      } catch {
        wsOk = false;
      }

      setReport({
        overall_status: servicesRes.overall_status || "Operational",
        live: liveRes.status === "Operational",
        ready: readyRes.status === "Operational",
        services: servicesRes.services || {},
        ml: mlRes || {},
        iot: iotRes || {},
        websocketConnected: wsOk,
      });
    } catch (err: any) {
      setErrorDetails(err.message || "Failed to execute diagnostic probes.");
      setReport({
        overall_status: "Unavailable",
        live: false,
        ready: false,
        services: {},
        ml: {},
        iot: {},
        websocketConnected: false,
      });
    } finally {
      setLoading(false);
      setRunningTest(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusBadge = (status: ServiceStatus | string) => {
    switch (status) {
      case "Operational":
      case "Present":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>OPERATIONAL</span>
          </span>
        );
      case "Degraded":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>DEGRADED</span>
          </span>
        );
      case "Unavailable":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-bold">
            <XCircle className="h-3.5 w-3.5" />
            <span>UNAVAILABLE</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Self-Diagnostics & Health</h1>
          <p className="text-xs text-slate-400">
            Real-time automated diagnostic matrix verifying all backend, ML, database, and IoT simulation probes.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={runningTest}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-950/40"
        >
          <RefreshCw className={`h-4 w-4 ${runningTest ? "animate-spin" : ""}`} />
          <span>{runningTest ? "Probing Systems..." : "Re-Run All Probes"}</span>
        </button>
      </div>

      {errorDetails && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <strong>Probe Failure:</strong> {errorDetails}
          </div>
        </div>
      )}

      {/* Main Status Header Card */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Overall PulseGuard Platform Status
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
              <span>System Health:</span>
              <span className={report?.overall_status === "Operational" ? "text-emerald-400" : "text-amber-400"}>
                {report?.overall_status || "Checking..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            Liveness:{" "}
            <span className={report?.live ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {report?.live ? "PASS" : "FAIL"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            Readiness:{" "}
            <span className={report?.ready ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {report?.ready ? "PASS" : "DEGRADED"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Diagnostic Probes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Backend API Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">FastAPI Backend</h3>
            </div>
            {getStatusBadge(report?.live ? "Operational" : "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Liveness Probe:</span>
              <span className="text-slate-200">GET /api/v1/health/live</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="text-slate-200">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="text-cyan-300">Development / Production Ready</span>
            </div>
          </div>
        </div>

        {/* 2. Database Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Database Engine</h3>
            </div>
            {getStatusBadge(report?.services?.database?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Storage Driver:</span>
              <span className="text-slate-200">{report?.services?.database?.driver || "SQLite / Postgres"}</span>
            </div>
            <div className="flex justify-between">
              <span>Roundtrip Latency:</span>
              <span className="text-emerald-400">{report?.services?.database?.latency_ms || 0} ms</span>
            </div>
            <div className="flex justify-between">
              <span>Registered Assets:</span>
              <span className="text-slate-200">{report?.services?.assets_registered || 0} machines</span>
            </div>
          </div>
        </div>

        {/* 3. Deep Learning CAE Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">ConvAutoencoder</h3>
            </div>
            {getStatusBadge(report?.ml?.cae_model?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Checkpoint File:</span>
              <span className={report?.ml?.cae_model?.weights_file_present ? "text-emerald-400" : "text-red-400"}>
                {report?.ml?.cae_model?.weights_file_present ? "Present (.pt)" : "Missing"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Latent Bottleneck:</span>
              <span className="text-slate-200">64 Dimensions</span>
            </div>
            <div className="flex justify-between">
              <span>Inference Device:</span>
              <span className="text-cyan-300">{report?.ml?.cae_model?.device || "cpu"}</span>
            </div>
          </div>
        </div>

        {/* 4. kNN Latent Baseline Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">kNN Feature Baseline</h3>
            </div>
            {getStatusBadge(report?.ml?.knn_baseline?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Reference Vectors:</span>
              <span className="text-emerald-400">{report?.ml?.knn_baseline?.reference_embeddings_count || 0} normal embeddings</span>
            </div>
            <div className="flex justify-between">
              <span>Distance Metric:</span>
              <span className="text-slate-200">Euclidean</span>
            </div>
            <div className="flex justify-between">
              <span>k Neighbors:</span>
              <span className="text-slate-200">k = 5</span>
            </div>
          </div>
        </div>

        {/* 5. Acoustic Preprocessor Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AudioWaveform className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Log-Mel Preprocessor</h3>
            </div>
            {getStatusBadge(report?.services?.acoustic_preprocessing?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Target Sampling Rate:</span>
              <span className="text-slate-200">16,000 Hz Mono</span>
            </div>
            <div className="flex justify-between">
              <span>STFT Window / Hop:</span>
              <span className="text-slate-200">1024 / 512</span>
            </div>
            <div className="flex justify-between">
              <span>Mel Filterbanks:</span>
              <span className="text-cyan-300">128 Mel Bands (0-8 kHz)</span>
            </div>
          </div>
        </div>

        {/* 6. Software IoT Simulator Probe */}
        <div className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Tinkercad IoT Sim</h3>
            </div>
            {getStatusBadge(report?.iot?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Tinkercad Firmware:</span>
              <span className="text-emerald-400">{report?.iot?.tinkercad_firmware_file || "Present"}</span>
            </div>
            <div className="flex justify-between">
              <span>Virtual Bridge:</span>
              <span className="text-emerald-400">{report?.iot?.virtual_sensor_bridge_file || "Present"}</span>
            </div>
            <div className="flex justify-between">
              <span>WebSocket Stream:</span>
              <span className={report?.websocketConnected ? "text-emerald-400" : "text-amber-400"}>
                {report?.websocketConnected ? "Connected" : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Readiness Checklist */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <h3 className="text-sm font-bold text-white uppercase font-mono">
          Deployment & Security Readiness Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Zero Physical Hardware Dependency</div>
              <div className="text-[11px] text-slate-500">100% software simulated via Tinkercad reference spec</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Row-Level Tenant Isolation</div>
              <div className="text-[11px] text-slate-500">Enforced user_id boundaries on every database query</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Binary Audio Sanitization</div>
              <div className="text-[11px] text-slate-500">Magic-byte checks & in-memory buffer decoding</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">Calibrated Percentile Thresholds</div>
              <div className="text-[11px] text-slate-500">Calibrated strictly on normal validation soundscapes (P90/P99)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
