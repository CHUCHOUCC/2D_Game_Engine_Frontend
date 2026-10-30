import { describe, expect, it } from "vitest";
import { DynamicArray } from "./DynamicArray";

function filled(...values: number[]): DynamicArray<number> {
  const array = new DynamicArray<number>(2);
  for (const value of values) array.append(value);
  return array;
}

describe("DynamicArray", () => {
  it("starts empty", () => {
    const array = new DynamicArray<number>();
    expect(array.isEmpty()).toBe(true);
    expect(array.size()).toBe(0);
  });

  it("rejects an invalid capacity", () => {
    expect(() => new DynamicArray<number>(0)).toThrow(RangeError);
    expect(() => new DynamicArray<number>(1.5)).toThrow(RangeError);
  });

  it("append keeps the order", () => {
    expect([...filled(1, 2, 3)]).toEqual([1, 2, 3]);
  });

  it("doubles its capacity when it is full", () => {
    const array = new DynamicArray<number>(2);
    array.append(1);
    array.append(2);
    expect(array.capacity()).toBe(2);
    array.append(3);
    expect(array.capacity()).toBe(4);
    expect([...array]).toEqual([1, 2, 3]);
  });

  it("get and set work inside the bounds and throw outside", () => {
    const array = filled(10, 20);
    expect(array.get(1)).toBe(20);
    array.set(1, 25);
    expect(array.get(1)).toBe(25);
    expect(() => array.get(2)).toThrow(RangeError);
    expect(() => array.set(-1, 0)).toThrow(RangeError);
  });

  it("insert shifts the elements to the right", () => {
    const array = filled(1, 3);
    array.insert(1, 2);
    array.insert(0, 0);
    array.insert(4, 4);
    expect([...array]).toEqual([0, 1, 2, 3, 4]);
    expect(() => array.insert(9, 1)).toThrow(RangeError);
  });

  it("removeAt shifts the elements to the left", () => {
    const array = filled(1, 2, 3, 4);
    expect(array.removeAt(1)).toBe(2);
    expect([...array]).toEqual([1, 3, 4]);
    expect(() => array.removeAt(3)).toThrow(RangeError);
  });

  it("pop takes the last element", () => {
    const array = filled(1, 2);
    expect(array.pop()).toBe(2);
    expect(array.size()).toBe(1);
    expect(() => new DynamicArray<number>().pop()).toThrow(RangeError);
  });

  it("indexOf finds the first match or -1", () => {
    const array = filled(5, 6, 7);
    expect(array.indexOf((n) => n > 5)).toBe(1);
    expect(array.indexOf((n) => n > 50)).toBe(-1);
  });

  it("filled makes n copies", () => {
    const array = DynamicArray.filled(5, false);
    expect(array.size()).toBe(5);
    expect([...array]).toEqual([false, false, false, false, false]);
    expect(DynamicArray.filled(0, 1).size()).toBe(0);
  });

  it("clear empties it and it can be used again", () => {
    const array = filled(1, 2, 3);
    array.clear();
    expect(array.size()).toBe(0);
    array.append(9);
    expect([...array]).toEqual([9]);
  });
});
