import Phaser from "phaser";
import type { RunResultDto } from "../api/client";
import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject, type Kind } from "../model/GameObject";
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
  /** What a 2D character can say in its speech bubble. */
  linesFor: (kind: Kind) => readonly string[];
}

/** 2D characters: how close the player must be to hear them, and how they walk. */
export const TALK_RADIUS = 72;
export const CHARACTER_SPEED = 42;
const TALK_COOLDOWN_MS = 6000;
const BUBBLE_MS = 2800;

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
  private characters!: Phaser.Physics.Arcade.Group;
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
    this.characters = this.physics.add.group();

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
      case "villager":
      case "knight":
      case "wizard": {
        const character = this.characters.create(object.x, object.y, object.kind, 0) as Sprite;
        character.setDepth(depth).setCollideWorldBounds(true).setBounce(0.1).setDrag(300).setPushable(false);
        (character.body as Body).setSize(18, 20).setOffset(7, 11);
        character.setData("kind", object.kind);
        character.setData("nextTurnAt", 0);
        character.setData("nextTalkAt", 0);
        break;
      }
      case "player":
        break; // the player is created separately at this point
    }
  }

  private createPlayer(spawn: { x: number; y: number }): void {
    this.player = this.physics.add.sprite(spawn.x, spawn.y, "player", 0);
    this.player.setCollideWorldBounds(true).setDepth(spawn.y / WORLD_HEIGHT);
    (this.player.body as Body).setSize(18, 20).setOffset(7, 11);
    this.attackRing = this.add.circle(0, 0, ATTACK_REACH).setStrokeStyle(3, 0xffffff, 0.8).setDepth(20).setVisible(false);
  }

  private addColliders(): void {
    const physics = this.physics.add;
    physics.collider(this.player, this.solids);
    physics.collider(this.player, this.boxes);
    physics.collider(this.boxes, this.solids);
    physics.collider(this.boxes, this.boxes);
    physics.collider(this.enemies, this.solids);
    physics.collider(this.enemies, this.boxes);
    physics.collider(this.enemies, this.enemies);
    // 2D characters are solid people: nobody walks through them, they cannot be pushed.
    physics.collider(this.characters, this.solids);
    physics.collider(this.characters, this.boxes);
    physics.collider(this.characters, this.characters);
    physics.collider(this.characters, this.enemies);
    physics.collider(this.player, this.characters);
    physics.overlap(this.player, this.coins, (_player, coin) => this.collect(coin as Sprite));
    physics.overlap(this.player, this.spikes, (_player, spike) => this.hurt("spike", spike as Sprite));
    physics.overlap(this.player, this.enemies, (_player, enemy) => this.hurt("enemy", enemy as Sprite));
  }

  private setupKeys(): void {
    const keyboard = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(K.UP), down: keyboard.addKey(K.DOWN), left: keyboard.addKey(K.LEFT), right: keyboard.addKey(K.RIGHT),
      w: keyboard.addKey(K.W), a: keyboard.addKey(K.A), s: keyboard.addKey(K.S), d: keyboard.addKey(K.D),
      space: keyboard.addKey(K.SPACE), esc: keyboard.addKey(K.ESC),
    };
  }

  /** Phaser captures keys for the whole page; give them back or text inputs stop working. */
  private releaseKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    keyboard.removeCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.W, K.A, K.S, K.D, K.SPACE, K.ESC]);
    keyboard.removeAllKeys(true);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const fit = Math.min(this.scale.width / WORLD_WIDTH, this.scale.height / WORLD_HEIGHT);
    camera.setZoom(Math.max(fit, Math.min(2, this.scale.height / 420)));
    camera.startFollow(this.player, true, 0.12, 0.12);
    const onResize = () => {
      const zoom = Math.min(this.scale.width / WORLD_WIDTH, this.scale.height / WORLD_HEIGHT);
      camera.setZoom(Math.max(zoom, Math.min(2, this.scale.height / 420)));
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  update(time: number): void {
    if (this.finished) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.end("quit");
      return;
    }
    const k = this.keys;
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const length = Math.hypot(x, y) || 1;
    if (time >= this.stunnedUntil) {
      // While knocked back the player cannot steer, so the push is visible.
      this.player.setVelocity((x / length) * PLAYER_SPEED, (y / length) * PLAYER_SPEED);
    }
    if (x !== 0 || y !== 0) {
      this.player.anims.play("player-walk", true);
      if (x !== 0) this.player.setFlipX(x < 0);
    } else {
      this.player.anims.stop();
      this.player.setFrame(0);
    }
    this.player.setDepth(this.player.y / WORLD_HEIGHT);
    this.player.setAlpha(time < this.invulnerableUntil ? 0.45 + 0.4 * Math.sin(time / 40) : 1);
    if (Phaser.Input.Keyboard.JustDown(k.space)) this.attack(time);
    this.attackRing.setPosition(this.player.x, this.player.y);
    this.moveEnemies();
    this.moveCharacters(time);
    this.reportHud(time);
  }

  private moveEnemies(): void {
    const range = 220 + 220 * this.difficulty;
    const speed = 60 + 80 * this.difficulty;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Sprite;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (distance < range) {
        this.physics.moveToObject(enemy, this.player, speed);
      } else {
        enemy.setVelocity(enemy.body!.velocity.x * 0.9, enemy.body!.velocity.y * 0.9);
      }
      enemy.setFlipX(this.player.x < enemy.x);
      enemy.setDepth(enemy.y / WORLD_HEIGHT);
    }
  }

  /** Characters wander around; when the player comes close they stop, turn and talk. */
  private moveCharacters(time: number): void {
    for (const child of this.characters.getChildren()) {
      const character = child as Sprite;
      const kind = character.getData("kind") as Kind;
      const distance = Phaser.Math.Distance.Between(character.x, character.y, this.player.x, this.player.y);
      if (distance < TALK_RADIUS) {
        character.setVelocity(0, 0);
        character.setFlipX(this.player.x < character.x);
        if (time >= (character.getData("nextTalkAt") as number)) {
          character.setData("nextTalkAt", time + TALK_COOLDOWN_MS);
          this.say(character, kind);
        }
      } else if (time >= (character.getData("nextTurnAt") as number)) {
        character.setData("nextTurnAt", time + Phaser.Math.Between(1200, 2800));
        if (Math.random() < 0.35) {
          character.setVelocity(0, 0);
        } else {
          const angle = Math.random() * Math.PI * 2;
          character.setVelocity(Math.cos(angle) * CHARACTER_SPEED, Math.sin(angle) * CHARACTER_SPEED);
        }
      }
      const body = character.body as Body;
      const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 4;
      if (moving) {
        character.anims.play(`${kind}-walk`, true);
        if (Math.abs(body.velocity.x) > 1) character.setFlipX(body.velocity.x < 0);
      } else {
        character.anims.stop();
        character.setFrame(0);
      }
      character.setDepth(character.y / WORLD_HEIGHT);
      const bubble = character.getData("bubble") as Phaser.GameObjects.Container | undefined;
      bubble?.setPosition(character.x, character.y - 26);
    }
  }

  /** A speech bubble with one of the character's lines, above its head. */
  private say(character: Sprite, kind: Kind): void {
    const lines = this.hooks.linesFor(kind);
    if (lines.length === 0) return;
    (character.getData("bubble") as Phaser.GameObjects.Container | undefined)?.destroy();
    const text = this.add.text(0, 0, Phaser.Utils.Array.GetRandom(lines as string[]), {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "11px",
      color: "#182033",
      wordWrap: { width: 150 },
      align: "center",
      resolution: 2,
    }).setOrigin(0.5, 1);
    const width = text.width + 14;
    const height = text.height + 10;
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 0.96).fillRoundedRect(-width / 2, -height - 4, width, height, 6);
    box.fillTriangle(-5, -5, 5, -5, 0, 2);
    box.lineStyle(1, 0x182033, 0.25).strokeRoundedRect(-width / 2, -height - 4, width, height, 6);
    text.setPosition(0, -9);
    const bubble = this.add.container(character.x, character.y - 26, [box, text]).setDepth(30);
    character.setData("bubble", bubble);
    this.tracker.talk(kind);
    this.time.delayedCall(BUBBLE_MS, () => {
      if (character.getData("bubble") === bubble) character.setData("bubble", undefined);
      bubble.destroy();
    });
  }

  private collect(coin: Sprite): void {
    if (!coin.active) return;
    this.tracker.collectCoin(coin.x, coin.y);
    this.tweens.add({ targets: coin, y: coin.y - 24, alpha: 0, scale: 1.4, duration: 220, onComplete: () => coin.destroy() });
    coin.disableBody(false, false);
    if (this.tracker.isOver()) this.end(this.tracker.outcome()!);
  }

  private hurt(source: "spike" | "enemy", from: Sprite): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil || this.finished) return;
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.stunnedUntil = now + 160;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(angle) * 420, Math.sin(angle) * 420);
    this.cameras.main.shake(120, 0.006);
    if (this.tracker.takeDamage(source, this.player.x, this.player.y)) this.end("lost");
  }

  private attack(now: number): void {
    if (now < this.nextAttackAt) return;
    this.nextAttackAt = now + ATTACK_COOLDOWN_MS;
    this.attackRing.setVisible(true).setScale(0.6).setAlpha(1);
    this.tweens.add({ targets: this.attackRing, scale: 1, alpha: 0, duration: 180, onComplete: () => this.attackRing.setVisible(false) });
    for (const child of [...this.enemies.getChildren()]) {
      const enemy = child as Sprite;
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) > ATTACK_REACH + 14) continue;
      const hp = (enemy.getData("hp") as number) - 1;
      enemy.setData("hp", hp);
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      enemy.setVelocity(Math.cos(angle) * 360, Math.sin(angle) * 360);
      enemy.setTint(0xffffff);
      this.time.delayedCall(90, () => enemy.active && enemy.clearTint());
      if (hp <= 0) {
        this.tracker.defeatEnemy(enemy.x, enemy.y);
        this.tweens.add({ targets: enemy, alpha: 0, scale: 0.2, duration: 200, onComplete: () => enemy.destroy() });
        enemy.disableBody(false, false);
      }
    }
    if (this.tracker.isOver()) this.end(this.tracker.outcome()!);
  }

  private reportHud(time: number, force = false): void {
    if (!force && time - this.lastHud < 120) return;
    this.lastHud = time;
    this.hooks.onHud({
      score: this.tracker.score(),
      health: this.tracker.health(),
      coins: this.tracker.coinsCollected,
      coinsTotal: this.tracker.coinsTotal,
      enemies: this.tracker.enemiesDefeated,
      enemiesTotal: this.tracker.enemiesTotal,
      elapsedMs: this.tracker.elapsedMs(),
      difficulty: this.difficulty,
    });
  }

  /** Called by the "Salir" button. */
  quit(): void {
    this.end("quit");
  }

  private end(outcome: RunResultDto["outcome"]): void {
    if (this.finished) return;
    this.finished = true;
    this.tracker.finish(outcome);
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.reportHud(this.time.now, true);
    this.hooks.onFinish(this.tracker.result());
  }
}
