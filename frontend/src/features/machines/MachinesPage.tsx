import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  Plus,
  Edit2,
  Trash2,
  AudioWaveform,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { Machine, MachineType } from "../../types";

const CATEGORIES: { label: string; value: MachineType }[] = [
  { label: "Fan", value: "fan" },
  { label: "Pump", value: "pump" },
  { label: "Valve", value: "valve" },
  { label: "Slide Rail", value: "slide_rail" },
];

export const MachinesPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // Form State
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MachineType>("fan");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMachines = async () => {
    try {
      const typeParam = selectedFilter !== "all" ? selectedFilter : undefined;
      const res = await api.listMachines(typeParam);
      setMachines(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [selectedFilter]);

  const openCreateModal = () => {
    setEditingMachine(null);
    setIdentifier("");
    setName("");
    setCategory("fan");
    setDescription("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: Machine) => {
    setEditingMachine(m);
    setIdentifier(m.machine_identifier);
    setName(m.machine_name);
    setCategory(m.machine_type);
    setDescription(m.description || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingMachine) {
        await api.updateMachine(editingMachine.id, {
          machine_name: name,
          machine_type: category,
          description,
        });
      } else {
        await api.createMachine({
          machine_identifier: identifier,
          machine_name: name,
          machine_type: category,
          description,
        });
      }
      setIsModalOpen(false);
      fetchMachines();
    } catch (err: any) {
      setFormError(err.message || "Failed to save machine asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This removes all associated analysis logs.`)) {
      return;
    }
    try {
      await api.deleteMachine(id);
      fetchMachines();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Machine Asset Management</h1>
          <p className="text-xs text-slate-400">
            Register and configure industrial rotating assets for acoustic anomaly monitoring.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Machine</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f293d] pb-4">
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedFilter === "all"
              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedFilter(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedFilter === cat.value
                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Machines */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-mono gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
          <span>Loading asset fleet...</span>
        </div>
      ) : machines.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <Server className="h-10 w-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-300">No machine assets found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by registering a machine category (Fan, Pump, Valve, Slide Rail).
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs"
          >
            Add Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold uppercase">
                    {m.machine_identifier}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
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

                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{m.machine_name}</h3>
                  <div className="text-[11px] text-cyan-400 uppercase font-mono mt-0.5">
                    {m.machine_type.replace("_", " ")}
                  </div>
                  {m.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#1f293d]">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>ANALYSES: {m.total_analyses}</span>
                  <span>
                    SCORE:{" "}
                    {m.latest_score !== null ? (
                      <span className="text-slate-200 font-bold">{m.latest_score.toFixed(1)}</span>
                    ) : (
                      "N/A"
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    to={`/analysis?machine_id=${m.id}`}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold text-center transition-colors"
                  >
                    Analyze Audio
                  </Link>
                  <button
                    onClick={() => openEditModal(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Edit Machine"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, m.machine_name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Machine"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create / Edit Machine */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0f17] border border-[#1f293d] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-4">
              <h3 className="text-base font-bold text-white">
                {editingMachine ? "Edit Machine Asset" : "Register Machine Asset"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Asset Identifier / Serial
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingMachine}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. FAN-BAY-05"
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Machine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zone B Exhaust Blower"
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Machine Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MachineType)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Operating environment, horsepower, or maintenance notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f293d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  {submitting ? "Saving..." : editingMachine ? "Update Asset" : "Register Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
