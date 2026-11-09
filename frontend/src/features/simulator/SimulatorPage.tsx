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
import { DigitalTwinMotor } from "./components/DigitalTwinMotor";

const SCENARIOS = [
  { id: "normal", label: "1. Nominal Baseline", desc: "2400 RPM, 42°C, 18% vibration (Optimal Operation)" },
  { id: "overheat", label: "2. High Temperature Surge", desc: "Bearing housing temperature rises to 88.5°C" },
  { id: "high_vibration", label: "3. Excessive Vibration Proxy", desc: "84% vibration intensity mechanical imbalance" },
  { id: "speed_surge", label: "4. RPM Fluctuation & Over-speed", desc: "Erratic speed runaway up to 3850 RPM" },
  { id: "combined_abnormal", label: "5. Combined Abnormal Operation", desc: "Simultaneous thermal (91°C) + vibration (88%) + speed surge" },
  { id: "stopped", label: "Machine Stopped / Offline", desc: "0 RPM emergency shutdown state" },
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
  const [manualRpm, setManualRpm] = useState<number>(2400);
  const [manualTemp, setManualTemp] = useState<number>(42);
  const [manualVib, setManualVib] = useState<number>(18);
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

  const handleApplyManual = async () => {
    if (!selectedMachineId) return;
    setTriggering(true);
    setActiveScenario("custom");
    try {
      const res = await api.triggerScenario(
        selectedMachineId,
        "custom",
        manualRpm,
        manualTemp,
        manualVib
      );
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

      {/* Digital Twin Motor Assembly */}
      <DigitalTwinMotor
        rpm={latestTelem ? latestTelem.rpm : 2400}
        temperature={latestTelem ? latestTelem.temperature : 42.0}
        vibration={latestTelem ? latestTelem.vibration_indicator : 18.0}
        operatingStatus={latestTelem ? latestTelem.operating_status : "running"}
        machineIdentifier={selectedMachine ? selectedMachine.machine_identifier : "FAN-BAY-01"}
        machineName={selectedMachine ? selectedMachine.machine_name : "Primary Aeration Blower Fan"}
        onEmergencyStop={() => handleTriggerScenario("stopped")}
        onStartMachine={() => handleTriggerScenario("normal")}
      />

      {/* Manual Direct Parameter Controls */}
      <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Manual Virtual Sensor Sliders (Direct Digital Twin Control)
            </h3>
            <p className="text-xs text-slate-400">
              Drag sensors to dynamically inject custom machine condition telemetry into the live WebSocket bridge:
            </p>
          </div>
          <button
            onClick={handleApplyManual}
            disabled={triggering}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-950/40"
          >
            {triggering ? "Injecting..." : "Apply Manual Injection"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* RPM Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-[#070a0f] border border-[#1f293d]">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Rotational Speed:</span>
              <span className="text-cyan-400 font-bold">{manualRpm} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max="4500"
              step="50"
              value={manualRpm}
              onChange={(e) => setManualRpm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 (Stop)</span>
              <span>2400 (Nominal)</span>
              <span>4500 (Over-speed)</span>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-[#070a0f] border border-[#1f293d]">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Housing Temp (TMP36):</span>
              <span className={`font-bold ${manualTemp > 75 ? "text-red-400" : manualTemp > 55 ? "text-amber-400" : "text-emerald-400"}`}>
                {manualTemp} °C
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="115"
              step="1"
              value={manualTemp}
              onChange={(e) => setManualTemp(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>15°C (Cold)</span>
              <span>42°C (Nominal)</span>
              <span>115°C (Severe Overheat)</span>
            </div>
          </div>

          {/* Vibration Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-[#070a0f] border border-[#1f293d]">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Vibration Proxy:</span>
              <span className={`font-bold ${manualVib > 65 ? "text-red-400" : manualVib > 40 ? "text-amber-400" : "text-cyan-400"}`}>
                {manualVib} %
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={manualVib}
              onChange={(e) => setManualVib(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Minimal)</span>
              <span>18% (Nominal)</span>
              <span>100% (Critical Shake)</span>
            </div>
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

