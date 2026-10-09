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
