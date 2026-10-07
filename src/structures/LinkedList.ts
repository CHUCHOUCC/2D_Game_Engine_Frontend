import { Node } from "./Node";

/**
 * Singly linked list written by hand (no native Array inside).
 *
 * The list only remembers the first node (head) and the last node (tail).
 * Every node knows just its data and the next node, so reaching an element
 * means following the `next` arrows from the head.
 */
export class LinkedList<T> implements Iterable<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private count = 0;

  /** Add an element at the end. O(1) thanks to the tail pointer. */
  add(data: T): void {
    const newNode = new Node(data);
    if (this.tail === null) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.count += 1;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  /** Return the first element that satisfies the condition, or undefined. */
  find(predicate: (item: T) => boolean): T | undefined {
    let current = this.head;
    while (current !== null) {
      if (predicate(current.data)) {
        return current.data;
      }
      current = current.next;
    }
    return undefined;
  }

  /** Remove the first element that satisfies the condition. */
  remove(predicate: (item: T) => boolean): boolean {
    let previous: Node<T> | null = null;
    let current = this.head;
    while (current !== null) {
      if (predicate(current.data)) {
        if (previous === null) {
          this.head = current.next;
        } else {
          previous.next = current.next;
        }
        if (current === this.tail) {
          this.tail = previous;
        }
        this.count -= 1;
        return true;
      }
      previous = current;
      current = current.next;
    }
    return false;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }

  /** Lets `for (const item of list)` walk the nodes from head to tail. */
  *[Symbol.iterator](): Iterator<T> {
    let current = this.head;
    while (current !== null) {
      yield current.data;
      current = current.next;
    }
  }
}
