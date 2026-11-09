import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ShieldCheck,
  Cpu,
  AudioWaveform,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  BarChart3,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Link000, Link001, Link004 } from "../../components/ui/skiper-ui/skiper40";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 1. Header Navigation */}
      <nav className="h-20 border-b border-[#1f293d]/80 bg-[#070a0f]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-xl text-white">
              Pulse<span className="text-cyan-400">Guard</span>
            </span>
            <span className="block text-[10px] font-mono tracking-widest text-slate-400">
              INDUSTRIAL ACOUSTIC AI
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors">Deep Learning</a>
          <a href="#iot-sim" className="hover:text-cyan-400 transition-colors">Tinkercad IoT</a>
          <a href="#security" className="hover:text-cyan-400 transition-colors">Security</a>
          <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
          >
            <span>Launch Platform</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-28 px-6 md:px-12 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wide">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span>PRODUCTION-GRADE ACOUSTIC PREDICTIVE MAINTENANCE PLATFORM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight">
          Detect Industrial Machine Faults <br />
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
            Purely Through Operating Sounds
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
          PulseGuard translates machine acoustic emissions into calibrated Log-Mel spectrograms, running unsupervised Convolutional Autoencoders and kNN embedding metrics to identify anomalous mechanical degradation before catastrophic failure occurs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
          >
            <span>Explore Live Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-base transition-colors"
          >
            Inspect Architecture
          </a>
        </div>

        {/* 100% Software-Only Notice Pill */}
        <div className="pt-6">
          <div className="inline-block p-3 rounded-xl bg-[#0b0f17] border border-[#1f293d] text-xs font-mono text-slate-400">
            <span className="text-emerald-400 font-semibold">100% SOFTWARE-ONLY SYSTEM:</span> Zero physical hardware procurement required. Industrial IoT simulated via Autodesk Tinkercad Uno + Virtual Sensor Bridge.
          </div>
        </div>
      </section>

      {/* 3. Core Capabilities Grid */}
      <section className="py-20 border-t border-[#1f293d]/80 bg-[#0b0f17]/50 px-6 md:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              End-to-End Industrial Intelligence
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm">
              Engineered to meet industrial reliability requirements without fabricating failure probabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4 hover:border-cyan-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <AudioWaveform className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Log-Mel Acoustic Pipeline</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Standardized 16,000 Hz resampling, 1024-point STFT, 512 hop size, and 128 Mel filterbanks. Enforces strict silence and clipping validation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4 hover:border-cyan-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Convolutional Autoencoder</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Unsupervised 2D CNN with 4 convolutional encoding blocks, a 64-dimensional latent bottleneck, and symmetrical transposed convolutions optimizing MSE reconstruction loss.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-4 hover:border-emerald-500/40 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Software IoT & Tinkercad Simulation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Reference Autodesk Tinkercad Arduino Uno circuit with TMP36 temperature, potentiometer vibration proxy, and pulse tachometer connected via Python REST bridge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Workflow */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
            Signal to Insight
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How PulseGuard Operates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Audio Capture",
              desc: "Upload industrial WAV or record browser audio. RMS silence and amplitude clipping tests validate acoustic integrity.",
            },
            {
              step: "02",
              title: "Log-Mel Spectrogram",
              desc: "Audio resampled to 16 kHz. STFT transforms signal to 128 Mel bands spanning 0–8000 Hz in normalized decibel power.",
            },
            {
              step: "03",
              title: "CAE Reconstruction",
              desc: "Model reconstructs normal machine patterns. Novel anomalous emissions produce high residual MSE and atypical kNN distances.",
            },
            {
              step: "04",
              title: "Calibrated Assessment",
              desc: "Compared against machine-specific 95th/99th percentile thresholds. Synthesizes explainable maintenance action recommendations.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-2xl bg-[#0b0f17] border border-[#1f293d] space-y-3 relative overflow-hidden"
            >
              <span className="text-3xl font-extrabold font-mono text-cyan-500/20">
                {item.step}
              </span>
              <h4 className="text-base font-bold text-white">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Tinkercad IoT Circuit Section */}
      <section id="iot-sim" className="py-20 border-t border-[#1f293d] bg-[#0b0f17]/70 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <Cpu className="h-3.5 w-3.5" />
              <span>ACADEMIC IoT REFERENCE ENVIRONMENT</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Autodesk Tinkercad Circuits Integration
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              To strictly satisfy the zero-hardware mandate while demonstrating complete embedded IoT ingestion pipelines, PulseGuard provides a fully documented Arduino Uno circuit in Autodesk Tinkercad Circuits:
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span><strong>TMP36 Sensor (Pin A0):</strong> Measures motor bearing thermal values with 10mV/°C calibration.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span><strong>Potentiometer (Pin A1):</strong> Explicit proxy indicator for mechanical vibration amplitude.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span><strong>Tachometer Interrupt (Pin D2):</strong> Computes rotational speed in real RPM.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span><strong>Python Sensor Bridge:</strong> Emulates Tinkercad serial JSON telemetry and streams to FastAPI via REST & WebSockets.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#070a0f] border border-[#1f293d] font-mono text-xs text-slate-300 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-cyan-400">Tinkercad Arduino Serial Stream</span>
              <span className="text-emerald-400 text-[10px]">9600 BAUD</span>
            </div>
            <pre className="text-slate-400 overflow-x-auto p-3 rounded bg-black/50 text-[11px] leading-relaxed">
{`{
  "machine_identifier": "FAN-BAY-01",
  "rpm": 2415.2,
  "temperature": 43.1,
  "vibration_indicator": 18.6,
  "operating_status": "normal",
  "source": "tinkercad_bridge"
}`}
            </pre>
            <div className="text-[11px] text-slate-500">
              Ingested via authenticated endpoint <code className="text-cyan-300">POST /api/v1/telemetry/ingest</code> with <code className="text-cyan-300">X-API-KEY</code> header verification.
            </div>
          </div>
        </div>
      </section>

      {/* 6. Security & Privacy */}
      <section id="security" className="py-20 px-6 md:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
            Enterprise Rigor
          </span>
          <h2 className="text-3xl font-extrabold text-white">Cybersecurity & Data Governance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
            <Lock className="h-6 w-6 text-cyan-400" />
            <h4 className="text-base font-bold text-white">Tenant Data Isolation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every database query verifies JWT claims and filters strictly by tenant user ID. Operators cannot query or access assets owned by other entities.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <h4 className="text-base font-bold text-white">Binary Audio Sanitization</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-part uploads undergo magic byte verification (enforcing PCM WAV), maximum file size enforcement (15 MB), and memory buffer decoding without writing raw binaries to disk.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-3">
            <Database className="h-6 w-6 text-blue-400" />
            <h4 className="text-base font-bold text-white">Parameterized ORM & Secrets</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              SQL injection is neutralized through SQLAlchemy parameterized queries. Secrets and API keys are strictly configured via environment variables and never exposed to the frontend client.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Interactive Skiper UI Link Showcase */}
      <section className="py-16 border-t border-[#1f293d] bg-[#0b0f17] px-6 text-center space-y-6">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
          Component Integration: Skiper UI Animated Links
        </span>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <Link000 href="/dashboard" className="text-cyan-400 font-semibold">
            Launch Industrial Dashboard
          </Link000>
          <Link001 href="https://zenodo.org/records/3384388" className="text-slate-300">
            MIMII Official Dataset
          </Link001>
          <Link004 href="https://tinkercad.com" className="text-slate-300">
            Autodesk Tinkercad Circuits
          </Link004>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" className="py-20 px-6 md:px-12 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Technical insights into the PulseGuard engineering architecture.</p>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <h4 className="text-sm font-semibold text-white">Is PulseGuard claiming to predict exact failure time?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              No. In accordance with industrial AI standards, PulseGuard provides acoustic anomaly detection and predictive maintenance decision support. Anomaly scores represent acoustic reconstruction deviations from normal baselines, not certified remaining useful life (RUL) or probability of failure.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <h4 className="text-sm font-semibold text-white">Why does PulseGuard not require physical hardware?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The project is 100% software-based. Audio input is captured via browser recording or file upload. Telemetry is modeled via an Autodesk Tinkercad Arduino Uno circuit and streamed through an asynchronous Python virtual sensor bridge, guaranteeing reproducible evaluation without equipment costs.
            </p>
          </div>
          <div className="p-5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <h4 className="text-sm font-semibold text-white">How were the deep learning thresholds calibrated?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thresholds were calculated using the 90th and 99th percentiles of reconstruction errors and kNN embedding distances exclusively on normal validation recordings, completely held-out from anomalous test data to prevent data leakage.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-[#1f293d] py-12 px-6 md:px-12 text-center text-xs text-slate-500 space-y-4">
        <div className="flex items-center justify-center gap-2 text-slate-300 font-bold">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span>PulseGuard Industrial AI Platform</span>
        </div>
        <p className="max-w-md mx-auto">
          Academic Major Project: Deep Learning-Based Industrial Machine Acoustic Anomaly Detection and Predictive Maintenance Support System.
        </p>
        <p>© 2026 PulseGuard. All rights reserved.</p>
      </footer>
    </div>
  );
};

