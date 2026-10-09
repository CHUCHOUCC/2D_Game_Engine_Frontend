import { listTemplates, type TemplateDto } from "../api/client";
import { byId, make } from "./dom";

const FALLBACK: TemplateDto[] = [{ code: "empty", name: "Vacío", description: "Una escena sin objetos", object_count: 0 }];

/** Ask for a name and a starting template; resolves to null when cancelled. */
export async function askNewProject(): Promise<{ name: string; template: string } | null> {
  const dialog = byId<HTMLDialogElement>("new-project-dialog");
  const name = byId<HTMLInputElement>("new-project-name");
  const templates = byId("templates");
  const options = await listTemplates().catch(() => FALLBACK);
  templates.replaceChildren(...options.map((t, i) => templateOption(t, i === 0)));
  name.value = "Mi juego";
  dialog.showModal();
  name.select();
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        const chosen = templates.querySelector<HTMLInputElement>("input:checked")?.value ?? "empty";
        resolve(dialog.returnValue === "create" && name.value.trim() ? { name: name.value.trim(), template: chosen } : null);
      },
      { once: true },
    );
  });
}
