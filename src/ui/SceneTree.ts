import { CATEGORIES, KIND_INFO, type GameObject, type Kind } from "../model/GameObject";
import { LinkedList } from "../structures/LinkedList";
import { Tree, type TreeNode } from "../structures/Tree";
import { byId, make } from "./dom";
import { iconElement } from "./Library";

export interface TreeGroup {
  kind: Kind;
  objects: GameObject[];
}

/** What a node of the scene tree holds: the scene itself, a kind, or one object. */
export type SceneNode =
  | { type: "scene" }
  | { type: "kind"; kind: Kind }
  | { type: "object"; object: GameObject };

/** The scene as a Tree: scene -> kind (in library order, only kinds that appear) -> its objects. */
export function buildSceneTree(objects: Iterable<GameObject>): Tree<SceneNode> {
  const tree = new Tree<SceneNode>({ type: "scene" });
  const kinds = new Map<Kind, TreeNode<SceneNode>>();
  const order = CATEGORIES.flatMap((category) => category.kinds);
  const present = new Set<Kind>();
  const all = new LinkedList<GameObject>();
  for (const object of objects) {
    present.add(object.kind);
    all.add(object);
  }
  for (const kind of order) {
    if (present.has(kind)) kinds.set(kind, tree.root.addChild({ type: "kind", kind }));
  }
  for (const object of all) kinds.get(object.kind)!.addChild({ type: "object", object });
  return tree;
}

/** The scene's objects grouped by kind, read from the first two levels of the scene tree. */
export function groupByKind(objects: Iterable<GameObject>): TreeGroup[] {
  const groups: TreeGroup[] = [];
  for (const kindNode of buildSceneTree(objects).root.children) {
    if (kindNode.value.type !== "kind") continue;
    const members: GameObject[] = [];
    for (const leaf of kindNode.children) {
      if (leaf.value.type === "object") members.push(leaf.value.object);
    }
    groups.push({ kind: kindNode.value.kind, objects: members });
  }
  return groups;
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
