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

const inspector = new Inspector({
  move: (id, x, y) => model.move(id, x, y),
  remove: (id) => removeObject(id),
});

const palette = new Palette((kind) => {
  host.editor.setPlacing(kind);
  const hint = byId("placing-hint");
  hint.hidden = kind === null;
  if (kind !== null) hint.textContent = `Colocando: ${KIND_INFO[kind].name} — clic para poner, Esc para terminar`;
});

const host = new GameHost(
  byId("game"),
  model,
  {
    onSelect: (id) => inspector.show(id === null ? undefined : model.find(id)),
    onPlace: (kind, x, y) => placeObject(kind, x, y),
    onPointer: (x, y) => (byId("status-pointer").textContent = `x ${x} · y ${y}`),
    onZoom: (zoom) => (byId("zoom-value").textContent = `${Math.round(zoom * 100)}%`),
  },
  {
    onHud: showHud,
    onFinish: (result) => void runFinished(result),
  },
);

function placeObject(kind: Kind, x: number, y: number): void {
  if (kind === "player" && hasPlayer(model)) {
    toast("La escena ya tiene un jugador.", "error");
    palette.pick(null);
    return;
  }
  const id = nextObjectId(model, kind);
  model.add({ id, kind, x, y });
  if (kind === "player") palette.pick(null);
  host.editor.select(id);
}

function removeObject(id: string | null = host.editor.selectedId): void {
  if (id === null || !model.remove(id)) {
    setStatus("Selecciona un objeto para eliminarlo.", "error");
    return;
  }
  host.editor.select(null);
}

let seenVersion = -1;
function watchModel(): void {
  if (model.version !== seenVersion) {
    seenVersion = model.version;
    const counts = countByKind(model);
    byId("status-objects").textContent = `${model.size()} objetos · ${counts.coin ?? 0} monedas · ${counts.enemy ?? 0} enemigos`;
    palette.setPlayerAvailable(!hasPlayer(model));
    const selected = host.editor.selectedId;
    inspector.show(selected === null ? undefined : model.find(selected));
    byId<HTMLButtonElement>("btn-undo").disabled = !model.canUndo();
    byId<HTMLButtonElement>("btn-redo").disabled = !model.canRedo();
    document.title = `${isDirty() ? "● " : ""}Motor 2D · Editor de juegos`;
  }
  requestAnimationFrame(watchModel);
}

const projectList = new ProjectList(
  (project) => void attempt(async () => openProject(project)),
  (id) => {
    if (id === projectId) openProject(null);
  },
);

function openProject(project: ProjectDto | null): void {
  if (isDirty() && !window.confirm("Hay cambios sin guardar. ¿Abrir otro proyecto igualmente?")) return;
  projectId = project?.id ?? null;
  model.replaceAll(project?.scene ?? []);
  savedVersion = model.version;
  host.editor.select(null);
  const name = byId<HTMLInputElement>("project-name");
  name.value = project?.name ?? "";
  name.disabled = project === null;
  projectList.setCurrent(projectId);
  void projectList.refresh();
  void aiPanel.refresh();
  setStatus(project ? `Abierto "${project.name}".` : "Crea o abre un proyecto para empezar.");
}

async function newProject(): Promise<void> {
  const choice = await askNewProject();
  if (choice === null) return;
  const project = await createProject(choice.name, choice.template);
  openProject(project);
  toast(`Proyecto "${project.name}" creado.`, "success");
}

async function save(): Promise<void> {
  if (projectId === null) {
    toast("Crea o abre un proyecto primero.", "error");
    return;
  }
  const button = byId<HTMLButtonElement>("btn-save");
  button.classList.add("is-loading");
  try {
    const project = await saveScene(projectId, model.toJson());
    savedVersion = model.version;
    seenVersion = -1;
    setStatus(`Guardado: ${project.scene.length} objetos.`, "success");
    await projectList.refresh();
  } finally {
    button.classList.remove("is-loading");
  }
}

byId<HTMLInputElement>("project-name").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (projectId === null || input.value.trim() === "") return;
  void attempt(async () => {
    await renameProject(projectId!, input.value.trim());
    await projectList.refresh();
    toast("Nombre actualizado.", "success");
  });
});

const aiPanel = new AiPanel(
  () => projectId,
  (project) => {
    model.replaceAll(project.scene);
    savedVersion = model.version;
  },
  async () => {
    if (isDirty()) await save();
  },
);
