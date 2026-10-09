export interface ShortcutActions {
  save: () => void;
  undo: () => void;
  redo: () => void;
  remove: () => void;
  play: () => void;
  cancel: () => void;
}

/** Which action a key press means, or null. Pure, so it can be tested. */
export function shortcutFor(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">): keyof ShortcutActions | null {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (mod && key === "s") return "save";
  if (mod && key === "z" && !event.shiftKey) return "undo";
  if (mod && (key === "y" || (key === "z" && event.shiftKey))) return "redo";
  if (!mod && (key === "delete" || key === "backspace")) return "remove";
  if (!mod && key === "p") return "play";
  if (key === "escape") return "cancel";
  return null;
}

/** Listen for shortcuts; `enabled()` is false while playing. Typing in fields is ignored. */
export function bindShortcuts(actions: ShortcutActions, enabled: () => boolean): void {
  window.addEventListener("keydown", (event) => {
    if (!enabled()) return;
    const target = event.target as HTMLElement | null;
    const typing = target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
    const action = shortcutFor(event);
    if (action === null || (typing && action !== "save")) return;
    event.preventDefault();
    actions[action]();
  });
}
