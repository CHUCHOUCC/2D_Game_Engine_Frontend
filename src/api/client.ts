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
