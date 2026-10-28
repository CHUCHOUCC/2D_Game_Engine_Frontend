/**
 * The numbers of the fight: heroes, weapons, enemies and chest loot.
 * No Phaser here, so every rule can be tested on its own.
 */
import type { Kind } from "../model/GameObject";

export type WeaponId = "sword" | "axe" | "wand" | "bow" | "dagger" | "hammer" | "spear" | "staff";
export type HeroId = "knight" | "wizard" | "archer" | "barbarian" | "rogue" | "viking" | "lancer" | "druid";

/** How a thrown or shot thing flies (see projectiles.ts for the physics). */
export interface ProjectileSpec {
  /** Texture key of the projectile. */
  texture: "arrow" | "orb" | "dagger-flying" | "spark";
  /** Launch speed along the ground, in px/s (at full charge for the bow). */
  speed: number;
  /** Pull towards the ground, px/s²: arrows and daggers fly in a low arc; magic floats. */
  gravity: number;
  /** Height the projectile starts at, above the hero's feet. */
  height: number;
  /** How many are fired at once, and the angle between them in degrees. */
  count: number;
  fanDeg: number;
  /** Spin in turns per second (daggers); 0 keeps it pointing where it flies. */
  spin: number;
  /** Enemies it goes through before stopping. */
  pierce: number;
  /** Times it bounces off walls before vanishing. */
  bounces: number;
  /** Radius of the explosion when it lands or hits (0: no explosion). */
  splash: number;
  /** Ground speed it gains per second (magic orbs speed up). */
  accel: number;
  /** Colour of the trail and the impact sparks. */
  color: number;
}

export interface Weapon {
  id: WeaponId;
  name: string;
  /** melee: a hit in front of the hero; projectile: something that flies. */
  style: "melee" | "projectile";
  damage: number;
  cooldownMs: number;
  /** Melee reach, or how far a projectile flies before it lands, in pixels. */
  range: number;
  /** Melee arc in degrees. */
  spread: number;
  knockback: number;
  /** Time the hero needs to get ready (raise the axe, draw the bow) before the hit or the shot. */
  windupMs: number;
  /** Holding the attack key longer than the windup charges the shot, up to this time (0: no charge). */
  chargeMs: number;
  /** Melee: speed of the step forward that goes with the hit (the lancer's thrust is long). */
  lunge: number;
  /** Melee: a ground slam that hits everything around the hero within this radius (the hammer). */
  shockwave: number;
  projectile?: ProjectileSpec;
  summary: string;
}

const ARROW: ProjectileSpec = { texture: "arrow", speed: 640, gravity: 240, height: 12, count: 1, fanDeg: 0, spin: 0, pierce: 0, bounces: 0, splash: 0, accel: 0, color: 0xd6ecff };

export const WEAPONS: Record<WeaponId, Weapon> = {
  sword: { id: "sword", name: "Espada", style: "melee", damage: 1, cooldownMs: 340, range: 52, spread: 120, knockback: 320, windupMs: 70, chargeMs: 0, lunge: 220, shockwave: 0, summary: "Golpe en arco · 1 de daño" },
  axe: { id: "axe", name: "Hacha", style: "melee", damage: 2, cooldownMs: 640, range: 58, spread: 150, knockback: 520, windupMs: 170, chargeMs: 0, lunge: 160, shockwave: 0, summary: "Golpe pesado · 2 de daño" },
  hammer: { id: "hammer", name: "Martillo", style: "melee", damage: 2, cooldownMs: 900, range: 44, spread: 160, knockback: 640, windupMs: 260, chargeMs: 0, lunge: 0, shockwave: 92, summary: "Golpe al suelo · 2 de daño en círculo" },
  spear: { id: "spear", name: "Lanza", style: "melee", damage: 2, cooldownMs: 520, range: 84, spread: 34, knockback: 380, windupMs: 110, chargeMs: 0, lunge: 430, shockwave: 0, summary: "Estocada larga · 2 de daño" },
  bow: { id: "bow", name: "Arco", style: "projectile", damage: 1, cooldownMs: 420, range: 520, spread: 0, knockback: 200, windupMs: 140, chargeMs: 520, lunge: 0, shockwave: 0, projectile: ARROW, summary: "Flechas · mantén para tensar" },
  wand: {
    id: "wand", name: "Varita", style: "projectile", damage: 2, cooldownMs: 620, range: 380, spread: 0, knockback: 260, windupMs: 230, chargeMs: 0, lunge: 0, shockwave: 0,
    projectile: { texture: "orb", speed: 300, gravity: 0, height: 16, count: 1, fanDeg: 0, spin: 0, pierce: 0, bounces: 0, splash: 46, accel: 420, color: 0x5aa9ff },
    summary: "Orbe mágico · explota · 2 de daño",
  },
  dagger: {
    id: "dagger", name: "Dagas", style: "projectile", damage: 1, cooldownMs: 360, range: 300, spread: 0, knockback: 140, windupMs: 80, chargeMs: 0, lunge: 0, shockwave: 0,
    projectile: { texture: "dagger-flying", speed: 520, gravity: 180, height: 10, count: 3, fanDeg: 13, spin: 3.5, pierce: 0, bounces: 0, splash: 0, accel: 0, color: 0xffffff },
    summary: "Tres dagas en abanico · 1 de daño",
  },
  staff: {
    id: "staff", name: "Bastón", style: "projectile", damage: 1, cooldownMs: 480, range: 620, spread: 0, knockback: 200, windupMs: 180, chargeMs: 0, lunge: 0, shockwave: 0,
    projectile: { texture: "spark", speed: 420, gravity: 0, height: 14, count: 1, fanDeg: 0, spin: 0, pierce: 1, bounces: 3, splash: 0, accel: 0, color: 0x6ee7b7 },
    summary: "Chispa que rebota en paredes · 1 de daño",
  },
};

