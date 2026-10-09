import Phaser from "phaser";
import type { RunResultDto } from "../api/client";
import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import type { SceneModel } from "../model/SceneModel";
import { RunTracker } from "./RunTracker";
import { createAnimations, loadTextures } from "./textures";

export const PLAYER_SPEED = 190;
export const ATTACK_REACH = 60;
export const ATTACK_COOLDOWN_MS = 350;
export const INVULNERABLE_MS = 1000;
export const ENEMY_HEALTH = 3;
const DEFAULT_SPAWN = { x: 64, y: WORLD_HEIGHT / 2 };

/** What the HUD shows; sent to the page a few times per second. */
export interface HudState {
  score: number;
  health: number;
  coins: number;
  coinsTotal: number;
  enemies: number;
  enemiesTotal: number;
  elapsedMs: number;
  difficulty: number;
}

export interface PlayHooks {
  onHud: (state: HudState) => void;
  onFinish: (result: RunResultDto) => void;
}

type Body = Phaser.Physics.Arcade.Body;
type Sprite = Phaser.Physics.Arcade.Sprite;

/**
 * Plays the edited scene with Arcade Physics.
 *
 * Walls, houses and trees are static bodies; boxes are dynamic and can be
 * pushed; enemies chase the player and collide with everything solid; coins
 * and spikes are overlaps. RunTracker turns contacts into score and health.
 */
export class PlayScene extends Phaser.Scene {
  private readonly model: SceneModel;
  private readonly hooks: PlayHooks;
  private tracker!: RunTracker;
  private difficulty = 0.5;
  private player!: Sprite;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private boxes!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "space" | "esc", Phaser.Input.Keyboard.Key>;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;
  private nextAttackAt = 0;
  private lastHud = 0;
  private finished = false;
  private attackRing!: Phaser.GameObjects.Arc;

  constructor(model: SceneModel, hooks: PlayHooks) {
    super("play");
    this.model = model;
    this.hooks = hooks;
  }

  init(data: { difficulty?: number }): void {
    this.difficulty = data.difficulty ?? 0.5;
    this.finished = false;
    this.invulnerableUntil = 0;
    this.stunnedUntil = 0;
    this.nextAttackAt = 0;
  }

  preload(): void {
    loadTextures(this);
  }

  create(): void {
    createAnimations(this);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, "grass").setDepth(-10);
    this.solids = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.boxes = this.physics.add.group();
    this.enemies = this.physics.add.group();

    const scene: GameObject[] = [];
    for (const object of this.model) scene.push({ ...object });
    this.tracker = new RunTracker(scene);
    for (const object of scene) this.spawn(object);
    this.createPlayer(scene.find((o) => o.kind === "player") ?? DEFAULT_SPAWN);
    this.addColliders();
    this.setupKeys();
    this.setupCamera();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseKeys());
  }

  private spawn(object: GameObject): void {
    const depth = object.y / WORLD_HEIGHT;
    switch (object.kind) {
      case "wall":
      case "house":
      case "tree":
        this.solids.create(object.x, object.y, object.kind).setDepth(depth);
        break;
      case "spike":
        this.spikes.create(object.x, object.y, "spike").setDepth(-1);
        break;
      case "coin": {
        const coin = this.coins.create(object.x, object.y, "coin") as Sprite;
        coin.play("coin-spin");
        (coin.body as Phaser.Physics.Arcade.StaticBody).setSize(16, 16);
        break;
      }
      case "box": {
        const box = this.boxes.create(object.x, object.y, "box") as Sprite;
        box.setDepth(depth).setDrag(400).setBounce(0.1).setCollideWorldBounds(true).setMass(2).setPushable(true);
        break;
      }
      case "enemy": {
        const enemy = this.enemies.create(object.x, object.y, "enemy") as Sprite;
        enemy.play("enemy-bounce").setDepth(depth).setBounce(0.2).setCollideWorldBounds(true).setMass(1.5);
        (enemy.body as Body).setSize(26, 20).setOffset(3, 10);
        enemy.setData("hp", ENEMY_HEALTH);
        break;
      }
      case "player":
        break; // the player is created separately at this point
    }
  }
