import { Node } from "./Node";

/**
 * Circular singly linked list written by hand: the last node points back to the first,
 * so walking forward never ends. It only keeps `tail` (the first node is `tail.next`)
 * and a `cursor` that remembers which element is selected.
 *
 * Costs: add is O(1); next() moves the cursor in O(1); remove is O(n).
 * Invariant: tail is null if and only if the list is empty; otherwise tail.next is the first node.
 */
export class CircularLinkedList<T> implements Iterable<T> {
  private tail: Node<T> | null = null;
  private cursor: Node<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  /** Add an element at the end of the lap. The first element added becomes the selected one. */
  add(data: T): void {
    const node = new Node(data);
    if (this.tail === null) {
      node.next = node; // alone, it points to itself
      this.cursor = node;
    } else {
      node.next = this.tail.next;
      this.tail.next = node;
    }
    this.tail = node;
    this.count += 1;
  }

  /** The selected element, or undefined when empty. */
  current(): T | undefined {
    return this.cursor === null ? undefined : this.cursor.data;
  }

  /** Move the selection one step forward (after the last it comes back to the first) and return it. */
  next(): T | undefined {
    if (this.cursor === null) return undefined;
    this.cursor = this.cursor.next;
    return this.cursor === null ? undefined : this.cursor.data;
  }

  /** Move the selection one step back. A singly linked circle has no back arrow, so it walks the lap: O(n). */
  previous(): T | undefined {
    if (this.cursor === null) return undefined;
    let node = this.cursor;
    while (node.next !== this.cursor) {
      node = node.next as Node<T>;
    }
    this.cursor = node;
    return node.data;
  }

  /** Select the first element that satisfies the condition. */
  select(predicate: (item: T) => boolean): boolean {
    if (this.tail === null) return false;
    let node = this.tail.next as Node<T>;
    for (let i = 0; i < this.count; i += 1) {
      if (predicate(node.data)) {
        this.cursor = node;
        return true;
      }
      node = node.next as Node<T>;
    }
    return false;
  }

  /** Remove the first element that satisfies the condition. */
  remove(predicate: (item: T) => boolean): boolean {
    if (this.tail === null) return false;
    let previous: Node<T> = this.tail;
    let node = this.tail.next as Node<T>;
    for (let i = 0; i < this.count; i += 1) {
      if (predicate(node.data)) {
        if (this.count === 1) {
          this.tail = null;
          this.cursor = null;
        } else {
          previous.next = node.next;
          if (node === this.tail) this.tail = previous;
          if (node === this.cursor) this.cursor = node.next;
        }
        this.count -= 1;
        return true;
      }
      previous = node;
      node = node.next as Node<T>;
    }
    return false;
  }

  clear(): void {
    this.tail = null;
    this.cursor = null;
    this.count = 0;
  }

  /** One lap, from the first element to the last (it stops: it does not loop forever). */
  *[Symbol.iterator](): Iterator<T> {
    if (this.tail === null) return;
    let node = this.tail.next as Node<T>;
    for (let i = 0; i < this.count; i += 1) {
      yield node.data;
      node = node.next as Node<T>;
    }
  }
}
