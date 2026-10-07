import { describe, expect, it } from "vitest";
import { Stack } from "./Stack";

describe("Stack", () => {
  it("pops in last-in first-out order", () => {
    const stack = new Stack<number>();
    stack.push(1);
    stack.push(2);
    stack.push(3);
    expect(stack.pop()).toBe(3);
    expect(stack.pop()).toBe(2);
    expect(stack.pop()).toBe(1);
  });

  it("peek does not remove", () => {
    const stack = new Stack<string>();
    stack.push("a");
    expect(stack.peek()).toBe("a");
    expect(stack.size()).toBe(1);
  });

  it("pop and peek on an empty stack return undefined", () => {
    const stack = new Stack<number>();
    expect(stack.pop()).toBeUndefined();
    expect(stack.peek()).toBeUndefined();
    expect(stack.isEmpty()).toBe(true);
  });

  it("clear empties the stack", () => {
    const stack = new Stack<number>();
    stack.push(1);
    stack.clear();
    expect(stack.isEmpty()).toBe(true);
    expect(stack.size()).toBe(0);
  });
});
