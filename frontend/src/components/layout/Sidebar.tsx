import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  AudioWaveform,
  Cpu,
  TrendingUp,
  BrainCircuit,
  Activity,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { name: "Overview Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Machine Assets", path: "/machines", icon: Server },
  { name: "Acoustic AI Analysis", path: "/analysis", icon: AudioWaveform },
  { name: "Virtual IoT Simulator", path: "/simulator", icon: Cpu },
  { name: "Trends & History", path: "/analytics", icon: TrendingUp },
  { name: "Model Architecture", path: "/model", icon: BrainCircuit },
  { name: "System Diagnostics", path: "/diagnostics", icon: Activity },
  { name: "Security Audit", path: "/security-audit", icon: ShieldCheck },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-[#1f293d] bg-[#070a0f] flex flex-col justify-between py-5 shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <div className="space-y-6 px-3">
        <div className="px-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Industrial Control
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:scale-110",
                        isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System info & Landing link */}
      <div className="px-4 space-y-3">
        <div className="p-3 rounded-lg bg-[#0b0f17] border border-[#1f293d] space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Dataset</span>
            <span className="font-mono text-cyan-300">MIMII Fan</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Inference</span>
            <span className="font-mono text-emerald-400">CAE + kNN</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Architecture</span>
            <span className="font-mono text-slate-300">100% Software</span>
          </div>
        </div>

        <NavLink
          to="/"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
        >
          <span>Landing & Documentation</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </NavLink>
      </div>
    </aside>
  );
};

