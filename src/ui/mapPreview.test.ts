import { expect, test } from "vitest";
import { KINDS } from "../model/GameObject";
import { previewColor } from "./mapPreview";

test("map previews colour the kinds a player needs to tell apart", () => {
  expect(previewColor("player")).toBe("#3b82f6");
  expect(previewColor("brute")).toBe(previewColor("spike")); // both hurt
  expect(previewColor("wall")).not.toBe(previewColor("tree"));
  expect(previewColor("coin")).toBe(previewColor("chest")); // both are rewards
});

test("every kind has a preview colour", () => {
  for (const kind of KINDS) expect(previewColor(kind)).toMatch(/^#[0-9a-f]{6}$/);
});
