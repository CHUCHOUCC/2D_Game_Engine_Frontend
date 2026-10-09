import { expect, test } from "vitest";
import { countByKind, hasPlayer, nextObjectId, SceneModel } from "./SceneModel";

test("hasPlayer is true only when a player was placed", () => {
  const model = new SceneModel();
  expect(hasPlayer(model)).toBe(false);
  model.add({ id: "p", kind: "player", x: 64, y: 64 });
  expect(hasPlayer(model)).toBe(true);
  model.undo();
  expect(hasPlayer(model)).toBe(false);
});

test("nextObjectId gives readable ids that are not taken", () => {
  const model = new SceneModel();
  expect(nextObjectId(model, "wall")).toBe("wall-1");
  model.add({ id: "wall-1", kind: "wall", x: 16, y: 16 });
  model.add({ id: "wall-3", kind: "wall", x: 48, y: 16 });
  expect(nextObjectId(model, "wall")).toBe("wall-2");
  expect(nextObjectId(model, "coin")).toBe("coin-1");
});
