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
