import { Node } from "./Node";

/**
 * FIFO queue written by hand with linked nodes.
 * `head` is the next element to leave, `tail` is the last one that arrived.
 * Both enqueue and dequeue are O(1).
 */
export class Queue<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private count = 0;

  /** Add an element at the back. */
  enqueue(data: T): void {
    const newNode = new Node(data);
    if (this.tail === null) {
      this.head = newNode;
    } else {
      this.tail.next = newNode;
    }
    this.tail = newNode;
    this.count += 1;
  }

  /** Remove and return the element at the front, or undefined when empty. */
  dequeue(): T | undefined {
    if (this.head === null) {
      return undefined;
    }
    const data = this.head.data;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null;
    }
    this.count -= 1;
    return data;
  }

  /** Look at the front element without removing it. */
  front(): T | undefined {
    return this.head === null ? undefined : this.head.data;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }
}
