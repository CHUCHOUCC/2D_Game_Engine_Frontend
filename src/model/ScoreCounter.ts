import { Queue } from "../structures/Queue";

/** Something that happened while playing. */
export type GameEvent = { type: "coin" } | { type: "enemy" };

/**
 * Receives game events through a Queue and turns them into a score.
 * Events wait in the queue until `process()` handles them in arrival order.
 */
export class ScoreCounter {
  private pending = new Queue<GameEvent>();
  private points = 0;
  private lost = false;

  /** Put an event in the queue. It does not change the score yet. */
  receive(event: GameEvent): void {
    this.pending.enqueue(event);
  }

  /** Handle every waiting event, oldest first. */
  process(): void {
    let event = this.pending.dequeue();
    while (event !== undefined) {
      if (event.type === "coin") {
        this.points += 1;
      } else {
        this.lost = true;
      }
      event = this.pending.dequeue();
    }
  }

  score(): number {
    return this.points;
  }

  /** True after an enemy event was processed. */
  isGameOver(): boolean {
    return this.lost;
  }

  reset(): void {
    this.pending.clear();
    this.points = 0;
    this.lost = false;
  }
}
