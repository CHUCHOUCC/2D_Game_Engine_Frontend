/** What the backend returns on login and refresh. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

const STORAGE_KEY = "engine-tokens";

interface Stored {
  access: string;
  refresh: string;
  expiresAt: number; // epoch milliseconds
}

/**
 * Keeps the tokens of the logged-in user.
 *
 * They live in localStorage and in memory, so the session survives closing the tab or the app
 * (on phones the browser drops sessionStorage when the app is closed). Logging out clears them.
 * The access token is short (15 min); the refresh token (rotating, 7 days) gets a new pair.
 * Every tab shares the same storage: reload() picks up a pair another tab just refreshed.
 */
export class TokenStore {
  private current: Stored | null;
  private readonly storage: Storage | null;
  private readonly now: () => number;

  constructor(storage: Storage | null = safeLocalStorage(), now: () => number = () => Date.now()) {
    this.storage = storage;
    this.now = now;
    this.current = this.read() ?? this.migrateFromSession();
  }

  /** Reads the storage again (another tab may have refreshed or logged out). */
  reload(): void {
    // Without storage the tokens live only in memory: there is nothing newer to read.
    if (this.storage !== null) this.current = this.read();
  }

  /** Tokens saved by an older version in sessionStorage move to the persistent storage once. */
  private migrateFromSession(): Stored | null {
    if (this.storage === null || this.storage === safeSessionStorage()) return null;
    try {
      const raw = safeSessionStorage()?.getItem(STORAGE_KEY);
      if (!raw) return null;
      safeSessionStorage()?.removeItem(STORAGE_KEY);
      const data = JSON.parse(raw) as Stored;
      if (typeof data.access !== "string" || typeof data.refresh !== "string") return null;
      this.current = data;
      this.write();
      return data;
    } catch {
      return null;
    }
  }

  save(pair: TokenPair): void {
    this.current = {
      access: pair.access_token,
      refresh: pair.refresh_token,
      expiresAt: this.now() + pair.expires_in * 1000,
    };
    this.write();
  }

  clear(): void {
    this.current = null;
    this.write();
  }

  get access(): string | null {
    return this.current?.access ?? null;
  }

  get refresh(): string | null {
    return this.current?.refresh ?? null;
  }

  /** Milliseconds until the access token expires (negative once expired). */
  msUntilExpiry(): number {
    return this.current === null ? -1 : this.current.expiresAt - this.now();
  }

  /** True when the access token expires within the next `marginMs`. */
  expiresSoon(marginMs = 60_000): boolean {
    return this.current !== null && this.msUntilExpiry() < marginMs;
  }

  private read(): Stored | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Stored;
      return typeof data.access === "string" && typeof data.refresh === "string" ? data : null;
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      if (this.current === null) this.storage?.removeItem(STORAGE_KEY);
      else this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // storage may be blocked; the tokens then live only in memory
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}
