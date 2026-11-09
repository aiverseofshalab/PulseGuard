import React from "react";

interface WaveformViewerProps {
  waveform: number[];
  durationSeconds: number;
  height?: number;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  waveform,
  durationSeconds,
  height = 80,
}) => {
  if (!waveform || waveform.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-xs text-slate-500 font-mono border border-dashed border-[#1f293d] rounded-lg">
        Waveform data unavailable
      </div>
    );
  }

  const width = 600;
  const midY = height / 2;
  const maxAmp = Math.max(...waveform.map(Math.abs), 0.01);
  const scaleY = (height / 2 - 4) / maxAmp;

  // Build SVG path
  const points = waveform.map((amp, idx) => {
    const x = (idx / (waveform.length - 1)) * width;
    const y = midY - amp * scaleY;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M 0,${midY} L ${points.join(" L ")} L ${width},${midY}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>ACOUSTIC WAVEFORM (16 kHz Standardized Mono)</span>
        <span>{durationSeconds.toFixed(2)}s</span>
      </div>
      <div className="relative rounded-lg bg-[#070a0f] border border-[#1f293d] p-2 overflow-hidden shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          {/* Center line */}
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="#1f293d"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          {/* Waveform outline */}
          <path
            d={pathD}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

