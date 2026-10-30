import { beforeEach, describe, expect, it } from "vitest";
import { cached, forget, forgetAll, remember } from "./cache";

describe("api cache", () => {
  beforeEach(() => forgetAll());

  it("loads once and then answers from memory", async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      return ["a"];
    };
    expect(await cached("k", 1000, load)).toEqual(["a"]);
    expect(await cached("k", 1000, load)).toEqual(["a"]);
    expect(calls).toBe(1);
  });

  it("shares one request between simultaneous callers", async () => {
    let calls = 0;
    const load = () => new Promise<number>((resolve) => { calls += 1; setTimeout(() => resolve(7), 5); });
    const [x, y] = await Promise.all([cached("k", 1000, load), cached("k", 1000, load)]);
    expect([x, y, calls]).toEqual([7, 7, 1]);
  });

  it("does not keep failures", async () => {
    await expect(cached("k", 1000, () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect(await cached("k", 1000, async () => "ok")).toBe("ok");
  });

  it("remember and forget", async () => {
    remember("s", { theme: "light" }, 1000);
    expect(await cached("s", 1000, async () => ({ theme: "dark" }))).toEqual({ theme: "light" });
    forget("s");
    expect(await cached("s", 1000, async () => ({ theme: "dark" }))).toEqual({ theme: "dark" });
  });
});
