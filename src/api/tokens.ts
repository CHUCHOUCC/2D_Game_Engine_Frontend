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
 * They live in sessionStorage (forgotten when the tab closes) and in memory.
 * The access token is short (15 min); the refresh token gets a new one.
 */
export class TokenStore {
  private current: Stored | null;
  private readonly storage: Storage | null;
  private readonly now: () => number;

  constructor(storage: Storage | null = safeSessionStorage(), now: () => number = () => Date.now()) {
    this.storage = storage;
    this.now = now;
    this.current = this.read();
  }
