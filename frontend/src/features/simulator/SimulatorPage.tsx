import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Flame,
  Activity,
  Gauge,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Code,
  Copy,
  Check,
  Radio,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../../services/api";
import { Machine, MachineTelemetry, HealthFusionAssessment } from "../../types";

const SCENARIOS = [
  { id: "normal", label: "Nominal Baseline", desc: "2400 RPM, 42°C, 18% vibration" },
  { id: "warning", label: "Early Stress Warning", desc: "2850 RPM, 64°C, 48% vibration" },
  { id: "overheat", label: "Thermal Overheat Surge", desc: "Bearing temperature 88.5°C" },
  { id: "high_vibration", label: "Severe Mechanical Vibration", desc: "84% vibration intensity" },
  { id: "speed_surge", label: "Over-speed Surge", desc: "3850 RPM speed runaway" },
  { id: "stopped", label: "Machine Stopped", desc: "0 RPM shutdown state" },
];

const ARDUINO_CODE_SNIPPET = `/* Autodesk Tinkercad Circuits - Arduino Uno Telemetry */
const int PIN_TEMP = A0;        // TMP36 Sensor
const int PIN_VIBRATION = A1;   // 10k Potentiometer
const int PIN_TACH = 2;         // Digital Pulse Tachometer

void setup() {
  Serial.begin(9600);
  pinMode(PIN_TACH, INPUT_PULLUP);
}

void loop() {
  // Read TMP36 and Potentiometer proxy
  float tempC = (analogRead(PIN_TEMP) * (5.0 / 1023.0) - 0.5) * 100.0;
  float vibPercent = (analogRead(PIN_VIBRATION) / 1023.0) * 100.0;

  Serial.print("{\\"machine_identifier\\":\\"FAN-BAY-01\\",\\"rpm\\":2410.0,\\"temperature\\":");
  Serial.print(tempC);
  Serial.print(",\\"vibration_indicator\\":");
  Serial.print(vibPercent);
  Serial.print(",\\"operating_status\\":\\"running\\"}\\n");
  delay(2000);
}`;

