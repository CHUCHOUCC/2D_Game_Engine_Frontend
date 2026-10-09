import { expect, test } from "vitest";
import { difficultyLabel } from "./AiPanel";
import { formatTime, hearts } from "./Hud";
import { passwordStrength } from "./passwordStrength";
import { achievementName } from "./ProgressPanel";
import { relativeTime } from "./ProjectList";
import { shortcutFor } from "./shortcuts";
import { resolveTheme } from "./theme";

test("passwords under 8 characters are very weak", () => {
  expect(passwordStrength("abc").score).toBe(0);
  expect(passwordStrength("abc").label).toBe("Muy débil");
});

test("length and character variety raise the score", () => {
  expect(passwordStrength("gatoverde").score).toBe(1);
  expect(passwordStrength("gatoverde12").score).toBe(2);
  expect(passwordStrength("Gatoverde12").score).toBe(3);
  expect(passwordStrength("Gatoverde12!largo").score).toBe(4);
});

test("repeated or common passwords stay weak", () => {
  expect(passwordStrength("aaaaaaaaaaaaaa").score).toBe(1);
  expect(passwordStrength("12345678Aa!xyz").score).toBe(1);
});

test("system theme follows the operating system", () => {
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
  expect(resolveTheme("light", true)).toBe("light");
});

test("shortcuts map keys to editor actions", () => {
  const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
    shortcutFor({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });
  expect(key("s", { ctrlKey: true })).toBe("save");
  expect(key("z", { metaKey: true })).toBe("undo");
  expect(key("Z", { ctrlKey: true, shiftKey: true })).toBe("redo");
  expect(key("y", { ctrlKey: true })).toBe("redo");
  expect(key("Delete")).toBe("remove");
  expect(key("p")).toBe("play");
  expect(key("Escape")).toBe("cancel");
  expect(key("s")).toBeNull();
});

test("HUD formats time and hearts", () => {
  expect(formatTime(75_000)).toBe("1:15");
  expect(formatTime(5_400)).toBe("0:05");
  expect(formatTime(-10)).toBe("0:00");
  expect(hearts(2)).toBe("♥♥♡");
  expect(hearts(9)).toBe("♥♥♥");
});
