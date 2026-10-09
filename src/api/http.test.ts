import { expect, test } from "vitest";
import { ApiError, friendlyMessage, HttpClient } from "./http";
import { TokenStore } from "./tokens";

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function setup(handler: Handler, withTokens = true) {
  const calls: { url: string; auth: string | undefined; body: unknown }[] = [];
  const tokens = new TokenStore(null);
  if (withTokens) tokens.save({ access_token: "old-access", refresh_token: "old-refresh", token_type: "bearer", expires_in: 900 });
  const fetcher = (async (input: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ url: input, auth: headers["Authorization"], body: init.body ? JSON.parse(String(init.body)) : undefined });
    return handler(input, init);
  }) as unknown as typeof fetch;
  return { client: new HttpClient("https://api.test", tokens, fetcher), calls, tokens };
}

test("HttpClient sends the access token as a bearer header", async () => {
  const { client, calls } = setup(() => json(200, { ok: true }));
  expect(await client.request("/auth/me")).toEqual({ ok: true });
  expect(calls[0]).toMatchObject({ url: "https://api.test/auth/me", auth: "Bearer old-access" });
});

test("HttpClient sends no header without tokens", async () => {
  const { client, calls } = setup(() => json(200, {}), false);
  await client.request("/health");
  expect(calls[0].auth).toBeUndefined();
});
