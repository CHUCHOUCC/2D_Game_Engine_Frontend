import { LinkedList } from "./LinkedList";
import { Queue } from "./Queue";
import { Stack } from "./Stack";

/** A node of a general tree: a value, its parent and its children (kept in our LinkedList). */
export class TreeNode<T> {
  readonly value: T;
  parent: TreeNode<T> | null = null;
  readonly children = new LinkedList<TreeNode<T>>();

  constructor(value: T) {
    this.value = value;
  }

  /** Create a child with `value`, attach it as the last child and return it. */
  addChild(value: T): TreeNode<T> {
    const child = new TreeNode(value);
    child.parent = this;
    this.children.add(child);
    return child;
  }

  isLeaf(): boolean {
    return this.children.isEmpty();
  }
}

/**
 * General tree (any number of children per node) written by hand.
 * Traversals use our own Stack (preorder, depth first) and Queue (level order, breadth first),
 * so they work on deep trees without recursion. All traversals are O(n).
 */
export class Tree<T> {
  readonly root: TreeNode<T>;

  constructor(rootValue: T) {
    this.root = new TreeNode(rootValue);
  }

  /** Number of nodes. */
  size(): number {
    let total = 0;
    for (const _ of this.preorder()) total += 1;
    return total;
  }

  /** Parent before children, children from left to right. */
  *preorder(): Iterable<T> {
    const pending = new Stack<TreeNode<T>>();
    pending.push(this.root);
    while (!pending.isEmpty()) {
      const node = pending.pop() as TreeNode<T>;
      yield node.value;
      // Push the children in reverse so the first child is the first one popped.
      const reversed = new Stack<TreeNode<T>>();
      for (const child of node.children) reversed.push(child);
      while (!reversed.isEmpty()) pending.push(reversed.pop() as TreeNode<T>);
    }
  }

  /** Level by level, top to bottom. */
  *levelOrder(): Iterable<T> {
    const pending = new Queue<TreeNode<T>>();
    pending.enqueue(this.root);
    while (!pending.isEmpty()) {
      const node = pending.dequeue() as TreeNode<T>;
      yield node.value;
      for (const child of node.children) pending.enqueue(child);
    }
  }

  /** Edges on the longest path from the root to a leaf (a lone root has height 0). */
  height(): number {
    let height = 0;
    const pending = new Queue<{ node: TreeNode<T>; depth: number }>();
    pending.enqueue({ node: this.root, depth: 0 });
    while (!pending.isEmpty()) {
      const { node, depth } = pending.dequeue() as { node: TreeNode<T>; depth: number };
      if (depth > height) height = depth;
      for (const child of node.children) pending.enqueue({ node: child, depth: depth + 1 });
    }
    return height;
  }

  /** The first node (in preorder) whose value satisfies the condition. */
  find(predicate: (value: T) => boolean): TreeNode<T> | undefined {
    const pending = new Stack<TreeNode<T>>();
    pending.push(this.root);
    while (!pending.isEmpty()) {
      const node = pending.pop() as TreeNode<T>;
      if (predicate(node.value)) return node;
      const reversed = new Stack<TreeNode<T>>();
      for (const child of node.children) reversed.push(child);
      while (!reversed.isEmpty()) pending.push(reversed.pop() as TreeNode<T>);
    }
    return undefined;
  }
}
