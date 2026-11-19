import { describe, expect, it } from "vitest";
import { CircularLinkedList } from "./CircularLinkedList";

function filled(...values: string[]): CircularLinkedList<string> {
  const ring = new CircularLinkedList<string>();
  for (const value of values) ring.add(value);
  return ring;
}

describe("CircularLinkedList", () => {
  it("starts empty and gives nothing", () => {
    const ring = new CircularLinkedList<string>();
    expect(ring.isEmpty()).toBe(true);
    expect(ring.current()).toBeUndefined();
    expect(ring.next()).toBeUndefined();
    expect(ring.previous()).toBeUndefined();
  });

  it("the first element added is the selected one", () => {
    expect(filled("a", "b", "c").current()).toBe("a");
  });

  it("next goes around: after the last comes the first", () => {
    const ring = filled("a", "b", "c");
    expect([ring.next(), ring.next(), ring.next(), ring.next()]).toEqual(["b", "c", "a", "b"]);
  });

  it("previous goes around the other way", () => {
    const ring = filled("a", "b", "c");
    expect([ring.previous(), ring.previous(), ring.previous()]).toEqual(["c", "b", "a"]);
  });

  it("a single element is its own next and previous", () => {
    const ring = filled("a");
    expect(ring.next()).toBe("a");
    expect(ring.previous()).toBe("a");
  });

  it("iteration is one lap and stops", () => {
    expect([...filled("a", "b", "c")]).toEqual(["a", "b", "c"]);
  });

  it("adding keeps the selection where it was", () => {
    const ring = filled("a", "b");
    ring.next();
    ring.add("c");
    expect(ring.current()).toBe("b");
    expect([...ring]).toEqual(["a", "b", "c"]);
  });

  it("select moves to the element that matches", () => {
    const ring = filled("a", "b", "c");
    expect(ring.select((v) => v === "c")).toBe(true);
    expect(ring.current()).toBe("c");
    expect(ring.select((v) => v === "z")).toBe(false);
  });

  it("removing the selected element moves the selection forward", () => {
    const ring = filled("a", "b", "c");
    ring.next();
    expect(ring.remove((v) => v === "b")).toBe(true);
    expect(ring.current()).toBe("c");
    expect([...ring]).toEqual(["a", "c"]);
  });

  it("removing the last element keeps the circle closed", () => {
    const ring = filled("a", "b", "c");
    ring.remove((v) => v === "c");
    expect([ring.next(), ring.next(), ring.next()]).toEqual(["b", "a", "b"]);
    ring.add("d");
    expect([...ring]).toEqual(["a", "b", "d"]);
  });

  it("removing the only element empties the ring", () => {
    const ring = filled("a");
    expect(ring.remove((v) => v === "a")).toBe(true);
    expect(ring.isEmpty()).toBe(true);
    expect(ring.current()).toBeUndefined();
  });

  it("clear empties the ring", () => {
    const ring = filled("a", "b");
    ring.clear();
    expect(ring.size()).toBe(0);
    expect([...ring]).toEqual([]);
  });
});
