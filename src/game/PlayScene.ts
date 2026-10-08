import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import type { SceneModel } from "../model/SceneModel";
import { PLAYER_MAX_HEALTH } from "../model/ScoreCounter";
import { ATTACK_REACH, ENEMY_HEALTH, PLAYER_RADIUS, PLAYER_SPEED, PlayState } from "./PlayState";

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
  private attackKey!: Phaser.Input.Keyboard.Key;
  private bars!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Arc;

  constructor(model: SceneModel) {
    super("play");
    this.model = model;
  }

  create(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1d2430);
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.createCursorKeys();
    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // Phaser blocks the keys it uses for the whole page. Give them back when the play
    // ends, or the prompt box in the editor cannot type spaces or the letter R.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      const { KeyCodes } = Phaser.Input.Keyboard;
      keyboard.removeCapture([KeyCodes.UP, KeyCodes.DOWN, KeyCodes.LEFT, KeyCodes.RIGHT, KeyCodes.SPACE, KeyCodes.SHIFT, KeyCodes.R]);
      keyboard.removeAllKeys(true);
    });
    this.scoreText = this.add.text(12, 10, "", { color: "#ffffff", fontSize: "20px" }).setDepth(10);
    this.add
      .text(WORLD_WIDTH - 12, 10, "Arrows: move · Space: attack · R: restart", { color: "#9fb0c8", fontSize: "14px" })
      .setOrigin(1, 0)
      .setDepth(10);
    this.bars = this.add.graphics().setDepth(8);
    this.ring = this.add.circle(0, 0, PLAYER_RADIUS + ATTACK_REACH).setStrokeStyle(2, 0xffffff, 0.6).setDepth(4).setVisible(false);
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
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.state.attack();
    }
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
    this.player.setAlpha(this.state.isProtected() ? 0.4 : 1);
    this.ring.setPosition(this.state.playerX, this.state.playerY).setVisible(this.state.isAttacking());
    const hearts = "♥".repeat(this.state.health()) + "♡".repeat(PLAYER_MAX_HEALTH - this.state.health());
    this.scoreText.setText(`Score: ${this.state.score()}   ${hearts}`);
    // Defeated enemies and collected coins disappear from the play, so remove their shapes.
    for (const shape of this.drawnShapes()) {
      if (!this.state.has(shape.getData("objectId") as string)) {
        shape.destroy();
      }
    }
    // Enemies walk, so move their shapes and draw a health bar over each one.
    this.bars.clear();
    for (const object of this.state) {
      if (object.kind !== "enemy") {
        continue;
      }
      this.drawnShapes().find((shape) => shape.getData("objectId") === object.id)?.setPosition(object.x, object.y);
      const left = object.x - 18;
      const top = object.y - 30;
      this.bars.fillStyle(0x000000, 0.7).fillRect(left, top, 36, 6);
      this.bars.fillStyle(0x5be37d, 1).fillRect(left + 1, top + 1, 34 * (object.hp / ENEMY_HEALTH), 4);
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
