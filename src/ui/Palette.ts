import { iconUrl } from "../game/textures";
import { KIND_INFO, KINDS, type Kind } from "../model/GameObject";
import { byId, make } from "./dom";

/** CSS class that shows only the first frame of a sprite sheet. */
export function iconClass(kind: Kind): string {
  if (kind === "player" || kind === "coin") return "palette-icon is-sheet-4";
  if (kind === "enemy") return "palette-icon is-sheet-2";
  return "palette-icon";
}

export function iconElement(kind: Kind): HTMLElement {
  const icon = make("span", iconClass(kind));
  icon.style.backgroundImage = `url("${iconUrl(kind)}")`;
  return icon;
}

/**
 * One button per kind. Clicking one starts placing that kind on the map;
 * clicking it again (or pressing Esc) stops.
 */
export class Palette {
  private active: Kind | null = null;
  private readonly buttons = new Map<Kind, HTMLButtonElement>();
  private readonly onPick: (kind: Kind | null) => void;

  constructor(onPick: (kind: Kind | null) => void) {
    this.onPick = onPick;
    const root = byId("palette");
    for (const kind of KINDS) {
      const button = make("button", "palette-item");
      button.type = "button";
      button.title = `${KIND_INFO[kind].name}: ${KIND_INFO[kind].hint}`;
      button.append(iconElement(kind), make("span", "", KIND_INFO[kind].name));
      button.addEventListener("click", () => this.pick(this.active === kind ? null : kind));
      this.buttons.set(kind, button);
      root.append(button);
    }
  }

  pick(kind: Kind | null): void {
    this.active = kind;
    for (const [k, button] of this.buttons) button.classList.toggle("is-active", k === kind);
    this.onPick(kind);
  }

  get current(): Kind | null {
    return this.active;
  }

  /** A scene has only one player: its button is disabled once one is placed. */
  setPlayerAvailable(available: boolean): void {
    const button = this.buttons.get("player")!;
    button.disabled = !available;
    if (!available && this.active === "player") this.pick(null);
  }
}
