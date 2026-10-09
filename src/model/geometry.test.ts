import { expect, test } from "vitest";
import { KINDS, SIZES, isKind } from "./GameObject";
import { clampToWorld, fitZoom, overlaps, snap } from "./geometry";

test("snap puts tile-sized objects exactly on a cell", () => {
  expect(snap(50, "wall", 32)).toBe(48);
  expect(snap(63, "wall", 32)).toBe(48);
  expect(snap(65, "wall", 32)).toBe(80);
});

test("snap aligns houses by their edges and coins by their centre", () => {
  expect(snap(150, "house", 32)).toBe(144); // 96 px: edges on the grid
  expect(snap(30, "coin", 32)).toBe(16);
  expect(snap(30, "wall", 16)).toBe(32);
});
