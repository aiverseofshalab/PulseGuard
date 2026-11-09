import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  AudioWaveform,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Cpu,
  RefreshCw,
  Plus,
  TrendingUp,
} from "lucide-react";
import { api } from "../../services/api";
import { DashboardSummary, Machine } from "../../types";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, machRes] = await Promise.all([
        api.getDashboardSummary(),
        api.listMachines(),
      ]);
      setSummary(sumRes);
      setMachines(machRes.items);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400 text-sm font-mono gap-2">
        <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
        <span>Loading industrial metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Industrial Plant Monitoring</h1>
          <p className="text-xs text-slate-400">
            Real-time acoustic anomaly scores and simulated IoT condition monitoring telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[#0b0f17] border border-[#1f293d] text-slate-400 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <Link
            to="/analysis"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40"
          >
            <AudioWaveform className="h-4 w-4" />
            <span>New Acoustic Analysis</span>
          </Link>
        </div>
      </div>

      {/* Critical Alert Bar if any critical machine exists */}
      {summary && summary.critical_count > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4 text-red-300 text-xs">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-red-200">CRITICAL ANOMALY ALERT:</span>{" "}
              {summary.critical_count} machine recording(s) significantly exceeded calibrated acoustic failure thresholds.
            </div>
          </div>
          <Link
            to="/analytics"
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] shrink-0"
          >
            Inspect Alerts
          </Link>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>REGISTERED ASSETS</span>
            <Server className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {summary?.total_machines || 0}
          </div>
          <div className="text-[11px] text-slate-500">Virtual machines monitored</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>RECORDINGS ANALYZED</span>
            <AudioWaveform className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {summary?.total_recordings_analyzed || 0}
          </div>
          <div className="text-[11px] text-slate-500">Acoustic inference runs</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>NORMAL SOUNDSCAPES</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {summary?.normal_count || 0}
          </div>
          <div className="text-[11px] text-slate-500">&lt; Calibrated warning threshold</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ACOUSTIC WARNINGS</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {summary?.warning_count || 0}
          </div>
          <div className="text-[11px] text-slate-500">Early mechanical degradation</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>CRITICAL ALERTS</span>
            <AlertOctagon className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-red-400">
            {summary?.critical_count || 0}
          </div>
          <div className="text-[11px] text-slate-500">&gt; Calibrated critical threshold</div>
        </div>
      </div>

      {/* Main Two-Column Section: Machine Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Registered Industrial Machines Overview */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Machine Asset Fleet</h3>
              <p className="text-xs text-slate-400">Live operational status and latest acoustic scores</p>
            </div>
            <Link
              to="/machines"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Manage Fleet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {machines.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono border border-dashed border-[#1f293d] rounded-xl">
              No registered machines found. Click "Manage Fleet" to register your first virtual asset.
            </div>
          ) : (
            <div className="space-y-3">
              {machines.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
                      {m.machine_type.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{m.machine_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {m.machine_identifier}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Category: {m.machine_type.replace("_", " ").toUpperCase()} • {m.total_analyses} analyses
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {m.latest_score !== null && (
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-300">
                          {m.latest_score.toFixed(1)}/100
                        </div>
                        <div className="text-[10px] text-slate-500">Acoustic Score</div>
                      </div>
                    )}
                    <span
                      className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                        m.status === "critical"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : m.status === "warning"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Telemetry & Simulator Launcher */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Software IoT Simulator</h3>
            <p className="text-xs text-slate-400">
              Autodesk Tinkercad reference architecture & virtual telemetry bridge.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Bridge Ingestion:</span>
              <span className="text-emerald-400">REST & WebSocket</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Simulated Nodes:</span>
              <span className="text-cyan-300">TMP36 + Tach + Vib</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Hardware Dependency:</span>
              <span className="text-slate-300">0% (Pure Software)</span>
            </div>
          </div>

          <Link
            to="/simulator"
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>Open Virtual IoT Simulator</span>
          </Link>

          {/* Recent Inferences */}
          <div className="space-y-3 pt-2 border-t border-[#1f293d]">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Recent Analyses
            </h4>
            {summary?.recent_analyses.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono py-4 text-center">
                No recent acoustic analyses.
              </div>
            ) : (
              <div className="space-y-2">
                {summary?.recent_analyses.slice(0, 4).map((an) => (
                  <div
                    key={an.id}
                    className="p-2.5 rounded-lg bg-[#070a0f] border border-[#1f293d] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{an.machine_identifier}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(an.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-300">{an.anomaly_score.toFixed(1)}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          an.status === "critical"
                            ? "bg-red-500/10 text-red-400"
                            : an.status === "warning"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {an.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

