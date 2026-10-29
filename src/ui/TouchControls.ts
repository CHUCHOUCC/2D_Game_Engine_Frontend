import { TEXTURE_BASE } from "../game/assets";
import type { HudState } from "../game/PlayScene";
import { isTouchDevice, knobOffset, resetTouch, stickVector, touch } from "../game/touchInput";

/**
 * On-screen controls for phones and tablets: a floating joystick on the left
 * half of the screen, and on the right a big attack button (hold it to draw the
 * bow) and a jump button, each with its cooldown ring. Exit and full screen sit
 * in the top corner. They only appear while playing on a touch screen (or with
 * ?touch=1 in the address, to try them with a mouse).
 */

const STICK_RADIUS = 52;
const SVG = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"';
const ICONS = {
  jump: `<svg ${SVG}><path d="M6 12.5 12 6.5l6 6" /><path d="M6 18.5l6-6 6 6" /></svg>`,
  exit: `<svg ${SVG}><path d="M6 6l12 12M18 6 6 18" /></svg>`,
  fullscreen: `<svg ${SVG}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>`,
};

let root: HTMLElement | null = null;
let active = false;
let lastWeapon = "";

function forced(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("touch") === "1";
  } catch {
    return false;
  }
}

export function wantsTouchControls(): boolean {
  return forced() || isTouchDevice();
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, html = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

/** Build the controls once, inside the game stage. */
export function initTouchControls(stage: HTMLElement, onExit: () => void): void {
  if (root !== null) return;
  root = el("div", "touch");
  root.id = "touch-controls";
  root.hidden = true;

  const top = el("div", "touch-top");
  const fullscreen = el("button", "touch-round", ICONS.fullscreen);
  fullscreen.type = "button";
  fullscreen.setAttribute("aria-label", "Pantalla completa");
  const canFullscreen = typeof document.documentElement.requestFullscreen === "function";
  fullscreen.hidden = !canFullscreen;
  fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
  });
  const exit = el("button", "touch-round touch-exit", ICONS.exit);
  exit.type = "button";
  exit.setAttribute("aria-label", "Salir de la partida");
  exit.addEventListener("click", () => onExit());
  top.append(fullscreen, exit);

  const zone = el("div", "touch-zone");
  zone.setAttribute("aria-hidden", "true");
  const stick = el("div", "stick");
  const knob = el("div", "stick-knob");
  stick.append(el("div", "stick-ring"), knob);
  zone.append(stick);
  bindStick(zone, stick, knob);

  const actions = el("div", "touch-actions");
  const jump = el("button", "touch-btn touch-jump", `${ICONS.jump}<i class="touch-ring"></i><span class="touch-label">Saltar</span>`);
  jump.type = "button";
  jump.setAttribute("aria-label", "Saltar");
  jump.dataset.action = "jump";
  const attack = el("button", "touch-btn touch-attack", `<img alt="" /><i class="touch-ring"></i><i class="touch-charge"></i><span class="touch-label">Atacar</span>`);
  attack.type = "button";
  attack.setAttribute("aria-label", "Atacar (mantén para tensar el arco)");
  attack.dataset.action = "attack";
  bindButton(jump, () => {
    touch.jumpQueued = true;
  });
  bindButton(attack, () => {
    touch.attackHeld = true;
  }, () => {
    touch.attackHeld = false;
  });
  actions.append(jump, attack);

  const hint = el("p", "touch-hint", "Mueve el joystick con el pulgar izquierdo · <b>Atacar</b> (mantén para tensar el arco) · <b>Saltar</b> esquiva");
  root.append(top, zone, actions, hint);
  stage.append(root);

  // A finger on the game must never scroll or zoom the page.
  root.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("fullscreenchange", () => root?.classList.toggle("is-fullscreen", document.fullscreenElement !== null));
}

/** The joystick appears under the thumb, anywhere in the left part of the screen. */
function bindStick(zone: HTMLElement, stick: HTMLElement, knob: HTMLElement): void {
  let pointer: number | null = null;
  let originX = 0;
  let originY = 0;
  const move = (event: PointerEvent) => {
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const v = stickVector(dx, dy, STICK_RADIUS);
    touch.x = v.x;
    touch.y = v.y;
    const k = knobOffset(dx, dy, STICK_RADIUS);
    knob.style.transform = `translate(${k.x}px, ${k.y}px)`;
    stick.classList.toggle("is-pushed", v.length > 0);
  };
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    touch.x = 0;
    touch.y = 0;
    knob.style.transform = "";
    stick.classList.remove("is-active", "is-pushed");
    stick.style.left = "";
    stick.style.top = "";
  };
  zone.addEventListener("pointerdown", (event) => {
    if (pointer !== null) return;
    event.preventDefault();
    pointer = event.pointerId;
    zone.setPointerCapture(event.pointerId);
    const box = zone.getBoundingClientRect();
    originX = event.clientX;
    originY = event.clientY;
    stick.style.left = `${event.clientX - box.left}px`;
    stick.style.top = `${event.clientY - box.top}px`;
    stick.classList.add("is-active");
    move(event);
  });
  zone.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointer) move(event);
  });
  zone.addEventListener("pointerup", release);
  zone.addEventListener("pointercancel", release);
  zone.addEventListener("lostpointercapture", release);
}

/** A button that reacts on touch down (no 300 ms wait) and knows when it is let go. */
function bindButton(button: HTMLElement, down: () => void, up?: () => void): void {
  let pointer: number | null = null;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pointer = event.pointerId;
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-down");
    down();
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    button.classList.remove("is-down");
    up?.();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

/** Show the controls while playing on a touch screen. */
export function setTouchControlsActive(playing: boolean): void {
  active = playing && wantsTouchControls();
  touch.enabled = active;
  resetTouch();
  document.documentElement.classList.toggle("is-touch-play", active);
  if (root === null) return;
  root.hidden = !active;
  if (active) {
    root.classList.remove("hint-gone");
    window.setTimeout(() => root?.classList.add("hint-gone"), 5000);
  } else if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
}

/** Keep the buttons in step with the game: weapon icon, cooldowns, bow charge. */
export function updateTouchControls(state: HudState): void {
  if (!active || root === null) return;
  const attack = root.querySelector<HTMLElement>(".touch-attack");
  const jump = root.querySelector<HTMLElement>(".touch-jump");
  if (attack) {
    if (state.weapon !== lastWeapon) {
      lastWeapon = state.weapon;
      attack.querySelector("img")!.src = `${TEXTURE_BASE}${state.weapon}.png`;
    }
    attack.style.setProperty("--ready", `${Math.round(state.attackReady * 100)}%`);
    attack.style.setProperty("--charge", `${Math.round(state.charge * 100)}%`);
    attack.classList.toggle("is-ready", state.attackReady >= 1);
  }
  if (jump) {
    jump.style.setProperty("--ready", `${Math.round(state.dashReady * 100)}%`);
    jump.classList.toggle("is-ready", state.dashReady >= 1);
  }
}
