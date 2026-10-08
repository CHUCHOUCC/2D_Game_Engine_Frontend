import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import { ScoreCounter } from "../model/ScoreCounter";
import { LinkedList } from "../structures/LinkedList";

export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 4;
export const BOX_SIZE = 40;
export const ENEMY_HEALTH = 3;
export const ENEMY_SPEED = 1.5;
export const CHASE_RANGE = 260;
export const ATTACK_REACH = 48;
export const ATTACK_COOLDOWN = 20;
export const HIT_PAUSE = 60;
const TOUCH_RADIUS = { coin: 14, enemy: 17 } as const;
const ENEMY_RADIUS = TOUCH_RADIUS.enemy;

/** An object of the play. Enemies also carry their current health. */
export interface PlayObject extends GameObject {
  hp: number;
}

/** Health an enemy starts with. Later this can read a value saved with the object. */
export function maxHealth(object: GameObject): number {
  return object.kind === "enemy" ? ENEMY_HEALTH : 0;
}

/**
 * The rules of the game, with no Phaser inside (so it can be tested).
 *
 * It works on its own COPY of the scene: coins collected and enemies defeated
 * disappear from this copy, never from the scene that is being edited.
 * `update()` runs once per frame; all the timers below count frames.
 */
export class PlayState {
  private objects = new LinkedList<PlayObject>();
  private counter = new ScoreCounter();
  playerX = WORLD_WIDTH / 2;
  playerY = WORLD_HEIGHT / 2;
  private hitPause = 0;
  private attackCooldown = 0;
  private attackFlash = 0;

  constructor(scene: Iterable<GameObject>) {
    for (const object of scene) {
      this.objects.add({ ...object, hp: maxHealth(object) });
    }
  }

  /** Objects that are still in the play (coins collected and enemies defeated are gone). */
  [Symbol.iterator](): Iterator<PlayObject> {
    return this.objects[Symbol.iterator]();
  }

  /** True while an object with this id is still in the play. */
  has(id: string): boolean {
    return this.objects.find((object) => object.id === id) !== undefined;
  }

  score(): number {
    return this.counter.score();
  }

  health(): number {
    return this.counter.health();
  }

  isGameOver(): boolean {
    return this.counter.isGameOver();
  }

  /** True for a short time after the player is hit (hits do not count meanwhile). */
  isProtected(): boolean {
    return this.hitPause > 0;
  }

  /** True for a few frames after an attack, so the scene can draw it. */
  isAttacking(): boolean {
    return this.attackFlash > 0;
  }

  /** Move the player. Boxes block it and the world edge stops it. Does nothing after game over. */
  movePlayer(dx: number, dy: number): void {
    if (this.isGameOver()) {
      return;
    }
    const [x, y] = this.step(this.playerX, this.playerY, dx, dy, PLAYER_RADIUS);
    this.playerX = x;
    this.playerY = y;
  }

  /** Hit every enemy in reach. Defeated enemies disappear and give points. */
  attack(): void {
    if (this.isGameOver() || this.attackCooldown > 0) {
      return;
    }
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackFlash = 8;
    const reach = PLAYER_RADIUS + ENEMY_RADIUS + ATTACK_REACH;
    let target = this.objects.find((object) => object.kind === "enemy" && this.within(object, reach));
    // Take the targets first so a defeated enemy is not found again.
    const struck: PlayObject[] = [];
    while (target !== undefined) {
      const found = target;
      if (struck.indexOf(found) !== -1) break;
      struck.push(found);
      target = this.objects.find(
        (object) => object.kind === "enemy" && this.within(object, reach) && struck.indexOf(object) === -1,
      );
    }
    for (const enemy of struck) {
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        const id = enemy.id;
        this.objects.remove((object) => object.id === id);
        this.counter.receive({ type: "defeated" });
      }
    }
    this.counter.process();
  }

  /** Run one frame: timers, coins, enemies chasing and enemies hurting the player. */
  update(): void {
    if (this.isGameOver()) {
      return;
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - 1);
    this.attackFlash = Math.max(0, this.attackFlash - 1);
    this.hitPause = Math.max(0, this.hitPause - 1);
    this.collectCoins();
    this.moveEnemies();
    if (this.hitPause === 0) {
      const touching = this.objects.find(
        (object) => object.kind === "enemy" && this.within(object, PLAYER_RADIUS + ENEMY_RADIUS),
      );
      if (touching !== undefined) {
        this.counter.receive({ type: "hit" });
        this.hitPause = HIT_PAUSE;
      }
    }
    this.counter.process();
  }

  private collectCoins(): void {
    const reach = PLAYER_RADIUS + TOUCH_RADIUS.coin;
    let coin = this.objects.find((object) => object.kind === "coin" && this.within(object, reach));
    while (coin !== undefined) {
      const id = coin.id;
      this.counter.receive({ type: "coin" });
      this.objects.remove((object) => object.id === id);
      coin = this.objects.find((object) => object.kind === "coin" && this.within(object, reach));
    }
  }

  /** Enemies close enough walk towards the player. Boxes block them too. */
  private moveEnemies(): void {
    for (const enemy of this.objects) {
      if (enemy.kind !== "enemy") {
        continue;
      }
      const dx = this.playerX - enemy.x;
      const dy = this.playerY - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance > CHASE_RANGE || distance <= PLAYER_RADIUS + ENEMY_RADIUS) {
        continue;
      }
      const [x, y] = this.step(
        enemy.x,
        enemy.y,
        (dx / distance) * ENEMY_SPEED,
        (dy / distance) * ENEMY_SPEED,
        ENEMY_RADIUS,
      );
      enemy.x = x;
      enemy.y = y;
    }
  }

  private within(object: GameObject, reach: number): boolean {
    const dx = object.x - this.playerX;
    const dy = object.y - this.playerY;
    return dx * dx + dy * dy <= reach * reach;
  }

  /**
   * Move a circle by (dx, dy), one axis at a time so it slides along boxes.
   * A move that ends inside a box is refused, unless the circle was already
   * inside one (then it can walk out instead of getting stuck).
   */
  private step(x: number, y: number, dx: number, dy: number, radius: number): [number, number] {
    const stuck = this.hitsBox(x, y, radius);
    let nextX = Math.min(WORLD_WIDTH, Math.max(0, x + dx));
    if (!stuck && this.hitsBox(nextX, y, radius)) {
      nextX = x;
    }
    let nextY = Math.min(WORLD_HEIGHT, Math.max(0, y + dy));
    if (!stuck && this.hitsBox(nextX, nextY, radius)) {
      nextY = y;
    }
    return [nextX, nextY];
  }

  private hitsBox(x: number, y: number, radius: number): boolean {
    const half = BOX_SIZE / 2;
    return (
      this.objects.find((object) => {
        if (object.kind !== "box") {
          return false;
        }
        const nearestX = Math.min(object.x + half, Math.max(object.x - half, x));
        const nearestY = Math.min(object.y + half, Math.max(object.y - half, y));
        const dx = x - nearestX;
        const dy = y - nearestY;
        return dx * dx + dy * dy < radius * radius;
      }) !== undefined
    );
  }
}
