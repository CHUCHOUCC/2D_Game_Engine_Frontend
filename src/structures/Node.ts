/** Linked node: holds a piece of data and a reference to the next node. */
export class Node<T> {
  data: T;
  next: Node<T> | null;

  constructor(data: T, next: Node<T> | null = null) {
    this.data = data;
    this.next = next;
  }
}

/** Doubly linked node: data plus references to both neighbours. */
export class DoublyNode<T> {
  data: T;
  previous: DoublyNode<T> | null;
  next: DoublyNode<T> | null;

  constructor(data: T, previous: DoublyNode<T> | null = null, next: DoublyNode<T> | null = null) {
    this.data = data;
    this.previous = previous;
    this.next = next;
  }
}
