import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../../stores/authContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { LandingPage } from "../../features/landing/LandingPage";
import { AuthPage } from "../../features/auth/AuthPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { MachinesPage } from "../../features/machines/MachinesPage";
import { AnalysisPage } from "../../features/analysis/AnalysisPage";
import { SimulatorPage } from "../../features/simulator/SimulatorPage";
import { AnalyticsPage } from "../../features/analytics/AnalyticsPage";
import { ModelInfoPage } from "../../features/model/ModelInfoPage";
import { DiagnosticsPage } from "../../features/diagnostics/DiagnosticsPage";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070a0f] flex items-center justify-center text-slate-500 font-mono text-xs">
        Authenticating industrial session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected Industrial Monitoring Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/machines" element={<MachinesPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/model" element={<ModelInfoPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

