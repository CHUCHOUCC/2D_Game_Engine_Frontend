import { describe, expect, it } from "vitest";
import { Queue } from "./Queue";

describe("Queue", () => {
  it("dequeues in first-in first-out order", () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(3);
  });

  it("front does not remove", () => {
    const queue = new Queue<string>();
    queue.enqueue("a");
    expect(queue.front()).toBe("a");
    expect(queue.size()).toBe(1);
  });

  it("dequeue and front on an empty queue return undefined", () => {
    const queue = new Queue<number>();
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.front()).toBeUndefined();
    expect(queue.isEmpty()).toBe(true);
  });

  it("stays usable after being emptied", () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    queue.dequeue();
    queue.enqueue(2);
    expect(queue.size()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.isEmpty()).toBe(true);
  });

  it("clear empties the queue", () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue(3);
    expect(queue.dequeue()).toBe(3);
  });
});
