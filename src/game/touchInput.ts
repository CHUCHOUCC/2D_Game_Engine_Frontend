/**
 * What the on-screen controls ask for, read by the play scene every frame.
 *
 * The joystick writes a direction (x, y in -1..1, length at most 1), the attack
 * button whether it is held (so the bow can be drawn by holding it), and the
 * jump button a press that the scene consumes once. No Phaser and no DOM here,
 * so the rules can be tested.
 */
export interface TouchState {
  /** True while the on-screen controls are in use (a touch device is playing). */
  enabled: boolean;
  x: number;
  y: number;
  attackHeld: boolean;
  /** Set by a tap on the jump button; the scene clears it when it jumps. */
  jumpQueued: boolean;
}

export const touch: TouchState = { enabled: false, x: 0, y: 0, attackHeld: false, jumpQueued: false };

export function resetTouch(): void {
  touch.x = 0;
  touch.y = 0;
  touch.attackHeld = false;
  touch.jumpQueued = false;
}

/** Below this share of the radius the stick does nothing (thumbs never rest perfectly still). */
export const DEAD_ZONE = 0.18;

/**
 * Direction of a thumb that is (dx, dy) pixels away from the centre of a stick
 * of `radius` pixels: zero inside the dead zone, then rising smoothly to 1 at
 * the rim, never longer than 1.
 */
export function stickVector(dx: number, dy: number, radius: number): { x: number; y: number; length: number } {
  const distance = Math.hypot(dx, dy);
  if (radius <= 0 || distance === 0) return { x: 0, y: 0, length: 0 };
  const raw = Math.min(1, distance / radius);
  if (raw < DEAD_ZONE) return { x: 0, y: 0, length: 0 };
  const length = (raw - DEAD_ZONE) / (1 - DEAD_ZONE);
  return { x: (dx / distance) * length, y: (dy / distance) * length, length };
}

/** Where the knob is drawn: on the thumb, but never outside the rim. */
export function knobOffset(dx: number, dy: number, radius: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  if (distance <= radius || distance === 0) return { x: dx, y: dy };
  return { x: (dx / distance) * radius, y: (dy / distance) * radius };
}

/** Phones and tablets: the primary pointer is a finger. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return coarse || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && "ontouchstart" in window);
}
