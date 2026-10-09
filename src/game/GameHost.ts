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
