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
