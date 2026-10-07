import { Node } from "./Node";

/**
 * LIFO stack written by hand with linked nodes.
 * The top of the stack is the head of the chain, so push and pop are O(1).
 */
export class Stack<T> {
  private top: Node<T> | null = null;
  private count = 0;

  push(data: T): void {
    this.top = new Node(data, this.top);
    this.count += 1;
  }

  /** Remove and return the top element, or undefined when empty. */
  pop(): T | undefined {
    if (this.top === null) {
      return undefined;
    }
    const data = this.top.data;
    this.top = this.top.next;
    this.count -= 1;
    return data;
  }

  peek(): T | undefined {
    return this.top === null ? undefined : this.top.data;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.top = null;
    this.count = 0;
  }
}
