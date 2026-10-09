import type { GameObject } from "../model/GameObject";
import { HttpClient } from "./http";
import { TokenStore, type TokenPair } from "./tokens";

export { ApiError } from "./http";

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** The only door to the backend. The frontend never calls the AI service. */
export const http = new HttpClient(BASE_URL, new TokenStore());

export interface UserDto {
  id: number;
  username: string;
  email: string;
}

export interface ProjectDto {
  id: number;
  owner_id: number;
  name: string;
  scene: GameObject[];
  updated_at: string;
}

export interface TemplateDto {
  code: string;
  name: string;
  description: string;
  object_count: number;
}

export interface VersionDto {
  version_number: number;
  note: string;
  created_at: string;
  object_count: number;
}

export function registerAccount(username: string, email: string, password: string): Promise<UserDto> {
  return http.request<UserDto>("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
}

/** Log in and keep the access and refresh tokens. */
export async function logIn(email: string, password: string): Promise<void> {
  const pair = await http.request<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  http.tokens.save(pair);
}

export function getMe(): Promise<UserDto> {
  return http.request<UserDto>("/auth/me");
}

/** Revoke both tokens on the backend, then forget them here too. */
export async function logOut(): Promise<void> {
  const refresh = http.tokens.refresh;
  try {
    if (http.tokens.access !== null) {
      await http.request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) });
    }
  } catch {
    // even if the backend is unreachable we still forget the tokens locally
  }
  http.tokens.clear();
}

export function hasSession(): boolean {
  return http.tokens.refresh !== null;
}

export function listProjects(): Promise<ProjectDto[]> {
  return http.request<ProjectDto[]>("/projects");
}

export function listTemplates(): Promise<TemplateDto[]> {
  return http.request<TemplateDto[]>("/projects/templates");
}

export function createProject(name: string, template?: string): Promise<ProjectDto> {
  return http.request<ProjectDto>("/projects", { method: "POST", body: JSON.stringify({ name, template }) });
}

export function getProject(id: number): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}`);
}

export function renameProject(id: number, name: string): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function deleteProject(id: number): Promise<void> {
  return http.request<void>(`/projects/${id}`, { method: "DELETE" });
}

export function duplicateProject(id: number): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}/duplicate`, { method: "POST" });
}

export function saveScene(id: number, scene: GameObject[], note = ""): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}/scene`, { method: "PUT", body: JSON.stringify({ scene, note }) });
}

export function listVersions(id: number): Promise<VersionDto[]> {
  return http.request<VersionDto[]>(`/projects/${id}/versions`);
}

export function restoreVersion(id: number, version: number): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}/versions/${version}/restore`, { method: "POST" });
}

export interface AiModelDto {
  samples_seen: number;
  version: number;
  difficulty: number;
  parameters: Record<string, unknown>;
}

export function askAi(id: number, prompt: string): Promise<ProjectDto> {
  return http.request<ProjectDto>(`/projects/${id}/ai`, { method: "POST", body: JSON.stringify({ prompt }) });
}

export function aiObstacles(id: number, count: number): Promise<ProjectDto & { added: number; difficulty: number }> {
  return http.request(`/projects/${id}/ai/obstacles`, { method: "POST", body: JSON.stringify({ count }) });
}

export function aiModel(id: number): Promise<AiModelDto> {
  return http.request<AiModelDto>(`/projects/${id}/ai/model`);
}

export interface RunResultDto {
  outcome: "won" | "lost" | "quit";
  score: number;
  coins_collected: number;
  coins_total: number;
  enemies_defeated: number;
  damage_taken: number;
  deaths: number;
  duration_ms: number;
  events: { kind: string; x?: number; y?: number; at_ms: number }[];
}

export interface FinishDto {
  learned: boolean;
  difficulty: number;
  reward?: number;
  achievements: string[];
}

export function startRun(projectId: number): Promise<{ id: number; difficulty: number }> {
  return http.request(`/projects/${projectId}/plays`, { method: "POST" });
}

export function finishRun(projectId: number, runId: number, result: RunResultDto): Promise<FinishDto> {
  return http.request<FinishDto>(`/projects/${projectId}/plays/${runId}/finish`, {
    method: "POST",
    body: JSON.stringify(result),
  });
}
