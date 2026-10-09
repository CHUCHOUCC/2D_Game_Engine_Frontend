import { expect, test } from "vitest";
import { KINDS, SIZES, isKind } from "./GameObject";
import { clampToWorld, fitZoom, overlaps, snap } from "./geometry";

test("snap puts tile-sized objects exactly on a cell", () => {
  expect(snap(50, "wall", 32)).toBe(48);
  expect(snap(63, "wall", 32)).toBe(48);
  expect(snap(65, "wall", 32)).toBe(80);
});
