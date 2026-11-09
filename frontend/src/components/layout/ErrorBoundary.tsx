import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PulseGuard Error Boundary Caught]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "An unexpected application error occurred.";

      return (
        <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-lg w-full p-8 rounded-2xl bg-[#0b0f17] border border-[#1f293d] shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1f293d] pb-4">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Application Exception Caught</h2>
                <div className="text-[11px] font-mono text-slate-500">PulseGuard Protective Error Boundary</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#070a0f] border border-[#1f293d] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>MODULE IMPACTED:</span>
                  <span className="text-cyan-400 font-bold">Client UI Subsystem</span>
                </div>
                <div className="text-xs text-red-300 font-mono break-words leading-relaxed">
                  {errorMsg}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-slate-200">Recommended Troubleshooting:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Refresh the browser window to restore client component state.</li>
                  <li>Verify the backend API is operational at port 8000.</li>
                  <li>Check browser console logs if problems persist.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

