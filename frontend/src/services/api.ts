import {
  AuthResponse,
  User,
  Machine,
  Analysis,
  VisualizationData,
  MachineTelemetry,
  HealthFusionAssessment,
  DashboardSummary,
  ModelInfo,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : "";

export class ApiError extends Error {
  status: number;
  troubleshooting?: string;
  constructor(message: string, status: number, troubleshooting?: string) {
    super(message);
    this.status = status;
    this.troubleshooting = troubleshooting;
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return localStorage.getItem("pulseguard_token");
}

export function setToken(token: string) {
  localStorage.setItem("pulseguard_token", token);
}

export function removeToken() {
  localStorage.removeItem("pulseguard_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/api/v1${endpoint}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set default Content-Type to JSON only if body is NOT FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const targetDesc = API_BASE ? API_BASE : `${window.location.origin}/api/v1 (proxied to http://127.0.0.1:8000)`;
    throw new ApiError(
      `Unable to reach PulseGuard Backend API at ${targetDesc}.`,
      0,
      "Ensure the FastAPI server is running on port 8000 (uvicorn backend.app.main:app --port 8000) and that CORS/network access is not blocked."
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} Error`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = (await response.text()) || errorMessage;
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    return res;
  },

  async register(email: string, password: string, full_name?: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    setToken(res.access_token);
    return res;
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  // Machines
  async listMachines(machineType?: string): Promise<{ items: Machine[]; total: number }> {
    const query = machineType ? `?machine_type=${encodeURIComponent(machineType)}` : "";
    return request<{ items: Machine[]; total: number }>(`/machines${query}`);
  },

  async createMachine(data: {
    machine_identifier: string;
    machine_name: string;
    machine_type: string;
    description?: string;
  }): Promise<Machine> {
    return request<Machine>("/machines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMachine(machineId: string): Promise<Machine> {
    return request<Machine>(`/machines/${machineId}`);
  },

  async updateMachine(machineId: string, data: Partial<Machine>): Promise<Machine> {
    return request<Machine>(`/machines/${machineId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteMachine(machineId: string): Promise<void> {
    await request<void>(`/machines/${machineId}`, {
      method: "DELETE",
    });
  },

  // Analyses
  async analyzeAudio(machineId: string, audioFile: Blob | File): Promise<Analysis> {
    const formData = new FormData();
    formData.append("machine_id", machineId);
    formData.append("file", audioFile, "recording.wav");

    return request<Analysis>("/analyses", {
      method: "POST",
      body: formData,
    });
  },

  async listAnalyses(params: {
    machineId?: string;
    statusFilter?: string;
    limit?: number;
  } = {}): Promise<{ items: Analysis[]; total: number }> {
    const queryParts: string[] = [];
    if (params.machineId) queryParts.push(`machine_id=${encodeURIComponent(params.machineId)}`);
    if (params.statusFilter) queryParts.push(`status_filter=${encodeURIComponent(params.statusFilter)}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    const qs = queryParts.length ? `?${queryParts.join("&")}` : "";

    return request<{ items: Analysis[]; total: number }>(`/analyses${qs}`);
  },

  async getAnalysis(analysisId: string): Promise<Analysis> {
    return request<Analysis>(`/analyses/${analysisId}`);
  },

  async getVisualizations(analysisId: string): Promise<VisualizationData> {
    return request<VisualizationData>(`/analyses/${analysisId}/visualizations`);
  },

  async addNote(analysisId: string, note: string): Promise<void> {
    await request(`/analyses/${analysisId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  // Telemetry & Simulator
  async getLatestTelemetry(machineId: string): Promise<MachineTelemetry> {
    return request<MachineTelemetry>(`/telemetry/machines/${machineId}/latest`);
  },

  async getTelemetryHistory(machineId: string, limit = 30): Promise<MachineTelemetry[]> {
    return request<MachineTelemetry[]>(`/telemetry/machines/${machineId}/history?limit=${limit}`);
  },

  async getHealthFusion(machineId: string): Promise<HealthFusionAssessment> {
    return request<HealthFusionAssessment>(`/telemetry/machines/${machineId}/health-fusion`);
  },

  async getScenarios(): Promise<{ scenarios: any[] }> {
    return request<{ scenarios: any[] }>("/simulator/scenarios");
  },

  async triggerScenario(machineId: string, scenario: string): Promise<MachineTelemetry> {
    return request<MachineTelemetry>(`/simulator/machines/${machineId}/trigger`, {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  },

  // Model Info & Dashboard
  async getModelInfo(): Promise<ModelInfo> {
    return request<ModelInfo>("/model/info");
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>("/dashboard/summary");
  },

  // Diagnostic Endpoints
  async getLiveHealth(): Promise<any> {
    return request<any>("/health/live");
  },

  async getReadyHealth(): Promise<any> {
    return request<any>("/health/ready");
  },

  async getServicesHealth(): Promise<any> {
    return request<any>("/health/services");
  },

  async getMlHealth(): Promise<any> {
    return request<any>("/health/ml");
  },

  async getIotHealth(): Promise<any> {
    return request<any>("/health/iot");
  },

  getExportCsvUrl(): string {
    const token = getToken();
    return `${API_BASE}/api/v1/reports/export?token=${token || ""}`;
  },

  getWebSocketUrl(machineId: string): string {
    if (import.meta.env.VITE_WS_BASE_URL) {
      return `${import.meta.env.VITE_WS_BASE_URL}/api/v1/telemetry/ws/${machineId}`;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (API_BASE.startsWith("http")) {
      const wsHost = API_BASE.replace(/^http(s?):\/\//, "");
      return `${proto}//${wsHost}/api/v1/telemetry/ws/${machineId}`;
    }
    return `${proto}//${window.location.host}/ws/${machineId}`;
  },
};

