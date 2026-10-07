import { describe, expect, it } from "vitest";
import type { GameObject } from "./GameObject";
import { SceneModel } from "./SceneModel";

const box: GameObject = { id: "b1", kind: "box", x: 10, y: 20 };
const coin: GameObject = { id: "c1", kind: "coin", x: 30, y: 40 };

describe("SceneModel", () => {
  it("adds, finds and removes objects", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.add(coin);
    expect(scene.size()).toBe(2);
    expect(scene.find("c1")?.kind).toBe("coin");
    expect(scene.remove("b1")).toBe(true);
    expect(scene.remove("b1")).toBe(false);
    expect(scene.size()).toBe(1);
  });

  it("undoes and redoes an add", () => {
    const scene = new SceneModel();
    scene.add(box);
    expect(scene.undo()).toBe(true);
    expect(scene.size()).toBe(0);
    expect(scene.redo()).toBe(true);
    expect(scene.size()).toBe(1);
  });

  it("undoes and redoes a move", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.move("b1", 100, 200);
    expect(scene.find("b1")).toMatchObject({ x: 100, y: 200 });
    scene.undo();
    expect(scene.find("b1")).toMatchObject({ x: 10, y: 20 });
    scene.redo();
    expect(scene.find("b1")).toMatchObject({ x: 100, y: 200 });
  });

  it("undoes a remove by bringing the object back", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.remove("b1");
    scene.undo();
    expect(scene.find("b1")).toBeDefined();
  });

  it("a new action clears the redo history", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.undo();
    expect(scene.canRedo()).toBe(true);
    scene.add(coin);
    expect(scene.canRedo()).toBe(false);
  });

  it("undo and redo return false when there is nothing to do", () => {
    const scene = new SceneModel();
    expect(scene.undo()).toBe(false);
    expect(scene.redo()).toBe(false);
  });

  it("replaceAll loads objects and clears the history", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.replaceAll([coin]);
    expect(scene.size()).toBe(1);
    expect(scene.find("b1")).toBeUndefined();
    expect(scene.canUndo()).toBe(false);
  });

  it("toJson returns copies in insertion order", () => {
    const scene = new SceneModel();
    scene.add(box);
    scene.add(coin);
    const json = scene.toJson();
    expect(json.map((o) => o.id)).toEqual(["b1", "c1"]);
    json[0].x = 999;
    expect(scene.find("b1")?.x).toBe(10);
  });

  it("increases version on every change", () => {
    const scene = new SceneModel();
    const before = scene.version;
    scene.add(box);
    expect(scene.version).toBeGreaterThan(before);
  });
});
