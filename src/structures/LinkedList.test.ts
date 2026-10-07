import { describe, expect, it } from "vitest";
import { LinkedList } from "./LinkedList";

function toArray<T>(list: LinkedList<T>): T[] {
  const result: T[] = [];
  for (const item of list) {
    result.push(item);
  }
  return result;
}

describe("LinkedList", () => {
  it("starts empty", () => {
    const list = new LinkedList<number>();
    expect(list.isEmpty()).toBe(true);
    expect(list.size()).toBe(0);
  });

  it("keeps insertion order", () => {
    const list = new LinkedList<string>();
    ["a", "b", "c"].forEach((x) => list.add(x));
    expect(toArray(list)).toEqual(["a", "b", "c"]);
    expect(list.size()).toBe(3);
  });

  it("finds the first match or undefined", () => {
    const list = new LinkedList<number>();
    [1, 2, 3].forEach((x) => list.add(x));
    expect(list.find((x) => x > 1)).toBe(2);
    expect(list.find((x) => x > 5)).toBeUndefined();
  });

  it("removes the head, a middle node and the tail", () => {
    const list = new LinkedList<number>();
    [1, 2, 3, 4].forEach((x) => list.add(x));
    expect(list.remove((x) => x === 1)).toBe(true);
    expect(list.remove((x) => x === 3)).toBe(true);
    expect(list.remove((x) => x === 4)).toBe(true);
    expect(toArray(list)).toEqual([2]);
    expect(list.size()).toBe(1);
  });

  it("returns false when nothing matches", () => {
    const list = new LinkedList<number>();
    list.add(1);
    expect(list.remove((x) => x === 9)).toBe(false);
    expect(list.size()).toBe(1);
  });

  it("can add again after removing the tail", () => {
    const list = new LinkedList<number>();
    list.add(1);
    list.add(2);
    list.remove((x) => x === 2);
    list.add(3);
    expect(toArray(list)).toEqual([1, 3]);
  });

  it("can add again after removing every element", () => {
    const list = new LinkedList<number>();
    list.add(1);
    list.remove((x) => x === 1);
    expect(list.isEmpty()).toBe(true);
    list.add(2);
    expect(toArray(list)).toEqual([2]);
  });

  it("clear empties the list", () => {
    const list = new LinkedList<number>();
    list.add(1);
    list.clear();
    expect(list.isEmpty()).toBe(true);
    expect(toArray(list)).toEqual([]);
  });
});
