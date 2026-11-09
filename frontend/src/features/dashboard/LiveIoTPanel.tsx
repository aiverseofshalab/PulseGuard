import { useCallback, useEffect, useState } from "react";
import { Activity, Thermometer, Gauge, Waves, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import type {
  Machine,
  MachineTelemetry,
  HealthFusionAssessment,
} from "../../types";

interface MachineReading {
  machine: Machine;
  telemetry: MachineTelemetry | null;
  fusion: HealthFusionAssessment | null;
}

const stateStyle: Record<string, string> = {
  optimal: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  degraded: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

const Metric = ({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit: string;
}) => (
  <div className="rounded-lg bg-[#070a0f] border border-[#1f293d] p-3">
    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
      <Icon size={12} />
      {label}
    </div>
    <div className="mt-1.5 font-mono text-lg font-bold text-slate-200">
      {value}
      <span className="ml-1 text-[10px] text-slate-500">{unit}</span>
    </div>
  </div>
);

export default function LiveIoTPanel() {
  const [readings, setReadings] = useState<MachineReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await api.listMachines();
      const machines = res.items || [];

      const results = await Promise.all(
        machines.map(async (machine: Machine) => {
          const [telemetryResult, fusionResult] = await Promise.allSettled([
            api.getLatestTelemetry(machine.id),
            api.getHealthFusion(machine.id),
          ]);

          return {
            machine,
            telemetry:
              telemetryResult.status === "fulfilled"
                ? telemetryResult.value
                : null,
            fusion:
              fusionResult.status === "fulfilled"
                ? fusionResult.value
                : null,
          };
        })
      );

      setReadings(results);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch IoT data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return (
    <section className="space-y-3 border-t border-[#1f293d] pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Live IoT Telemetry
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Automatic refresh every 5 seconds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-mono text-emerald-400">POLLING</span>
          <button
            onClick={refresh}
            className="rounded-md border border-[#1f293d] p-1.5 text-slate-400 hover:text-white"
            title="Refresh telemetry"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loading && readings.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          Loading IoT telemetry...
        </div>
      ) : error && readings.length === 0 ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
          {error}
        </div>
      ) : readings.length === 0 ? (
        <div className="py-5 text-center text-xs text-slate-500">
          No registered machines found.
        </div>
      ) : (
        <div className="space-y-3">
          {readings.map(({ machine, telemetry, fusion }) => {
            const state = fusion?.combined_health_state ?? "unknown";

            return (
              <div
                key={machine.id}
                className="rounded-xl border border-[#1f293d] bg-[#0b1019] p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {machine.machine_name}
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-slate-500">
                      {machine.machine_identifier}
                    </div>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase ${
                      stateStyle[state] ??
                      "text-slate-400 bg-slate-500/10 border-slate-500/20"
                    }`}
                  >
                    {state}
                  </span>
                </div>

                {telemetry ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Metric icon={Gauge} label="RPM" value={telemetry.rpm.toFixed(0)} unit="rpm" />
                    <Metric icon={Thermometer} label="Temperature" value={telemetry.temperature.toFixed(1)} unit="°C" />
                    <Metric icon={Waves} label="Vibration" value={telemetry.vibration_indicator.toFixed(1)} unit="%" />
                    <Metric icon={Activity} label="Acoustic score" value={fusion ? fusion.acoustic_anomaly_score.toFixed(1) : "--"} unit="/100" />
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#070a0f] p-3 text-xs text-slate-500">
                    No telemetry reading available yet.
                  </div>
                )}

                {fusion && (
                  <div className="border-t border-[#1f293d] pt-2">
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      {fusion.diagnostic_explanation}
                    </p>
                  </div>
                )}

                <div className="text-[9px] text-slate-600 font-mono">
                  {telemetry?.source ?? "No source"} 
                  {telemetry?.timestamp
                    ? ` · ${new Date(telemetry.timestamp).toLocaleTimeString()}`
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastUpdated && (
        <p className="text-right text-[9px] text-slate-600 font-mono">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}
