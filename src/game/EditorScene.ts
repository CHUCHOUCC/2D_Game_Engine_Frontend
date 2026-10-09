import Phaser from "phaser";
import { SIZES, WORLD_HEIGHT, WORLD_WIDTH, type GameObject, type Kind } from "../model/GameObject";
import { clampToWorld, fitZoom, snap } from "../model/geometry";
import type { SceneModel } from "../model/SceneModel";
import { createAnimations, KIND_TEXTURE, loadTextures } from "./textures";

export interface EditorOptions {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface EditorEvents {
  onSelect: (id: string | null) => void;
  onPlace: (kind: Kind, x: number, y: number) => void;
  onPointer: (x: number, y: number) => void;
  onZoom: (zoom: number) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

/**
 * Phaser scene that DRAWS the model and lets the user edit it.
 * All the data lives in SceneModel; this class never keeps its own copy.
 */
export class EditorScene extends Phaser.Scene {
  private readonly model: SceneModel;
  private readonly events_: EditorEvents;
  private options: EditorOptions = { showGrid: true, snapToGrid: true, gridSize: 32 };
  private drawnVersion = -1;
  private grid!: Phaser.GameObjects.Graphics;
  private selection!: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image | null = null;
  private placing: Kind | null = null;
  private panning: { x: number; y: number; scrollX: number; scrollY: number } | null = null;

  /** Id of the selected object, or null. */
  selectedId: string | null = null;

  constructor(model: SceneModel, events: EditorEvents) {
    super("editor");
    this.model = model;
    this.events_ = events;
  }

  preload(): void {
    loadTextures(this);
  }

  create(): void {
    createAnimations(this);
    this.drawnVersion = -1; // the scene starts again when we come back from Play
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, "grass").setDepth(-10);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT).setStrokeStyle(4, 0x0b0f14, 0.9).setDepth(-5);
    this.grid = this.add.graphics().setDepth(-4);
    this.selection = this.add.graphics().setDepth(50);
    this.drawGrid();
    this.setupCamera();
    this.setupInput();
    this.setupPanAndZoom();
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBackgroundColor("rgba(0,0,0,0)");
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitView());
  }

  /** Zoom so the whole world is visible and centre it. */
  fitView(): void {
    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Clamp(fitZoom(this.scale.width, this.scale.height), MIN_ZOOM, MAX_ZOOM));
    camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.events_.onZoom(camera.zoom);
  }

  /** Change zoom by a factor, keeping the world point under the pointer still. */
  zoomBy(factor: number, screenX = this.scale.width / 2, screenY = this.scale.height / 2): void {
    const camera = this.cameras.main;
    const before = camera.getWorldPoint(screenX, screenY);
    camera.setZoom(Phaser.Math.Clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM));
    const after = camera.getWorldPoint(screenX, screenY);
    camera.scrollX += before.x - after.x;
    camera.scrollY += before.y - after.y;
    this.events_.onZoom(camera.zoom);
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer, hit: Phaser.GameObjects.GameObject[]) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        const camera = this.cameras.main;
        this.panning = { x: pointer.x, y: pointer.y, scrollX: camera.scrollX, scrollY: camera.scrollY };
        return;
      }
      if (this.placing !== null) {
        const [x, y] = this.placePoint(pointer.worldX, pointer.worldY, this.placing);
        this.events_.onPlace(this.placing, x, y);
        return;
      }
      this.select(hit.length > 0 ? (hit[0].getData("objectId") as string) : null);
    });

    this.input.on("drag", (_p: Phaser.Input.Pointer, image: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      const kind = image.getData("kind") as Kind;
      const [x, y] = this.placePoint(dragX, dragY, kind);
      image.setPosition(x, y);
      this.drawSelection();
    });

    this.input.on("dragend", (_p: Phaser.Input.Pointer, image: Phaser.GameObjects.Image) => {
      const object = this.model.find(image.getData("objectId") as string);
      if (object !== undefined && (object.x !== image.x || object.y !== image.y)) {
        this.model.move(object.id, image.x, image.y);
      }
    });

  }

  private setupPanAndZoom(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.panning !== null) {
        const camera = this.cameras.main;
        camera.scrollX = this.panning.scrollX - (pointer.x - this.panning.x) / camera.zoom;
        camera.scrollY = this.panning.scrollY - (pointer.y - this.panning.y) / camera.zoom;
      }
      if (this.ghost !== null && this.placing !== null) {
        const [x, y] = this.placePoint(pointer.worldX, pointer.worldY, this.placing);
        this.ghost.setPosition(x, y);
      }
      this.events_.onPointer(Math.round(pointer.worldX), Math.round(pointer.worldY));
    });

    this.input.on("pointerup", () => {
      this.panning = null;
    });

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      this.zoomBy(dy > 0 ? 0.9 : 1.1, pointer.x, pointer.y);
    });
  }
