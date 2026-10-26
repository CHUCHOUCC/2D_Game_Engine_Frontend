import Phaser from "phaser";
import type { RunResultDto } from "../api/client";
import { isCharacter, isEnemy, isWeapon, WORLD_HEIGHT, WORLD_WIDTH, type GameObject, type Kind } from "../model/GameObject";
import type { SceneModel } from "../model/SceneModel";
import {
  distanceToSegment, enemyStats, healthColor, heroById, inSwing, POTION_HEAL, rollLoot, speedFor, WEAPONS,
  type EnemyStats, type Hero, type Weapon, type WeaponId,
} from "./combat";
import { RunTracker } from "./RunTracker";
import { bob, KIND_TEXTURE, loadTextures } from "./textures";

export const INVULNERABLE_MS = 1000;
export const DASH_SPEED = 520;
export const DASH_MS = 160;
export const DASH_COOLDOWN_MS = 900;
const DEFAULT_SPAWN = { x: 64, y: WORLD_HEIGHT / 2 };
const ARROW_SPEED = 560;
const SWING_MS = 160;

/** What the HUD shows; sent to the page a few times per second. */
export interface HudState {
  score: number;
  health: number;
  maxHealth: number;
  coins: number;
  coinsTotal: number;
  enemies: number;
  enemiesTotal: number;
  elapsedMs: number;
  difficulty: number;
  hero: string;
  weapon: WeaponId;
  /** 0..1: how ready the weapon and the dash are. */
  attackReady: number;
  dashReady: number;
}

export interface PlayHooks {
  onHud: (state: HudState) => void;
  onFinish: (result: RunResultDto) => void;
  /** What a 2D character can say in its speech bubble. */
  linesFor: (kind: Kind) => readonly string[];
  /** Something worth a toast ("Has recogido un hacha"). */
  onNotice?: (text: string) => void;
}

/** 2D characters: how close the player must be to hear them, and how they walk. */
export const TALK_RADIUS = 72;
export const CHARACTER_SPEED = 42;
const TALK_COOLDOWN_MS = 6000;
const BUBBLE_MS = 2800;

type Body = Phaser.Physics.Arcade.Body;
type Sprite = Phaser.Physics.Arcade.Sprite;

const ITEM_NAMES: Partial<Record<Kind, string>> = { sword: "una espada", axe: "un hacha", wand: "una varita", bow: "un arco", potion: "una poción" };

/**
 * Plays the edited scene with Arcade Physics.
 *
 * Walls, houses, trees, bushes and fences are static bodies; boxes and barrels
 * are dynamic and can be pushed; enemies chase the player (bats and ghosts
 * pass over walls); chests drop loot, and weapons and potions are picked up.
 * The hero fights with its weapon: a melee swing, the wand's lightning ray or
 * arrows. RunTracker turns every contact into score and health.
 */
export class PlayScene extends Phaser.Scene {
  private readonly model: SceneModel;
  private readonly hooks: PlayHooks;
  private tracker!: RunTracker;
  private difficulty = 0.5;
  private hero: Hero = heroById(null);
  private weapon: Weapon = WEAPONS.sword;
  private player!: Sprite;
  private held!: Phaser.GameObjects.Image;
  private playerBar!: Phaser.GameObjects.Graphics;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private chests!: Phaser.Physics.Arcade.StaticGroup;
  private items!: Phaser.Physics.Arcade.Group;
  private boxes!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private characters!: Phaser.Physics.Arcade.Group;
  private arrows!: Phaser.Physics.Arcade.Group;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "space" | "shift" | "esc", Phaser.Input.Keyboard.Key>;
  private facing = 0;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;
  private nextAttackAt = 0;
  private dashUntil = 0;
  private nextDashAt = 0;
  private swingUntil = 0;
  private lastHud = 0;
  private finished = false;

  constructor(model: SceneModel, hooks: PlayHooks) {
    super("play");
    this.model = model;
    this.hooks = hooks;
  }

  init(data: { difficulty?: number; hero?: string }): void {
    this.difficulty = data.difficulty ?? 0.5;
    this.hero = heroById(data.hero);
    this.weapon = WEAPONS[this.hero.weapon];
    this.finished = false;
    this.facing = 0;
    this.invulnerableUntil = 0;
    this.stunnedUntil = 0;
    this.nextAttackAt = 0;
    this.dashUntil = 0;
    this.nextDashAt = 0;
    this.swingUntil = 0;
  }

