import { TEXTURE_BASE } from "../game/assets";
import { heroById, HEROES, WEAPONS, type Hero } from "../game/combat";
import { byId, make } from "./dom";

const STORAGE_KEY = "pixelforge-hero";

function remembered(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // only a convenience
  }
}

function bar(label: string, value: number): HTMLElement {
  const row = make("div", "stat-row");
  const track = make("i");
  const fill = make("b");
  fill.style.width = `${value * 10}%`;
  track.append(fill);
  row.append(make("span", "", label), track, make("span", "stat-value", String(value)));
  return row;
}

function card(hero: Hero): HTMLButtonElement {
  const weapon = WEAPONS[hero.weapon];
  const button = make("button", "hero");
  button.type = "button";
  button.dataset.hero = hero.id;
  button.setAttribute("role", "radio");
  const portrait = make("div", "portrait");
  const body = make("img");
  body.src = `${TEXTURE_BASE}${hero.texture}.png`;
  body.alt = "";
  const tool = make("img", "portrait-weapon");
  tool.src = `${TEXTURE_BASE}${weapon.id}.png`;
  tool.alt = "";
  portrait.append(body, tool);
  const skill = make("div", "skill");
  const icon = make("img");
  icon.src = tool.src;
  icon.alt = "";
  skill.append(icon, make("span", "", `${weapon.name} · ${weapon.summary.split(" · ")[0].toLowerCase()}`), make("kbd", "", "Espacio"));
  button.append(portrait, make("h4", "", hero.name), make("p", "", hero.description), bar("Vida", hero.bars.health), bar("Velocidad", hero.bars.speed), bar("Poder", hero.bars.power), skill);
  return button;
}

/** Asks which hero to play with. Resolves with its id, or null when cancelled. */
export function chooseHero(): Promise<string | null> {
  const dialog = byId<HTMLDialogElement>("hero-dialog");
  const list = byId("hero-list");
  let chosen: string = heroById(remembered()).id;
  if (list.childElementCount === 0) for (const hero of HEROES) list.append(card(hero));
  const paint = () => {
    for (const button of list.querySelectorAll<HTMLButtonElement>(".hero")) {
      const on = button.dataset.hero === chosen;
      button.setAttribute("aria-checked", String(on));
      button.tabIndex = on ? 0 : -1;
    }
  };
  list.onclick = (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".hero");
    if (button === null) return;
    chosen = button.dataset.hero!;
    paint();
  };
  list.ondblclick = () => dialog.close("play");
  paint();
  dialog.returnValue = "";
  dialog.showModal();
  list.querySelector<HTMLButtonElement>(`[data-hero="${chosen}"]`)?.focus();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      if (dialog.returnValue !== "play") return resolve(null);
      remember(chosen);
      resolve(chosen);
    }, { once: true });
  });
}
