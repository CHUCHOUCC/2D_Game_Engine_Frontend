import { CATEGORIES, KIND_INFO, type GameObject, type Kind } from "../model/GameObject";
import { byId, make } from "./dom";
import { iconElement } from "./Library";

export interface TreeGroup {
  kind: Kind;
  objects: GameObject[];
}

/** The scene's objects grouped by kind, in the library order (only kinds that appear). */
export function groupByKind(objects: Iterable<GameObject>): TreeGroup[] {
  const byKind = new Map<Kind, GameObject[]>();
  for (const object of objects) {
    if (!byKind.has(object.kind)) byKind.set(object.kind, []);
    byKind.get(object.kind)!.push(object);
  }
  const order = CATEGORIES.flatMap((category) => category.kinds);
  return order.filter((kind) => byKind.has(kind)).map((kind) => ({ kind, objects: byKind.get(kind)! }));
}

interface TreeActions {
  select: (id: string) => void;
  focus: (id: string) => void;
}

/**
 * The "Escena" panel, like the hierarchy of a 2D engine: every object of the
 * scene grouped by kind. Click selects, double click centres the camera on it.
 */
export class SceneTree {
  private readonly root = byId("scene-tree");
  private readonly actions: TreeActions;
  private collapsed = new Set<Kind>();

  constructor(actions: TreeActions) {
    this.actions = actions;
  }

  render(objects: Iterable<GameObject>, selectedId: string | null): void {
    const groups = groupByKind(objects);
    const total = groups.reduce((sum, group) => sum + group.objects.length, 0);
    byId("scene-count").textContent = String(total);
    this.root.replaceChildren();
    if (groups.length === 0) {
      this.root.append(make("p", "empty", "La escena no tiene objetos todavía."));
      return;
    }
    for (const group of groups) {
      const open = !this.collapsed.has(group.kind);
      const header = make("button", "tree-group");
      header.type = "button";
      header.setAttribute("aria-expanded", String(open));
      header.append(make("span", "tree-caret", open ? "▾" : "▸"), iconElement(group.kind),
        make("span", "tree-name", KIND_INFO[group.kind].name), make("span", "pill", String(group.objects.length)));
      header.addEventListener("click", () => {
        if (this.collapsed.has(group.kind)) this.collapsed.delete(group.kind);
        else this.collapsed.add(group.kind);
        this.render(objects, selectedId);
      });
      this.root.append(header);
      if (!open) continue;
      const list = make("ul", "tree-items");
      for (const object of group.objects) {
        const item = make("li");
        const row = make("button", "tree-item");
        row.type = "button";
        row.classList.toggle("is-selected", object.id === selectedId);
        row.title = "Clic: seleccionar · Doble clic: centrar la vista";
        row.append(make("span", "tree-id", object.id), make("small", "", `${Math.round(object.x)}, ${Math.round(object.y)}`));
        row.addEventListener("click", () => this.actions.select(object.id));
        row.addEventListener("dblclick", () => this.actions.focus(object.id));
        item.append(row);
        list.append(item);
      }
      this.root.append(list);
    }
  }
}
