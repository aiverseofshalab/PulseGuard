import React from "react";
import { Gauge, Flame, Activity, Power, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DigitalTwinMotorProps {
  rpm: number;
  temperature: number;
  vibration: number;
  operatingStatus: string;
  machineIdentifier: string;
  machineName: string;
  onEmergencyStop?: () => void;
  onStartMachine?: () => void;
}

export const DigitalTwinMotor: React.FC<DigitalTwinMotorProps> = ({
  rpm,
  temperature,
  vibration,
  operatingStatus,
  machineIdentifier,
  machineName,
  onEmergencyStop,
  onStartMachine,
}) => {
  const isRunning = rpm > 50 && operatingStatus !== "stopped";
  
  // Calculate spin duration in seconds (faster RPM = smaller duration)
  const spinDuration = isRunning ? Math.max(0.12, 1200 / Math.max(rpm, 100)) : 0;
  
  // Thermal color gradient
  const isHot = temperature > 65;
  const isWarm = temperature > 50 && temperature <= 65;
  const heatColor = isHot ? "#ef4444" : isWarm ? "#f59e0b" : "#06b6d4";

  // Vibration severity
  const isSevereVibration = vibration > 60;
  const isElevatedVibration = vibration > 40 && vibration <= 60;

  return (
    <div className="relative p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] overflow-hidden space-y-6">
      {/* Background Simulation Badge */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            PHYSICAL-VIRTUAL DIGITAL TWIN SIMULATOR
          </span>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
            <span>{machineName}</span>
            <span className="text-xs font-mono text-slate-400 font-normal">[{machineIdentifier}]</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onEmergencyStop}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Power className="h-3.5 w-3.5" />
              <span>EMERGENCY STOP</span>
            </button>
          ) : (
            <button
              onClick={onStartMachine}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Power className="h-3.5 w-3.5" />
              <span>START MACHINE</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Visual Twin Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Animated Rotor & Stator Graphic */}
        <div className="md:col-span-7 flex flex-col items-center justify-center p-8 rounded-xl bg-[#070a0f] border border-[#1f293d]/80 relative overflow-hidden">
          {/* Heat Aura Glow */}
          <div
            className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${heatColor}25 0%, transparent 70%)`,
              opacity: isHot ? 0.9 : isWarm ? 0.5 : 0.2,
            }}
          />

          {/* SVG Digital Twin Motor Assembly */}
          <div
            className={`relative w-64 h-64 flex items-center justify-center ${
              isSevereVibration ? "animate-pulse" : ""
            }`}
          >
            {/* Outer Stator Ring */}
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Outer Mount */}
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="4"
              />
              <circle
                cx="100"
                cy="100"
                r="84"
                fill="#070a0f"
                stroke={heatColor}
                strokeWidth="2"
                strokeDasharray="4 4"
                className="opacity-70"
              />

              {/* 12 Stator Coil Poles */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 360) / 12;
                return (
                  <rect
                    key={i}
                    x="96"
                    y="14"
                    width="8"
                    height="18"
                    rx="2"
                    fill={isHot ? "#ef4444" : "#475569"}
                    transform={`rotate(${angle} 100 100)`}
                  />
                );
              })}

              {/* Central Bearing Hub */}
              <circle cx="100" cy="100" r="30" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <circle cx="100" cy="100" r="14" fill="#0f172a" stroke={heatColor} strokeWidth="2" />

              {/* Rotating Impeller Rotor Blades */}
              <g
                style={{
                  transformOrigin: "100px 100px",
                  animation: isRunning ? `spin ${spinDuration}s linear infinite` : "none",
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const angle = (i * 360) / 6;
                  return (
                    <path
                      key={i}
                      d="M 100 100 Q 120 70 148 50 Q 130 90 100 100 Z"
                      fill={heatColor}
                      opacity={isRunning ? "0.85" : "0.5"}
                      transform={`rotate(${angle} 100 100)`}
                    />
                  );
                })}
              </g>

              {/* Shaft Center Pin */}
              <circle cx="100" cy="100" r="6" fill="#f8fafc" />
            </svg>
          </div>

          {/* Real-Time Angular Velocity Meter */}
          <div className="mt-4 flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">Rotor State:</span>
            <span
              className={`font-bold ${
                isRunning ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {isRunning ? `ROTATING (${rpm.toFixed(0)} RPM)` : "OFFLINE / STOPPED"}
            </span>
          </div>
        </div>

        {/* Real-Time Parameter Telemetry Readout Cards */}
        <div className="md:col-span-5 space-y-3">
          {/* 1. Speed Gauge */}
          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                <span>ROTATIONAL SPEED</span>
              </span>
              <span className="text-[10px] text-slate-500">Tachometer Pulse</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              <span>{rpm.toFixed(1)}</span>
              <span className="text-xs font-normal text-slate-400">RPM</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (rpm / 4000) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Temperature Gauge */}
          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Flame className={`h-3.5 w-3.5 ${isHot ? "text-red-400" : "text-amber-400"}`} />
                <span>HOUSING TEMPERATURE</span>
              </span>
              <span className="text-[10px] text-slate-500">TMP36 Sensor</span>
            </div>
            <div className="text-2xl font-bold font-mono flex items-baseline gap-2">
              <span className={isHot ? "text-red-400" : isWarm ? "text-amber-400" : "text-emerald-400"}>
                {temperature.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-400">°C</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-300 ${
                  isHot ? "bg-red-500" : isWarm ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, (temperature / 120) * 100)}%` }}
              />
            </div>
          </div>

          {/* 3. Vibration Gauge */}
          <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className={`h-3.5 w-3.5 ${isSevereVibration ? "text-red-400" : "text-cyan-400"}`} />
                <span>VIBRATION PROXY</span>
              </span>
              <span className="text-[10px] text-slate-500">Potentiometer</span>
            </div>
            <div className="text-2xl font-bold font-mono flex items-baseline gap-2">
              <span className={isSevereVibration ? "text-red-400" : isElevatedVibration ? "text-amber-400" : "text-white"}>
                {vibration.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-300 ${
                  isSevereVibration ? "bg-red-500" : isElevatedVibration ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${Math.min(100, vibration)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
