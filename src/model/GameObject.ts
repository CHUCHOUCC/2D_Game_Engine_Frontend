/** Every kind of object the engine knows. Same list as the backend and the AI service. */
export const KINDS = ["player", "box", "wall", "house", "tree", "spike", "coin", "enemy"] as const;
export type Kind = (typeof KINDS)[number];

/** One object of the scene. Same shape the backend stores as JSON; x and y are its centre. */
export interface GameObject {
  id: string;
  kind: Kind;
  x: number;
  y: number;
}

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 960;
export const TILE_SIZE = 32;

/** Width and height in pixels (the AI service uses the same numbers). */
export const SIZES: Record<Kind, [number, number]> = {
  player: [24, 24],
  box: [32, 32],
  wall: [32, 32],
  house: [96, 96],
  tree: [32, 32],
  spike: [32, 32],
  coin: [16, 16],
  enemy: [28, 28],
};
