/**
 * The backend's password policy, checked before sending the form so the user
 * gets the reason at once. The backend checks it again; this is only a helper.
 */
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123",
  "qwertyuiop", "11111111", "00000000", "iloveyou", "sunshine", "princess", "football",
  "baseball", "welcome1", "admin123", "letmein1", "dragon123", "monkey123", "abc12345",
  "contrasena", "contraseña", "123123123", "passw0rd", "superman", "trustno1", "starwars",
  "asdfghjkl", "zaq12wsx", "1q2w3e4r", "q1w2e3r4", "aa123456", "computer", "whatever",
  "qazwsx123", "michelle", "jennifer", "corvette", "mustang1", "shadow12", "master12",
]);

/** The reason the password is not acceptable (in Spanish), or null when it is fine. */
export function passwordProblem(password: string, email = "", username = ""): string | null {
  if (password.length < 8) return "La contraseña necesita al menos 8 caracteres.";
  if (password.length > 128) return "La contraseña puede tener como máximo 128 caracteres.";
  const lowered = password.toLowerCase();
  if (COMMON.has(lowered)) return "Esa contraseña es demasiado común.";
  if (new Set(password).size < 4) return "La contraseña repite demasiados caracteres.";
  if (/^\d+$/.test(password)) return "La contraseña no puede tener solo números.";
  const personal = [email.split("@")[0].toLowerCase(), username.toLowerCase()];
  if (personal.some((part) => part.length >= 4 && lowered.includes(part))) {
    return "La contraseña no puede contener tu correo ni tu usuario.";
  }
  return null;
}
