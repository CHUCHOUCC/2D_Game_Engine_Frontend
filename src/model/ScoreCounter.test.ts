import { describe, expect, it } from "vitest";
import { ScoreCounter } from "./ScoreCounter";

describe("ScoreCounter", () => {
  it("adds one point per coin event after processing", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.receive({ type: "coin" });
    expect(counter.score()).toBe(0);
    counter.process();
    expect(counter.score()).toBe(2);
  });

  it("an enemy event ends the game and gives no points", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "enemy" });
    counter.process();
    expect(counter.isGameOver()).toBe(true);
    expect(counter.score()).toBe(0);
  });

  it("processing twice does not count an event twice", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.process();
    counter.process();
    expect(counter.score()).toBe(1);
  });

  it("reset clears the score, the game over flag and the waiting events", () => {
    const counter = new ScoreCounter();
    counter.receive({ type: "coin" });
    counter.process();
    counter.receive({ type: "enemy" });
    counter.reset();
    counter.process();
    expect(counter.score()).toBe(0);
    expect(counter.isGameOver()).toBe(false);
  });
});
