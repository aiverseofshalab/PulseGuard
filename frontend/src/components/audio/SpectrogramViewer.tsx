import React, { useRef, useEffect } from "react";

interface SpectrogramViewerProps {
  matrix: number[][]; // 2D grid: matrix[mel_bin][time_step] normalized [0, 1]
  title: string;
  colormap?: "magma" | "cyan" | "error";
  height?: number;
}

export const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({
  matrix,
  title,
  colormap = "magma",
  height = 140,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix || matrix.length === 0 || !matrix[0]) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numRows = matrix.length; // Mel bins
    const numCols = matrix[0].length; // Time frames

    canvas.width = numCols;
    canvas.height = numRows;

    const imgData = ctx.createImageData(numCols, numRows);
    const data = imgData.data;

    for (let r = 0; r < numRows; r++) {
      // Invert row so lowest frequencies are at the bottom of the canvas
      const targetRow = numRows - 1 - r;
      for (let c = 0; c < numCols; c++) {
        const val = Math.max(0, Math.min(1, matrix[r][c] || 0));
        const pixelIdx = (targetRow * numCols + c) * 4;

        let red = 0;
        let green = 0;
        let blue = 0;

        if (colormap === "error") {
          // Heatmap: dark -> bright red/yellow
          red = Math.floor(Math.min(255, val * 350));
          green = Math.floor(val > 0.5 ? (val - 0.5) * 400 : 0);
          blue = Math.floor(val > 0.8 ? 100 : 20);
        } else if (colormap === "cyan") {
          // Dark navy to vibrant cyan/white
          red = Math.floor(val * 40);
          green = Math.floor(val * 220);
          blue = Math.floor(val * 255);
        } else {
          // Standard Industrial Magma
          red = Math.floor(Math.pow(val, 0.8) * 255);
          green = Math.floor(Math.pow(val, 1.8) * 220);
          blue = Math.floor(Math.pow(val, 0.4) * 160 + (1 - val) * 30);
        }

        data[pixelIdx] = red;
        data[pixelIdx + 1] = green;
        data[pixelIdx + 2] = blue;
        data[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [matrix, colormap]);

  return (
    <div className="space-y-1.5 flex-1 min-w-[240px]">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>{title}</span>
        <span className="text-[10px] text-slate-500">128 Mel Bands (0–8 kHz)</span>
      </div>
      <div
        className="rounded-lg bg-[#070a0f] border border-[#1f293d] p-1 overflow-hidden shadow-inner flex items-center justify-center"
        style={{ height }}
      >
        {matrix && matrix.length > 0 ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-fill rounded"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="text-xs text-slate-500 font-mono">No spectrogram available</div>
        )}
      </div>
    </div>
  );
};
