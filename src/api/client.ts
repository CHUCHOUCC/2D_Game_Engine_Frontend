import type { GameObject } from "../model/GameObject";

/** Shape of a project as the backend returns it. */
export interface ProjectDto {
  id: number;
  owner_id: number;
  name: string;
  scene: GameObject[];
  updated_at: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Token for the login module (set after /login is implemented).
let authToken: string | null = null;

export function setToken(token: string | null): void {
  authToken = token;
}

/** The frontend talks ONLY to the backend. It never calls the AI service. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken !== null) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // keep the status text
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

export function createProject(name: string): Promise<ProjectDto> {
  return request<ProjectDto>("/projects", { method: "POST", body: JSON.stringify({ name }) });
}

export function getProject(id: number): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${id}`);
}

export function saveScene(id: number, scene: GameObject[]): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${id}/scene`, { method: "PUT", body: JSON.stringify({ scene }) });
}

export function askAi(id: number, prompt: string): Promise<ProjectDto> {
  return request<ProjectDto>(`/projects/${id}/ai`, { method: "POST", body: JSON.stringify({ prompt }) });
}
