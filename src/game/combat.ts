/**
 * The numbers of the fight: heroes, weapons, enemies and chest loot.
 * No Phaser here, so every rule can be tested on its own.
 */
import type { Kind } from "../model/GameObject";

export type WeaponId = "sword" | "axe" | "wand" | "bow";
export type HeroId = "knight" | "wizard" | "archer" | "barbarian";

export interface Weapon {
  id: WeaponId;
  name: string;
  /** melee: arc in front of the hero; ray: lightning in a line; projectile: an arrow. */
  style: "melee" | "ray" | "projectile";
  damage: number;
  cooldownMs: number;
  /** Melee reach or ray/arrow range, in pixels. */
  range: number;
  /** Melee arc in degrees, or the ray's width in pixels. */
  spread: number;
  knockback: number;
  summary: string;
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  sword: { id: "sword", name: "Espada", style: "melee", damage: 1, cooldownMs: 320, range: 52, spread: 120, knockback: 320, summary: "Golpe en arco · 1 de daño" },
  axe: { id: "axe", name: "Hacha", style: "melee", damage: 2, cooldownMs: 620, range: 58, spread: 150, knockback: 520, summary: "Golpe pesado · 2 de daño" },
  wand: { id: "wand", name: "Varita", style: "ray", damage: 2, cooldownMs: 520, range: 300, spread: 26, knockback: 180, summary: "Rayo · 2 de daño" },
  bow: { id: "bow", name: "Arco", style: "projectile", damage: 1, cooldownMs: 380, range: 520, spread: 0, knockback: 200, summary: "Flechas · 1 de daño" },
};

export interface Hero {
  id: HeroId;
  name: string;
  texture: string;
  maxHealth: number;
  speed: number;
  weapon: WeaponId;
  description: string;
  /** 1-10 bars for the selection screen. */
  bars: { health: number; speed: number; power: number };
}

export const HEROES: readonly Hero[] = [
  { id: "knight", name: "Caballero", texture: "hero-knight", maxHealth: 6, speed: 175, weapon: "sword", description: "Resistente y equilibrado. Corta en arco frente a él.", bars: { health: 6, speed: 5, power: 4 } },
  { id: "wizard", name: "Mago", texture: "hero-wizard", maxHealth: 4, speed: 180, weapon: "wand", description: "Frágil pero letal a distancia. Su varita lanza rayos que atraviesan a varios enemigos.", bars: { health: 4, speed: 5, power: 8 } },
  { id: "archer", name: "Arquero", texture: "hero-archer", maxHealth: 5, speed: 200, weapon: "bow", description: "El más rápido. Dispara flechas desde lejos y esquiva bien.", bars: { health: 5, speed: 8, power: 4 } },
  { id: "barbarian", name: "Bárbaro", texture: "hero-barbarian", maxHealth: 7, speed: 160, weapon: "axe", description: "Lento y muy duro. Su hacha derriba y empuja lejos.", bars: { health: 7, speed: 4, power: 9 } },
];

export function heroById(id: string | null | undefined): Hero {
  return HEROES.find((hero) => hero.id === id) ?? HEROES[0];
}

export interface EnemyStats {
  name: string;
  texture: string;
  health: number;
  speed: number;
  damage: number;
  points: number;
  /** Flies over walls (bats) or floats through them (ghosts). */
  passesWalls: boolean;
  /** How it moves towards the player. */
  behavior: "chase" | "zigzag" | "flutter" | "drift";
  scale: number;
}

export const ENEMIES: Partial<Record<Kind, EnemyStats>> = {
  enemy: { name: "Slime", texture: "enemy-slime", health: 3, speed: 70, damage: 1, points: 5, passesWalls: false, behavior: "chase", scale: 1 },
  bat: { name: "Murciélago", texture: "bat", health: 1, speed: 135, damage: 1, points: 3, passesWalls: true, behavior: "flutter", scale: 0.9 },
  spider: { name: "Araña", texture: "spider", health: 2, speed: 115, damage: 1, points: 4, passesWalls: false, behavior: "zigzag", scale: 1 },
  ghost: { name: "Fantasma", texture: "ghost", health: 3, speed: 55, damage: 1, points: 6, passesWalls: true, behavior: "drift", scale: 1 },
  brute: { name: "Ogro", texture: "brute", health: 8, speed: 45, damage: 2, points: 15, passesWalls: false, behavior: "chase", scale: 1.3 },
};

export function enemyStats(kind: Kind): EnemyStats {
  return ENEMIES[kind] ?? ENEMIES.enemy!;
}

/** Enemies move faster as the AI difficulty grows (0.8x at 0, 1.4x at 1). */
export function speedFor(stats: EnemyStats, difficulty: number): number {
  return stats.speed * (0.8 + 0.6 * Math.max(0, Math.min(1, difficulty)));
}

/** What a chest drops. `random` returns 0..1 (Math.random in the game, fixed in tests). */
export const LOOT: readonly Kind[] = ["sword", "axe", "wand", "bow", "potion", "potion"];

export function rollLoot(random: () => number = Math.random): Kind {
  return LOOT[Math.min(LOOT.length - 1, Math.floor(random() * LOOT.length))];
}

export const POTION_HEAL = 2;

/** True when a target is inside a melee swing: close enough and within the arc in front. */
export function inSwing(dx: number, dy: number, facing: number, weapon: Weapon, targetRadius = 14): boolean {
  const distance = Math.hypot(dx, dy);
  if (distance > weapon.range + targetRadius) return false;
  if (distance < targetRadius) return true;
  let delta = Math.atan2(dy, dx) - facing;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return Math.abs(delta) <= ((weapon.spread / 2) * Math.PI) / 180;
}

/** Distance from a point to the segment a-b (used by the wand's ray). */
export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const length2 = vx * vx + vy * vy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / length2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** Colour of a health bar: green when healthy, yellow, then red. */
export function healthColor(ratio: number): number {
  if (ratio > 0.6) return 0x33e0a1;
  if (ratio > 0.3) return 0xffc547;
  return 0xff4d6d;
}
