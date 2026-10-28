/**
 * The physics of everything that flies: arrows, daggers, orbs and sparks.
 *
 * The game is seen from above, so a projectile has a position on the ground
 * (x, y) and a height (z). Gravity pulls z down while the projectile moves
 * along the ground; on screen it is drawn z pixels above its shadow, and it
 * points where it is going on screen, so an arrow tilts up as it leaves the
 * bow and dips as it comes down. No Phaser here, so every rule can be tested.
 */
import type { ProjectileSpec } from "./combat";

export interface Flight {
  x: number;
  y: number;
  /** Height above the ground, in pixels. */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  /** Ground speed gained per second (magic speeds up), and the cap. */
  accel: number;
  maxSpeed: number;
  /** Seconds since launch. */
  age: number;
  /** Rotation added by spinning (daggers), in radians. */
  spinAngle: number;
  spin: number;
  landed: boolean;
}

/**
 * Upward speed that makes a projectile launched at `height` touch the ground
 * after flying `range` pixels at `speed`. With no gravity it flies level.
 */
export function liftFor(range: number, speed: number, height: number, gravity: number): number {
  if (gravity <= 0 || speed <= 0) return 0;
  const time = range / speed;
  return (gravity * time * time) / 2 / time - height / time;
}

/** A new flight from (x, y) towards `angle`. `power` (0..1] scales speed and range (a charged bow). */
export function launch(spec: ProjectileSpec, x: number, y: number, angle: number, range: number, power = 1): Flight {
  const speed = spec.speed * (0.6 + 0.4 * power);
  const reach = range * power;
  return {
    x,
    y,
    z: spec.height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    vz: liftFor(reach, speed, spec.height, spec.gravity),
    gravity: spec.gravity,
    accel: spec.accel,
    maxSpeed: speed + spec.accel * 0.6,
    age: 0,
    spinAngle: 0,
    spin: spec.spin * Math.PI * 2,
    landed: false,
  };
}

/** Advance a flight by `dt` seconds. Returns true on the frame it touches the ground. */
export function step(flight: Flight, dt: number): boolean {
  if (flight.landed) return false;
  flight.age += dt;
  if (flight.accel > 0) {
    const speed = Math.hypot(flight.vx, flight.vy) || 1;
    const next = Math.min(flight.maxSpeed, speed + flight.accel * dt);
    flight.vx *= next / speed;
    flight.vy *= next / speed;
  }
  flight.x += flight.vx * dt;
  flight.y += flight.vy * dt;
  if (flight.gravity > 0) {
    flight.vz -= flight.gravity * dt;
    flight.z += flight.vz * dt;
    if (flight.z <= 0) {
      flight.z = 0;
      flight.landed = true;
    }
  }
  flight.spinAngle += flight.spin * dt;
  return flight.landed;
}

/**
 * Where the projectile points on screen: along its screen velocity, which
 * is its ground velocity with the height change drawn upwards.
 */
export function screenAngle(flight: Flight): number {
  return Math.atan2(flight.vy - flight.vz, flight.vx) + flight.spinAngle;
}

/** Bounce off a wall: reverse the side of the velocity that hit it and lose a little speed. */
export function bounce(flight: Flight, hitX: boolean, hitY: boolean, keep = 0.85): void {
  if (hitX) flight.vx = -flight.vx * keep;
  if (hitY) flight.vy = -flight.vy * keep;
}

/** Angles of a fan of `count` shots centred on `angle`, `fanDeg` apart. */
export function fanAngles(angle: number, count: number, fanDeg: number): number[] {
  const step = (fanDeg * Math.PI) / 180;
  const angles: number[] = [];
  for (let i = 0; i < count; i++) angles.push(angle + (i - (count - 1) / 2) * step);
  return angles;
}

/**
 * Velocity towards a target speed with some inertia: the hero speeds up and
 * slows down over a few frames instead of starting and stopping at once.
 */
export function approach(current: number, target: number, agility: number, dt: number): number {
  const t = Math.min(1, agility * dt);
  return current + (target - current) * t;
}
