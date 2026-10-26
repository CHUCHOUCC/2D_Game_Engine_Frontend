/**
 * Live checks of the login and register form. Each one says what is wrong
 * and how to fix it, in Spanish. The backend checks the same rules again.
 */
import { passwordProblem } from "./passwordPolicy";

export type FieldState = "ok" | "bad" | "";

export interface Check {
  state: FieldState;
  message: string;
}

const ok = (message = ""): Check => ({ state: "ok", message });
const bad = (message: string): Check => ({ state: "bad", message });

/** 3-20 letters, digits or underscores (the backend uses the same pattern). */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function checkUsername(value: string): Check {
  const name = value.trim();
  if (name === "") return bad("Escribe un nombre de usuario.");
  if (name.length < 3) return bad("Debe tener al menos 3 caracteres.");
  if (name.length > 20) return bad("Puede tener como máximo 20 caracteres.");
  if (/\s/.test(name)) return bad("No puede tener espacios.");
  if (!USERNAME_PATTERN.test(name)) return bad("Solo letras sin tilde, números y guion bajo (_).");
  return ok("Nombre válido.");
}

export function checkEmail(value: string): Check {
  const email = value.trim();
  if (email === "") return bad("Escribe tu correo.");
  if (email.length > 254) return bad("El correo es demasiado largo.");
  if (/\s/.test(email)) return bad("El correo no puede tener espacios.");
  const at = email.indexOf("@");
  if (at === -1) return bad("Falta la @ del correo.");
  if (at === 0) return bad("Falta el nombre antes de la @.");
  if (email.indexOf("@", at + 1) !== -1) return bad("El correo solo puede tener una @.");
  const domain = email.slice(at + 1);
  if (domain === "") return bad("Falta el dominio después de la @, por ejemplo gmail.com.");
  if (!/\.[A-Za-z]{2,}$/.test(domain)) return bad("Al dominio le falta la terminación, por ejemplo .com o .co.");
  if (/\.\./.test(email) || domain.startsWith(".")) return bad("El correo tiene puntos seguidos o mal colocados.");
  return ok("Correo válido.");
}

/** The four rules shown as a checklist under the password. */
export interface PasswordRules {
  length: boolean;
  mix: boolean;
  common: boolean;
  personal: boolean;
}

export function passwordRules(password: string, email = "", username = ""): PasswordRules {
  const problem = passwordProblem(password, email, username);
  return {
    length: password.length >= 8 && password.length <= 128,
    mix: /[A-Za-z]/.test(password) && /[^A-Za-z]/.test(password),
    common: problem !== "Esa contraseña es demasiado común." && problem !== "La contraseña repite demasiados caracteres.",
    personal: problem !== "La contraseña no puede contener tu correo ni tu usuario.",
  };
}

export function checkNewPassword(password: string, email = "", username = ""): Check {
  if (password === "") return bad("Escribe una contraseña.");
  const problem = passwordProblem(password, email, username);
  if (problem !== null) return bad(problem);
  if (!passwordRules(password, email, username).mix) return bad("Combina letras con números o símbolos.");
  return ok("Buena contraseña.");
}

export function checkConfirmation(password: string, confirmation: string): Check {
  if (confirmation === "") return bad("Repite la contraseña.");
  if (confirmation !== password) return bad("No coincide con la contraseña.");
  return ok("Las contraseñas coinciden.");
}

/** The banner after a failed login: how many tries are left before the lockout. */
export function attemptsMessage(left: number | null): string {
  if (left === null) return "";
  if (left <= 0) return "Cuenta bloqueada 15 minutos por demasiados intentos fallidos.";
  if (left === 1) return "Te queda 1 intento antes de bloquear la cuenta 15 minutos.";
  return `Te quedan ${left} intentos antes de bloquear la cuenta 15 minutos.`;
}
