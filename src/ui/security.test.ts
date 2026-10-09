import { expect, test } from "vitest";
import { IdleTimer, WARNING_BEFORE_MS } from "./IdleTimer";
import { passwordProblem } from "./passwordPolicy";
import { actionName } from "./SecurityPanel";

test("the password policy matches the backend rules", () => {
  expect(passwordProblem("short")).toBe("La contraseña necesita al menos 8 caracteres.");
  expect(passwordProblem("Password123")).toBe("Esa contraseña es demasiado común.");
  expect(passwordProblem("aaaabbbb")).toBe("La contraseña repite demasiados caracteres.");
  expect(passwordProblem("1234567899")).toBe("La contraseña no puede tener solo números.");
  expect(passwordProblem("jesus-rocks-2026", "jesus@example.com")).toBe("La contraseña no puede contener tu correo ni tu usuario.");
  expect(passwordProblem("x".repeat(129))).toBe("La contraseña puede tener como máximo 128 caracteres.");
  expect(passwordProblem("caballo correcto grapa", "ana@example.com", "ana")).toBeNull();
});

test("the idle timer warns before logging out and resets on activity", () => {
  let now = 0;
  const calls: string[] = [];
  const timer = new IdleTimer({ onWarning: () => calls.push("warning"), onTimeout: () => calls.push("timeout") }, 10_000_000, () => now);
  now = 10_000_000 - WARNING_BEFORE_MS;
  timer.check();
  timer.check();
  expect(calls).toEqual(["warning"]);
  timer.touch();
  now += 10_000_000 - 1;
  timer.check();
  expect(calls).toEqual(["warning", "warning"]);
  now += 1;
  timer.check();
  expect(calls).toEqual(["warning", "warning", "timeout"]);
});

test("security events are shown in Spanish", () => {
  expect(actionName("user.password_changed")).toBe("Contraseña cambiada");
  expect(actionName("token.reuse_detected")).toContain("bloqueado");
});
