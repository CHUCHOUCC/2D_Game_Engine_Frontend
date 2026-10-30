import { LRUCache } from "../structures/LRUCache";

/**
 * In-memory cache of API answers that rarely change (catalog, starter templates, settings).
 * Opening the editor or the "new project" dialog again no longer asks the backend.
 * Requests for the same key made at the same time share one network call.
 * Everything is cleared on logout, so another user never sees cached data.
 */
const answers = new LRUCache<string, unknown>(32);
const inFlight = new Map<string, Promise<unknown>>();
// Bumped on every forgetAll(): an answer that was requested before a logout must not be stored after it.
let generation = 0;

export const TTL = {
  reference: 10 * 60_000,
  settings: 5 * 60_000,
};

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = answers.get(key);
  if (hit !== undefined) return hit as T;
  const pending = inFlight.get(key);
  if (pending !== undefined) return pending as Promise<T>;
  const startedIn = generation;
  const request: Promise<T> = load()
    .then((value) => {
      if (startedIn === generation) answers.set(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

/** Stores a value that the app already knows is current (write-through after a save). */
export function remember<T>(key: string, value: T, ttlMs: number): void {
  answers.set(key, value, ttlMs);
}

export function forget(key: string): void {
  answers.delete(key);
}

export function forgetAll(): void {
  generation += 1;
  answers.clear();
  inFlight.clear();
}
