import { describe, expect, it } from "vitest";
import type { GameObject } from "../model/GameObject";
import { PlayState } from "./PlayState";

function objectsIn(state: PlayState): GameObject[] {
  const result: GameObject[] = [];
  for (const object of state) {
    result.push(object);
  }
  return result;
}

describe("PlayState", () => {
  it("collecting a coin adds a point and removes it from the play only", () => {
    const scene: GameObject[] = [{ id: "c1", kind: "coin", x: 400, y: 300 }];
    const state = new PlayState(scene);
    state.update();
    expect(state.score()).toBe(1);
    expect(objectsIn(state)).toHaveLength(0);
    expect(scene).toHaveLength(1);
  });

  it("collects every coin the player touches in the same frame", () => {
    const state = new PlayState([
      { id: "c1", kind: "coin", x: 400, y: 300 },
      { id: "c2", kind: "coin", x: 405, y: 300 },
    ]);
    state.update();
    expect(state.score()).toBe(2);
  });

  it("touching an enemy ends the game and the player stops moving", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 400, y: 300 }]);
    state.update();
    expect(state.isGameOver()).toBe(true);
    const x = state.playerX;
    state.movePlayer(10, 0);
    expect(state.playerX).toBe(x);
  });

  it("boxes and far away objects do nothing", () => {
    const state = new PlayState([
      { id: "b1", kind: "box", x: 400, y: 300 },
      { id: "c1", kind: "coin", x: 50, y: 50 },
    ]);
    state.update();
    expect(state.score()).toBe(0);
    expect(state.isGameOver()).toBe(false);
  });

  it("the player stays inside the world", () => {
    const state = new PlayState([]);
    state.movePlayer(-5000, -5000);
    expect(state.playerX).toBe(0);
    expect(state.playerY).toBe(0);
    state.movePlayer(5000, 5000);
    expect(state.playerX).toBe(800);
    expect(state.playerY).toBe(600);
  });
});
