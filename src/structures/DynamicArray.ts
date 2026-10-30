/**
 * Growing array written by hand. The block of memory has a fixed length and we never
 * use push/pop/splice: when it is full we allocate a block twice as big and copy.
 *
 * Costs: get/set O(1); append O(1) amortised (doubling); insert/removeAt O(n) (shifts elements).
 * Invariant: the first `count` slots hold elements, the rest are empty.
 */
export class DynamicArray<T> implements Iterable<T> {
  private block: (T | undefined)[];
  private count = 0;

  constructor(capacity = 4) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("capacity must be a positive integer");
    }
    this.block = new Array<T | undefined>(capacity);
  }

  /** An array of `count` copies of `value`. */
  static filled<U>(count: number, value: U): DynamicArray<U> {
    const array = new DynamicArray<U>(Math.max(1, count));
    for (let i = 0; i < count; i += 1) array.append(value);
    return array;
  }

  capacity(): number {
    return this.block.length;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  private checked(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError(`index ${index} is outside 0..${this.count - 1}`);
    }
    return index;
  }

  /** Double the block and copy the elements into it. */
  private grow(): void {
    const bigger = new Array<T | undefined>(this.block.length * 2);
    for (let i = 0; i < this.count; i += 1) bigger[i] = this.block[i];
    this.block = bigger;
  }

  get(index: number): T {
    return this.block[this.checked(index)] as T;
  }

  set(index: number, value: T): void {
    this.block[this.checked(index)] = value;
  }

  append(value: T): void {
    if (this.count === this.block.length) this.grow();
    this.block[this.count] = value;
    this.count += 1;
  }

  /** Put `value` at `index` (0..size), shifting the elements after it one place to the right. */
  insert(index: number, value: T): void {
    if (!Number.isInteger(index) || index < 0 || index > this.count) {
      throw new RangeError(`index ${index} is outside 0..${this.count}`);
    }
    if (this.count === this.block.length) this.grow();
    for (let i = this.count; i > index; i -= 1) this.block[i] = this.block[i - 1];
    this.block[index] = value;
    this.count += 1;
  }

  /** Remove and return the element at `index`, shifting the later ones to the left. */
  removeAt(index: number): T {
    this.checked(index);
    const removed = this.block[index] as T;
    for (let i = index; i < this.count - 1; i += 1) this.block[i] = this.block[i + 1];
    this.count -= 1;
    this.block[this.count] = undefined;
    return removed;
  }

  /** Remove and return the last element. */
  pop(): T {
    return this.removeAt(this.count - 1);
  }

  indexOf(predicate: (item: T) => boolean): number {
    for (let i = 0; i < this.count; i += 1) {
      if (predicate(this.block[i] as T)) return i;
    }
    return -1;
  }

  clear(): void {
    for (let i = 0; i < this.count; i += 1) this.block[i] = undefined;
    this.count = 0;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i += 1) yield this.block[i] as T;
  }
}
