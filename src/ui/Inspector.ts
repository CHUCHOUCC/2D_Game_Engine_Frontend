import { KIND_INFO, type GameObject } from "../model/GameObject";
import { clampToWorld } from "../model/geometry";
import { byId, make } from "./dom";
import { iconElement } from "./Palette";

interface InspectorActions {
  move: (id: string, x: number, y: number) => void;
  remove: (id: string) => void;
}

/** Shows the selected object: its kind, its exact position (editable) and a delete button. */
export class Inspector {
  private readonly root = byId("inspector");
  private readonly actions: InspectorActions;

  constructor(actions: InspectorActions) {
    this.actions = actions;
    this.show(undefined);
  }

  show(object: GameObject | undefined): void {
    this.root.replaceChildren();
    if (object === undefined) {
      this.root.append(make("p", "inspector-empty", "Selecciona un objeto en el mapa para ver sus datos."));
      return;
    }
    const head = make("div", "inspector-head");
    const title = make("div");
    title.append(make("strong", "", KIND_INFO[object.kind].name), make("small", "", object.id));
    head.append(iconElement(object.kind), title);
    this.root.append(head, make("small", "hint", KIND_INFO[object.kind].hint), this.positionFields(object), this.deleteButton(object));
  }
