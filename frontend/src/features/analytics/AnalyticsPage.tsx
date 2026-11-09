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
  Sparkles,
  FileText,
  FileCheck,
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
import { Machine, Analysis, MaintenanceReportItem } from "../../types";
import { AIExplainabilityModal } from "../analysis/components/AIExplainabilityModal";

export const AnalyticsPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [reports, setReports] = useState<MaintenanceReportItem[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [explainAnalysisId, setExplainAnalysisId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [machRes, anRes, repRes] = await Promise.all([
        api.listMachines(),
        api.listAnalyses({
          machineId: selectedMachineId !== "all" ? selectedMachineId : undefined,
          statusFilter: selectedStatus !== "all" ? selectedStatus : undefined,
          limit: 100,
        }),
        api.listReports(),
      ]);
      setMachines(machRes.items);
      setAnalyses(anRes.items);
      setReports(repRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMachineId, selectedStatus]);

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
          <h1 className="text-2xl font-bold tracking-tight text-white">Historical Trends & Audit Reports</h1>
          <p className="text-xs text-slate-400">
            Acoustic anomaly score progression, formal PDF maintenance reports, and compliance audit exports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Historical Audit CSV</span>
        </button>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-1">
          <span className="text-xs font-mono text-slate-500 uppercase">Total Analyses Conducted</span>
          <div className="text-3xl font-black font-mono text-white">{analyses.length}</div>
          <span className="text-[11px] font-mono text-slate-500">Across {machines.length} Industrial Assets</span>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-1">
          <span className="text-xs font-mono text-slate-500 uppercase">Warning / Critical Incidents</span>
          <div className="text-3xl font-black font-mono text-amber-400">
            {warningAndCriticalCount}
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {analyses.length > 0
              ? `${((warningAndCriticalCount / analyses.length) * 100).toFixed(1)}% Exceedance Rate`
              : "0%"}
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-1">
          <span className="text-xs font-mono text-slate-500 uppercase">Generated PDF Maintenance Reports</span>
          <div className="text-3xl font-black font-mono text-cyan-400">{reports.length}</div>
          <span className="text-[11px] font-mono text-slate-500">Standardized PDF Reports Available</span>
        </div>
      </div>

      {/* Longitudinal Anomaly Score Trend Chart */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Acoustic Anomaly Score Trajectory
            </h3>
            <p className="text-xs text-slate-400">Chronological trend of normalized machine anomaly scores [0–100]</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500">Machine:</span>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
              >
                <option value="all">All Assets</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_identifier}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
              >
                <option value="all">All States</option>
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
              No historical data available for selected filter.
            </div>
          ) : (
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
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Warning (50)", fill: "#f59e0b", fontSize: 10 }} />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Critical (75)", fill: "#ef4444", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Anomaly Score"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: "#06b6d4", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historical Analyses Log Table */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <h3 className="text-sm font-bold text-white uppercase font-mono">
          Acoustic Audit Event Trail ({analyses.length} Records)
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Loading records...</span>
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
                  <th className="pb-3 font-semibold">Actions</th>
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
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExplainAnalysisId(an.id)}
                          title="Inspect AI Explainability & Attribution"
                          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={api.getDirectPdfUrl(an.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download Official PDF Maintenance Report"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated PDF Reports Registry */}
      {reports.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Official PDF Maintenance Reports Archive
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">ReportLab Generated PDFs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-bold text-white font-mono">{rep.report_identifier}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{rep.title}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Generated: {new Date(rep.created_at).toLocaleString()}
                  </div>
                </div>

                <a
                  href={api.getReportDownloadUrl(rep.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Explainability Modal */}
      {explainAnalysisId && (
        <AIExplainabilityModal
          analysisId={explainAnalysisId}
          onClose={() => setExplainAnalysisId(null)}
        />
      )}
    </div>
  );
};
