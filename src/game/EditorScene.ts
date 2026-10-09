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