export interface Hero {
  id: HeroId;
  name: string;
  texture: string;
  maxHealth: number;
  speed: number;
  /** How quickly the hero reaches full speed and stops, per second (higher: snappier). */
  agility: number;
  weapon: WeaponId;
  description: string;
  /** 1-10 bars for the selection screen. */
  bars: { health: number; speed: number; power: number };
}

export const HEROES: readonly Hero[] = [
  { id: "knight", name: "Caballero", texture: "hero-knight", maxHealth: 6, speed: 175, agility: 12, weapon: "sword", description: "Resistente y equilibrado. Da un paso al frente y corta en arco.", bars: { health: 6, speed: 5, power: 4 } },
  { id: "wizard", name: "Mago", texture: "hero-wizard", maxHealth: 4, speed: 180, agility: 10, weapon: "wand", description: "Frágil pero letal. Concentra un orbe que acelera y explota al chocar.", bars: { health: 4, speed: 5, power: 8 } },
  { id: "archer", name: "Arquero", texture: "hero-archer", maxHealth: 5, speed: 200, agility: 14, weapon: "bow", description: "El más rápido. Tensa el arco: mantén Espacio y la flecha llega más lejos.", bars: { health: 5, speed: 8, power: 4 } },
  { id: "barbarian", name: "Bárbaro", texture: "hero-barbarian", maxHealth: 7, speed: 160, agility: 8, weapon: "axe", description: "Lento y muy duro. Levanta el hacha y derriba a lo que tenga delante.", bars: { health: 7, speed: 4, power: 9 } },
  { id: "rogue", name: "Pícaro", texture: "hero-rogue", maxHealth: 4, speed: 215, agility: 18, weapon: "dagger", description: "Ágil y escurridizo. Lanza tres dagas que giran en el aire.", bars: { health: 4, speed: 9, power: 5 } },
  { id: "viking", name: "Vikingo", texture: "hero-viking", maxHealth: 8, speed: 150, agility: 7, weapon: "hammer", description: "Una muralla. Golpea el suelo con el martillo y empuja a todos a su alrededor.", bars: { health: 8, speed: 3, power: 9 } },
  { id: "lancer", name: "Lancero", texture: "hero-lancer", maxHealth: 6, speed: 185, agility: 12, weapon: "spear", description: "Alcance largo. Se lanza hacia delante con una estocada que atraviesa.", bars: { health: 6, speed: 6, power: 6 } },
  { id: "druid", name: "Druida", texture: "hero-druid", maxHealth: 5, speed: 180, agility: 11, weapon: "staff", description: "Juega con los rebotes: su chispa salta en las paredes y atraviesa enemigos.", bars: { health: 5, speed: 5, power: 6 } },
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

/**
 * How strong a charged shot is, from 0.55 (a quick tap) to 1 (fully drawn).
 * heldMs counts from when the key went down; the windup is always paid.
 */
export function chargePower(weapon: Weapon, heldMs: number): number {
  if (weapon.chargeMs <= 0) return 1;
  const t = Math.max(0, Math.min(1, (heldMs - weapon.windupMs) / weapon.chargeMs));
  return 0.55 + 0.45 * t;
}

/**
 * Soft aim: the closest target within `coneDeg` of where the hero faces and
 * within range, or the facing itself when nobody is there. Returns an angle.
 */
export function aimAngle(facing: number, fromX: number, fromY: number, targets: Iterable<{ x: number; y: number }>, range: number, coneDeg = 28): number {
  let best = facing;
  let bestDistance = Infinity;
  const cone = (coneDeg * Math.PI) / 180;
  for (const target of targets) {
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const distance = Math.hypot(dx, dy);
    if (distance > range || distance < 1) continue;
    let delta = Math.atan2(dy, dx) - facing;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    if (Math.abs(delta) <= cone && distance < bestDistance) {
      bestDistance = distance;
      best = Math.atan2(dy, dx);
    }
  }
  return best;
}
