import { describe, expect, it } from "vitest";
import { Tree } from "./Tree";

/**        a
 *       / | \
 *      b  c  d
 *     / \     \
 *    e   f     g
 */
function sample(): Tree<string> {
  const tree = new Tree("a");
  const b = tree.root.addChild("b");
  tree.root.addChild("c");
  const d = tree.root.addChild("d");
  b.addChild("e");
  b.addChild("f");
  d.addChild("g");
  return tree;
}

describe("Tree", () => {
  it("a lone root has size 1, height 0 and is a leaf", () => {
    const tree = new Tree("a");
    expect(tree.size()).toBe(1);
    expect(tree.height()).toBe(0);
    expect(tree.root.isLeaf()).toBe(true);
  });

  it("preorder visits a parent before its children, left to right", () => {
    expect([...sample().preorder()]).toEqual(["a", "b", "e", "f", "c", "d", "g"]);
  });

  it("level order visits level by level", () => {
    expect([...sample().levelOrder()]).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });

  it("size counts every node and height the longest path", () => {
    const tree = sample();
    expect(tree.size()).toBe(7);
    expect(tree.height()).toBe(2);
  });

  it("children know their parent", () => {
    const tree = sample();
    const e = tree.find((v) => v === "e");
    expect(e?.parent?.value).toBe("b");
    expect(tree.root.parent).toBeNull();
  });

  it("find returns the first match in preorder, or undefined", () => {
    const tree = sample();
    expect(tree.find((v) => v > "b")?.value).toBe("e");
    expect(tree.find((v) => v === "z")).toBeUndefined();
  });

  it("handles a deep tree without recursion", () => {
    const tree = new Tree(0);
    let node = tree.root;
    for (let i = 1; i <= 20000; i += 1) node = node.addChild(i);
    expect(tree.height()).toBe(20000);
    expect(tree.size()).toBe(20001);
  });
});
