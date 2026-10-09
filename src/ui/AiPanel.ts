import { aiModel, aiObstacles, askAi, type AiModelDto, type ProjectDto } from "../api/client";
import { byId, errorText, make } from "./dom";
import { toast } from "./toast";

/** "Fácil", "Normal"... for a difficulty between 0 and 1. */
export function difficultyLabel(value: number): string {
  if (value < 0.3) return "Fácil";
  if (value < 0.55) return "Normal";
  if (value < 0.8) return "Difícil";
  return "Muy difícil";
}

/**
 * Two ways to use the AI: describe objects in words, or let the model that
 * learned from your runs place new obstacles. The model summary shows what
 * it has learned so far.
 */
export class AiPanel {
  private readonly getProjectId: () => number | null;
  private readonly onScene: (project: ProjectDto) => void;
  private readonly beforeRequest: () => Promise<void>;
  private readonly count = byId<HTMLInputElement>("ai-count");

  /** beforeRequest saves pending edits: the AI works on the scene stored in the backend. */
  constructor(getProjectId: () => number | null, onScene: (project: ProjectDto) => void, beforeRequest: () => Promise<void>) {
    this.getProjectId = getProjectId;
    this.onScene = onScene;
    this.beforeRequest = beforeRequest;
    this.count.addEventListener("input", () => (byId("ai-count-value").textContent = this.count.value));
    byId<HTMLFormElement>("ai-form").addEventListener("submit", (event) => {
      event.preventDefault();
      void this.ask();
    });
    byId("btn-ai-obstacles").addEventListener("click", () => void this.obstacles());
  }
