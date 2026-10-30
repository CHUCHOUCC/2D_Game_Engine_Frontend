/** Doubly linked node of the cache: key, value, expiry time and both neighbours. */
class Entry<K, V> {
  prev: Entry<K, V> | null = null;
  next: Entry<K, V> | null = null;

  constructor(
    public key: K,
    public value: V,
    public expiresAt: number | null,
  ) {}
}

/**
 * Cache with a size limit and a time limit, written by hand: a Map finds each key's node and a
 * doubly linked list keeps the entries from the most recently used (after `head`) to the least
 * recently used (before `tail`).
 * Invariant: every key in `index` has exactly one node between the sentinels and the other way
 * round; `index.size <= capacity`.
 * Costs: get, set and delete are O(1) (no walk over the list).
 * Expiry: an entry older than its ttl counts as absent and is removed when read.
 * Full cache: set() evicts the least recently used entry. Empty cache: get() returns undefined.
 */
export class LRUCache<K, V> {
  private readonly index = new Map<K, Entry<K, V>>();
  private readonly head: Entry<K, V>;
  private readonly tail: Entry<K, V>;

  constructor(
    private readonly capacity = 64,
    private readonly ttlMs: number | null = null,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (capacity < 1) throw new RangeError("capacity must be at least 1");
    // Sentinels: the list is never empty, so linking needs no special cases.
    this.head = new Entry<K, V>(undefined as K, undefined as V, null);
    this.tail = new Entry<K, V>(undefined as K, undefined as V, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private unlink(entry: Entry<K, V>): void {
    entry.prev!.next = entry.next;
    entry.next!.prev = entry.prev;
    entry.prev = entry.next = null;
  }

  private pushFront(entry: Entry<K, V>): void {
    entry.prev = this.head;
    entry.next = this.head.next;
    this.head.next!.prev = entry;
    this.head.next = entry;
  }

  private expired(entry: Entry<K, V>): boolean {
    return entry.expiresAt !== null && this.now() >= entry.expiresAt;
  }

  get(key: K): V | undefined {
    const entry = this.index.get(key);
    if (entry === undefined) return undefined;
    if (this.expired(entry)) {
      this.unlink(entry);
      this.index.delete(key);
      return undefined;
    }
    this.unlink(entry);
    this.pushFront(entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number | null = this.ttlMs): void {
    const expiresAt = ttlMs === null ? null : this.now() + ttlMs;
    const existing = this.index.get(key);
    if (existing !== undefined) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.unlink(existing);
      this.pushFront(existing);
      return;
    }
    if (this.index.size >= this.capacity) {
      const oldest = this.tail.prev!;
      this.unlink(oldest);
      this.index.delete(oldest.key);
    }
    const entry = new Entry(key, value, expiresAt);
    this.index.set(key, entry);
    this.pushFront(entry);
  }

  has(key: K): boolean {
    const entry = this.index.get(key);
    return entry !== undefined && !this.expired(entry);
  }

  delete(key: K): boolean {
    const entry = this.index.get(key);
    if (entry === undefined) return false;
    this.unlink(entry);
    this.index.delete(key);
    return true;
  }

  clear(): void {
    this.index.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /** Keys from the most to the least recently used. */
  keys(): K[] {
    const out: K[] = [];
    for (let entry = this.head.next; entry !== this.tail && entry !== null; entry = entry.next) {
      out[out.length] = entry.key;
    }
    return out;
  }

  size(): number {
    return this.index.size;
  }
}
