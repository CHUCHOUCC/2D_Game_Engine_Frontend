import { deleteProject, duplicateProject, listProjects, type ProjectDto } from "../api/client";
import { byId, errorText, make } from "./dom";
import { toast } from "./toast";

/** "hace 5 min", "ayer"... for the project dates. */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}
