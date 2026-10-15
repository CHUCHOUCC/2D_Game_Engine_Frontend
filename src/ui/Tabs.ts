/**
 * Tabbed docks: every [data-tabs] container has [data-tab] buttons and
 * [data-panel] sections with the same names. Only one panel is visible.
 */
export function setupTabs(root: ParentNode = document): void {
  for (const dock of root.querySelectorAll<HTMLElement>("[data-tabs]")) {
    for (const tab of dock.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
      tab.addEventListener("click", () => showTab(tab.dataset.tab!));
    }
  }
}

/** Show the panel with this name in whichever dock has it. */
export function showTab(name: string): void {
  const tab = document.querySelector<HTMLButtonElement>(`[data-tab="${name}"]`);
  const dock = tab?.closest<HTMLElement>("[data-tabs]");
  if (!tab || !dock) return;
  for (const other of dock.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    const active = other === tab;
    other.classList.toggle("is-active", active);
    other.setAttribute("aria-selected", String(active));
  }
  for (const panel of dock.querySelectorAll<HTMLElement>("[data-panel]")) {
    panel.hidden = panel.dataset.panel !== name;
  }
}
