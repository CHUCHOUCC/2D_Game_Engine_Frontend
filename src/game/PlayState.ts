import { WORLD_HEIGHT, WORLD_WIDTH, type GameObject } from "../model/GameObject";
import { ScoreCounter } from "../model/ScoreCounter";
import { LinkedList } from "../structures/LinkedList";

export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 4;
const TOUCH_RADIUS = { coin: 14, enemy: 17 } as const;

/**
 * The rules of the game, with no Phaser inside (so it can be tested).
 *
 * It works on its own COPY of the scene: collecting a coin removes it from
 * this copy, never from the scene that is being edited.
 */
export class PlayState {
  private objects = new LinkedList<GameObject>();
  private counter = new ScoreCounter();
  playerX = WORLD_WIDTH / 2;
  playerY = WORLD_HEIGHT / 2;

  constructor(scene: Iterable<GameObject>) {
    for (const object of scene) {
      this.objects.add({ ...object });
    }
  }

  /** Objects that are still in the play (coins already collected are gone). */
  [Symbol.iterator](): Iterator<GameObject> {
    return this.objects[Symbol.iterator]();
  }

  /** True while an object with this id is still in the play. */
  has(id: string): boolean {
    return this.objects.find((object) => object.id === id) !== undefined;
  }

  score(): number {
    return this.counter.score();
  }

  isGameOver(): boolean {
    return this.counter.isGameOver();
  }

  /** Move the player and keep it inside the world. Does nothing after game over. */
  movePlayer(dx: number, dy: number): void {
    if (this.isGameOver()) {
      return;
    }
    this.playerX = Math.min(WORLD_WIDTH, Math.max(0, this.playerX + dx));
    this.playerY = Math.min(WORLD_HEIGHT, Math.max(0, this.playerY + dy));
  }

  /** Check what the player touches. Call it once per frame. */
  update(): void {
    if (this.isGameOver()) {
      return;
    }
    let touched = this.objects.find((object) => this.touches(object));
    while (touched !== undefined) {
      this.counter.receive({ type: touched.kind === "coin" ? "coin" : "enemy" });
      if (touched.kind === "coin") {
        const id = touched.id;
        this.objects.remove((object) => object.id === id);
      } else {
        break;
      }
      touched = this.objects.find((object) => this.touches(object));
    }
    this.counter.process();
  }

  /** Boxes are only decoration: the player walks over them. */
  private touches(object: GameObject): boolean {
    if (object.kind === "box") {
      return false;
    }
    const reach = PLAYER_RADIUS + TOUCH_RADIUS[object.kind];
    const dx = object.x - this.playerX;
    const dy = object.y - this.playerY;
    return dx * dx + dy * dy <= reach * reach;
  }
}
