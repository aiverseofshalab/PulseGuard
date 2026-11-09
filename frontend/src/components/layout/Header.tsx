import React from "react";
import { useAuth } from "../../stores/authContext";
import { Activity, ShieldCheck, Cpu, LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
  activeMachineName?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeMachineName }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-[#1f293d] bg-[#0b0f17]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-lg">
              Pulse<span className="text-cyan-400">Guard</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Acoustic AI v1.0
            </span>
          </div>
        </div>

        {activeMachineName && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#1f293d] text-xs text-slate-400 font-mono">
            <span>MONITORING:</span>
            <span className="text-cyan-300 font-semibold">{activeMachineName}</span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Software Simulation Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>VIRTUAL IOT SIMULATOR ACTIVE</span>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-[#1f293d]">
            <div className="flex items-center gap-2 text-left">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-slate-200">{user.full_name || user.email}</div>
                <div className="text-[10px] uppercase font-mono text-cyan-400">{user.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
