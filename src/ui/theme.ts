export type ThemeSetting = "light" | "dark" | "system";

/** The theme to paint: "system" follows the operating system. */
export function resolveTheme(setting: ThemeSetting, prefersDark: boolean): "light" | "dark" {
  if (setting === "system") return prefersDark ? "dark" : "light";
  return setting;
}
