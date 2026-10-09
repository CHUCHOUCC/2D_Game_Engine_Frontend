import { expect, test } from "@playwright/test";
import { newUser, register } from "./helpers";

const API = "http://localhost:8000";

test("the production build ships a strict Content-Security-Policy without breaking the game", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });
  await page.goto("/");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  await register(page, newUser());
  await expect(page.locator("#game canvas")).toBeVisible();
  expect(violations).toEqual([]);
});

test("the API answers with security headers and a request id", async ({ request }) => {
  const response = await request.get(`${API}/health`);
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("default-src 'none'");
  expect(headers["x-request-id"]).toMatch(/^[0-9a-f]{32}$/);
});

test("protected routes refuse requests without a valid token", async ({ request }) => {
  expect((await request.get(`${API}/projects`)).status()).toBe(401);
  const forged = await request.get(`${API}/projects`, { headers: { Authorization: "Bearer eyJhbGciOiJub25lIn0.e30." } });
  expect(forged.status()).toBe(401);
});

test("one user cannot read another user's project", async ({ request }) => {
  const login = async (user: ReturnType<typeof newUser>) => {
    await request.post(`${API}/auth/register`, { data: { username: user.username, email: user.email, password: user.password } });
    const pair = await (await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } })).json();
    return { Authorization: `Bearer ${pair.access_token}` };
  };
  const alice = await login(newUser());
  const bob = await login(newUser());
  const project = await (await request.post(`${API}/projects`, { data: { name: "privado" }, headers: alice })).json();
  expect((await request.get(`${API}/projects/${project.id}`, { headers: alice })).status()).toBe(200);
  expect((await request.get(`${API}/projects/${project.id}`, { headers: bob })).status()).toBe(404);
  expect((await request.delete(`${API}/projects/${project.id}`, { headers: bob })).status()).toBe(404);
});

test("a stolen refresh token is useless once it was rotated", async ({ request }) => {
  const user = newUser();
  await request.post(`${API}/auth/register`, { data: { username: user.username, email: user.email, password: user.password } });
  const first = await (await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } })).json();
  const second = await (await request.post(`${API}/auth/refresh`, { data: { refresh_token: first.refresh_token } })).json();
  // Someone replays the old token: the whole session family is revoked.
  expect((await request.post(`${API}/auth/refresh`, { data: { refresh_token: first.refresh_token } })).status()).toBe(401);
  expect((await request.post(`${API}/auth/refresh`, { data: { refresh_token: second.refresh_token } })).status()).toBe(401);
});

test("oversized requests are rejected", async ({ request }) => {
  const response = await request.post(`${API}/auth/login`, {
    data: "x".repeat(1_100_000),
    headers: { "Content-Type": "application/json" },
  });
  expect(response.status()).toBe(413);
});

test("the AI service cannot be called without a service token", async ({ request }) => {
  const response = await request.post("http://localhost:8001/generate", { data: { prompt: "una moneda" } });
  expect(response.status()).toBe(401);
});
