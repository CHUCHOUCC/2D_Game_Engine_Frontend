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

const TOKEN_KEY = "auth-token";

// The token lives in sessionStorage: it is forgotten when the tab is closed.
function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let authToken: string | null = readStoredToken();
let unauthorizedHandler: (() => void) | null = null;

export function setToken(token: string | null): void {
  authToken = token;
  try {
    if (token === null) {
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // storage may be blocked; the token then lives only in memory
  }
}

export function hasToken(): boolean {
  return authToken !== null;
}

/** Called when the backend answers 401 to a request that carried a token (expired session). */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
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
    if (response.status === 401 && authToken !== null) {
      setToken(null);
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
}

export function registerAccount(username: string, email: string, password: string): Promise<UserDto> {
  return request<UserDto>("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
}

/** Log in and keep the token for the next requests. */
export async function logIn(email: string, password: string): Promise<void> {
  const result = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(result.access_token);
}

export function getMe(): Promise<UserDto> {
  return request<UserDto>("/auth/me");
}

/** Tell the backend to forget the token, then forget it here too. */
export async function logOut(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } catch {
    // even if the backend is unreachable we still forget the token locally
  }
  setToken(null);
}

export function listProjects(): Promise<ProjectDto[]> {
  return request<ProjectDto[]>("/projects");
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
