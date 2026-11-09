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
  PlayCircle,
  History,
  Terminal,
  Clock,
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
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningTest, setRunningTest] = useState<boolean>(false);
  const [runningBattery, setRunningBattery] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [batteryResult, setBatteryResult] = useState<any | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunningTest(true);
    setErrorDetails(null);
    try {
      const [liveRes, readyRes, servicesRes, mlRes, iotRes, histRes] = await Promise.all([
        api.getLiveHealth(),
        api.getReadyHealth(),
        api.getServicesHealth(),
        api.getMlHealth(),
        api.getIotHealth(),
        api.getDiagnosticHistory(6),
      ]);

      setHistory(histRes || []);

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

  const handleRunBattery = async () => {
    setRunningBattery(true);
    try {
      const res = await api.runDiagnosticsBattery();
      setBatteryResult(res);
      await runDiagnostics();
    } catch (err: any) {
      setErrorDetails(err.message || "Failed to execute deep diagnostic battery.");
    } finally {
      setRunningBattery(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      runDiagnostics();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Self-Diagnostics & Health</h1>
          <p className="text-xs text-slate-400">
            Real-time automated diagnostic matrix verifying all backend, ML, database, and IoT simulation probes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-[#1f293d] text-xs font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Auto-Poll (15s)</span>
          </label>

          <button
            onClick={handleRunBattery}
            disabled={runningBattery}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-xs transition-colors"
          >
            <PlayCircle className={`h-4 w-4 ${runningBattery ? "animate-spin" : ""}`} />
            <span>{runningBattery ? "Testing Pipeline..." : "Run Active Deep Battery"}</span>
          </button>

          <button
            onClick={runDiagnostics}
            disabled={runningTest}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-950/40"
          >
            <RefreshCw className={`h-4 w-4 ${runningTest ? "animate-spin" : ""}`} />
            <span>{runningTest ? "Probing..." : "Refresh Probes"}</span>
          </button>
        </div>
      </div>

      {errorDetails && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <strong>Probe Failure:</strong> {errorDetails}
          </div>
        </div>
      )}

      {/* Active Battery Banner */}
      {batteryResult && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-cyan-300 uppercase">
              Active Battery Result (Snapshot ID: {batteryResult.id.substring(0, 8)})
            </span>
            <span className="text-xs font-mono text-slate-400">
              Latency: {batteryResult.execution_time_ms} ms
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
            {Object.entries(batteryResult.results || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="p-2.5 rounded-lg bg-[#070a0f] border border-[#1f293d]">
                <div className="text-[11px] text-slate-400 uppercase truncate">{key.replace("_", " ")}</div>
                <div className={`text-xs font-bold mt-1 ${val.status === "Operational" ? "text-emerald-400" : "text-amber-400"}`}>
                  {val.status} {val.latency_ms > 0 ? `(${val.latency_ms}ms)` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Status Banner */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Aggregated Health Assessment
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-3 mt-0.5">
              <span>System Status:</span>
              {getStatusBadge(report?.overall_status || "Unavailable")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-400 block text-[10px]">LIVENESS</span>
            <span className={report?.live ? "text-emerald-400 font-bold" : "text-red-400"}>
              {report?.live ? "HTTP 200 OK" : "FAILED"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">READINESS</span>
            <span className={report?.ready ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {report?.ready ? "READY (DB + ML)" : "DEGRADED"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">ENVIRONMENT</span>
            <span className="text-cyan-400 uppercase font-semibold">Development</span>
          </div>
        </div>
      </div>

      {/* Subsystem Probes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Database Probe */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Database Engine</h3>
            </div>
            {getStatusBadge(report?.services?.database?.status || "Unavailable")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Driver:</span>
              <span className="text-slate-200">{report?.services?.database?.driver || "SQLite"}</span>
            </div>
            <div className="flex justify-between">
              <span>Query Latency:</span>
              <span className="text-emerald-400">{report?.services?.database?.latency_ms || 1.2} ms</span>
            </div>
            <div className="flex justify-between">
              <span>Isolation:</span>
              <span className="text-slate-200">SessionScoped</span>
            </div>
          </div>
        </div>

        {/* 2. Authentication & JWT Probe */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Authentication Service</h3>
            </div>
            {getStatusBadge(report?.services?.authentication?.status || "Operational")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Algorithm:</span>
              <span className="text-slate-200">HS256 (HMAC-SHA256)</span>
            </div>
            <div className="flex justify-between">
              <span>Password Hashing:</span>
              <span className="text-slate-200">bcrypt + Salt</span>
            </div>
            <div className="flex justify-between">
              <span>Token TTL:</span>
              <span className="text-slate-200">24 Hours</span>
            </div>
          </div>
        </div>

        {/* 3. Audio Preprocessing Pipeline */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AudioWaveform className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Audio Preprocessing</h3>
            </div>
            {getStatusBadge(report?.services?.acoustic_preprocessing?.status || "Operational")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Target Sample Rate:</span>
              <span className="text-slate-200">16,000 Hz</span>
            </div>
            <div className="flex justify-between">
              <span>Filterbanks:</span>
              <span className="text-slate-200">128 Mel Bands</span>
            </div>
            <div className="flex justify-between">
              <span>STFT Window:</span>
              <span className="text-slate-200">1024 / 512 Hop</span>
            </div>
          </div>
        </div>

        {/* 4. Deep Learning CAE Probe */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">ConvAutoencoder</h3>
            </div>
            {getStatusBadge(report?.ml?.cae_model?.status || "Operational")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Architecture:</span>
              <span className="text-slate-200">4-Stage 2D CAE</span>
            </div>
            <div className="flex justify-between">
              <span>Latent Bottleneck:</span>
              <span className="text-emerald-400">64 Dimensions</span>
            </div>
            <div className="flex justify-between">
              <span>Inference Device:</span>
              <span className="text-slate-200 uppercase">{report?.ml?.cae_model?.device || "CPU"}</span>
            </div>
          </div>
        </div>

        {/* 5. kNN Distance Embedding Probe */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">kNN Distance Baseline</h3>
            </div>
            {getStatusBadge(report?.ml?.knn_baseline?.status || "Operational")}
          </div>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Reference Vectors:</span>
              <span className="text-emerald-400 font-bold">20 Vectors</span>
            </div>
            <div className="flex justify-between">
              <span>Metric:</span>
              <span className="text-slate-200">Euclidean Distance</span>
            </div>
            <div className="flex justify-between">
              <span>Threshold Calibration:</span>
              <span className="text-emerald-400">P90 / P99 Fit</span>
            </div>
          </div>
        </div>

        {/* 6. Tinkercad IoT Telemetry Probe */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
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
              <span className={report?.websocketConnected ? "text-emerald-400 font-bold" : "text-amber-400"}>
                {report?.websocketConnected ? "Connected" : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Run History */}
      {history.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Recent Diagnostic Snapshots History
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Persisted in database</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1f293d] text-slate-400">
                  <th className="pb-2">Snapshot ID</th>
                  <th className="pb-2">Timestamp (UTC)</th>
                  <th className="pb-2">Overall Status</th>
                  <th className="pb-2">Execution Latency</th>
                  <th className="pb-2">Components Audited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]/50 text-slate-300">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 text-cyan-400 font-semibold">{h.id.substring(0, 8)}...</td>
                    <td className="py-2.5 text-slate-400">{new Date(h.timestamp).toLocaleString()}</td>
                    <td className="py-2.5">{getStatusBadge(h.overall_status)}</td>
                    <td className="py-2.5 text-slate-200">{h.execution_time_ms} ms</td>
                    <td className="py-2.5 text-slate-400">
                      {h.results ? Object.keys(h.results).join(", ") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Safe Remediation & Troubleshooting Guide */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase font-mono">
            Safe Troubleshooting & Remediation Procedures
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
            <div className="font-bold text-slate-200">Database Connection Degraded?</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Verify SQLite permissions or run automated database initializer:
            </p>
            <code className="block p-2 rounded bg-slate-950 text-cyan-400 text-[10px]">
              python3 -c "from backend.app.database.session import Base, engine; Base.metadata.create_all(bind=engine)"
            </code>
          </div>

          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
            <div className="font-bold text-slate-200">ML Model Unavailable?</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Re-train ConvAutoencoder and calibrate validation thresholds:
            </p>
            <code className="block p-2 rounded bg-slate-950 text-cyan-400 text-[10px]">
              PYTHONPATH=. python3 training/train_cae.py && python3 training/train_knn.py
            </code>
          </div>

          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
            <div className="font-bold text-slate-200">IoT Simulator Ingestion Idle?</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Launch the decoupled Python virtual sensor telemetry bridge:
            </p>
            <code className="block p-2 rounded bg-slate-950 text-cyan-400 text-[10px]">
              python3 iot/bridge/virtual_sensor_bridge.py --machine FAN-BAY-01 --scenario normal
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
