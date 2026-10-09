/**
 * Logs the user out after a period without activity, with a warning shortly
 * before. Protects a session left open on a shared computer.
 */
export const IDLE_LIMIT_MS = 30 * 60_000;
export const WARNING_BEFORE_MS = 2 * 60_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export interface IdleCallbacks {
  onWarning: () => void;
  onTimeout: () => void;
}

export class IdleTimer {
  private lastActivity: number;
  private warned = false;
  private timer: number | undefined;
  private readonly callbacks: IdleCallbacks;
  private readonly now: () => number;
  private readonly limit: number;
  private readonly onActivity = () => this.touch();

  constructor(callbacks: IdleCallbacks, limit = IDLE_LIMIT_MS, now: () => number = () => Date.now()) {
    this.callbacks = callbacks;
    this.limit = limit;
    this.now = now;
    this.lastActivity = now();
  }

  /** Something happened: the countdown starts again. */
  touch(): void {
    this.lastActivity = this.now();
    this.warned = false;
  }

  /** Check the time; called every few seconds by start(), or directly in tests. */
  check(): void {
    const idle = this.now() - this.lastActivity;
    if (idle >= this.limit) {
      this.stop();
      this.callbacks.onTimeout();
    } else if (!this.warned && idle >= this.limit - WARNING_BEFORE_MS) {
      this.warned = true;
      this.callbacks.onWarning();
    }
  }

  start(): void {
    this.stop();
    this.touch();
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, this.onActivity, { passive: true });
    this.timer = window.setInterval(() => this.check(), 5_000);
  }

  stop(): void {
    if (typeof window === "undefined") return;
    window.clearInterval(this.timer);
    this.timer = undefined;
    for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, this.onActivity);
  }
}
