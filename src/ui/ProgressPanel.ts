import { myAchievements, myStats } from "../api/client";
import { byId, make } from "./dom";
import { formatTime } from "./Hud";

const ALL_ACHIEVEMENTS: Record<string, string> = {
  "first-coin": "Primera moneda",
  "coin-hoarder": "Coleccionista",
  "first-win": "Primera victoria",
  hunter: "Cazador",
  untouchable: "Intocable",
};

export function achievementName(code: string): string {
  return ALL_ACHIEVEMENTS[code] ?? code;
}

/** Player totals and the achievements, unlocked ones highlighted. */
export async function refreshProgress(): Promise<void> {
  const [stats, achievements] = await Promise.all([myStats(), myAchievements()]).catch(() => [null, []] as const);
  const statsRoot = byId("stats");
  statsRoot.replaceChildren();
  if (stats !== null) {
    const items: [string, string][] = [
      [String(stats.games_played), "Partidas"],
      [String(stats.games_won), "Victorias"],
      [String(stats.best_score), "Mejor puntuación"],
      [formatTime(stats.play_time_ms), "Tiempo jugado"],
    ];
    for (const [value, label] of items) {
      const box = make("div", "stat");
      box.append(make("strong", "", value), make("span", "", label));
      statsRoot.append(box);
    }
  }
  renderAchievements(achievements.map((a) => a.code));
}
