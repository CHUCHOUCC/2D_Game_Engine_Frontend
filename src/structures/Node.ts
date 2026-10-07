/** Linked node: holds a piece of data and a reference to the next node. */
export class Node<T> {
  data: T;
  next: Node<T> | null;

  constructor(data: T, next: Node<T> | null = null) {
    this.data = data;
    this.next = next;
  }
}
