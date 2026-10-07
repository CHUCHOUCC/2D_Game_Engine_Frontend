import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import type { SceneModel } from "../model/SceneModel";

const COLORS = { box: 0xb07a3f, coin: 0xf2c230, enemy: 0xd8423f } as const;
const SELECTED_COLOR = 0xffffff;

/**
 * Phaser scene that DRAWS the model. All the data lives in SceneModel;
 * this class never keeps its own copy of the objects.
 */
export class EditorScene extends Phaser.Scene {
  private readonly model: SceneModel;
  private drawnVersion = -1;
  private dragStartX = 0;
  private dragStartY = 0;

  /** Id of the selected object, or null. The toolbar reads it. */
  selectedId: string | null = null;

  constructor(model: SceneModel) {
    super("editor");
    this.model = model;
  }

  create(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1d2430);

    this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, hit: Phaser.GameObjects.GameObject[]) => {
      this.selectedId = hit.length > 0 ? (hit[0].getData("objectId") as string) : null;
      this.showSelection();
    });

    this.input.on("dragstart", (_pointer: Phaser.Input.Pointer, shape: Phaser.GameObjects.Shape) => {
      this.dragStartX = shape.x;
      this.dragStartY = shape.y;
    });

    this.input.on("drag", (_pointer: Phaser.Input.Pointer, shape: Phaser.GameObjects.Shape, dragX: number, dragY: number) => {
      shape.x = Phaser.Math.Clamp(dragX, 0, WORLD_WIDTH);
      shape.y = Phaser.Math.Clamp(dragY, 0, WORLD_HEIGHT);
    });

    this.input.on("dragend", (_pointer: Phaser.Input.Pointer, shape: Phaser.GameObjects.Shape) => {
      if (shape.x === this.dragStartX && shape.y === this.dragStartY) {
        return;
      }
      this.model.move(shape.getData("objectId") as string, Math.round(shape.x), Math.round(shape.y));
    });
  }

  update(): void {
    if (this.drawnVersion !== this.model.version) {
      this.redraw();
      this.drawnVersion = this.model.version;
    }
  }

  /** Shapes currently on screen that represent a scene object. */
  private drawnShapes(): Phaser.GameObjects.Shape[] {
    return this.children.list.filter(
      (child): child is Phaser.GameObjects.Shape => typeof child.getData("objectId") === "string",
    );
  }

  private redraw(): void {
    this.drawnShapes().forEach((shape) => shape.destroy());
    for (const object of this.model) {
      this.drawObject(object);
    }
    this.showSelection();
  }

  /** Only changes the border; it must not rebuild shapes (that would cancel a drag). */
  private showSelection(): void {
    for (const shape of this.drawnShapes()) {
      if (shape.getData("objectId") === this.selectedId) {
        shape.setStrokeStyle(3, SELECTED_COLOR);
      } else {
        shape.setStrokeStyle();
      }
    }
  }

  private drawObject(object: GameObject): void {
    let shape: Phaser.GameObjects.Shape;
    if (object.kind === "coin") {
      shape = this.add.circle(object.x, object.y, 14, COLORS.coin);
    } else if (object.kind === "enemy") {
      shape = this.add.triangle(object.x, object.y, 0, 34, 17, 0, 34, 34, COLORS.enemy);
    } else {
      shape = this.add.rectangle(object.x, object.y, 40, 40, COLORS.box);
    }
    shape.setData("objectId", object.id);
    shape.setInteractive({ draggable: true });
  }
}
