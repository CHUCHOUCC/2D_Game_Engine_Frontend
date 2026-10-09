import type { RunResultDto } from "../api/client";
import type { GameObject } from "../model/GameObject";
import { ScoreCounter } from "../model/ScoreCounter";
import { LinkedList } from "../structures/LinkedList";

/** At most this many events are sent to the backend for one run. */
export const MAX_EVENTS = 500;

type Outcome = RunResultDto["outcome"];

/**
 * The rules of a run, with no Phaser inside (so they can be tested).
 *
 * Phaser's Arcade Physics decides WHAT touches what; this class decides what
 * that MEANS: points, health, when the run is won or lost, and the numbers the
 * backend (and the AI that learns from them) receives at the end.
 */
export class RunTracker {
  private readonly counter = new ScoreCounter();
  private readonly events = new LinkedList<RunResultDto["events"][number]>();
  private readonly startedAt: number;
  private readonly now: () => number;
  private endedAt: number | null = null;
  private result_: Outcome | null = null;
  readonly coinsTotal: number;
  readonly enemiesTotal: number;
  coinsCollected = 0;
  enemiesDefeated = 0;
  damageTaken = 0;

  constructor(scene: Iterable<GameObject>, now: () => number = () => performance.now()) {
    let coins = 0;
    let enemies = 0;
    for (const object of scene) {
      if (object.kind === "coin") coins += 1;
      if (object.kind === "enemy") enemies += 1;
    }
    this.coinsTotal = coins;
    this.enemiesTotal = enemies;
    this.now = now;
    this.startedAt = now();
  }
