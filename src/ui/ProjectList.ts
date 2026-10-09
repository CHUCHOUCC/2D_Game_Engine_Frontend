import { deleteProject, duplicateProject, listProjects, type ProjectDto } from "../api/client";
import { byId, errorText, make } from "./dom";
import { toast } from "./toast";

/** "hace 5 min", "ayer"... for the project dates. */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

/**
 * The "Mis proyectos" panel. It only shows data and tells the app which
 * project was opened; duplicating and deleting call the backend directly.
 */
export class ProjectList {
  private readonly list = byId("projects");
  private currentId: number | null = null;
  private readonly onOpen: (project: ProjectDto) => void;
  private readonly onDeleted: (id: number) => void;

  constructor(onOpen: (project: ProjectDto) => void, onDeleted: (id: number) => void) {
    this.onOpen = onOpen;
    this.onDeleted = onDeleted;
  }

  private row(project: ProjectDto): HTMLElement {
    const item = make("li", "project-row");
    item.classList.toggle("is-current", project.id === this.currentId);
    const text = make("div");
    text.append(make("strong", "", project.name), make("small", "", `${project.scene.length} objetos · ${relativeTime(project.updated_at)}`));
    const actions = make("div", "project-actions");
    actions.append(this.action("⧉", "Duplicar", () => this.duplicate(project)), this.action("🗑", "Eliminar", () => this.remove(project)));
    item.append(text, actions);
    item.addEventListener("click", () => this.onOpen(project));
    return item;
  }

  private action(symbol: string, label: string, handler: () => void): HTMLButtonElement {
    const button = make("button", "btn btn-icon btn-ghost", symbol);
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handler();
    });
    return button;
  }

  private async duplicate(project: ProjectDto): Promise<void> {
    try {
      const copy = await duplicateProject(project.id);
      toast(`Copiado como "${copy.name}".`, "success");
      await this.refresh();
    } catch (error) {
      toast(errorText(error), "error");
    }
  }

  private async remove(project: ProjectDto): Promise<void> {
    if (!window.confirm(`¿Eliminar "${project.name}"? No se puede deshacer.`)) return;
    try {
      await deleteProject(project.id);
      toast("Proyecto eliminado.", "success");
      this.onDeleted(project.id);
      await this.refresh();
    } catch (error) {
      toast(errorText(error), "error");
    }
  }
