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
