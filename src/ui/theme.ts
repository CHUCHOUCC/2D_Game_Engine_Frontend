export type ThemeSetting = "light" | "dark" | "system";

/** The theme to paint: "system" follows the operating system. */
export function resolveTheme(setting: ThemeSetting, prefersDark: boolean): "light" | "dark" {
  if (setting === "system") return prefersDark ? "dark" : "light";
  return setting;
}

const query = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
let current: ThemeSetting = "dark";

export function applyTheme(setting: ThemeSetting): void {
  current = setting;
  document.documentElement.dataset.theme = resolveTheme(setting, query?.matches ?? true);
  try {
    localStorage.setItem("engine-theme", setting);
  } catch {
    // the theme still applies for this visit
  }
}

query?.addEventListener("change", () => {
  if (current === "system") applyTheme("system");
});

/** Theme chosen last time on this device, used before the account settings arrive. */
export function storedTheme(): ThemeSetting {
  try {
    const value = localStorage.getItem("engine-theme");
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // ignore
  }
  return "dark";
}
