import { describe, expect, it } from "vitest";
import { currentVolumes, EFFECTS, JINGLES, setVolumes, shouldPlay } from "./audio";

describe("sound", () => {
  it("volumes follow the settings (0-100) and stay between 0 and 1", () => {
    setVolumes(50, 120);
    expect(currentVolumes()).toEqual({ effects: 0.5, music: 1 });
    setVolumes(-5, Number.NaN);
    expect(currentVolumes()).toEqual({ effects: 0, music: 0 });
    setVolumes(80, 70);
  });

  it("the same effect is not stacked within a few milliseconds", () => {
    expect(shouldPlay("test-hit", 1000)).toBe(true);
    expect(shouldPlay("test-hit", 1010)).toBe(false);
    expect(shouldPlay("test-hit", 1100)).toBe(true);
    expect(shouldPlay("test-other", 1100)).toBe(true);
  });

  it("every sound has a unique name", () => {
    const all = [...EFFECTS, ...JINGLES];
    expect(new Set(all).size).toBe(all.length);
  });
});
