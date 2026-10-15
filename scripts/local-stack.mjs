#!/usr/bin/env node
/**
 * Start the whole system on this computer with throw-away data:
 *
 *   PostgreSQL (PGlite, in memory) :54329
 *   Backend (FastAPI)              :8000   ../2D_Game_Engine
 *   AI service (FastAPI)           :8001   ../2D_Game_Engine_AI
 *   Frontend                       :5173   (dev)   or :4173 with --preview (production build)
 *
 * Usage:  npm run stack            development, hot reload
 *         npm run stack:preview    production build with the strict CSP (what E2E tests use)
 *
 * Every run creates fresh random secrets and an empty database, so nothing here
 * can leak into or touch a real deployment. Ctrl+C stops everything.
 * The backend and AI repos must sit next to this one, each with its .venv
 * (override with BACKEND_DIR and AI_DIR).
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(here, "..");
const backendDir = path.resolve(process.env.BACKEND_DIR ?? path.join(frontendDir, "..", "2D_Game_Engine"));
const aiDir = path.resolve(process.env.AI_DIR ?? path.join(frontendDir, "..", "2D_Game_Engine_AI"));
const preview = process.argv.includes("--preview");
// Automated tests log in many times a minute; real limits would block them.
const e2e = process.argv.includes("--e2e");

const PORTS = { db: 54329, backend: 8000, ai: 8001, frontend: preview ? 4173 : 5173 };
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORTS.db}/postgres?sslmode=disable`;
const secret = () => randomBytes(36).toString("base64url");
const JWT_SECRET = secret();
const AI_SERVICE_KEY = secret();
const children = [];

function python(dir) {
  const candidates = [path.join(dir, ".venv", "Scripts", "python.exe"), path.join(dir, ".venv", "bin", "python")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error(`No virtual environment in ${dir}. Create it with:\n  python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt`);
    process.exit(1);
  }
  return found;
}

function start(name, command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" && command === "npx", ...options });
  const prefix = `[${name}]`.padEnd(10);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (data) => {
      for (const line of String(data).split(/\r?\n/)) if (line.trim()) console.log(`${prefix} ${line}`);
    });
  }
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${prefix} stopped with code ${code}; stopping everything.`);
      stopAll(1);
    }
  });
  children.push(child);
  return child;
}

function waitForPort(port, timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > until) reject(new Error(`Port ${port} did not open in time`));
        else setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

let stopping = false;
function stopAll(code = 0) {
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  }
  process.exit(code);
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function main() {
  for (const [name, port] of Object.entries(PORTS)) {
    if (await portInUse(port)) {
      console.error(`Port ${port} (${name}) is already in use. Is another stack running? Stop it first.`);
      process.exit(1);
    }
  }
  const backendPython = python(backendDir);
  const aiPython = python(aiDir);

  start("database", process.execPath, [
    path.join(frontendDir, "node_modules", "@electric-sql", "pglite-socket", "dist", "scripts", "server.js"),
    "-p", String(PORTS.db), "-m", "4",
  ]);
  await waitForPort(PORTS.db);

  const migrate = spawnSync(backendPython, ["-m", "app.migrate"], {
    cwd: backendDir, env: { ...process.env, DATABASE_URL }, encoding: "utf-8",
  });
  console.log(`[migrate]  ${(migrate.stdout || migrate.stderr).split("\n")[0]}`);
  if (migrate.status !== 0) stopAll(1);

  const shared = { ...process.env, ENVIRONMENT: "development", PYTHONUNBUFFERED: "1" };
  start("ai", aiPython, ["-m", "uvicorn", "app.main:app", "--port", String(PORTS.ai)], {
    cwd: aiDir, env: { ...shared, AI_SERVICE_KEY, AI_PROVIDER: "simulated" },
  });
  start("backend", backendPython, ["-m", "uvicorn", "app.main:app", "--port", String(PORTS.backend)], {
    cwd: backendDir,
    env: {
      ...shared, DATABASE_URL, JWT_SECRET, AI_SERVICE_KEY,
      RATE_LIMIT_MULTIPLIER: e2e ? "20" : "1",
      AI_SERVICE_URL: `http://127.0.0.1:${PORTS.ai}`,
      FRONTEND_ORIGINS: `http://localhost:${PORTS.frontend},http://127.0.0.1:${PORTS.frontend}`,
    },
  });
  await Promise.all([waitForPort(PORTS.ai), waitForPort(PORTS.backend)]);

  const frontendEnv = { ...process.env, VITE_API_URL: `http://localhost:${PORTS.backend}` };
  if (preview) {
    const build = spawnSync("npx", ["vite", "build"], { cwd: frontendDir, env: frontendEnv, shell: process.platform === "win32", encoding: "utf-8" });
    if (build.status !== 0) {
      console.error(build.stdout, build.stderr);
      stopAll(1);
    }
    start("frontend", "npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORTS.frontend), "--strictPort"], { cwd: frontendDir, env: frontendEnv });
  } else {
    start("frontend", "npx", ["vite", "--host", "127.0.0.1", "--port", String(PORTS.frontend), "--strictPort"], { cwd: frontendDir, env: frontendEnv });
  }
  await waitForPort(PORTS.frontend);
  console.log(`\nReady: http://127.0.0.1:${PORTS.frontend}   (API http://127.0.0.1:${PORTS.backend}/docs)   Ctrl+C to stop.\n`);
}

main().catch((error) => {
  console.error(error);
  stopAll(1);
});
