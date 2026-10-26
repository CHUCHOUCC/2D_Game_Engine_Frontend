import { iconUrl } from "../game/assets";
import { CATEGORIES, KIND_INFO, type Kind } from "../model/GameObject";
import { byId, make } from "./dom";

/** MIME type used when a library card is dragged onto the map. */
export const DRAG_TYPE = "application/x-motor2d-kind";

export function iconElement(kind: Kind): HTMLElement {
  const icon = make("span", "palette-icon");
  icon.style.backgroundImage = `url("${iconUrl(kind)}")`;
  return icon;
}

/** Lower case and without accents, so "arbol" finds "Árbol". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** True when a kind matches the search box (name, hint or code). */
export function matchesSearch(kind: Kind, query: string): boolean {
  const q = normalise(query);
  if (q === "") return true;
  const info = KIND_INFO[kind];
  return [info.name, info.hint, kind].some((text) => normalise(text).includes(q));
}

/**
 * The asset library of the engine: every kind grouped by category, with a
 * search box. A card can be dragged onto the map, or clicked to paint with it.
 */
export class Library {
  private active: Kind | null = null;
  private readonly cards = new Map<Kind, HTMLButtonElement>();
  private readonly groups: HTMLElement[] = [];
  private readonly onPick: (kind: Kind | null) => void;

  constructor(onPick: (kind: Kind | null) => void) {
    this.onPick = onPick;
    const root = byId("library");
    for (const category of CATEGORIES) {
      const group = make("section", "library-group");
      group.dataset.category = category.id;
      const grid = make("div", "library-grid");
      for (const kind of category.kinds) grid.append(this.card(kind));
      group.append(make("h4", "library-title", category.name), grid);
      this.groups.push(group);
      root.append(group);
    }
    byId<HTMLInputElement>("library-search").addEventListener("input", (event) => {
      this.filter((event.target as HTMLInputElement).value);
    });
  }

  private card(kind: Kind): HTMLButtonElement {
    const card = make("button", "palette-item");
    card.type = "button";
    card.draggable = true;
    card.title = `${KIND_INFO[kind].name}: ${KIND_INFO[kind].hint}`;
    card.dataset.kind = kind;
    card.append(iconElement(kind), make("span", "", KIND_INFO[kind].name));
    card.addEventListener("click", () => this.pick(this.active === kind ? null : kind));
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData(DRAG_TYPE, kind);
      event.dataTransfer?.setData("text/plain", kind);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
    this.cards.set(kind, card);
    return card;
  }

  /** Show only the cards that match the search, hiding empty categories. */
  filter(query: string): void {
    for (const [kind, card] of this.cards) card.hidden = !matchesSearch(kind, query);
    for (const group of this.groups) {
      group.hidden = [...group.querySelectorAll<HTMLElement>(".palette-item")].every((card) => card.hidden);
    }
  }

  /** Highlight the kind the brush paints with (null: none). */
  pick(kind: Kind | null): void {
    this.active = kind;
    for (const [k, card] of this.cards) card.classList.toggle("is-active", k === kind);
    this.onPick(kind);
  }

  /** Show the active kind without telling the app again (when the tool changes). */
  highlight(kind: Kind | null): void {
    this.active = kind;
    for (const [k, card] of this.cards) card.classList.toggle("is-active", k === kind);
  }

  get current(): Kind | null {
    return this.active;
  }

  /** A scene has only one player: its card is disabled once one is placed. */
  setPlayerAvailable(available: boolean): void {
    const card = this.cards.get("player")!;
    card.disabled = !available;
    card.draggable = available;
    if (!available && this.active === "player") this.pick(null);
  }
}
