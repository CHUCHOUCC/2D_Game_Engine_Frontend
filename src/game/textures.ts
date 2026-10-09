import Phaser from "phaser";
import type { Kind } from "../model/GameObject";

const BASE = `${import.meta.env.BASE_URL}textures/`;

/** Load every texture of the pack. Call it from a scene's preload(). */
export function loadTextures(scene: Phaser.Scene): void {
  scene.load.spritesheet("player", `${BASE}player.png`, { frameWidth: 32, frameHeight: 32 });
  scene.load.spritesheet("coin", `${BASE}coin.png`, { frameWidth: 32, frameHeight: 32 });
  scene.load.spritesheet("enemy", `${BASE}enemy-slime.png`, { frameWidth: 32, frameHeight: 32 });
  for (const name of ["box", "wall", "tree", "spike", "house", "grass", "path"]) {
    scene.load.image(name, `${BASE}${name}.png`);
  }
}

/** Animations shared by the editor and the game (created only once per game). */
export function createAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;
  if (!anims.exists("player-walk")) {
    anims.create({ key: "player-walk", frames: anims.generateFrameNumbers("player", { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
  }
  if (!anims.exists("coin-spin")) {
    anims.create({ key: "coin-spin", frames: anims.generateFrameNumbers("coin", { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
  }
  if (!anims.exists("enemy-bounce")) {
    anims.create({ key: "enemy-bounce", frames: anims.generateFrameNumbers("enemy", { start: 0, end: 1 }), frameRate: 3, repeat: -1 });
  }
}

/** Texture key of each kind, and the animation it plays (if any). */
export const KIND_TEXTURE: Record<Kind, { key: string; anim?: string }> = {
  player: { key: "player" },
  box: { key: "box" },
  wall: { key: "wall" },
  house: { key: "house" },
  tree: { key: "tree" },
  spike: { key: "spike" },
  coin: { key: "coin", anim: "coin-spin" },
  enemy: { key: "enemy", anim: "enemy-bounce" },
};

/** Image for the HTML palette (first frame of sprite sheets is shown with CSS). */
export function iconUrl(kind: Kind): string {
  const file = kind === "enemy" ? "enemy-slime" : KIND_TEXTURE[kind].key;
  return `${BASE}${file}.png`;
}
