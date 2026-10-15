import Phaser from "phaser";
import { CHARACTER_KINDS } from "../model/GameObject";
import { TEXTURE_BASE as BASE } from "./assets";

export { iconUrl, KIND_TEXTURE } from "./assets";

/** Load every texture of the pack. Call it from a scene's preload(). */
export function loadTextures(scene: Phaser.Scene): void {
  scene.load.spritesheet("player", `${BASE}player.png`, { frameWidth: 32, frameHeight: 32 });
  scene.load.spritesheet("coin", `${BASE}coin.png`, { frameWidth: 32, frameHeight: 32 });
  scene.load.spritesheet("enemy", `${BASE}enemy-slime.png`, { frameWidth: 32, frameHeight: 32 });
  for (const character of CHARACTER_KINDS) {
    scene.load.spritesheet(character, `${BASE}${character}.png`, { frameWidth: 32, frameHeight: 32 });
  }
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
  for (const character of CHARACTER_KINDS) {
    if (!anims.exists(`${character}-walk`)) {
      anims.create({ key: `${character}-walk`, frames: anims.generateFrameNumbers(character, { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
    }
  }
}
