import { describe, expect, it } from "vitest";
import { PLAYER_MAX_HEALTH, ScoreCounter } from "./ScoreCounter";

describe("ScoreCounter", () => {
  it("adds one point per coin event after processing", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.receive({ type: "coin" });
    expect(counter.score()).toBe(0);
    counter.process();
    expect(counter.score()).toBe(2);
  });

  it("defeating an enemy gives five points", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "defeated" });
    counter.process();
    expect(counter.score()).toBe(5);
  });

  it("a hit takes one health and the game ends when health reaches zero", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "hit" });
    counter.process();
    expect(counter.health()).toBe(PLAYER_MAX_HEALTH - 1);
    expect(counter.isGameOver()).toBe(false);
    for (let i = 0; i < PLAYER_MAX_HEALTH; i++) counter.receive({ type: "hit" });
    counter.process();
    expect(counter.health()).toBe(0);
    expect(counter.isGameOver()).toBe(true);
  });

  it("processing twice does not count an event twice", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.process();
    counter.process();
    expect(counter.score()).toBe(1);
  });

  it("reset restores score, health and clears the waiting events", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.process();
    counter.receive({ type: "hit" });
    counter.reset();
    counter.process();
    expect(counter.score()).toBe(0);
    expect(counter.health()).toBe(PLAYER_MAX_HEALTH);
    expect(counter.isGameOver()).toBe(false);
  });
});

describe("ScoreCounter with heroes", () => {
  it("starts with the hero's own maximum health", () => {
    expect(new ScoreCounter(6).health()).toBe(6);
  });

  it("strong hits take more health and enemies give their own points", () => {
    const counter = new ScoreCounter(6);
    counter.receive({ type: "hit", amount: 2 });
    counter.receive({ type: "defeated", points: 15 });
    counter.process();
    expect(counter.health()).toBe(4);
    expect(counter.score()).toBe(15);
  });

  it("potions heal but never above the maximum", () => {
    const counter = new ScoreCounter(5);
    counter.receive({ type: "hit", amount: 3 });
    counter.receive({ type: "heal", amount: 2 });
    counter.process();
    expect(counter.health()).toBe(4);
    counter.receive({ type: "heal", amount: 2 });
    counter.process();
    expect(counter.health()).toBe(5);
  });

  it("a potion does not bring a dead player back", () => {
    const counter = new ScoreCounter(2);
    counter.receive({ type: "hit", amount: 2 });
    counter.receive({ type: "heal", amount: 2 });
    counter.process();
    expect(counter.isGameOver()).toBe(true);
  });
});
