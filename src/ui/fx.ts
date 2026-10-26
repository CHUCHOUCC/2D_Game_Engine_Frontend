/**
 * The electric effects of the PixelForge logo, drawn on a canvas over a panel:
 * embers rising, four-point sparkles around the emblem, short arcs that leave
 * the emblem and, every few seconds, a lightning strike with a flash.
 */

export type Point = [number, number];

/** A zigzag line from one point to another; `rough` is how far it strays. */
export function jagged(x1: number, y1: number, x2: number, y2: number, rough: number, random: () => number = Math.random): Point[] {
  const points: Point[] = [[x1, y1]];
  const steps = 8;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / length;
  const ny = (x2 - x1) / length;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (random() - 0.5) * rough;
    points.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
  }
  points.push([x2, y2]);
  return points;
}

/** Three strokes, wide and blue to thin and white, so the bolt glows. */
export function strokeBolt(ctx: CanvasRenderingContext2D, points: Point[], alpha: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "#38c4ff";
  ctx.shadowBlur = 24;
  const layers: [number, string][] = [[14, `rgba(31,123,255,${0.35 * alpha})`], [6, `rgba(56,196,255,${0.6 * alpha})`], [2.2, `rgba(240,252,255,${alpha})`]];
  for (const [width, color] of layers) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();
}

interface Arc {
  points: Point[];
  branches: Point[][];
  life: number;
  strike: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

/** Something extra drawn every frame (the wizard's bolt); returns false when done. */
export type Effect = (ctx: CanvasRenderingContext2D, dt: number) => boolean;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export class LogoFx {
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly emblem: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private arcs: Arc[] = [];
  private sparks: { x: number; y: number; t: number; size: number }[] = [];
  private embers: Particle[] = [];
  private effects: Effect[] = [];
  private nextArc = 600;
  private nextStrike = 1800;
  private width = 0;
  private height = 0;
  private last = 0;
  private frameId = 0;
  private readonly observer: ResizeObserver | null;

  constructor(canvas: HTMLCanvasElement, host: HTMLElement, emblem: HTMLElement) {
    this.canvas = canvas;
    this.host = host;
    this.emblem = emblem;
    this.ctx = canvas.getContext("2d");
    this.observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.resize());
  }

  start(): void {
    if (this.frameId !== 0 || this.ctx === null || prefersReducedMotion()) return;
    this.resize();
    this.observer?.observe(this.host);
    this.last = performance.now();
    this.frameId = requestAnimationFrame((now) => this.frame(now));
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.observer?.disconnect();
    this.arcs = [];
    this.effects = [];
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }

  /** Draw something extra on top of the effects until it returns false. */
  add(effect: Effect): void {
    if (this.frameId !== 0) this.effects.push(effect);
  }

  /** A lightning strike right now (used when the user logs in). */
  strikeNow(): void {
    this.strike();
  }

  private resize(): void {
    const rect = this.host.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  /** Where the emblem is, relative to the panel. */
  emblemBox(): { x: number; y: number; w: number; h: number } {
    const a = this.emblem.getBoundingClientRect();
    const b = this.host.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }

  private zap(ms: number): void {
    this.emblem.classList.add("is-zapped");
    window.setTimeout(() => this.emblem.classList.remove("is-zapped"), ms);
  }

  private arc(): void {
    const box = this.emblemBox();
    if (box.w === 0) return;
    const cx = box.x + box.w * 0.5;
    const cy = box.y + box.h * 0.5;
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r1 = box.w * 0.42;
      const r2 = r1 + 80 + Math.random() * 120;
      const points = jagged(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1 * 0.75, cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2 * 0.8, 38);
      const [bx, by] = points[4];
      const branch = jagged(bx, by, bx + (Math.random() - 0.5) * 60, by + (Math.random() - 0.5) * 60, 14);
      this.arcs.push({ points, branches: [branch], life: 300, strike: false });
    }
    this.zap(90);
  }

  /** A full bolt from the top of the panel onto the emblem, with a flash of the panel. */
  private strike(): void {
    const box = this.emblemBox();
    if (box.w === 0) return;
    const tx = box.x + box.w * 0.5;
    const ty = box.y + box.h * 0.2;
    const sx = tx + (Math.random() - 0.5) * 220;
    const main = jagged(sx, 0, tx, ty, 70);
    const branches = [3, 5].map((k) => {
      const [x, y] = main[k];
      return jagged(x, y, x + (Math.random() - 0.5) * 140, y + 40 + Math.random() * 60, 30);
    });
    this.arcs.push({ points: main, branches, life: 360, strike: true });
    this.host.classList.remove("is-flashed");
    void this.host.offsetWidth; // restart the CSS animation
    this.host.classList.add("is-flashed");
    this.zap(160);
  }

  private frame(now: number): void {
    const ctx = this.ctx!;
    const dt = Math.min(50, now - this.last);
    this.last = now;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (Math.random() < 0.35) {
      this.embers.push({ x: Math.random() * this.width, y: this.height + 4, vy: 18 + Math.random() * 30, vx: (Math.random() - 0.5) * 10, size: 0.8 + Math.random() * 1.8, life: 1 });
    }
    this.embers = this.embers.filter((p) => {
      p.y -= (p.vy * dt) / 1000;
      p.x += (p.vx * dt) / 1000;
      p.life -= dt / 4200;
      if (p.life <= 0) return false;
      ctx.fillStyle = `rgba(56,180,255,${p.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    const box = this.emblemBox();
    if (box.w > 0 && Math.random() < 0.06) {
      this.sparks.push({ x: box.x + Math.random() * box.w * 1.1 - box.w * 0.05, y: box.y + Math.random() * box.h, t: 0, size: 4 + Math.random() * 7 });
    }
    this.sparks = this.sparks.filter((p) => {
      p.t += dt / 700;
      if (p.t >= 1) return false;
      const k = Math.sin(p.t * Math.PI) * p.size;
      ctx.fillStyle = `rgba(220,245,255,${Math.sin(p.t * Math.PI)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - k);
      ctx.quadraticCurveTo(p.x, p.y, p.x + k, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + k);
      ctx.quadraticCurveTo(p.x, p.y, p.x - k, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - k);
      ctx.fill();
      return true;
    });
    ctx.restore();
    this.nextArc -= dt;
    if (this.nextArc <= 0) {
      this.arc();
      this.nextArc = 700 + Math.random() * 1100;
    }
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) {
      this.strike();
      this.nextStrike = 3500 + Math.random() * 1800;
    }
    this.arcs = this.arcs.filter((a) => {
      a.life -= dt;
      if (a.life <= 0) return false;
      const alpha = (Math.random() < 0.25 ? 0.35 : 1) * Math.min(1, a.life / 120);
      if (!a.strike && Math.random() < 0.3) {
        const [x1, y1] = a.points[0];
        const [x2, y2] = a.points[a.points.length - 1];
        a.points = jagged(x1, y1, x2, y2, 38);
      }
      strokeBolt(ctx, a.points, alpha);
      a.branches.forEach((branch, i) => strokeBolt(ctx, branch, alpha * (0.7 - i * 0.1)));
      return true;
    });
    this.effects = this.effects.filter((effect) => effect(ctx, dt));
    this.frameId = requestAnimationFrame((next) => this.frame(next));
  }
}
