import Phaser from "phaser";
import { KINDS } from "../model/GameObject";
import { EXTRA_TEXTURES, KIND_TEXTURE, TEXTURE_BASE as BASE } from "./assets";

export { iconUrl, KIND_TEXTURE } from "./assets";

/**
 * Load every texture of the pack (Kenney Tiny Dungeon + Tiny Town, CC0).
 * Each one is a single image; movement is animated with tweens, not frames.
 */
export function loadTextures(scene: Phaser.Scene): void {
  const keys = new Set<string>([...KINDS.map((kind) => KIND_TEXTURE[kind].key), ...EXTRA_TEXTURES]);
  for (const key of keys) {
    if (!scene.textures.exists(key)) scene.load.image(key, `${BASE}${key}.png`);
  }
}

/** A soft up-and-down bob, the "idle" animation of every living thing. */
export function bob(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, height = 2, duration = 420): Phaser.Tweens.Tween {
  return scene.tweens.add({ targets: target, scaleY: { from: 1, to: 1 - height / 40 }, duration, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: Math.random() * duration });
}
