import { byId } from "./dom";
import { LogoFx, prefersReducedMotion } from "./fx";

export const INTRO_MS = 5200;
const STEPS = ["Forjando el mundo…", "Cargando texturas…", "Despertando a la IA…", "Listo"];

/**
 * The intro that plays once after logging in or registering, before the menu:
 * the emblem lights up between lightning, the wordmark is revealed with a
 * glint and a loading bar fills while the workspace loads. Any key, a click on
 * "Saltar" or the end of the animation closes it.
 */
export class Intro {
  private readonly screen = byId("intro");
  private readonly fx = new LogoFx(byId<HTMLCanvasElement>("intro-fx"), byId("intro"), byId("intro-emblem"));
  private timers: number[] = [];
  private finish: (() => void) | null = null;

  constructor() {
    byId("intro-skip").addEventListener("click", () => this.close());
    window.addEventListener("keydown", () => this.close());
  }

  /** Resolves when the intro is over (or skipped). `work` runs meanwhile; the intro waits for it. */
  play(work: Promise<unknown> = Promise.resolve()): Promise<void> {
    const duration = prefersReducedMotion() ? 900 : INTRO_MS;
    this.screen.hidden = false;
    this.screen.classList.remove("is-playing", "is-leaving");
    void this.screen.offsetWidth; // restart the CSS animations
    this.screen.classList.add("is-playing");
    this.fx.start();
    const text = byId("intro-text");
    STEPS.forEach((step, i) => this.timers.push(window.setTimeout(() => (text.textContent = step), (i * duration) / STEPS.length)));
    const shown = new Promise<void>((resolve) => {
      this.finish = resolve;
      this.timers.push(window.setTimeout(resolve, duration));
    });
    // Skipping cannot open a workspace that is not ready yet.
    return Promise.all([shown, work.catch(() => undefined)]).then(() => this.leave());
  }

  private close(): void {
    this.finish?.();
  }

  private async leave(): Promise<void> {
    this.finish = null;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.screen.classList.add("is-leaving");
    await new Promise((resolve) => window.setTimeout(resolve, 380));
    this.fx.stop();
    this.screen.hidden = true;
    this.screen.classList.remove("is-playing", "is-leaving");
  }
}
