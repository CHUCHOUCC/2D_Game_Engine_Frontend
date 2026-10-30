import { describe, expect, it } from "vitest";
import { DoublyLinkedList } from "./DoublyLinkedList";

function filled(...values: number[]): DoublyLinkedList<number> {
  const list = new DoublyLinkedList<number>();
  for (const value of values) list.addLast(value);
  return list;
}

describe("DoublyLinkedList", () => {
  it("starts empty", () => {
    const list = new DoublyLinkedList<number>();
    expect(list.isEmpty()).toBe(true);
    expect(list.size()).toBe(0);
    expect(list.first()).toBeUndefined();
    expect(list.last()).toBeUndefined();
  });

  it("addLast keeps the insertion order", () => {
    expect([...filled(1, 2, 3)]).toEqual([1, 2, 3]);
  });

  it("addFirst goes before everything", () => {
    const list = filled(2, 3);
    list.addFirst(1);
    expect([...list]).toEqual([1, 2, 3]);
    expect(list.first()).toBe(1);
  });

  it("addFirst on an empty list also sets the last element", () => {
    const list = new DoublyLinkedList<number>();
    list.addFirst(7);
    expect(list.last()).toBe(7);
  });

  it("removeFirst and removeLast take from each end", () => {
    const list = filled(1, 2, 3);
    expect(list.removeFirst()).toBe(1);
    expect(list.removeLast()).toBe(3);
    expect([...list]).toEqual([2]);
  });

  it("removing the only element leaves an empty list that still works", () => {
    const list = filled(1);
    expect(list.removeLast()).toBe(1);
    expect(list.isEmpty()).toBe(true);
    list.addLast(2);
    expect([...list]).toEqual([2]);
    expect(list.removeFirst()).toBe(2);
    expect(list.removeFirst()).toBeUndefined();
  });

  it("backwards walks from the last to the first", () => {
    expect([...filled(1, 2, 3).backwards()]).toEqual([3, 2, 1]);
  });

  it("remove deletes from the start, the middle and the end", () => {
    const list = filled(1, 2, 3, 4);
    expect(list.remove((n) => n === 1)).toBe(true);
    expect(list.remove((n) => n === 3)).toBe(true);
    expect(list.remove((n) => n === 4)).toBe(true);
    expect([...list]).toEqual([2]);
    expect([...list.backwards()]).toEqual([2]);
    expect(list.remove((n) => n === 99)).toBe(false);
  });

  it("find returns the first match", () => {
    expect(filled(1, 2, 3).find((n) => n > 1)).toBe(2);
    expect(filled(1).find((n) => n > 5)).toBeUndefined();
  });

  it("clear empties the list", () => {
    const list = filled(1, 2);
    list.clear();
    expect(list.size()).toBe(0);
    expect([...list]).toEqual([]);
  });
});
