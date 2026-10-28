import { describe, expect, it } from "vitest";
import { ENEMY_KINDS } from "../model/GameObject";
import { aimAngle, chargePower, distanceToSegment, enemyStats, healthColor, heroById, HEROES, inSwing, LOOT, rollLoot, speedFor, WEAPONS } from "./combat";

describe("heroes and weapons", () => {
  it("each hero carries a weapon that exists", () => {
    for (const hero of HEROES) expect(WEAPONS[hero.weapon].id).toBe(hero.weapon);
  });

  it("the wizard casts an exploding orb", () => {
    const wand = WEAPONS[heroById("wizard").weapon];
    expect(wand.style).toBe("projectile");
    expect(wand.projectile!.splash).toBeGreaterThan(0);
  });

  it("there are eight heroes, each with its own texture and a weapon that flies or hits", () => {
    expect(HEROES).toHaveLength(8);
    expect(new Set(HEROES.map((h) => h.texture)).size).toBe(8);
    for (const hero of HEROES) {
      const weapon = WEAPONS[hero.weapon];
      expect(weapon.windupMs).toBeGreaterThan(0);
      expect(weapon.style === "melee" || weapon.projectile !== undefined).toBe(true);
    }
  });

  it("a held bow shoots harder than a tapped one", () => {
    const bow = WEAPONS.bow;
    expect(chargePower(bow, 0)).toBeCloseTo(0.55);
    expect(chargePower(bow, bow.windupMs + bow.chargeMs)).toBe(1);
    expect(chargePower(WEAPONS.sword, 0)).toBe(1);
  });

  it("an unknown hero falls back to the knight", () => {
    expect(heroById("nobody").id).toBe("knight");
    expect(heroById(null).id).toBe("knight");
  });
});

describe("enemies", () => {
  it("every enemy kind has stats with health", () => {
    for (const kind of ENEMY_KINDS) expect(enemyStats(kind).health).toBeGreaterThan(0);
  });

  it("the brute is the toughest and hits hardest", () => {
    expect(enemyStats("brute").health).toBeGreaterThan(enemyStats("enemy").health);
    expect(enemyStats("brute").damage).toBe(2);
  });

  it("enemies get faster with the AI difficulty", () => {
    const slime = enemyStats("enemy");
    expect(speedFor(slime, 0)).toBeLessThan(speedFor(slime, 1));
    expect(speedFor(slime, 5)).toBe(speedFor(slime, 1));
  });
});

describe("loot", () => {
  it("rolls every entry of the table", () => {
    expect(rollLoot(() => 0)).toBe(LOOT[0]);
    expect(rollLoot(() => 0.999)).toBe(LOOT[LOOT.length - 1]);
    expect(rollLoot(() => 1)).toBe(LOOT[LOOT.length - 1]);
  });
});

describe("hit tests", () => {
  const sword = WEAPONS.sword;

  it("a swing hits what is in front and close", () => {
    expect(inSwing(40, 0, 0, sword)).toBe(true);
    expect(inSwing(-40, 0, 0, sword)).toBe(false);
    expect(inSwing(200, 0, 0, sword)).toBe(false);
  });

  it("a swing always hits what is touching the hero", () => {
    expect(inSwing(-5, 0, 0, sword)).toBe(true);
  });

  it("measures the distance to the ray", () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(distanceToSegment(-4, 3, 0, 0, 10, 0)).toBe(5);
    expect(distanceToSegment(1, 1, 0, 0, 0, 0)).toBeCloseTo(Math.SQRT2);
  });

  it("aims at an enemy close to where the hero faces, not at one behind", () => {
    const ahead = { x: 100, y: 20 };
    const behind = { x: -50, y: 0 };
    expect(aimAngle(0, 0, 0, [ahead, behind], 300)).toBeCloseTo(Math.atan2(20, 100));
    expect(aimAngle(0, 0, 0, [behind], 300)).toBe(0);
    expect(aimAngle(0, 0, 0, [{ x: 900, y: 0 }], 300)).toBe(0);
  });

  it("health bars go from green to red", () => {
    expect(healthColor(1)).toBe(0x33e0a1);
    expect(healthColor(0.5)).toBe(0xffc547);
    expect(healthColor(0.1)).toBe(0xff4d6d);
  });
});