  preload(): void {
    loadTextures(this);
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, "grass").setDepth(-10);
    this.solids = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.chests = this.physics.add.staticGroup();
    this.items = this.physics.add.group();
    this.boxes = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.characters = this.physics.add.group();
    this.arrows = this.physics.add.group();

    const scene: GameObject[] = [];
    for (const object of this.model) scene.push({ ...object });
    this.tracker = new RunTracker(scene, undefined, this.hero.maxHealth);
    for (const object of scene) this.spawn(object);
    this.createPlayer(scene.find((o) => o.kind === "player") ?? DEFAULT_SPAWN);
    this.addColliders();
    this.setupKeys();
    this.setupCamera();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseKeys());
  }

  private spawn(object: GameObject): void {
    const depth = object.y / WORLD_HEIGHT;
    const key = KIND_TEXTURE[object.kind].key;
    if (isEnemy(object.kind)) {
      this.spawnEnemy(object.kind, object.x, object.y);
      return;
    }
    if (isCharacter(object.kind)) {
      const character = this.characters.create(object.x, object.y, key) as Sprite;
      character.setDepth(depth).setCollideWorldBounds(true).setBounce(0.1).setDrag(300).setPushable(false);
      (character.body as Body).setSize(18, 20).setOffset(7, 11);
      character.setData("kind", object.kind);
      character.setData("nextTurnAt", 0);
      character.setData("nextTalkAt", 0);
      bob(this, character);
      return;
    }
    if (isWeapon(object.kind) || object.kind === "potion") {
      this.spawnItem(object.kind, object.x, object.y);
      return;
    }
    switch (object.kind) {
      case "wall":
      case "house":
      case "tree":
      case "bush":
      case "fence":
        this.solids.create(object.x, object.y, key).setDepth(depth);
        break;
      case "spike":
        this.spikes.create(object.x, object.y, key).setDepth(-1);
        break;
      case "coin": {
        const coin = this.coins.create(object.x, object.y, key) as Sprite;
        (coin.body as Phaser.Physics.Arcade.StaticBody).setSize(16, 16);
        this.tweens.add({ targets: coin, scaleX: { from: 1, to: 0.25 }, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        break;
      }
      case "chest":
        this.chests.create(object.x, object.y, key).setDepth(depth);
        break;
      case "box":
      case "barrel": {
        const heavy = object.kind === "barrel";
        const box = this.boxes.create(object.x, object.y, key) as Sprite;
        box.setDepth(depth).setDrag(heavy ? 700 : 400).setBounce(0.1).setCollideWorldBounds(true).setMass(heavy ? 4 : 2).setPushable(true);
        break;
      }
      default:
        break; // the player is created separately
    }
  }

  private spawnEnemy(kind: Kind, x: number, y: number): void {
    const stats = enemyStats(kind);
    const enemy = this.enemies.create(x, y, stats.texture) as Sprite;
    enemy.setDepth(y / WORLD_HEIGHT).setBounce(0.2).setCollideWorldBounds(true).setMass(kind === "brute" ? 4 : 1.5).setScale(stats.scale);
    (enemy.body as Body).setSize(22, 20).setOffset(5, 10);
    enemy.setData("kind", kind);
    enemy.setData("stats", stats);
    enemy.setData("hp", stats.health);
    enemy.setData("phase", Math.random() * Math.PI * 2);
    enemy.setData("bar", this.add.graphics().setDepth(35));
  }

  private spawnItem(kind: Kind, x: number, y: number, float = true): Sprite {
    const item = this.items.create(x, y, KIND_TEXTURE[kind].key) as Sprite;
    item.setData("kind", kind).setDepth(y / WORLD_HEIGHT);
    (item.body as Body).setImmovable(true);
    if (float) this.tweens.add({ targets: item, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return item;
  }

  private createPlayer(spawn: { x: number; y: number }): void {
    this.player = this.physics.add.sprite(spawn.x, spawn.y, this.hero.texture);
    this.player.setCollideWorldBounds(true).setDepth(spawn.y / WORLD_HEIGHT);
    (this.player.body as Body).setSize(18, 20).setOffset(7, 11);
    this.held = this.add.image(spawn.x, spawn.y, KIND_TEXTURE[this.weapon.id].key).setOrigin(0.5, 0.85).setScale(0.7);
    this.playerBar = this.add.graphics().setDepth(36);
  }

  private addColliders(): void {
    const physics = this.physics.add;
    const blocksEnemy = (enemy: unknown) => !((enemy as Sprite).getData("stats") as EnemyStats).passesWalls;
    physics.collider(this.player, this.solids);
    physics.collider(this.player, this.boxes);
    physics.collider(this.player, this.chests, (_p, chest) => this.openChest(chest as Sprite));
    physics.collider(this.boxes, this.solids);
    physics.collider(this.boxes, this.boxes);
    physics.collider(this.boxes, this.chests);
    physics.collider(this.enemies, this.solids, undefined, blocksEnemy);
    physics.collider(this.enemies, this.boxes, undefined, blocksEnemy);
    physics.collider(this.enemies, this.chests, undefined, blocksEnemy);
    physics.collider(this.enemies, this.enemies);
    // 2D characters are solid people: nobody walks through them, they cannot be pushed.
    physics.collider(this.characters, this.solids);
    physics.collider(this.characters, this.boxes);
    physics.collider(this.characters, this.characters);
    physics.collider(this.characters, this.enemies, undefined, (_c, enemy) => blocksEnemy(enemy));
    physics.collider(this.player, this.characters);
    physics.collider(this.arrows, this.solids, (arrow) => (arrow as Sprite).destroy());
    physics.collider(this.arrows, this.boxes, (arrow) => (arrow as Sprite).destroy());
    physics.overlap(this.arrows, this.enemies, (arrow, enemy) => {
      const a = arrow as Sprite;
      const e = enemy as Sprite;
      if (!a.active || !e.body?.enable) return;
      this.damageEnemy(e, this.weapon.damage, a.rotation);
      a.destroy();
      if (this.tracker.isOver()) this.end(this.tracker.outcome()!);
    });
    physics.overlap(this.player, this.coins, (_player, coin) => this.collect(coin as Sprite));
    physics.overlap(this.player, this.items, (_player, item) => this.pickUp(item as Sprite));
    physics.overlap(this.player, this.spikes, (_player, spike) => this.hurt("spike", spike as Sprite, 1));
    physics.overlap(this.player, this.enemies, (_player, enemy) => {
      const e = enemy as Sprite;
      if (!e.body?.enable) return;
      this.hurt(e.getData("kind") as string, e, (e.getData("stats") as EnemyStats).damage);
    });
  }

  private setupKeys(): void {
    const keyboard = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(K.UP), down: keyboard.addKey(K.DOWN), left: keyboard.addKey(K.LEFT), right: keyboard.addKey(K.RIGHT),
      w: keyboard.addKey(K.W), a: keyboard.addKey(K.A), s: keyboard.addKey(K.S), d: keyboard.addKey(K.D),
      space: keyboard.addKey(K.SPACE), shift: keyboard.addKey(K.SHIFT), esc: keyboard.addKey(K.ESC),
    };
  }

  /** Phaser captures keys for the whole page; give them back or text inputs stop working. */
  private releaseKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    keyboard.removeCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.W, K.A, K.S, K.D, K.SPACE, K.SHIFT, K.ESC]);
    keyboard.removeAllKeys(true);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const zoomFor = () => {
      const fit = Math.min(this.scale.width / WORLD_WIDTH, this.scale.height / WORLD_HEIGHT);
      return Math.max(fit, Math.min(2, this.scale.height / 420));
    };
    camera.setZoom(zoomFor());
    camera.startFollow(this.player, true, 0.12, 0.12);
    camera.fadeIn(350, 3, 6, 13);
    const onResize = () => camera.setZoom(zoomFor());
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
    if (x !== 0 || y !== 0) this.facing = Math.atan2(y, x);
    if (Phaser.Input.Keyboard.JustDown(k.shift)) this.dash(time);
    if (time < this.dashUntil) {
      this.player.setVelocity(Math.cos(this.facing) * DASH_SPEED, Math.sin(this.facing) * DASH_SPEED);
      if (Math.floor(time / 30) % 2 === 0) this.afterimage();
    } else if (time >= this.stunnedUntil) {
      // While knocked back the player cannot steer, so the push is visible.
      this.player.setVelocity((x / length) * this.hero.speed, (y / length) * this.hero.speed);
    }
    if (x !== 0) this.player.setFlipX(x < 0);
    // Walking: a small hop on every step; standing: a slow breath.
    const moving = x !== 0 || y !== 0;
    this.player.setScale(1, moving ? 1 - 0.06 * Math.abs(Math.sin(time / 70)) : 1 - 0.03 * Math.sin(time / 300));
    this.player.setDepth(this.player.y / WORLD_HEIGHT);
    this.player.setAlpha(time < this.invulnerableUntil ? 0.45 + 0.4 * Math.sin(time / 40) : 1);
    if (Phaser.Input.Keyboard.JustDown(k.space)) this.attack(time);
    this.placeWeapon(time);
    this.drawBar(this.playerBar, this.player, this.tracker.health(), this.tracker.maxHealth(), 30);
    this.moveEnemies(time);
    this.moveCharacters(time);
    this.reportHud(time);
  }

  private dash(time: number): void {
    if (time < this.nextDashAt) return;
    this.nextDashAt = time + DASH_COOLDOWN_MS;
    this.dashUntil = time + DASH_MS;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + DASH_MS + 60);
  }

  /** A fading blue copy of the hero: the trail of the dash. */
  private afterimage(): void {
    const ghost = this.add.image(this.player.x, this.player.y, this.hero.texture).setFlipX(this.player.flipX).setTint(0x2d8cff).setAlpha(0.55).setDepth(this.player.depth - 0.001);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  /** The weapon sits in the hero's hand; during a melee swing it sweeps the arc. */
  private placeWeapon(time: number): void {
    const side = this.player.flipX ? -1 : 1;
    this.held.setDepth(this.player.depth + 0.0001);
    if (time < this.swingUntil) {
      const t = 1 - (this.swingUntil - time) / SWING_MS;
      const half = Phaser.Math.DegToRad(this.weapon.spread / 2);
      this.held.setFlipX(false).setScale(0.9);
      this.held.setRotation(this.facing + Math.PI / 2 - half + 2 * half * t);
      this.held.setPosition(this.player.x + Math.cos(this.facing) * 8, this.player.y + Math.sin(this.facing) * 8);
    } else {
      this.held.setScale(0.7).setFlipX(side < 0).setRotation(0.35 * side);
      this.held.setPosition(this.player.x + 9 * side, this.player.y + 6);
    }
  }

  private moveEnemies(time: number): void {
    const range = 220 + 220 * this.difficulty;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Sprite;
      if (!enemy.body?.enable) continue;
      const bar = enemy.getData("bar") as Phaser.GameObjects.Graphics;
      const stats = enemy.getData("stats") as EnemyStats;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const knocked = time < ((enemy.getData("knockedUntil") as number | undefined) ?? 0);
      if (!knocked && distance < range) {
        const speed = speedFor(stats, this.difficulty);
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const phase = enemy.getData("phase") as number;
        let turn = 0;
        if (stats.behavior === "zigzag") turn = 0.9 * Math.sin(time / 160 + phase);
        if (stats.behavior === "flutter") turn = 0.6 * Math.sin(time / 90 + phase);
        if (stats.behavior === "drift") turn = 0.3 * Math.sin(time / 600 + phase);
        enemy.setVelocity(Math.cos(angle + turn) * speed, Math.sin(angle + turn) * speed);
      } else if (!knocked) {
        enemy.setVelocity(enemy.body.velocity.x * 0.9, enemy.body.velocity.y * 0.9);
      }
      // Each kind moves in its own way: bats flap, ghosts fade, the rest squash and stretch.
      if (stats.behavior === "flutter") enemy.setScale(stats.scale, stats.scale * (0.8 + 0.2 * Math.abs(Math.sin(time / 60))));
      else if (stats.behavior === "drift") enemy.setAlpha(0.5 + 0.3 * Math.sin(time / 300 + (enemy.getData("phase") as number)));
      else enemy.setScale(stats.scale * (1 + 0.06 * Math.sin(time / 120)), stats.scale * (1 - 0.06 * Math.sin(time / 120)));
      enemy.setFlipX(this.player.x < enemy.x);
      enemy.setDepth(stats.passesWalls ? 2 : enemy.y / WORLD_HEIGHT);
      this.drawBar(bar, enemy, enemy.getData("hp") as number, stats.health, 26 * stats.scale);
    }
  }

  /** A small health bar above a sprite, coloured by how much is left. */
  private drawBar(bar: Phaser.GameObjects.Graphics, owner: Sprite, value: number, max: number, width: number): void {
    const ratio = Math.max(0, value / max);
    const x = owner.x - width / 2;
    const y = owner.y - owner.displayHeight / 2 - 8;
    bar.clear();
    bar.fillStyle(0x03060d, 0.75).fillRect(x - 1, y - 1, width + 2, 6);
    bar.fillStyle(healthColor(ratio), 1).fillRect(x, y, width * ratio, 4);
    bar.fillStyle(0xffffff, 0.35).fillRect(x, y, width * ratio, 1);
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
      if (Math.abs(body.velocity.x) > 1) character.setFlipX(body.velocity.x < 0);
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
      color: "#0b1530",
      wordWrap: { width: 150 },
      align: "center",
      resolution: 2,
    }).setOrigin(0.5, 1);
    const width = text.width + 14;
    const height = text.height + 10;
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 0.96).fillRoundedRect(-width / 2, -height - 4, width, height, 6);
    box.fillTriangle(-5, -5, 5, -5, 0, 2);
    box.lineStyle(1, 0x2d8cff, 0.6).strokeRoundedRect(-width / 2, -height - 4, width, height, 6);
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
    if (!coin.active || !coin.body?.enable) return;
    this.tracker.collectCoin(coin.x, coin.y);
    this.sparkle(coin.x, coin.y, 0xffc547);
    this.floatText(coin.x, coin.y - 10, "+1", "#ffc547");
    this.tweens.killTweensOf(coin);
    this.tweens.add({ targets: coin, y: coin.y - 24, alpha: 0, scale: 1.4, duration: 220, onComplete: () => coin.destroy() });
    coin.disableBody(false, false);
    if (this.tracker.isOver()) this.end(this.tracker.outcome()!);
  }

  /** Touching a closed chest opens it and throws out an item. */
  private openChest(chest: Sprite): void {
    if (chest.getData("open")) return;
    chest.setData("open", true);
    chest.setTexture("chest-open");
    const loot = rollLoot();
    this.tracker.openChest(loot, chest.x, chest.y);
    this.sparkle(chest.x, chest.y - 8, 0xffc547, 12);
    this.tweens.add({ targets: chest, scaleX: 1.15, scaleY: 0.9, duration: 90, yoyo: true });
    // The item jumps out of the chest and lands in front of it.
    const landX = chest.x + Phaser.Math.Between(-20, 20);
    const landY = chest.y + 34;
    const item = this.spawnItem(loot, chest.x, chest.y - 4, false);
    item.disableBody(false, false);
    this.tweens.add({ targets: item, x: landX, duration: 460, ease: "Quad.easeOut" });
    this.tweens.add({
      targets: item, y: { from: chest.y - 30, to: landY }, duration: 460, ease: "Bounce.easeOut",
      onComplete: () => {
        if (!item.active) return;
        item.enableBody(true, landX, landY, true, true);
        this.tweens.add({ targets: item, y: landY - 4, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      },
    });
    this.hooks.onNotice?.(`El cofre tenía ${ITEM_NAMES[loot] ?? loot}`);
  }

  private pickUp(item: Sprite): void {
    if (!item.active || !item.body?.enable) return;
    const kind = item.getData("kind") as Kind;
    if (kind === "potion") {
      this.tracker.pickUp("potion", POTION_HEAL);
      this.floatText(this.player.x, this.player.y - 20, `+${POTION_HEAL} ♥`, "#33e0a1");
      this.sparkle(item.x, item.y, 0x33e0a1);
    } else if (isWeapon(kind)) {
      this.weapon = WEAPONS[kind as WeaponId];
      this.held.setTexture(KIND_TEXTURE[kind].key);
      this.tracker.pickUp(kind);
      this.sparkle(item.x, item.y, 0x2d8cff);
      this.floatText(this.player.x, this.player.y - 20, this.weapon.name, "#7cc4ff");
    }
    this.hooks.onNotice?.(`Has recogido ${ITEM_NAMES[kind] ?? kind}`);
    this.tweens.killTweensOf(item);
    item.disableBody(false, false);
    this.tweens.add({ targets: item, y: item.y - 18, alpha: 0, duration: 200, onComplete: () => item.destroy() });
  }

  private hurt(source: string, from: Sprite, amount: number): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil || this.finished) return;
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.stunnedUntil = now + 160;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(angle) * 420, Math.sin(angle) * 420);
    this.flash(this.player, 0xff4d6d, 90);
    this.cameras.main.shake(140, 0.007);
    this.floatText(this.player.x, this.player.y - 20, `-${amount}`, "#ff4d6d");
    if (this.tracker.takeDamage(source, this.player.x, this.player.y, amount)) this.end("lost");
  }

  private attack(now: number): void {
    if (now < this.nextAttackAt) return;
    this.nextAttackAt = now + this.weapon.cooldownMs;
    if (this.weapon.style === "melee") this.swing();
    else if (this.weapon.style === "ray") this.lightning();
    else this.shoot();
    if (this.tracker.isOver()) this.end(this.tracker.outcome()!);
  }

  /** Sword or axe: the weapon sweeps an arc and hits everything inside it. */
  private swing(): void {
    this.swingUntil = this.time.now + SWING_MS;
    const { x, y } = this.player;
    const half = Phaser.Math.DegToRad(this.weapon.spread / 2);
    const radius = this.weapon.range - 6;
    const arc = this.add.graphics().setDepth(39).setBlendMode(Phaser.BlendModes.ADD);
    arc.lineStyle(10, 0x2d8cff, 0.3).beginPath().arc(x, y, radius, this.facing - half, this.facing + half).strokePath();
    arc.lineStyle(3, 0xd6ecff, 0.95).beginPath().arc(x, y, radius, this.facing - half, this.facing + half).strokePath();
    this.tweens.add({ targets: arc, alpha: 0, duration: 200, onComplete: () => arc.destroy() });
    for (const child of [...this.enemies.getChildren()]) {
      const enemy = child as Sprite;
      if (!enemy.body?.enable) continue;
      if (inSwing(enemy.x - x, enemy.y - y, this.facing, this.weapon)) this.damageEnemy(enemy, this.weapon.damage, this.facing);
    }
  }

  /** The wand: a lightning ray that goes through every enemy in its line, up to the first wall. */
  private lightning(): void {
    const ax = this.player.x + Math.cos(this.facing) * 14;
    const ay = this.player.y + Math.sin(this.facing) * 14;
    let bx = this.player.x + Math.cos(this.facing) * this.weapon.range;
    let by = this.player.y + Math.sin(this.facing) * this.weapon.range;
    const line = new Phaser.Geom.Line(ax, ay, bx, by);
    for (const child of this.solids.getChildren()) {
      const rect = (child as Sprite).getBounds();
      for (const point of Phaser.Geom.Intersects.GetLineToRectangle(line, rect)) {
        if (Phaser.Math.Distance.Between(ax, ay, point.x, point.y) < Phaser.Math.Distance.Between(ax, ay, bx, by)) {
          bx = point.x;
          by = point.y;
        }
      }
    }
    this.drawBolt(ax, ay, bx, by);
    this.cameras.main.flash(60, 45, 140, 255, false);
    for (const child of [...this.enemies.getChildren()]) {
      const enemy = child as Sprite;
      if (!enemy.body?.enable) continue;
      if (distanceToSegment(enemy.x, enemy.y, ax, ay, bx, by) <= this.weapon.spread) this.damageEnemy(enemy, this.weapon.damage, this.facing);
    }
  }

  /** A jagged bolt in three glowing strokes, like the lightning of the PixelForge logo. */
  private drawBolt(ax: number, ay: number, bx: number, by: number): void {
    const steps = 9;
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / length;
    const ny = (bx - ax) / length;
    const points = [new Phaser.Math.Vector2(ax, ay)];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = Phaser.Math.Between(-10, 10);
      points.push(new Phaser.Math.Vector2(ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off));
    }
    points.push(new Phaser.Math.Vector2(bx, by));
    const bolt = this.add.graphics().setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
    for (const [width, color, alpha] of [[10, 0x2d8cff, 0.25], [5, 0x5aa9ff, 0.6], [2, 0xffffff, 1]] as const) {
      bolt.lineStyle(width, color, alpha).strokePoints(points);
    }
    this.sparkle(bx, by, 0x7cc4ff);
    this.tweens.add({ targets: bolt, alpha: 0, duration: 180, onComplete: () => bolt.destroy() });
  }

  /** The bow: an arrow flies until it hits an enemy or a wall. */
  private shoot(): void {
    const arrow = this.arrows.create(this.player.x, this.player.y, "arrow") as Sprite;
    arrow.setRotation(this.facing).setDepth(this.player.depth + 0.001);
    (arrow.body as Body).setSize(10, 10);
    arrow.setVelocity(Math.cos(this.facing) * ARROW_SPEED, Math.sin(this.facing) * ARROW_SPEED);
    this.time.delayedCall((this.weapon.range / ARROW_SPEED) * 1000, () => arrow.active && arrow.destroy());
  }

  private damageEnemy(enemy: Sprite, damage: number, angle: number): void {
    const stats = enemy.getData("stats") as EnemyStats;
    const hp = (enemy.getData("hp") as number) - damage;
    enemy.setData("hp", hp);
    const push = this.weapon.knockback / (enemy.getData("kind") === "brute" ? 2 : 1);
    enemy.setVelocity(Math.cos(angle) * push, Math.sin(angle) * push);
    enemy.setData("knockedUntil", this.time.now + 140);
    this.flash(enemy, 0xffffff, 80);
    this.floatText(enemy.x, enemy.y - 16, `-${damage}`, "#ffffff");
    this.sparkle(enemy.x, enemy.y, 0xd6ecff, 5);
    if (hp <= 0) {
      this.tracker.defeatEnemy(enemy.x, enemy.y, enemy.getData("kind") as string, stats.points);
      this.floatText(enemy.x, enemy.y - 30, `+${stats.points}`, "#ffc547");
      (enemy.getData("bar") as Phaser.GameObjects.Graphics).destroy();
      enemy.disableBody(false, false);
      this.tweens.add({ targets: enemy, alpha: 0, scale: 0.2, angle: 180, duration: 260, onComplete: () => enemy.destroy() });
    }
  }

  /** Paint a sprite in one solid colour for a moment: the "hit" flash. */
  private flash(sprite: Sprite, color: number, ms: number): void {
    sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(ms, () => {
      if (sprite.active) sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, {
      fontFamily: "Orbitron, Inter, system-ui, sans-serif", fontSize: "12px", fontStyle: "bold", color, stroke: "#03060d", strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: label, y: y - 22, alpha: 0, duration: 650, ease: "Cubic.easeOut", onComplete: () => label.destroy() });
  }

  private sparkle(x: number, y: number, color: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dot = this.add.rectangle(x, y, 3, 3, color).setDepth(45).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22, alpha: 0, duration: 320, ease: "Cubic.easeOut", onComplete: () => dot.destroy() });
    }
  }

  private reportHud(time: number, force = false): void {
    if (!force && time - this.lastHud < 100) return;
    this.lastHud = time;
    this.hooks.onHud({
      score: this.tracker.score(),
      health: this.tracker.health(),
      maxHealth: this.tracker.maxHealth(),
      coins: this.tracker.coinsCollected,
      coinsTotal: this.tracker.coinsTotal,
      enemies: this.tracker.enemiesDefeated,
      enemiesTotal: this.tracker.enemiesTotal,
      elapsedMs: this.tracker.elapsedMs(),
      difficulty: this.difficulty,
      hero: this.hero.name,
      weapon: this.weapon.id,
      attackReady: Phaser.Math.Clamp(1 - (this.nextAttackAt - time) / this.weapon.cooldownMs, 0, 1),
      dashReady: Phaser.Math.Clamp(1 - (this.nextDashAt - time) / DASH_COOLDOWN_MS, 0, 1),
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
