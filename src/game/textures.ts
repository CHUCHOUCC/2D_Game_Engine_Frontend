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
