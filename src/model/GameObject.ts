export type Kind = "box" | "coin" | "enemy";

/** One object of the scene. Same shape the backend stores as JSON. */
export interface GameObject {
  id: string;
  kind: Kind;
  x: number;
  y: number;
}

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
