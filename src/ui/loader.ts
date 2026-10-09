import { byId } from "./dom";

let hideTimer: number | undefined;

/** Cover the screen with the animated logo and a message. */
export function showLoader(text = "Cargando…"): void {
  window.clearTimeout(hideTimer);
  const loader = byId("loader");
  byId("loader-text").textContent = text;
  loader.hidden = false;
  loader.classList.remove("is-hiding");
}

/** Fade the loader out. */
export function hideLoader(): void {
  const loader = byId("loader");
  loader.classList.add("is-hiding");
  hideTimer = window.setTimeout(() => {
    loader.hidden = true;
  }, 260);
}
