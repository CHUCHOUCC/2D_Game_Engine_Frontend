import { TEXTURE_BASE } from "../game/assets";
import { jagged, LogoFx, prefersReducedMotion, strokeBolt } from "./fx";

interface Walker {
  el: HTMLImageElement;
  x: number;
  dir: number;
  speed: number;
  min: number;
  max: number;
}

/**
 * The login panel is alive: the emblem throws sparks and lightning (LogoFx)
 * while the heroes walk around it. The knight is chased by a slime, the
 * barbarian and the archer patrol a lane under the feature list, the wizard
 * casts a bolt with his wand, a bat circles the logo and a ghost floats.
 */
export class LivingLogo {
  private readonly host: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly emblem: HTMLElement;
  readonly fx: LogoFx;
  private readonly actors: Record<string, Walker> = {};
  private frameId = 0;
  private last = 0;
  private lastCast = 0;

  constructor(host: HTMLElement, stage: HTMLElement, canvas: HTMLCanvasElement, emblem: HTMLElement) {
    this.host = host;
    this.stage = stage;
    this.emblem = emblem;
    this.fx = new LogoFx(canvas, host, emblem);
    const walker = (texture: string, x: number, dir: number, speed: number, min = 0.06, max = 0.94, small = false): Walker => {
      const el = document.createElement("img");
      el.className = small ? "actor is-small" : "actor";
      el.src = `${TEXTURE_BASE}${texture}.png`;
      el.alt = "";
      stage.append(el);
      return { el, x, dir, speed, min, max };
    };
    this.actors.knight = walker("hero-knight", 0.12, 1, 0.045, 0.06, 0.42);
    this.actors.slime = walker("enemy-slime", 0.5, -1, 0.06, 0, 1, true);
    this.actors.barbarian = walker("hero-barbarian", 0.78, -1, 0.035, 0.55, 0.94);
    this.actors.archer = walker("hero-archer", 0.15, 1, 0.07, 0.06, 0.45);
    this.actors.wizard = walker("hero-wizard", 0.93, 0, 0);
    this.actors.wand = walker("wand", 0, 0, 0, 0, 1, true);
    this.actors.bat = walker("bat", 0, 0, 0, 0, 1, true);
    this.actors.ghost = walker("ghost", 0, 0, 0);
  }

  start(): void {
    this.fx.start();
    if (this.frameId !== 0 || prefersReducedMotion()) return;
    this.last = performance.now();
    this.frameId = requestAnimationFrame((now) => this.tick(now));
  }

  stop(): void {
    this.fx.stop();
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  private place(a: Walker, x: number, y: number, flip: boolean, rotate = 0, stretch = 1): void {
    a.el.style.transform = `translate(${x - a.el.width / 2}px, ${y - a.el.height}px) scaleX(${flip ? -1 : 1}) rotate(${rotate}deg) scaleY(${stretch})`;
  }

  private walk(a: Walker, width: number, ground: number, t: number, dt: number): void {
    a.x += (a.dir * a.speed * dt) / 1000;
    if (a.x > a.max) {
      a.x = a.max;
      a.dir = -1;
    }
    if (a.x < a.min) {
      a.x = a.min;
      a.dir = 1;
    }
    this.place(a, a.x * width, ground, a.dir < 0, Math.sin(t / 90) * 7, 1 + Math.sin(t / 45) * 0.04);
  }

  private tick(now: number): void {
    const dt = Math.min(50, now - this.last);
    this.last = now;
    const t = now;
    const A = this.actors;
    const width = this.stage.clientWidth;
    const ground = this.stage.clientHeight - 14;
    const stageBox = this.stage.getBoundingClientRect();
    this.walk(A.knight, width, ground, t, dt);
    // A second lane in the middle of the panel, under the feature list.
    const list = this.host.querySelector("ul")?.getBoundingClientRect();
    const lane = list ? Math.min(ground - 90, list.bottom - stageBox.top + 90) : ground - 90;
    this.walk(A.barbarian, width, lane, t + 300, dt);
    this.walk(A.archer, width, lane + 4, t + 150, dt);
    // The slime hops after the knight.
    const sx = A.slime.x * width;
    const kx = A.knight.x * width;
    A.slime.dir = kx > sx ? 1 : -1;
    A.slime.x += ((A.slime.dir * A.slime.speed * dt) / 1000) * (Math.abs(kx - sx) > 60 ? 1 : 0);
    const hop = Math.abs(Math.sin(t / 220)) * 12;
    this.place(A.slime, A.slime.x * width, ground - hop, A.slime.dir < 0, 0, 1 - hop / 80);
    // The wizard stands on the right and casts at the slime every few seconds.
    const wx = A.wizard.x * width;
    this.place(A.wizard, wx, ground - 18, true, Math.sin(t / 700) * 2);
    const casting = t - this.lastCast < 450;
    A.wand.el.style.transform = `translate(${wx - 26}px, ${ground - 46}px) rotate(${casting ? -70 : -35}deg)`;
    if (t - this.lastCast > 3200) {
      this.lastCast = t;
      const from: [number, number] = [wx - 22, ground - 46];
      const to: [number, number] = [A.slime.x * width, ground - 18];
      let life = 380;
      this.fx.add((ctx, d) => {
        life -= d;
        if (life <= 0) return false;
        strokeBolt(ctx, jagged(from[0], from[1], to[0], to[1], 30), Math.min(1, life / 150));
        return true;
      });
    }
    // The bat circles the emblem; the ghost floats in the corner.
    const logo = this.emblem.getBoundingClientRect();
    const cx = logo.left - stageBox.left + logo.width / 2;
    const cy = logo.top - stageBox.top + logo.height / 2;
    this.place(A.bat, cx + Math.cos(t / 1300) * logo.width * 0.78, cy + Math.sin(t / 650) * logo.height * 0.55 + 16, Math.sin(t / 1300) > 0, 0, 0.7 + Math.abs(Math.sin(t / 70)) * 0.35);
    A.ghost.el.style.opacity = String(0.45 + Math.sin(t / 900) * 0.25);
    this.place(A.ghost, width * 0.88 + Math.sin(t / 1700) * 18, 70 + Math.sin(t / 800) * 10, Math.cos(t / 1700) < 0);
    this.frameId = requestAnimationFrame((next) => this.tick(next));
  }
}
