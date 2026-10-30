import { CircularLinkedList } from "../structures/CircularLinkedList";

/** The heroes in a circle, with the chosen one selected: after the last comes the first. */
export function createHeroRing(ids: Iterable<string>, chosenId: string): CircularLinkedList<string> {
  const ring = new CircularLinkedList<string>();
  for (const id of ids) ring.add(id);
  ring.select((id) => id === chosenId);
  return ring;
}

/** Arrow keys walk the circle. Returns the hero now selected, or undefined for any other key. */
export function stepHero(ring: CircularLinkedList<string>, key: string): string | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") return ring.next();
  if (key === "ArrowLeft" || key === "ArrowUp") return ring.previous();
  return undefined;
}
