import { TokenStore, type TokenPair } from "./tokens";

export class ApiError extends Error {
  readonly status: number;
  /** Failed logins left before the lockout (from X-Attempts-Remaining), when the server says. */
  readonly attemptsLeft: number | null;

  constructor(status: number, message: string, attemptsLeft: number | null = null) {
    super(message);
    this.status = status;
    this.attemptsLeft = attemptsLeft;
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
  "Too many requests, slow down": "Vas demasiado rápido. Espera un momento y vuelve a intentarlo.",
  "Request body too large": "Los datos enviados son demasiado grandes.",
  "Current password is wrong": "La contraseña actual no es correcta.",
  "Password is too common": "Esa contraseña es demasiado común.",
  "Password repeats too few characters": "La contraseña repite demasiados caracteres.",
  "Password cannot be only numbers": "La contraseña no puede tener solo números.",
  "Password cannot contain your email or username": "La contraseña no puede contener tu correo ni tu usuario.",
  "Password must have at least 8 characters": "La contraseña necesita al menos 8 caracteres.",
  "New password must be different": "La nueva contraseña debe ser distinta de la actual.",
  "Version not found": "No se encontró esa versión.",
  "Unknown template": "Esa plantilla no existe.",
  "Run not found or already finished": "La partida ya había terminado.",
  "Internal server error": "Error interno del servidor. Inténtalo de nuevo.",
};

/** Spanish text for an error. The backend speaks English; the user never sees it. */
export function friendlyMessage(status: number, detail: string): string {
  if (MESSAGES[detail]) return MESSAGES[detail];
  if (status === 0) return "No se pudo conectar con el servidor.";
  if (status === 401) return "Tu sesión terminó. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para hacer esto.";
  if (status === 404) return "No se encontró lo que buscabas.";
  if (status === 413) return "Los datos enviados son demasiado grandes.";
  if (status === 422) return "Hay datos no válidos en el formulario.";
  if (status === 429) return "Demasiadas peticiones. Espera un momento.";
  if (status === 502 || status === 503) return "La IA no respondió. Inténtalo de nuevo.";
  return `Algo salió mal (código ${status}). Inténtalo de nuevo.`;
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

  private async send(path: string, init: RequestInit, token: string | null): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token !== null) headers["Authorization"] = `Bearer ${token}`;
    try {
      return await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, friendlyMessage(0, ""));
    }
  }

  private static async errorOf(response: Response): Promise<ApiError> {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // keep the status text
    }
    const left = Number.parseInt(response.headers.get("X-Attempts-Remaining") ?? "", 10);
    return new ApiError(response.status, friendlyMessage(response.status, detail), Number.isNaN(left) ? null : left);
  }

  /** Exchange the refresh token for a new pair. Only one refresh runs at a time. */
  refreshTokens(): Promise<boolean> {
    if (this.refreshing === null) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  /**
   * Refresh tokens rotate and the backend treats reusing an old one as theft (it revokes them all).
   * With several tabs open, only one may refresh at a time: the Web Locks API serialises them, and
   * inside the lock the storage is read again in case another tab already got a new pair.
   */
  private async doRefresh(): Promise<boolean> {
    const used = this.tokens.refresh;
    const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (locks === undefined) return this.refreshNow();
    return locks.request("engine-token-refresh", async () => {
      this.tokens.reload();
      if (this.tokens.refresh !== null && this.tokens.refresh !== used && !this.tokens.expiresSoon(15_000)) {
        return true; // another tab refreshed while we waited
      }
      return this.refreshNow();
    });
  }

  private async refreshNow(): Promise<boolean> {
    const refresh = this.tokens.refresh;
    if (refresh === null) return false;
    const response = await this.send("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) }, null)
      .catch(() => null);
    if (response === null || !response.ok) {
      // Only a rejected refresh token ends the session. A sleeping server (502/503), a rate limit
      // or no network keeps the tokens, so the next attempt can still succeed.
      if (response !== null && [400, 401, 403].includes(response.status)) this.tokens.clear();
      return false;
    }
    this.tokens.save((await response.json()) as TokenPair);
    return true;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.tokens.access !== null && this.tokens.expiresSoon(15_000)) {
      await this.refreshTokens();
    }
    let response = await this.send(path, init, this.tokens.access);
    if (response.status === 401 && this.tokens.refresh !== null) {
      if (await this.refreshTokens()) {
        response = await this.send(path, init, this.tokens.access);
      }
      if (response.status === 401) {
        this.tokens.clear();
        this.onSessionLost();
      }
    }
    if (!response.ok) throw await HttpClient.errorOf(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
