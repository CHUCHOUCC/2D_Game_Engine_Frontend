import { Queue } from "../structures/Queue";

/** Something that happened while playing. */
export type GameEvent =
  | { type: "coin" }
  | { type: "defeated"; points?: number }
  | { type: "hit"; amount?: number }
  | { type: "heal"; amount: number };

export const COIN_POINTS = 1;
export const DEFEAT_POINTS = 5;
export const PLAYER_MAX_HEALTH = 3;

/**
 * Receives game events through a Queue and turns them into score and health.
 * Events wait in the queue until `process()` handles them in arrival order.
 */
export class ScoreCounter {
  private pending = new Queue<GameEvent>();
  private points = 0;
  private lives: number;
  readonly maxHealth: number;

  constructor(maxHealth = PLAYER_MAX_HEALTH) {
    this.maxHealth = maxHealth;
    this.lives = maxHealth;
  }

  /** Put an event in the queue. It does not change anything yet. */
  receive(event: GameEvent): void {
    this.pending.enqueue(event);
  }

  /** Handle every waiting event, oldest first. */
  process(): void {
    let event = this.pending.dequeue();
    while (event !== undefined) {
      if (event.type === "coin") {
        this.points += COIN_POINTS;
      } else if (event.type === "defeated") {
        this.points += event.points ?? DEFEAT_POINTS;
      } else if (event.type === "heal") {
        // A dead player stays dead: a potion in the same frame does not revive.
        if (this.lives > 0) this.lives = Math.min(this.maxHealth, this.lives + event.amount);
      } else {
        this.lives = Math.max(0, this.lives - (event.amount ?? 1));
      }
      event = this.pending.dequeue();
    }
  }

  score(): number {
    return this.points;
  }

  /** Health left for the player. */
  health(): number {
    return this.lives;
  }

  /** True when the player has no health left. */
  isGameOver(): boolean {
    return this.lives === 0;
  }

  reset(): void {
    this.pending.clear();
    this.points = 0;
    this.lives = this.maxHealth;
  }
}
