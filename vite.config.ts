import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Production builds get a strict Content-Security-Policy: scripts and styles
 * only from this site, network calls only to the backend. In development Vite
 * needs inline scripts and a websocket for hot reload, so the policy is skipped.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  const api = new URL(apiUrl).origin;
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${api}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" },
      { tag: "meta", attrs: { name: "referrer", content: "no-referrer" }, injectTo: "head-prepend" },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [contentSecurityPolicy(env.VITE_API_URL || "http://localhost:8000")],
    // Unit tests only; the browser tests in e2e/ run with Playwright.
    test: { include: ["src/**/*.test.ts"] },
    build: {
      sourcemap: false,
      // Phaser alone is about 1.3 MB; keep it in its own cacheable file.
      chunkSizeWarningLimit: 1600,
      rolldownOptions: { output: { advancedChunks: { groups: [{ name: "phaser", test: /node_modules[\\/]phaser/ }] } } },
    },
  };
});
