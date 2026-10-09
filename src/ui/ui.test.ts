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
