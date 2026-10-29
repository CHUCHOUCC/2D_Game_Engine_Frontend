import { describe, expect, it } from "vitest";
import { DEAD_ZONE, knobOffset, resetTouch, stickVector, touch } from "./touchInput";

describe("on-screen joystick", () => {
  it("does nothing inside the dead zone", () => {
    expect(stickVector(3, 2, 52)).toEqual({ x: 0, y: 0, length: 0 });
    expect(stickVector(0, 0, 52).length).toBe(0);
  });

  it("points where the thumb is and reaches full speed at the rim", () => {
    const right = stickVector(52, 0, 52);
    expect(right.x).toBeCloseTo(1);
    expect(right.y).toBeCloseTo(0);
    const far = stickVector(0, -200, 52);
    expect(far.length).toBeCloseTo(1);
    expect(far.y).toBeCloseTo(-1);
  });

  it("is analog between the dead zone and the rim", () => {
    const half = stickVector(26, 0, 52);
    expect(half.length).toBeGreaterThan(0);
    expect(half.length).toBeLessThan(1);
    expect(half.length).toBeCloseTo((0.5 - DEAD_ZONE) / (1 - DEAD_ZONE));
  });

  it("keeps the knob inside the ring", () => {
    expect(knobOffset(10, 0, 52)).toEqual({ x: 10, y: 0 });
    const k = knobOffset(300, 400, 52);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(52);
  });

  it("forgets everything when a run starts or ends", () => {
    touch.x = 1;
    touch.attackHeld = true;
    touch.jumpQueued = true;
    resetTouch();
    expect(touch).toMatchObject({ x: 0, y: 0, attackHeld: false, jumpQueued: false });
  });
});
