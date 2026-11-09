import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../stores/authContext";
import { Activity, Lock, Mail, User, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

export const AuthPage: React.FC = () => {
  const { isAuthenticated, login, register, demoLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (isRegisterMode) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-6 selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_25px_rgba(6,182,212,0.25)]">
            <Activity className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Pulse<span className="text-cyan-400">Guard</span> Industrial
          </h2>
          <p className="text-xs text-slate-400">
            Sign in to access acoustic anomaly monitoring & virtual IoT simulation.
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-8 rounded-2xl bg-[#0b0f17] border border-[#1f293d] shadow-2xl space-y-6">
          {/* Quick Demo Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>One-Click Demo Access (Plant Engineer)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#1f293d] w-full" />
            <span className="bg-[#0b0f17] px-3 text-[10px] font-mono uppercase text-slate-500 shrink-0">
              or use credentials
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@plant.industrial"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070a0f] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <span>{isRegisterMode ? "Create Account" : "Sign In"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMessage(null);
              }}
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {isRegisterMode
                ? "Already have an account? Sign In"
                : "Need an account? Register new operator"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

