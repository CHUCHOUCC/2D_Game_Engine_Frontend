import { SIZES, WORLD_HEIGHT, WORLD_WIDTH, type Kind } from "./GameObject";

/** Snap a centre coordinate so the object sits exactly on grid cells. */
export function snap(value: number, kind: Kind, grid: number): number {
  const size = SIZES[kind][0];
  // Objects as big as the grid (or bigger) align their edges; small ones their centre.
  const offset = size >= grid ? (size / 2) % grid : grid / 2;
  return Math.round((value - offset) / grid) * grid + offset;
}

/** Move a centre so the whole object stays inside the world. */
export function clampToWorld(x: number, y: number, kind: Kind): [number, number] {
  const [w, h] = SIZES[kind];
  return [
    Math.min(WORLD_WIDTH - w / 2, Math.max(w / 2, x)),
    Math.min(WORLD_HEIGHT - h / 2, Math.max(h / 2, y)),
  ];
}
