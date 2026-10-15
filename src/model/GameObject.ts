/** Every kind of object the engine knows. Same list as the backend and the AI service. */
export const KINDS = ["player", "box", "wall", "house", "tree", "spike", "coin", "enemy", "villager", "knight", "wizard"] as const;
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
  villager: [24, 28],
  knight: [24, 28],
  wizard: [24, 28],
};

export const KIND_INFO: Record<Kind, { name: string; hint: string }> = {
  player: { name: "Jugador", hint: "Punto de inicio. Solo uno por escena." },
  box: { name: "Caja", hint: "Se puede empujar." },
  wall: { name: "Pared", hint: "Bloquea el paso." },
  house: { name: "Casa", hint: "Edificio sólido de 3 × 3 casillas." },
  tree: { name: "Árbol", hint: "Decoración sólida." },
  spike: { name: "Pinchos", hint: "Quita vida al tocarlos." },
  coin: { name: "Moneda", hint: "Recógelas todas para ganar." },
  enemy: { name: "Enemigo", hint: "Te persigue. Espacio para atacar." },
  villager: { name: "Aldeano", hint: "Personaje amistoso: pasea y te da consejos." },
  knight: { name: "Caballero", hint: "Personaje amistoso que protege la aldea." },
  wizard: { name: "Mago", hint: "Personaje amistoso que sabe cómo aprende la IA." },
};

/** Friendly 2D characters: they walk around and talk, they never hurt. */
export const CHARACTER_KINDS: readonly Kind[] = ["villager", "knight", "wizard"];

export function isCharacter(kind: Kind): boolean {
  return CHARACTER_KINDS.includes(kind);
}

/** How the library groups the kinds, in the order it shows them. */
export const CATEGORIES: readonly { id: string; name: string; kinds: readonly Kind[] }[] = [
  { id: "characters", name: "Personajes", kinds: ["player", "villager", "knight", "wizard", "enemy"] },
  { id: "building", name: "Construcción", kinds: ["wall", "house", "tree", "box"] },
  { id: "items", name: "Objetos", kinds: ["coin", "spike"] },
];

export function categoryOf(kind: Kind): string {
  return CATEGORIES.find((category) => category.kinds.includes(kind))!.id;
}

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}