export const SimulatorPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [latestTelem, setLatestTelem] = useState<MachineTelemetry | null>(null);
  const [history, setHistory] = useState<MachineTelemetry[]>([]);
  const [healthFusion, setHealthFusion] = useState<HealthFusionAssessment | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("normal");
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Load machines
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.listMachines();
        setMachines(res.items);
        if (res.items.length > 0) {
          setSelectedMachineId(res.items[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Connect WebSocket & load telemetry when selectedMachineId changes
  useEffect(() => {
    if (!selectedMachineId) return;

    const loadInitialData = async () => {
      try {
        const [latest, hist, fusion] = await Promise.all([
          api.getLatestTelemetry(selectedMachineId),
          api.getTelemetryHistory(selectedMachineId, 20),
          api.getHealthFusion(selectedMachineId),
        ]);
        setLatestTelem(latest);
        setHistory(hist);
        setHealthFusion(fusion);
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialData();

    // Setup live WebSocket
    const wsUrl = api.getWebSocketUrl(selectedMachineId);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.rpm !== undefined) {
          setLatestTelem(data);
          setHistory((prev) => [...prev.slice(-19), data]);
          // Refresh health fusion assessment
          api.getHealthFusion(selectedMachineId).then(setHealthFusion).catch(console.error);
        }
      } catch (e) {
        // Ping response or plain text
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [selectedMachineId]);

  const handleTriggerScenario = async (scenarioId: string) => {
    if (!selectedMachineId) return;
    setTriggering(true);
    setActiveScenario(scenarioId);
    try {
      const res = await api.triggerScenario(selectedMachineId, scenarioId);
      setLatestTelem(res);
      setHistory((prev) => [...prev.slice(-19), res]);
      const fusion = await api.getHealthFusion(selectedMachineId);
      setHealthFusion(fusion);
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ARDUINO_CODE_SNIPPET);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);

  // Format telemetry for Recharts
  const chartData = history.map((h, i) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    rpm: h.rpm,
    temperature: h.temperature,
    vibration: h.vibration_indicator,
  }));

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Virtual Industrial IoT Simulator</h1>
          <p className="text-xs text-slate-400">
            Simulated microcontroller telemetry stream (Autodesk Tinkercad reference architecture).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border ${
              wsConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${wsConnected ? "animate-pulse" : ""}`} />
            <span>{wsConnected ? "LIVE WEBSOCKET STREAM" : "RECONNECTING WS"}</span>
          </div>

          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-[#1f293d] text-xs font-mono text-cyan-300 focus:outline-none"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machine_identifier} ({m.machine_type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explicit Simulated Disclaimer Notice */}
      <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-[#1f293d] flex items-center gap-3 text-xs text-slate-400">
        <Info className="h-4 w-4 text-cyan-400 shrink-0" />
        <span>
          <strong className="text-slate-200">Software Simulation Notice:</strong> Temperature (°C), RPM, and Vibration (%) values below are generated by the software simulator / Tinkercad virtual bridge and clearly designated as simulated telemetry. Audio ML remains the primary anomaly engine.
        </span>
      </div>

      {/* Live Telemetry Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* RPM Gauge */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ROTATIONAL SPEED</span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white">
              {latestTelem ? latestTelem.rpm.toFixed(0) : "2400"}
            </span>
            <span className="text-xs font-mono text-slate-500">RPM</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, ((latestTelem?.rpm || 2400) / 4000) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>0 RPM</span>
            <span>Nominal: 2400</span>
            <span>4000 RPM</span>
          </div>
        </div>

        {/* Temperature Gauge */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>BEARING THERMAL (TMP36)</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white">
              {latestTelem ? latestTelem.temperature.toFixed(1) : "42.0"}
            </span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (latestTelem?.temperature || 42) > 75
                  ? "bg-red-500"
                  : (latestTelem?.temperature || 42) > 60
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
              style={{
                width: `${Math.min(100, ((latestTelem?.temperature || 42) / 100) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>0°C</span>
            <span>Warning: 60°C</span>
            <span>Critical: 75°C</span>
          </div>
        </div>

        {/* Vibration Proxy Indicator */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>VIBRATION PROXY (POTENTIOMETER)</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white">
              {latestTelem ? latestTelem.vibration_indicator.toFixed(1) : "18.0"}
            </span>
            <span className="text-xs font-mono text-slate-500">% Intensity</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (latestTelem?.vibration_indicator || 18) > 70
                  ? "bg-red-500"
                  : (latestTelem?.vibration_indicator || 18) > 45
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
              style={{
                width: `${Math.min(100, latestTelem?.vibration_indicator || 18)}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>0%</span>
            <span>Warning: 45%</span>
            <span>Critical: 70%</span>
          </div>
        </div>
      </div>

      {/* Explainable Multi-Sensor Health Assessment */}
      {healthFusion && (
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f293d] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Multi-Sensor Synthesis
              </span>
              <h3 className="text-base font-bold text-white">Explainable Machine Health Assessment</h3>
            </div>
            <span
              className={`text-xs font-mono uppercase px-3 py-1 rounded-full font-bold border ${
                healthFusion.combined_health_state === "critical"
                  ? "bg-red-500/10 text-red-400 border-red-500/40"
                  : healthFusion.combined_health_state === "warning"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
              }`}
            >
              {healthFusion.combined_health_state}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {healthFusion.diagnostic_explanation}
          </p>

          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">
              Diagnostic Evidence Breakdown:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {healthFusion.evidence_breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-slate-300 flex items-center gap-2"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Telemetry Charts & Simulation Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Time-Series */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Live Sensor Telemetry History
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Last 20 ticks</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#070a0f",
                    borderColor: "#1f293d",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temp (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  name="Vib (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Interactive Scenario Triggers */}
        <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase font-mono">Simulation Scenarios</h3>
            <p className="text-xs text-slate-400">Trigger simulated machine operational conditions:</p>
          </div>

          <div className="space-y-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleTriggerScenario(sc.id)}
                disabled={triggering}
                className={`w-full p-3 rounded-xl border text-left transition-all text-xs flex items-center justify-between ${
                  activeScenario === sc.id
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-semibold"
                    : "bg-[#070a0f] border-[#1f293d] text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-semibold">{sc.label}</div>
                  <div className="text-[10px] text-slate-500">{sc.desc}</div>
                </div>
                <Play className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tinkercad Circuits C++ Firmware Code Viewer */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Autodesk Tinkercad Arduino Uno Firmware (Reference Implementation)
            </h3>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy C++ Code</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
          {ARDUINO_CODE_SNIPPET}
        </pre>
      </div>
    </div>
  );
};

