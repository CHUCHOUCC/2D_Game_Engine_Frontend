import { SIZES, WORLD_HEIGHT, WORLD_WIDTH, type Kind } from "./GameObject";

/** Snap a centre coordinate so the object sits exactly on grid cells. */
export function snap(value: number, kind: Kind, grid: number): number {
  const size = SIZES[kind][0];
  // Objects as big as the grid (or bigger) align their edges; small ones their centre.
  const offset = size >= grid ? (size / 2) % grid : grid / 2;
  return Math.round((value - offset) / grid) * grid + offset;
}
