/**
 * In production the browser console stays empty: no library banners, warnings or
 * debug output that could tell a curious visitor how the game works inside.
 * This module is imported first by main.ts so it runs before anything else.
 * (What the browser itself prints, such as a failed request, cannot be hidden by
 * a page; the API is built so those say nothing useful.)
 */
export function quietConsole(target: Console = console): void {
  const silent = () => undefined;
  for (const method of ["log", "info", "warn", "error", "debug", "trace", "table", "dir", "dirxml", "group", "groupCollapsed", "groupEnd", "time", "timeEnd", "timeLog", "count", "countReset", "assert"] as const) {
    try {
      (target as unknown as Record<string, unknown>)[method] = silent;
    } catch {
      // a locked console: nothing to do
    }
  }
}

if (import.meta.env.PROD) quietConsole();
