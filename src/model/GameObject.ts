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
