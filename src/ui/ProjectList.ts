import { listProjects } from "../api/client";

/**
 * The "My projects" panel: one row per project with an Open button.
 * It only shows data and tells the caller which project was chosen.
 */
export function setupProjectList(onOpen: (id: number) => void) {
  const list = document.getElementById("projects") as HTMLElement;

  function row(id: number, name: string, updatedAt: string): HTMLElement {
    const item = document.createElement("li");

    const label = document.createElement("span");
    label.className = "project-name";
    label.textContent = `#${id} ${name}`;

    const date = document.createElement("span");
    date.className = "project-date";
    date.textContent = new Date(updatedAt).toLocaleString();

    const open = document.createElement("button");
    open.textContent = "Open";
    open.addEventListener("click", () => onOpen(id));

    item.append(label, date, open);
    return item;
  }

  return {
    /** Ask the backend for the projects of the logged-in user and show them. */
    async refresh(): Promise<void> {
      const projects = await listProjects();
      list.replaceChildren();
      if (projects.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent = "No projects yet.";
        list.append(empty);
        return;
      }
      for (const project of projects) {
        list.append(row(project.id, project.name, project.updated_at));
      }
    },
    clear(): void {
      list.replaceChildren();
    },
  };
}
