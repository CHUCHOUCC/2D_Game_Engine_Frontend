import { LinkedList } from "../structures/LinkedList";
import { Stack } from "../structures/Stack";
import type { GameObject } from "./GameObject";

/** An action that can be undone and redone. */
type Command =
  | { type: "add"; object: GameObject }
  | { type: "remove"; object: GameObject }
  | { type: "move"; id: string; from: { x: number; y: number }; to: { x: number; y: number } };

/**
 * The scene data: the single source of truth. Phaser only draws it.
 *
 * - The objects live in our own LinkedList.
 * - Undo and redo use two of our own Stacks of commands.
 */
export class SceneModel {
  private objects = new LinkedList<GameObject>();
  private undoStack = new Stack<Command>();
  private redoStack = new Stack<Command>();

  /** Increases on every change so the view knows when to redraw. */
  version = 0;

  add(object: GameObject): void {
    this.apply({ type: "add", object });
    this.record({ type: "add", object });
  }

  remove(id: string): boolean {
    const object = this.objects.find((o) => o.id === id);
    if (object === undefined) {
      return false;
    }
    const command: Command = { type: "remove", object: { ...object } };
    this.apply(command);
    this.record(command);
    return true;
  }

  move(id: string, x: number, y: number): boolean {
    const object = this.objects.find((o) => o.id === id);
    if (object === undefined) {
      return false;
    }
    const command: Command = { type: "move", id, from: { x: object.x, y: object.y }, to: { x, y } };
    this.apply(command);
    this.record(command);
    return true;
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (command === undefined) {
      return false;
    }
    this.apply(this.inverse(command));
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (command === undefined) {
      return false;
    }
    this.apply(command);
    this.undoStack.push(command);
    return true;
  }

  canUndo(): boolean {
    return !this.undoStack.isEmpty();
  }

  canRedo(): boolean {
    return !this.redoStack.isEmpty();
  }

  find(id: string): GameObject | undefined {
    return this.objects.find((o) => o.id === id);
  }

  size(): number {
    return this.objects.size();
  }

  [Symbol.iterator](): Iterator<GameObject> {
    return this.objects[Symbol.iterator]();
  }

  /** Replace the whole scene (for example after loading from the backend). */
  replaceAll(objects: Iterable<GameObject>): void {
    this.objects.clear();
    for (const object of objects) {
      this.objects.add({ ...object });
    }
    this.undoStack.clear();
    this.redoStack.clear();
    this.version += 1;
  }

  /** Copy the scene into a plain array, only to send it as JSON. */
  toJson(): GameObject[] {
    const result: GameObject[] = [];
    for (const object of this.objects) {
      result.push({ ...object });
    }
    return result;
  }

  private record(command: Command): void {
    this.undoStack.push(command);
    this.redoStack.clear();
  }

  private inverse(command: Command): Command {
    switch (command.type) {
      case "add":
        return { type: "remove", object: command.object };
      case "remove":
        return { type: "add", object: command.object };
      case "move":
        return { type: "move", id: command.id, from: command.to, to: command.from };
    }
  }

  private apply(command: Command): void {
    switch (command.type) {
      case "add":
        this.objects.add({ ...command.object });
        break;
      case "remove":
        this.objects.remove((o) => o.id === command.object.id);
        break;
      case "move": {
        const object = this.objects.find((o) => o.id === command.id);
        if (object !== undefined) {
          object.x = command.to.x;
          object.y = command.to.y;
        }
        break;
      }
    }
    this.version += 1;
  }
}
