import { DoublyNode } from "./Node";

/**
 * Doubly linked list written by hand: every node knows the one before and the one after.
 * Adding and removing at either end is O(1); finding by condition is O(n).
 * Invariant: head and tail are both null (empty) or both point into the same chain.
 */
export class DoublyLinkedList<T> implements Iterable<T> {
  private head: DoublyNode<T> | null = null;
  private tail: DoublyNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  /** Add an element at the end. */
  addLast(data: T): void {
    const node = new DoublyNode(data, this.tail, null);
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.count += 1;
  }

  /** Add an element at the start. */
  addFirst(data: T): void {
    const node = new DoublyNode(data, null, this.head);
    if (this.head === null) {
      this.tail = node;
    } else {
      this.head.previous = node;
    }
    this.head = node;
    this.count += 1;
  }

  first(): T | undefined {
    return this.head === null ? undefined : this.head.data;
  }

  last(): T | undefined {
    return this.tail === null ? undefined : this.tail.data;
  }

  /** Remove and return the first element, or undefined when empty. */
  removeFirst(): T | undefined {
    if (this.head === null) return undefined;
    const node = this.head;
    this.head = node.next;
    if (this.head === null) {
      this.tail = null;
    } else {
      this.head.previous = null;
    }
    this.count -= 1;
    return node.data;
  }

  /** Remove and return the last element, or undefined when empty. */
  removeLast(): T | undefined {
    if (this.tail === null) return undefined;
    const node = this.tail;
    this.tail = node.previous;
    if (this.tail === null) {
      this.head = null;
    } else {
      this.tail.next = null;
    }
    this.count -= 1;
    return node.data;
  }

  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this) {
      if (predicate(item)) return item;
    }
    return undefined;
  }

  /** Remove the first element that satisfies the condition. */
  remove(predicate: (item: T) => boolean): boolean {
    let current = this.head;
    while (current !== null) {
      if (predicate(current.data)) {
        if (current.previous === null) {
          this.head = current.next;
        } else {
          current.previous.next = current.next;
        }
        if (current.next === null) {
          this.tail = current.previous;
        } else {
          current.next.previous = current.previous;
        }
        this.count -= 1;
        return true;
      }
      current = current.next;
    }
    return false;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }

  *[Symbol.iterator](): Iterator<T> {
    let current = this.head;
    while (current !== null) {
      yield current.data;
      current = current.next;
    }
  }

  /** Walk from the last element to the first (only possible because nodes know their previous one). */
  *backwards(): Iterable<T> {
    let current = this.tail;
    while (current !== null) {
      yield current.data;
      current = current.previous;
    }
  }
}
