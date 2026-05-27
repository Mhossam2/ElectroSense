// ============================================================================
// lib/api.ts — lightweight fetch wrapper
//
// Automatically:
//   • Attaches Authorization: Bearer <token> from localStorage
//   • Sets Content-Type: application/json
//   • Throws on non-2xx responses with the server's error message
// ============================================================================

const TOKEN_KEY = "lcr_auth_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Convenience methods ───────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string)                          => request<T>(path, { method: "GET" }),
  post:   <T>(path: string, body: unknown)           => request<T>(path, { method: "POST", body }),
  put:    <T>(path: string, body: unknown)           => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string)                          => request<T>(path, { method: "DELETE" }),
};

// ── Domain helpers ────────────────────────────────────────────────────────────

export interface Circuit {
  id: string;
  name: string;
  components: unknown;
  wires: unknown;
  junctions: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Measurement {
  id: string;
  type: string | null;
  values: Record<string, string> | null;
  pinOrder: string | null;
  signalFrequency: number | null;
  externalVoltage: number | null;
  circuitId: string | null;
  timestamp: string;
}

// Circuits
export const circuitsApi = {
  list:   ()                                          => api.get<Circuit[]>("/circuits"),
  get:    (id: string)                               => api.get<Circuit>(`/circuits/${id}`),
  create: (data: Omit<Circuit, "id" | "createdAt" | "updatedAt">) =>
                                                         api.post<Circuit>("/circuits", data),
  update: (id: string, data: Partial<Circuit>)        => api.put<Circuit>(`/circuits/${id}`, data),
  remove: (id: string)                                => api.delete<void>(`/circuits/${id}`),
};

// Measurements
export const measurementsApi = {
  list:   (params?: { type?: string; circuitId?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return api.get<Measurement[]>(`/measurements${qs}`);
  },
  create: (data: Omit<Measurement, "id" | "timestamp">) =>
                                                         api.post<Measurement>("/measurements", data),
};
