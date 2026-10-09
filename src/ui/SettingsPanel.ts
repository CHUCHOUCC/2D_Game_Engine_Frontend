import { getSettings, saveSettings, type SettingsDto } from "../api/client";
import { byId } from "./dom";
import { applyTheme, storedTheme } from "./theme";
import { toast } from "./toast";

export const DEFAULT_SETTINGS: SettingsDto = {
  theme: "dark",
  language: "es",
  show_grid: true,
  snap_to_grid: true,
  grid_size: 32,
  music_volume: 70,
  sfx_volume: 80,
};

/**
 * The drawer opened by the gear: theme (light, dark, system), grid and sound.
 * Changes apply at once and are saved to the account a moment later.
 */
export class SettingsPanel {
  private settings: SettingsDto = { ...DEFAULT_SETTINGS, theme: storedTheme() };
  private saveTimer: number | undefined;
  private readonly onChange: (settings: SettingsDto) => void;
  private readonly drawer = byId("settings");
  private readonly backdrop = byId("settings-backdrop");
  private readonly gear = byId("btn-settings");

  constructor(onChange: (settings: SettingsDto) => void) {
    this.onChange = onChange;
    applyTheme(this.settings.theme);
    this.gear.addEventListener("click", () => (this.drawer.hidden ? this.open() : this.close()));
    byId("settings-close").addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", () => this.close());
    this.bindInputs();
  }

  private bindInputs(): void {
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme-option]")) {
      button.addEventListener("click", () => this.update({ theme: button.dataset.themeOption as SettingsDto["theme"] }));
    }
    byId<HTMLInputElement>("set-grid").addEventListener("change", (e) => this.update({ show_grid: (e.target as HTMLInputElement).checked }));
    byId<HTMLInputElement>("set-snap").addEventListener("change", (e) => this.update({ snap_to_grid: (e.target as HTMLInputElement).checked }));
    byId<HTMLSelectElement>("set-grid-size").addEventListener("change", (e) => this.update({ grid_size: Number((e.target as HTMLSelectElement).value) }));
    byId<HTMLInputElement>("set-music").addEventListener("input", (e) => this.update({ music_volume: Number((e.target as HTMLInputElement).value) }));
    byId<HTMLInputElement>("set-sfx").addEventListener("input", (e) => this.update({ sfx_volume: Number((e.target as HTMLInputElement).value) }));
  }

  open(): void {
    this.render();
    this.drawer.hidden = false;
    this.backdrop.hidden = false;
    this.gear.setAttribute("aria-expanded", "true");
  }

  close(): void {
    this.drawer.hidden = true;
    this.backdrop.hidden = true;
    this.gear.setAttribute("aria-expanded", "false");
  }
