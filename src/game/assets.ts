/**
 * Where the texture pack lives and which texture each kind uses.
 * No Phaser here, so the HTML panels (and their tests) can use it too.
 */
import type { Kind } from "../model/GameObject";

export const TEXTURE_BASE = `${import.meta.env.BASE_URL}textures/`;

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
  villager: { key: "villager" },
  knight: { key: "knight" },
  wizard: { key: "wizard" },
};

/** Image for the HTML palette (first frame of sprite sheets is shown with CSS). */
export function iconUrl(kind: Kind): string {
  const file = kind === "enemy" ? "enemy-slime" : KIND_TEXTURE[kind].key;
  return `${TEXTURE_BASE}${file}.png`;
}
