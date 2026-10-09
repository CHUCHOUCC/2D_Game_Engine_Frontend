import type { HudState } from "../game/PlayScene";
import { PLAYER_MAX_HEALTH } from "../model/ScoreCounter";
import { byId } from "./dom";

/** 75000 ms -> "1:15". */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Full and empty hearts for the player's health. */
export function hearts(health: number, max = PLAYER_MAX_HEALTH): string {
  const full = Math.max(0, Math.min(max, health));
  return "♥".repeat(full) + "♡".repeat(max - full);
}

export function showHud(state: HudState): void {
  byId("hud-hearts").textContent = hearts(state.health);
  byId("hud-score").textContent = String(state.score);
  byId("hud-coins").textContent = `${state.coins}/${state.coinsTotal}`;
  byId("hud-enemies").textContent = `${state.enemies}/${state.enemiesTotal}`;
  byId("hud-time").textContent = formatTime(state.elapsedMs);
  byId("hud-difficulty").style.width = `${Math.round(state.difficulty * 100)}%`;
}

export function setHudVisible(visible: boolean): void {
  byId("hud").hidden = !visible;
}
