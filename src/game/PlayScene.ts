import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import type { SceneModel } from "../model/SceneModel";
import { PLAYER_RADIUS, PLAYER_SPEED, PlayState } from "./PlayState";

const COLORS = { box: 0xb07a3f, coin: 0xf2c230, enemy: 0xd8423f, player: 0x4fd1c5 } as const;

/**
 * Phaser scene that PLAYS the scene that was edited.
 * The rules live in PlayState; this class only draws and reads the keyboard.
 */
export class PlayScene extends Phaser.Scene {
  private readonly model: SceneModel;
  private state = new PlayState([]);
  private player!: Phaser.GameObjects.Arc;
  private scoreText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private restartKey!: Phaser.Input.Keyboard.Key;

  constructor(model: SceneModel) {
    super("play");
    this.model = model;
  }

  create(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1d2430);
    this.keys = this.input.keyboard!.createCursorKeys();
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.scoreText = this.add.text(12, 10, "", { color: "#ffffff", fontSize: "20px" }).setDepth(10);
    this.messageText = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "", { color: "#ffffff", fontSize: "32px", align: "center" })
      .setOrigin(0.5)
      .setDepth(10);
    this.player = this.add.circle(0, 0, PLAYER_RADIUS, COLORS.player).setDepth(5);
    this.startPlay();
  }

  update(): void {
    if (this.state.isGameOver()) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.startPlay();
      }
      return;
    }
    const dx = (this.keys.right.isDown ? PLAYER_SPEED : 0) - (this.keys.left.isDown ? PLAYER_SPEED : 0);
    const dy = (this.keys.down.isDown ? PLAYER_SPEED : 0) - (this.keys.up.isDown ? PLAYER_SPEED : 0);
    this.state.movePlayer(dx, dy);
    this.state.update();
    this.refresh();
  }

  /** Copy the edited scene into a fresh play and draw it. */
  private startPlay(): void {
    this.drawnShapes().forEach((shape) => shape.destroy());
    this.state = new PlayState(this.model);
    for (const object of this.state) {
      this.drawObject(object);
    }
    this.messageText.setText("");
    this.refresh();
  }

  private refresh(): void {
    this.player.setPosition(this.state.playerX, this.state.playerY);
    this.scoreText.setText(`Score: ${this.state.score()}`);
    // Coins that were collected disappear from the play, so remove their shapes.
    for (const shape of this.drawnShapes()) {
      if (!this.state.has(shape.getData("objectId") as string)) {
        shape.destroy();
      }
    }
    if (this.state.isGameOver()) {
      this.messageText.setText("Game over\nPress R to restart");
    }
  }

  private drawnShapes(): Phaser.GameObjects.Shape[] {
    return this.children.list.filter(
      (child): child is Phaser.GameObjects.Shape => typeof child.getData("objectId") === "string",
    );
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
  }
}
