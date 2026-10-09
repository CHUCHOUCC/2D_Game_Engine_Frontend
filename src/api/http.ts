import { TokenStore, type TokenPair } from "./tokens";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MESSAGES: Record<string, string> = {
  "Invalid email or password": "Correo o contraseña incorrectos.",
  "Email already registered": "Ese correo ya tiene una cuenta.",
  "Too many failed attempts, try again later": "Demasiados intentos fallidos. Espera unos minutos.",
  "Invalid or missing token": "Tu sesión terminó. Vuelve a iniciar sesión.",
  "Invalid refresh token": "Tu sesión terminó. Vuelve a iniciar sesión.",
  "Project not found": "No se encontró el proyecto.",
  "AI service is not configured": "La IA no está configurada en el servidor.",
};

export function friendlyMessage(status: number, detail: string): string {
  if (MESSAGES[detail]) return MESSAGES[detail];
  if (status === 0) return "No se pudo conectar con el servidor.";
  if (status === 422) return "Hay datos no válidos en el formulario.";
  if (status === 502 || status === 503) return "La IA no respondió. Inténtalo de nuevo.";
  return detail || `Error ${status}`;
}

type Fetch = typeof fetch;

/**
 * Talks ONLY to the backend. Adds the access token to every request and,
 * when the backend answers 401, refreshes the tokens once and retries.
 * Concurrent requests share a single refresh.
 */
export class HttpClient {
  readonly tokens: TokenStore;
  private readonly baseUrl: string;
  private readonly fetcher: Fetch;
  private refreshing: Promise<boolean> | null = null;
  private onSessionLost: () => void = () => {};

  constructor(baseUrl: string, tokens: TokenStore, fetcher: Fetch = (...args) => fetch(...args)) {
    this.baseUrl = baseUrl;
    this.tokens = tokens;
    this.fetcher = fetcher;
  }

  /** Called when the session cannot be refreshed any more (user must log in again). */
  whenSessionLost(handler: () => void): void {
    this.onSessionLost = handler;
  }
