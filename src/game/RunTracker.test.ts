import { expect, test } from "vitest";
import type { GameObject } from "../model/GameObject";
import { RunTracker } from "./RunTracker";

const SCENE: GameObject[] = [
  { id: "c1", kind: "coin", x: 100, y: 100 },
  { id: "c2", kind: "coin", x: 200, y: 100 },
  { id: "e1", kind: "enemy", x: 300, y: 300 },
  { id: "w1", kind: "wall", x: 50, y: 50 },
];

function tracker(scene = SCENE) {
  let now = 0;
  const run = new RunTracker(scene, () => now);
  return { run, advance: (ms: number) => (now += ms) };
}

test("RunTracker counts the coins and enemies of the level", () => {
  const { run } = tracker();
  expect(run.coinsTotal).toBe(2);
  expect(run.enemiesTotal).toBe(1);
  expect(run.health()).toBe(3);
  expect(run.isOver()).toBe(false);
});

test("RunTracker wins when every coin is collected", () => {
  const { run } = tracker();
  run.collectCoin(100, 100);
  expect(run.isOver()).toBe(false);
  run.collectCoin(200, 100);
  expect(run.outcome()).toBe("won");
  expect(run.score()).toBe(2);
});

test("RunTracker wins a level without coins by defeating every enemy", () => {
  const { run } = tracker([{ id: "e1", kind: "enemy", x: 1, y: 1 }]);
  run.defeatEnemy();
  expect(run.outcome()).toBe("won");
  expect(run.score()).toBe(5);
});

test("RunTracker loses when health runs out", () => {
  const { run } = tracker();
  expect(run.takeDamage("enemy")).toBe(false);
  expect(run.takeDamage("spike")).toBe(false);
  expect(run.takeDamage("enemy")).toBe(true);
  expect(run.outcome()).toBe("lost");
  expect(run.damageTaken).toBe(3);
});
