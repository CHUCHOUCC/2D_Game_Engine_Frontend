import { expect, test } from "vitest";
import { createHeroRing, stepHero } from "./heroRing";

test("the ring starts on the chosen hero", () => {
  expect(createHeroRing(["a", "b", "c"], "b").current()).toBe("b");
});

test("an unknown hero leaves the first one selected", () => {
  expect(createHeroRing(["a", "b"], "zzz").current()).toBe("a");
});

test("right and down go forward, and the last hero leads back to the first", () => {
  const ring = createHeroRing(["a", "b", "c"], "b");
  expect(stepHero(ring, "ArrowRight")).toBe("c");
  expect(stepHero(ring, "ArrowDown")).toBe("a");
});

test("left and up go backwards, and the first hero leads to the last", () => {
  const ring = createHeroRing(["a", "b", "c"], "b");
  expect(stepHero(ring, "ArrowLeft")).toBe("a");
  expect(stepHero(ring, "ArrowUp")).toBe("c");
});

test("other keys do nothing", () => {
  const ring = createHeroRing(["a", "b"], "a");
  expect(stepHero(ring, "Enter")).toBeUndefined();
  expect(ring.current()).toBe("a");
});
