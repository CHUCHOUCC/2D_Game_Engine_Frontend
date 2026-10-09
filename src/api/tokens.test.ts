import { expect, test } from "vitest";
import { TokenStore } from "./tokens";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

const PAIR = { access_token: "a1", refresh_token: "r1", token_type: "bearer", expires_in: 900 };

function store(now = () => 1_000) {
  const storage = new MemoryStorage();
  return { storage, tokens: new TokenStore(storage as unknown as Storage, now) };
}

test("TokenStore starts with no tokens", () => {
  const { tokens } = store();
  expect(tokens.access).toBeNull();
  expect(tokens.refresh).toBeNull();
  expect(tokens.expiresSoon()).toBe(false);
});

test("TokenStore saves a pair and knows when the access token expires", () => {
  const { tokens } = store(() => 1_000);
  tokens.save(PAIR);
  expect(tokens.access).toBe("a1");
  expect(tokens.refresh).toBe("r1");
  expect(tokens.msUntilExpiry()).toBe(900_000);
});
