import type { FinishDto, RunResultDto } from "../api/client";
import { difficultyLabel } from "./AiPanel";
import { byId, make } from "./dom";
import { formatTime } from "./Hud";
import { achievementName } from "./ProgressPanel";

const TITLES: Record<RunResultDto["outcome"], string> = {
  won: "¡Nivel superado!",
  lost: "Has perdido",
  quit: "Partida abandonada",
};

/** Show how the run went and what the AI learned. Resolves to the button chosen. */
export function showResult(result: RunResultDto, learned: FinishDto | null): Promise<"again" | "edit"> {
  const dialog = byId<HTMLDialogElement>("result-dialog");
  const title = byId("result-title");
  title.textContent = TITLES[result.outcome];
  title.className = `is-${result.outcome}`;
  byId("result-body").replaceChildren(numbers(result), aiSummary(learned));
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "again" ? "again" : "edit"), { once: true });
  });
}

function numbers(result: RunResultDto): HTMLElement {
  const grid = make("div", "result-grid");
  const items: [string, string][] = [
    [String(result.score), "Puntos"],
    [`${result.coins_collected}/${result.coins_total}`, "Monedas"],
    [String(result.enemies_defeated), "Enemigos"],
    [String(result.damage_taken), "Golpes recibidos"],
    [formatTime(result.duration_ms), "Tiempo"],
  ];
  for (const [value, label] of items) {
    const box = make("div", "stat");
    box.append(make("strong", "", value), make("span", "", label));
    grid.append(box);
  }
  return grid;
}

function aiSummary(learned: FinishDto | null): HTMLElement {
  const box = make("div", "result-ai");
  if (learned === null) {
    box.textContent = "No se pudo guardar la partida.";
    return box;
  }
  const text = learned.learned
    ? `La IA aprendió de esta partida. Nueva dificultad: ${difficultyLabel(learned.difficulty)} (${Math.round(learned.difficulty * 100)}%).`
    : "Partida guardada. La IA no estaba disponible para aprender esta vez.";
  box.append(make("p", "", text));
  if (learned.achievements.length > 0) {
    const list = make("div", "achievements");
    for (const code of learned.achievements) list.append(make("span", "badge", `🏆 ${achievementName(code)}`));
    box.append(list);
  }
  return box;
}
