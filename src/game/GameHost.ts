import Phaser from "phaser";
import type { SceneModel } from "../model/SceneModel";
import { EditorScene, type EditorEvents, type EditorOptions } from "./EditorScene";
import { PlayScene, type PlayHooks } from "./PlayScene";

/**
 * Creates the Phaser game that fills its container and switches between
 * editing and playing. The canvas resizes with the window (Scale.RESIZE).
 */
export class GameHost {
  readonly editor: EditorScene;
  private readonly playScene: PlayScene;
  private game: Phaser.Game | null = null;
  private readonly parent: HTMLElement;

  constructor(parent: HTMLElement, model: SceneModel, editorEvents: EditorEvents, playHooks: PlayHooks) {
    this.parent = parent;
    this.editor = new EditorScene(model, editorEvents);
    this.playScene = new PlayScene(model, playHooks);
  }

  start(): void {
    if (this.game !== null) return;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.parent,
      backgroundColor: "#00000000",
      transparent: true,
      pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [this.editor, this.playScene],
    });
  }
