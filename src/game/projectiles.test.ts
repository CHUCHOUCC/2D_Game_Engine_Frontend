import { describe, expect, it } from "vitest";
import { WEAPONS } from "./combat";
import { approach, bounce, fanAngles, launch, liftFor, screenAngle, step } from "./projectiles";

function flyUntilLanded(flight: ReturnType<typeof launch>, dt = 1 / 120): number {
  for (let i = 0; i < 2000 && !step(flight, dt); i++);
  return Math.hypot(flight.x, flight.y);
}

describe("arrows fly in an arc", () => {
  const arrow = WEAPONS.bow.projectile!;

  it("a fully drawn arrow lands about at the bow's range", () => {
    const distance = flyUntilLanded(launch(arrow, 0, 0, 0, WEAPONS.bow.range, 1));
    expect(Math.abs(distance - WEAPONS.bow.range)).toBeLessThan(12);
  });

  it("a quick tap flies a shorter way than a charged shot", () => {
    const tap = flyUntilLanded(launch(arrow, 0, 0, 0, 500, 0.55));
    const full = flyUntilLanded(launch(arrow, 0, 0, 0, 500, 1));
    expect(tap).toBeLessThan(full * 0.7);
  });

  it("rises first and then falls, and points along its path", () => {
    const flight = launch(arrow, 0, 0, 0, 500, 1);
    step(flight, 0.05);
    expect(flight.z).toBeGreaterThan(arrow.height);
    expect(screenAngle(flight)).toBeLessThan(0); // tilted up on screen
    for (let i = 0; i < 60; i++) step(flight, 0.01);
    expect(screenAngle(flight)).toBeGreaterThan(0); // nose down on the way down
  });

  it("the lift keeps the arrow low over the ground (no mortar shots)", () => {
    const lift = liftFor(520, 640, 12, 240);
    const apex = 12 + (lift * lift) / (2 * 240);
    expect(apex).toBeLessThan(40);
  });
});

describe("magic and thrown weapons", () => {
  it("an orb has no gravity and speeds up", () => {
    const orb = launch(WEAPONS.wand.projectile!, 0, 0, 0, 380);
    const start = orb.vx;
    for (let i = 0; i < 30; i++) step(orb, 1 / 60);
    expect(orb.z).toBe(WEAPONS.wand.projectile!.height);
    expect(orb.vx).toBeGreaterThan(start);
    expect(orb.landed).toBe(false);
  });

  it("daggers spin while they fly", () => {
    const dagger = launch(WEAPONS.dagger.projectile!, 0, 0, 0, 300);
    step(dagger, 0.1);
    expect(Math.abs(dagger.spinAngle)).toBeGreaterThan(1);
  });

  it("a fan is centred on the aim", () => {
    const angles = fanAngles(1, 3, 10);
    expect(angles).toHaveLength(3);
    expect(angles[1]).toBe(1);
    expect(angles[2] - angles[1]).toBeCloseTo((10 * Math.PI) / 180);
  });

  it("a bounce reverses the side that hit the wall", () => {
    const spark = launch(WEAPONS.staff.projectile!, 0, 0, 0, 600);
    const vx = spark.vx;
    bounce(spark, true, false);
    expect(spark.vx).toBeLessThan(0);
    expect(Math.abs(spark.vx)).toBeLessThan(Math.abs(vx));
  });
});

describe("movement with inertia", () => {
  it("speeds up over a few frames instead of at once", () => {
    let v = 0;
    v = approach(v, 200, 12, 1 / 60);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(200);
    for (let i = 0; i < 60; i++) v = approach(v, 200, 12, 1 / 60);
    expect(v).toBeCloseTo(200, 0);
  });
});
