import { byId, make } from "./dom";

export type ToastKind = "info" | "success" | "error";

/** Show a short message in the corner; it disappears by itself. */
export function toast(message: string, kind: ToastKind = "info", ms = 3200): void {
  const item = make("div", `toast is-${kind}`, message);
  item.setAttribute("role", kind === "error" ? "alert" : "status");
  byId("toasts").append(item);
  window.setTimeout(() => item.remove(), ms);
}
