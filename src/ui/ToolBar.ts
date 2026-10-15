import type { Tool } from "../game/EditorScene";
import { byId } from "./dom";

export const TOOL_NAMES: Record<Tool, string> = {
  select: "Seleccionar",
  hand: "Mano",
  brush: "Pincel",
  erase: "Borrar",
};

/** The tool buttons of the top bar; one is always pressed. */
export class ToolBar {
  private current: Tool = "select";
  private readonly onChange: (tool: Tool) => void;

  constructor(onChange: (tool: Tool) => void) {
    this.onChange = onChange;
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
      button.addEventListener("click", () => this.set(button.dataset.tool as Tool));
    }
  }

  set(tool: Tool): void {
    this.show(tool);
    this.onChange(tool);
  }

  /** Update the buttons without notifying (the app already changed the tool). */
  show(tool: Tool): void {
    this.current = tool;
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
      const active = button.dataset.tool === tool;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    byId("status-tool").textContent = TOOL_NAMES[tool];
  }

  get value(): Tool {
    return this.current;
  }
}
