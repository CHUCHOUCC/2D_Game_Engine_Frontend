import type { GameObject } from "../model/GameObject";
import { HttpClient } from "./http";
import { TokenStore, type TokenPair } from "./tokens";

export { ApiError } from "./http";

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** The only door to the backend. The frontend never calls the AI service. */
export const http = new HttpClient(BASE_URL, new TokenStore());
