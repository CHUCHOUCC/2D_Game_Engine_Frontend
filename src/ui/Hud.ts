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
