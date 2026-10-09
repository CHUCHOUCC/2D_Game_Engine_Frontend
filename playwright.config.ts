import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser drives the production build against the
 * real backend, AI service and a throw-away PostgreSQL (see scripts/local-stack.mjs).
 *
 * Locally the installed Microsoft Edge is used (no browser download needed);
 * set PW_CHANNEL=chrome to use Google Chrome, or PW_CHANNEL= (empty) in CI
 * after `npx playwright install chromium`.
 */
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "browser", use: { ...devices["Desktop Chrome"], channel: channel || undefined, viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "node scripts/local-stack.mjs --preview --e2e",
    url: "http://127.0.0.1:4173",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
