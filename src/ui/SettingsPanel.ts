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
