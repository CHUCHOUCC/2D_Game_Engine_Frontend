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

  it("does not store an answer that arrives after a logout", async () => {
    let finish!: (value: string) => void;
    const slow = cached("settings", 1000, () => new Promise<string>((resolve) => (finish = resolve)));
    forgetAll(); // the user logs out while the request is still in the air
    finish("data of the previous user");
    await slow;
    let calls = 0;
    const fresh = await cached("settings", 1000, async () => {
      calls += 1;
      return "data of the new user";
    });
    expect(fresh).toBe("data of the new user");
    expect(calls).toBe(1);
  });

  it("a late request does not remove the in-flight entry of a newer one", async () => {
    let finishOld!: (value: string) => void;
    const old = cached("k", 1000, () => new Promise<string>((resolve) => (finishOld = resolve)));
    forgetAll();
    let finishNew!: (value: string) => void;
    const newer = cached("k", 1000, () => new Promise<string>((resolve) => (finishNew = resolve)));
    finishOld("old");
    await old;
    let extraCalls = 0;
    const shared = cached("k", 1000, async () => {
      extraCalls += 1;
      return "extra";
    });
    finishNew("new");
    expect(await newer).toBe("new");
    expect(await shared).toBe("new");
    expect(extraCalls).toBe(0);
  });
});
