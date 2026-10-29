import { isCharacter, isEnemy, isGround, SIZES, WORLD_HEIGHT, WORLD_WIDTH, type GameObject, type Kind } from "../model/GameObject";

/** Colour of each kind in the small map previews of the "Nuevo proyecto" dialog. */
export function previewColor(kind: Kind): string {
  if (kind === "player") return "#3b82f6";
  if (kind === "water") return "#3b8bd8";
  if (kind === "sand") return "#e6cf92";
  if (kind === "bridge") return "#a8713f";
  if (isGround(kind)) return "#c9a36b";
  if (isEnemy(kind) || kind === "spike") return "#ef4444";
  if (isCharacter(kind)) return "#c084fc";
  switch (kind) {
    case "wall":
    case "house":
      return "#6b7280";
    case "tree":
    case "bush":
      return "#2f8f46";
    case "fence":
    case "box":
    case "barrel":
      return "#a16207";
    case "coin":
    case "chest":
      return "#facc15";
    default:
      return "#e5e7eb"; // potions and weapons
  }
}

/** Draw a whole scene, scaled down, on a canvas: grass, then every object as a box of its size. */
export function drawPreview(canvas: HTMLCanvasElement, scene: readonly GameObject[]): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const scale = Math.min(canvas.width / WORLD_WIDTH, canvas.height / WORLD_HEIGHT);
  context.fillStyle = "#8fbf6a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  // Roads first, so everything standing on them is drawn on top.
  const flat = (kind: Kind) => isGround(kind) || kind === "water";
  const ordered = [...scene.filter((o) => flat(o.kind)), ...scene.filter((o) => !flat(o.kind))];
  for (const object of ordered) {
    const [width, height] = SIZES[object.kind] ?? [32, 32];
    context.fillStyle = previewColor(object.kind);
    context.fillRect(
      (object.x - width / 2) * scale,
      (object.y - height / 2) * scale,
      Math.max(1, width * scale),
      Math.max(1, height * scale),
    );
  }
}
