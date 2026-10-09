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

async function play(): Promise<void> {
  if (projectId === null) {
    toast("Crea o abre un proyecto para jugar.", "error");
    return;
  }
  palette.pick(null);
  if (isDirty()) await save();
  const run = await startRun(projectId);
  runId = run.id;
  difficulty = run.difficulty;
  setPlaying(true);
  host.play(difficulty);
}

function setPlaying(value: boolean): void {
  playing = value;
  byId("app").classList.toggle("is-playing", value);
  byId("btn-play").hidden = value;
  byId("btn-stop").hidden = !value;
  setHudVisible(value);
  setStatus(value ? "Jugando: flechas o WASD para moverte, Espacio para atacar." : "Editando.");
}

async function runFinished(result: RunResultDto): Promise<void> {
  let learned: FinishDto | null = null;
  if (projectId !== null && runId !== null) {
    learned = await finishRun(projectId, runId, result).catch(() => null);
  }
  runId = null;
  void refreshProgress();
  void aiPanel.refresh();
  const choice = await showResult(result, learned);
  if (choice === "again") {
    await attempt(async () => {
      const run = await startRun(projectId!);
      runId = run.id;
      difficulty = run.difficulty;
      host.restart(difficulty);
    });
  } else {
    setPlaying(false);
    host.edit();
  }
}

function bind(id: string, handler: () => void | Promise<void>): void {
  byId(id).addEventListener("click", () => void attempt(async () => handler()));
}

bind("btn-save", save);
bind("btn-undo", () => void model.undo());
bind("btn-redo", () => void model.redo());
bind("btn-play", play);
bind("btn-stop", () => host.quitPlay());
bind("btn-new-project", newProject);
bind("zoom-in", () => host.editor.zoomBy(1.2));
bind("zoom-out", () => host.editor.zoomBy(1 / 1.2));
bind("zoom-fit", () => host.editor.fitView());
bind("btn-logout", () => leaveApp(true));

bindShortcuts(
  {
    save: () => void attempt(save),
    undo: () => void model.undo(),
    redo: () => void model.redo(),
    remove: () => removeObject(),
    play: () => void attempt(play),
    cancel: () => {
      palette.pick(null);
      host.editor.select(null);
    },
  },
  () => !playing && byId("app").hidden === false,
);

window.addEventListener("beforeunload", (event) => {
  if (isDirty()) event.preventDefault();
});

const settings = new SettingsPanel((value) =>
  host.setEditorOptions({ showGrid: value.show_grid, snapToGrid: value.snap_to_grid, gridSize: value.grid_size }),
);

const login = new LoginScreen(enterApp);

async function enterApp(user: UserDto): Promise<void> {
  showLoader("Preparando tu espacio de trabajo…");
  login.hide();
  byId("app").hidden = false;
  byId("user-name").textContent = user.username;
  byId("user-avatar").textContent = user.username.slice(0, 1);
  host.start();
  await settings.load();
  const projects = await projectList.refresh().catch(() => []);
  openProject(projects[0] ?? null);
  void refreshProgress();
  hideLoader();
  toast(`¡Hola, ${user.username}!`, "success");
}

async function leaveApp(callBackend: boolean, note = ""): Promise<void> {
  if (callBackend) {
    if (isDirty() && !window.confirm("Hay cambios sin guardar. ¿Salir igualmente?")) return;
    await logOut();
  }
  if (playing) {
    setPlaying(false);
    host.edit();
  }
  projectId = null;
  model.replaceAll([]);
  savedVersion = model.version;
  projectList.clear();
  settings.close();
  byId("app").hidden = true;
  login.show(note);
}

http.whenSessionLost(() => void leaveApp(false, "Tu sesión terminó. Vuelve a iniciar sesión."));

window.setInterval(() => {
  if (http.tokens.refresh !== null && http.tokens.expiresSoon(120_000)) void http.refreshTokens();
}, 30_000);

async function boot(): Promise<void> {
  showLoader("Cargando motor…");
  requestAnimationFrame(watchModel);
  if (hasSession()) {
    try {
      await enterApp(await getMe());
      return;
    } catch {
      http.tokens.clear();
    }
  }
  login.show();
  hideLoader();
}

void boot();
