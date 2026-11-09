export type MachineType = "fan" | "pump" | "valve" | "slide_rail";
export type MachineStatus = "normal" | "warning" | "critical" | "offline";
export type AnalysisStatus = "normal" | "warning" | "critical" | "insufficient_quality" | "model_unavailable";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export interface Machine {
  id: string;
  user_id: string;
  machine_identifier: string;
  machine_name: string;
  machine_type: MachineType;
  description: string | null;
  status: MachineStatus;
  created_at: string;
  updated_at: string;
  total_analyses: number;
  latest_score: number | null;
}

export interface AnalysisMetric {
  reconstruction_error: number;
  knn_distance: number | null;
  inference_time_ms: number;
  feature_metadata: Record<string, any> | null;
}

export interface OperatorNote {
  id: string;
  analysis_id: string;
  user_id: string;
  note: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  machine_id: string;
  machine_name?: string;
  machine_identifier?: string;
  machine_type?: string;
  user_id: string;
  anomaly_score: number;
  threshold: number;
  status: AnalysisStatus;
  audio_quality: string;
  model_version: string;
  recording_duration: number;
  recommendation: string | null;
  created_at: string;
  metrics?: AnalysisMetric;
  operator_notes?: OperatorNote[];
}

export interface VisualizationData {
  analysis_id: string;
  sample_rate: number;
  duration_seconds: number;
  waveform: number[];
  spectrogram_shape: [number, number];
  mel_spectrogram_preview: number[][];
  reconstructed_preview?: number[][];
  error_residual_preview?: number[][];
}

export interface MachineTelemetry {
  id: string;
  machine_id: string;
  machine_identifier?: string;
  rpm: number;
  temperature: number;
  vibration_indicator: number;
  operating_status: string;
  is_simulated: boolean;
  source: string;
  timestamp: string;
}

export interface HealthFusionAssessment {
  machine_id: string;
  machine_identifier: string;
  acoustic_anomaly_score: number;
  acoustic_status: string;
  telemetry_temperature: number;
  telemetry_vibration: number;
  telemetry_rpm: number;
  combined_health_state: "optimal" | "degraded" | "warning" | "critical";
  diagnostic_explanation: string;
  evidence_breakdown: string[];
  timestamp: string;
}

export interface DashboardSummary {
  total_machines: number;
  total_recordings_analyzed: number;
  normal_count: number;
  warning_count: number;
  critical_count: number;
  recent_analyses: {
    id: string;
    machine_id: string;
    machine_name: string;
    machine_identifier: string;
    machine_type: string;
    anomaly_score: number;
    status: string;
    created_at: string;
  }[];
  machine_status_breakdown: Record<string, number>;
  system_health_status: string;
}

export interface ModelInfo {
  model_name: string;
  model_version: string;
  model_architecture: string;
  is_ready: boolean;
  weights_path: string;
  supported_machine_categories: string[];
  preprocessing_spec: {
    sample_rate: number;
    n_fft: number;
    hop_length: number;
    n_mels: number;
    f_min: number;
    f_max: number;
    window: string;
    scale: string;
  };
  calibrated_thresholds: Record<string, {
    warning_threshold: number;
    critical_threshold: number;
    knn_warning_threshold: number;
    knn_critical_threshold: number;
  }>;
  knn_baseline_ready: boolean;
  last_calibrated_at: string | null;
}

export interface FrequencyBandAttribution {
  band_name: string;
  freq_range: string;
  residual_percentage: number;
  description: string;
}

export interface AnalysisExplainability {
  analysis_id: string;
  machine_identifier: string;
  machine_name: string;
  machine_type: string;
  anomaly_score: number;
  threshold: number;
  status: string;
  model_version: string;
  reconstruction_error: number;
  knn_distance: number | null;
  inference_time_ms: number;
  frequency_bands_attribution: FrequencyBandAttribution[];
  model_based_evidence: string[];
  iot_telemetry_evidence: string[];
  interpretable_summary: string;
  disclaimer: string;
}

export interface MaintenanceReportItem {
  id: string;
  report_identifier: string;
  title: string;
  status: string;
  machine_identifier: string;
  machine_name: string;
  created_at: string;
  download_url: string;
}

export interface SecurityAuditLogItem {
  id: string;
  timestamp: string;
  event_type: string;
  severity: "info" | "warning" | "critical";
  actor_type: string;
  actor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  resource: string | null;
  status: "success" | "failure";
  details: Record<string, any> | null;
}

export interface SecurityAuditSummary {
  total_events: number;
  critical_events: number;
  warning_events: number;
  info_events: number;
  failed_logins: number;
  successful_logins: number;
  unauthorized_requests: number;
  security_posture: "SECURE_NOMINAL" | "MODERATE_OBSERVATION" | "ELEVATED_RISK";
  retention_policy: string;
  last_updated: string;
}


