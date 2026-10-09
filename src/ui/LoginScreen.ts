import { getMe, logIn, registerAccount, type UserDto } from "../api/client";
import { byId, errorText } from "./dom";
import { hideLoader, showLoader } from "./loader";
import { passwordStrength } from "./passwordStrength";

type Mode = "login" | "register";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The full-screen login page: tabs to log in or create an account, an eye to
 * show the password, a strength meter and a loading logo while it works.
 */
export class LoginScreen {
  private mode: Mode = "login";
  private readonly screen = byId("login-screen");
  private readonly form = byId<HTMLFormElement>("auth-form");
  private readonly username = byId<HTMLInputElement>("auth-username");
  private readonly email = byId<HTMLInputElement>("auth-email");
  private readonly password = byId<HTMLInputElement>("auth-password");
  private readonly eye = byId<HTMLButtonElement>("toggle-password");
  private readonly submit = byId<HTMLButtonElement>("auth-submit");
  private readonly message = byId("auth-message");
  private readonly onLoggedIn: (user: UserDto) => Promise<void>;

  constructor(onLoggedIn: (user: UserDto) => Promise<void>) {
    this.onLoggedIn = onLoggedIn;
    byId("tab-login").addEventListener("click", () => this.setMode("login"));
    byId("tab-register").addEventListener("click", () => this.setMode("register"));
    this.eye.addEventListener("click", () => this.togglePassword());
    this.password.addEventListener("input", () => this.showStrength());
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.send();
    });
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    const register = mode === "register";
    byId("tab-login").classList.toggle("is-active", !register);
    byId("tab-register").classList.toggle("is-active", register);
    byId("tab-login").setAttribute("aria-selected", String(!register));
    byId("tab-register").setAttribute("aria-selected", String(register));
    byId("field-username").hidden = !register;
    byId("strength").hidden = !register;
    this.password.autocomplete = register ? "new-password" : "current-password";
    this.submit.querySelector(".btn-label")!.textContent = register ? "Crear cuenta" : "Iniciar sesión";
    this.setMessage("");
    this.showStrength();
  }

  private togglePassword(): void {
    const visible = this.password.type === "password";
    this.password.type = visible ? "text" : "password";
    this.eye.setAttribute("aria-pressed", String(visible));
    this.eye.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    this.password.focus();
  }

  private showStrength(): void {
    if (this.mode !== "register") return;
    const strength = passwordStrength(this.password.value);
    const fill = byId("strength-fill");
    fill.style.width = `${this.password.value ? (strength.score + 1) * 20 : 0}%`;
    fill.style.background = strength.color;
    byId("strength-label").textContent = this.password.value ? strength.label : "Escribe una contraseña";
  }

  private validate(): string | null {
    for (const input of [this.username, this.email, this.password]) input.removeAttribute("aria-invalid");
    if (this.mode === "register" && this.username.value.trim() === "") {
      this.username.setAttribute("aria-invalid", "true");
      return "Elige un nombre de usuario.";
    }
    if (!EMAIL.test(this.email.value.trim())) {
      this.email.setAttribute("aria-invalid", "true");
      return "Escribe un correo válido.";
    }
    if (this.password.value.length < (this.mode === "register" ? 8 : 1)) {
      this.password.setAttribute("aria-invalid", "true");
      return this.mode === "register" ? "La contraseña necesita al menos 8 caracteres." : "Escribe tu contraseña.";
    }
    return null;
  }

  private async send(): Promise<void> {
    const problem = this.validate();
    if (problem !== null) {
      this.setMessage(problem, true);
      return;
    }
    this.setBusy(true);
    try {
      const email = this.email.value.trim();
      if (this.mode === "register") {
        await registerAccount(this.username.value.trim(), email, this.password.value);
      }
      await logIn(email, this.password.value);
      showLoader("Iniciando sesión…");
      const user = await getMe();
      this.password.value = "";
      await this.onLoggedIn(user);
    } catch (error) {
      hideLoader();
      this.setMessage(errorText(error), true);
    } finally {
      this.setBusy(false);
    }
  }
