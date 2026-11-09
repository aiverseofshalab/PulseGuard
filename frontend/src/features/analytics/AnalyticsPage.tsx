import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Layers,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { api } from "../../services/api";
import { Machine, Analysis } from "../../types";

export const AnalyticsPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      const [machRes, anRes] = await Promise.all([
        api.listMachines(),
        api.listAnalyses({
          machineId: selectedMachineId !== "all" ? selectedMachineId : undefined,
          statusFilter: selectedStatus !== "all" ? selectedStatus : undefined,
          limit: 100,
        }),
      ]);
      setMachines(machRes.items);
      setAnalyses(anRes.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMachineId, selectedStatus]);

  // Repeated warning frequency check (Section 7)
  const warningAndCriticalCount = analyses.filter(
    (a) => a.status === "warning" || a.status === "critical"
  ).length;

  const chartData = analyses
    .slice()
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString([], { month: "short", day: "numeric" }),
      score: a.anomaly_score,
      machine: a.machine_identifier,
      threshold: 50.0,
    }));

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), "_blank");
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Machine Historical Analytics</h1>
          <p className="text-xs text-slate-400">
            Acoustic score progression, warning frequencies, and audit logs.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow-lg"
        >
          <Download className="h-4 w-4 text-cyan-400" />
          <span>Export Historical CSV</span>
        </button>
      </div>

      {/* Repeated Warning Alert */}
      {warningAndCriticalCount >= 3 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-bold">REPEATED ACOUSTIC WARNING DETECTED:</strong>{" "}
            {warningAndCriticalCount} recordings have triggered warning or critical thresholds. A single spike may be transient, but repeated warnings indicate progressive mechanical wear. An on-site engineer inspection is strongly recommended.
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-[#0b0f17] border border-[#1f293d] flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Machine:</label>
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
          >
            <option value="all">All Machines</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machine_identifier} — {m.machine_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Historical Trend Timeline Chart */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Anomaly Score Progression Timeline
            </h3>
            <p className="text-xs text-slate-400">
              Score scale [0-100]. Line at 50 represents calibrated warning threshold.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            {chartData.length} records plotted
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#070a0f",
                  borderColor: "#1f293d",
                  fontSize: "12px",
                }}
              />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Warning Threshold", fill: "#f59e0b", fontSize: 10 }} />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Critical Threshold", fill: "#ef4444", fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="score"
                name="Anomaly Score"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: "#06b6d4" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analysis History Table */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <h3 className="text-sm font-bold text-white uppercase font-mono">
          Inspection History Records
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            Loading historical analyses...
          </div>
        ) : analyses.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            No analysis records match current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1f293d] text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Asset ID</th>
                  <th className="pb-3 font-semibold">Anomaly Score</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Recon MSE</th>
                  <th className="pb-3 font-semibold">kNN Dist</th>
                  <th className="pb-3 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]/50 text-slate-300">
                {analyses.map((an) => (
                  <tr key={an.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 font-mono text-slate-400">
                      {new Date(an.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-white">{an.machine_identifier}</td>
                    <td className="py-3 font-mono font-bold text-cyan-300">
                      {an.anomaly_score.toFixed(1)}/100
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                          an.status === "critical"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : an.status === "warning"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {an.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {an.metrics?.reconstruction_error.toFixed(6) || "N/A"}
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {an.metrics?.knn_distance?.toFixed(4) || "N/A"}
                    </td>
                    <td className="py-3 font-mono text-slate-500">
                      {an.metrics?.inference_time_ms.toFixed(1)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
