import { getMe, hasToken, logIn, logOut, registerAccount, type UserDto } from "../api/client";

interface AuthCallbacks {
  /** Called after a successful login (or when an earlier session is restored). */
  onLoggedIn: (user: UserDto) => Promise<void> | void;
  /** Called when the user logs out or the session expires. */
  onLoggedOut: () => void;
}

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

/**
 * The register / log in form and the "logged in as ..." bar.
 * It shows the editor only while there is a logged-in user.
 */
export function setupAuthPanel(callbacks: AuthCallbacks) {
  const panel = element<HTMLElement>("auth-panel");
  const form = element<HTMLFormElement>("auth-form");
  const username = element<HTMLInputElement>("auth-username");
  const email = element<HTMLInputElement>("auth-email");
  const password = element<HTMLInputElement>("auth-password");
  const message = element<HTMLElement>("auth-message");
  const userBar = element<HTMLElement>("user-bar");
  const userName = element<HTMLElement>("user-name");
  const editor = element<HTMLElement>("editor");

  function setMessage(text: string, isError = false): void {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  async function enter(user: UserDto): Promise<void> {
    userName.textContent = user.username;
    password.value = "";
    setMessage("");
    panel.hidden = true;
    userBar.hidden = false;
    editor.hidden = false;
    await callbacks.onLoggedIn(user);
  }

  function leave(note = ""): void {
    panel.hidden = false;
    userBar.hidden = true;
    editor.hidden = true;
    password.value = "";
    setMessage(note);
    callbacks.onLoggedOut();
  }

  async function submit(isRegister: boolean): Promise<void> {
    try {
      if (isRegister) {
        if (username.value.trim() === "") {
          setMessage("Choose a username to register.", true);
          return;
        }
        await registerAccount(username.value.trim(), email.value.trim(), password.value);
      }
      await logIn(email.value.trim(), password.value);
      await enter(await getMe());
    } catch (error) {
      setMessage(errorText(error), true);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit(false);
  });
  element<HTMLButtonElement>("auth-register").addEventListener("click", () => void submit(true));
  element<HTMLButtonElement>("logout").addEventListener("click", () => {
    void logOut().then(() => leave());
  });

  return {
    /** If the tab still has a token from before, try to use it. */
    async restoreSession(): Promise<void> {
      if (!hasToken()) {
        leave();
        return;
      }
      try {
        await enter(await getMe());
      } catch {
        leave();
      }
    },
    /** The backend said the token is no longer valid. */
    expire(): void {
      leave("Your session expired. Log in again.");
    },
  };
}
