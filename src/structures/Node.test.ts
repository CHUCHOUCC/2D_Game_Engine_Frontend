import { describe, expect, it } from "vitest";
import { DoublyNode, Node } from "./Node";

describe("Node", () => {
  it("points to the next node", () => {
    const second = new Node("b");
    const first = new Node("a", second);
    expect(first.next).toBe(second);
    expect(second.next).toBeNull();
  });

  it("DoublyNode knows both of its neighbours", () => {
    const first = new DoublyNode("a");
    const second = new DoublyNode("b", first);
    first.next = second;
    expect(second.previous).toBe(first);
    expect(first.previous).toBeNull();
    expect(first.next).toBe(second);
  });
});
