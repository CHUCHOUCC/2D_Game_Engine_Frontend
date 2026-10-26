/** The element with this id; throws early if the HTML and the code disagree. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing element #${id}`);
  return element as T;
}

/** Create an element with a class and optional text. */
export function make<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

/** The eye buttons (data-toggle-password="<input id>") inside `root` show and hide their password. */
export function bindPasswordEyes(root: ParentNode): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-toggle-password]")) {
    button.addEventListener("click", () => {
      const input = byId<HTMLInputElement>(button.dataset.togglePassword!);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
      input.focus();
    });
  }
}
