import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  Terminal,
  Activity,
  UserCheck,
} from "lucide-react";
import { api } from "../../services/api";
import { SecurityAuditLogItem, SecurityAuditSummary } from "../../types";

export const SecurityAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditLogItem[]>([]);
  const [summary, setSummary] = useState<SecurityAuditSummary | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [forbidden, setForbidden] = useState<boolean>(false);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setForbidden(false);
      const [logsRes, sumRes] = await Promise.all([
        api.getAuditLogs({
          severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
          eventType: selectedEventType !== "all" ? selectedEventType : undefined,
          search: searchQuery.trim() || undefined,
          limit: 50,
        }),
        api.getAuditSummary(),
      ]);
      setLogs(logsRes.items || []);
      setTotalCount(logsRes.total || 0);
      setSummary(sumRes);
    } catch (err: any) {
      if (err.message?.includes("403") || err.message?.includes("restricted")) {
        setForbidden(true);
      } else {
        console.error("Audit fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedSeverity, selectedEventType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditData();
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" />
            <span>CRITICAL</span>
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  if (forbidden) {
    return (
      <div className="p-8 rounded-2xl bg-[#0b0f17] border border-red-500/30 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Access Denied: Role Insufficient</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            The Security Audit Dashboard is strictly restricted to plant engineering personnel or system administrators.
            Your current operator role does not possess the requisite RBAC permissions to inspect audit event trails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Audit & Access Governance</h1>
          <p className="text-xs text-slate-400">
            Immutable audit logging tracking user authentication, IoT device authorization, and administrative actions.
          </p>
        </div>

        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-950/40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Security Posture Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Posture Status */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>SECURITY POSTURE</span>
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  summary.security_posture === "SECURE_NOMINAL"
                    ? "bg-emerald-400"
                    : summary.security_posture === "MODERATE_OBSERVATION"
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-sm">
                {summary.security_posture.replace("_", " ")}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 block">
              Continuous Threat Observation
            </span>
          </div>

          {/* Total Events */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>TOTAL AUDIT EVENTS</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {summary.total_events}
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex gap-2">
              <span className="text-red-400 font-semibold">{summary.critical_events} Crit</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{summary.warning_events} Warn</span>
            </div>
          </div>

          {/* Failed Logins */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>AUTH FAILURES</span>
              <Lock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {summary.failed_logins}
            </div>
            <span className="text-[11px] font-mono text-slate-500 block">
              {summary.successful_logins} Successful Logins
            </span>
          </div>

          {/* Unauthorized Requests */}
          <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>DEVICE AUTH REJECTIONS</span>
              <ShieldAlert className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {summary.unauthorized_requests}
            </div>
            <span className="text-[11px] font-mono text-slate-500 block">
              X-API-KEY Bridge Verifications
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0b0f17] border border-[#1f293d] flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor email, device, or resource..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Event:</span>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none"
            >
              <option value="all">All Event Types</option>
              <option value="auth_login_success">Login Success</option>
              <option value="auth_login_failed">Login Failed</option>
              <option value="auth_registered">User Registered</option>
              <option value="iot_api_key_invalid">Invalid IoT API Key</option>
              <option value="machine_created">Machine Created</option>
              <option value="scenario_injected">Scenario Injected</option>
              <option value="report_generated">Report Generated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Records Table */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Audit Event Trail ({totalCount} Records)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Encrypted & Tamper-Evident Storage
          </span>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Loading security event logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No audit logs match current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[#1f293d] text-slate-400 text-[11px] uppercase">
                <tr>
                  <th className="pb-3">Timestamp (UTC)</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Resource</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Sanitized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]/50 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold text-white whitespace-nowrap">
                      {log.event_type}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="py-3 text-cyan-300 whitespace-nowrap">
                      {log.actor_id || "anonymous"}
                    </td>
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {log.resource || "N/A"}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          log.status === "success" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 max-w-xs truncate text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Governance & Retention Notice */}
      <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span>Audit Policy: 90-Day Read-Only Cryptographic Log Retention Enforced</span>
        </div>
        <span className="text-[11px] text-slate-500">ISO 27001 / IEC 62443 Aligned</span>
      </div>
    </div>
  );
};
