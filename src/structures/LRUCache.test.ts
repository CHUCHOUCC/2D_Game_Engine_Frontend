import { describe, expect, it } from "vitest";
import { LRUCache } from "./LRUCache";

describe("LRUCache", () => {
  it("returns undefined when empty", () => {
    expect(new LRUCache<string, number>(2).get("x")).toBeUndefined();
  });

  it("evicts the least recently used entry when full", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.has("b")).toBe(false);
    expect(cache.keys()).toEqual(["c", "a"]);
  });

  it("overwrites without growing", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("a", 2);
    expect(cache.get("a")).toBe(2);
    expect(cache.size()).toBe(1);
  });

  it("forgets entries after their ttl", () => {
    let now = 0;
    const cache = new LRUCache<string, number>(4, 1000, () => now);
    cache.set("a", 1);
    cache.set("b", 2, 5000);
    now = 999;
    expect(cache.get("a")).toBe(1);
    now = 1000;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("deletes and clears", () => {
    const cache = new LRUCache<string, number>(4);
    cache.set("a", 1);
    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.keys()).toEqual([]);
  });

  it("rejects a capacity below one", () => {
    expect(() => new LRUCache(0)).toThrow(RangeError);
  });
});
