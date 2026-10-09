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
