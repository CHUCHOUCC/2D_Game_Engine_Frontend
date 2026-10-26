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

test("RunTracker ignores events after the run is over", () => {
  const { run } = tracker();
  run.finish("quit");
  run.collectCoin();
  run.defeatEnemy();
  expect(run.takeDamage("enemy")).toBe(false);
  expect(run.score()).toBe(0);
  run.finish("won");
  expect(run.outcome()).toBe("quit");
});

test("RunTracker builds the result the backend expects", () => {
  const { run, advance } = tracker();
  advance(1500);
  run.collectCoin(100.4, 99.6);
  advance(500);
  run.takeDamage("spike", 10, 20);
  run.finish("quit");
  advance(10_000);
  expect(run.result()).toEqual({
    outcome: "quit",
    score: 1,
    coins_collected: 1,
    coins_total: 2,
    enemies_defeated: 0,
    damage_taken: 1,
    deaths: 0,
    duration_ms: 2000,
    events: [
      { kind: "coin", x: 100, y: 100, at_ms: 1500 },
      { kind: "hit_spike", x: 10, y: 20, at_ms: 2000 },
    ],
  });
});

test("RunTracker reports one death for a lost run and quit when unfinished", () => {
  const lost = tracker().run;
  for (let i = 0; i < 3; i++) lost.takeDamage("enemy");
  expect(lost.result().deaths).toBe(1);
  expect(tracker().run.result().outcome).toBe("quit");
});

test("RunTracker keeps at most 500 events", () => {
  const coins: GameObject[] = Array.from({ length: 600 }, (_, i) => ({ id: `c${i}`, kind: "coin", x: i, y: 0 }));
  const { run } = tracker(coins);
  for (let i = 0; i < 600; i++) run.collectCoin();
  expect(run.result().events).toHaveLength(500);
  expect(run.result().coins_collected).toBe(600);
});

test("RunTracker records talks with 2D characters without points", () => {
  const { run } = tracker();
  run.talk("wizard");
  expect(run.score()).toBe(0);
  expect(run.result().events.map((e) => e.kind)).toEqual(["talk_wizard"]);
});

test("RunTracker counts every enemy type and uses the hero's health", () => {
  const scene: GameObject[] = [
    { id: "b", kind: "bat", x: 1, y: 1 },
    { id: "o", kind: "brute", x: 2, y: 2 },
    { id: "g", kind: "ghost", x: 3, y: 3 },
  ];
  const run = new RunTracker(scene, () => 0, 6);
  expect(run.enemiesTotal).toBe(3);
  expect(run.health()).toBe(6);
  expect(run.maxHealth()).toBe(6);
});

test("RunTracker uses each enemy's points and damage", () => {
  const { run } = tracker([{ id: "o", kind: "brute", x: 1, y: 1 }, { id: "s", kind: "spider", x: 2, y: 2 }]);
  run.takeDamage("brute", 0, 0, 2);
  expect(run.health()).toBe(1);
  expect(run.damageTaken).toBe(2);
  run.defeatEnemy(1, 1, "brute", 15);
  expect(run.score()).toBe(15);
  expect(run.result().events.map((e) => e.kind)).toEqual(["hit_brute", "defeated_brute"]);
});

test("RunTracker records chests and heals with potions", () => {
  const { run } = tracker();
  run.takeDamage("spike");
  run.openChest("potion", 10, 10);
  run.pickUp("potion", 2);
  run.pickUp("sword");
  expect(run.health()).toBe(3);
  expect(run.chestsOpened).toBe(1);
  expect(run.itemsPicked).toBe(2);
  expect(run.result().events.map((e) => e.kind)).toEqual(["hit_spike", "chest_potion", "pick_potion", "pick_sword"]);
});
