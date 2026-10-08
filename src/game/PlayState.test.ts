import { describe, expect, it } from "vitest";
import type { GameObject } from "../model/GameObject";
import { ATTACK_COOLDOWN, HIT_PAUSE, PLAYER_SPEED, PlayState, type PlayObject } from "./PlayState";

function objectsIn(state: PlayState): PlayObject[] {
  const result: PlayObject[] = [];
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

  it("touching an enemy takes one health, then protects the player for a while", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 400, y: 300 }]);
    state.update();
    expect(state.health()).toBe(2);
    expect(state.isProtected()).toBe(true);
    state.update();
    expect(state.health()).toBe(2);
  });

  it("the game ends when health reaches zero and the player stops moving", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 400, y: 300 }]);
    for (let i = 0; i < HIT_PAUSE * 4; i++) state.update();
    expect(state.isGameOver()).toBe(true);
    const x = state.playerX;
    state.movePlayer(10, 0);
    expect(state.playerX).toBe(x);
  });

  it("an enemy in range walks towards the player", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 600, y: 300 }]);
    state.update();
    expect(objectsIn(state)[0].x).toBeLessThan(600);
  });

  it("an enemy out of range stays where it is", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 790, y: 590 }]);
    state.update();
    expect(objectsIn(state)[0].x).toBe(790);
  });

  it("the edited scene is not changed when enemies move", () => {
    const scene: GameObject[] = [{ id: "e1", kind: "enemy", x: 600, y: 300 }];
    new PlayState(scene).update();
    expect(scene[0].x).toBe(600);
  });

  it("an enemy needs three hits and gives points when defeated", () => {
    const state = new PlayState([{ id: "e1", kind: "enemy", x: 440, y: 300 }]);
    for (let i = 0; i < 2; i++) {
      state.attack();
      for (let f = 0; f < ATTACK_COOLDOWN; f++) state.update();
      expect(state.has("e1")).toBe(true);
    }
    state.attack();
    expect(state.has("e1")).toBe(false);
    expect(state.score()).toBe(5);
  });

  it("attacking does not reach far enemies and has a cooldown", () => {
    const state = new PlayState([
      { id: "far", kind: "enemy", x: 780, y: 580 },
      { id: "near", kind: "enemy", x: 440, y: 300 },
    ]);
    state.attack();
    state.attack();
    const hps = objectsIn(state).map((o) => [o.id, o.hp]);
    expect(hps).toEqual([["far", 3], ["near", 2]]);
  });

  it("boxes block the player but it can slide along them", () => {
    const state = new PlayState([{ id: "b1", kind: "box", x: 450, y: 300 }]);
    state.movePlayer(-10, 0);
    state.playerX = 400;
    state.movePlayer(20, 0);
    expect(state.playerX).toBeLessThan(420);
    const y = state.playerY;
    state.movePlayer(20, 3);
    expect(state.playerY).toBe(y + 3);
  });

  it("a player that starts inside a box can walk out", () => {
    const state = new PlayState([{ id: "b1", kind: "box", x: 400, y: 300 }]);
    state.movePlayer(PLAYER_SPEED, 0);
    expect(state.playerX).toBe(404);
  });

  it("far away objects do nothing", () => {
    const state = new PlayState([{ id: "c1", kind: "coin", x: 50, y: 50 }]);
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
