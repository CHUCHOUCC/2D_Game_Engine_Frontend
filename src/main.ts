import "./style.css";
import {
  createProject,
  finishRun,
  getMe,
  hasSession,
  http,
  logOut,
  renameProject,
  saveScene,
  startRun,
  type FinishDto,
  type ProjectDto,
  type RunResultDto,
  type UserDto,
} from "./api/client";
import { GameHost } from "./game/GameHost";
import { KIND_INFO, type Kind } from "./model/GameObject";
import { countByKind, hasPlayer, nextObjectId, SceneModel } from "./model/SceneModel";
import { AiPanel } from "./ui/AiPanel";
import { byId, errorText } from "./ui/dom";
import { setHudVisible, showHud } from "./ui/Hud";
import { Inspector } from "./ui/Inspector";
import { hideLoader, showLoader } from "./ui/loader";
import { LoginScreen } from "./ui/LoginScreen";
import { askNewProject } from "./ui/NewProjectDialog";
import { Palette } from "./ui/Palette";
import { refreshProgress } from "./ui/ProgressPanel";
import { ProjectList } from "./ui/ProjectList";
import { showResult } from "./ui/ResultDialog";
import { SettingsPanel } from "./ui/SettingsPanel";
import { bindShortcuts } from "./ui/shortcuts";
import { toast } from "./ui/toast";

const model = new SceneModel();
let projectId: number | null = null;
let savedVersion = 0;
let playing = false;
let runId: number | null = null;
let difficulty = 0.5;

function setStatus(message: string, kind: "info" | "error" | "success" = "info"): void {
  const status = byId("status");
  status.textContent = message;
  status.classList.toggle("is-error", kind === "error");
  status.classList.toggle("is-success", kind === "success");
}

/** Run an action and show its error, if any, as a toast. */
async function attempt(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    toast(errorText(error), "error");
  }
}

function isDirty(): boolean {
  return projectId !== null && model.version !== savedVersion;
}
