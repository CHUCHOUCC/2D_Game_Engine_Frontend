/**
 * Where the texture pack lives and which texture each kind uses.
 * No Phaser here, so the HTML panels (and their tests) can use it too.
 */
import { KINDS, type Kind } from "../model/GameObject";

export const TEXTURE_BASE = `${import.meta.env.BASE_URL}textures/`;

/** Texture key of each kind (the file is public/textures/<key>.png). */
export const KIND_TEXTURE: Record<Kind, { key: string }> = Object.fromEntries(
  KINDS.map((kind) => [kind, { key: kind === "enemy" ? "enemy-slime" : kind }]),
) as Record<Kind, { key: string }>;

/** Textures that are not a kind: heroes, the open chest, arrows and the ground. */
export const EXTRA_TEXTURES = [
  "hero-knight", "hero-wizard", "hero-archer", "hero-barbarian", "chest-open", "arrow", "grass", "path",
] as const;

/** Image for the HTML library cards. */
export function iconUrl(kind: Kind): string {
  return `${TEXTURE_BASE}${KIND_TEXTURE[kind].key}.png`;
}
