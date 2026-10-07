import Phaser from "phaser";
import "./style.css";
import { askAi, createProject, getProject, listProjects, onUnauthorized, saveScene } from "./api/client";
import { EditorScene } from "./game/EditorScene";
import { WORLD_HEIGHT, WORLD_WIDTH, type Kind } from "./model/GameObject";
import { SceneModel } from "./model/SceneModel";
import { setupAuthPanel } from "./ui/AuthPanel";

const model = new SceneModel();
const scene = new EditorScene(model);

// The Phaser game is created after the first login, when the editor is visible.
let game: Phaser.Game | null = null;

function startGame(): void {
  if (game !== null) {
    return;
  }
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: "#10141b",
    scene: [scene],
  });
}

let projectId: number | null = null;

const statusEl = document.getElementById("status") as HTMLElement;
const projectEl = document.getElementById("project") as HTMLElement;
const promptEl = document.getElementById("prompt") as HTMLInputElement;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setProject(id: number | null): void {
  projectId = id;
  projectEl.textContent = id === null ? "No project yet" : `Project #${id}`;
}

function requireProject(): number | null {
  if (projectId === null) {
    setStatus("Create or load a project first.", true);
  }
  return projectId;
}

/** Run a backend call and show its result or its error in the status bar. */
async function run(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unexpected error", true);
  }
}

function bind(id: string, handler: () => void | Promise<void>): void {
  document.getElementById(id)!.addEventListener("click", () => void run(async () => handler()));
}

function addObject(kind: Kind): void {
  const count = model.size();
  model.add({
    id: `${kind}-${crypto.randomUUID().slice(0, 8)}`,
    kind,
    x: 100 + ((count * 45) % 600),
    y: 100 + ((count * 35) % 400),
  });
}

const auth = setupAuthPanel({
  onLoggedIn: async (user) => {
    startGame();
    model.replaceAll([]);
    setProject(null);
    setStatus(`Welcome, ${user.username}.`);
    await run(async () => {
      // Open the user's most recently updated project, if there is one.
      const projects = await listProjects();
      if (projects.length > 0) {
        model.replaceAll(projects[0].scene);
        setProject(projects[0].id);
        setStatus(`Welcome back, ${user.username}. Opened "${projects[0].name}".`);
      } else {
        setStatus(`Welcome, ${user.username}. Create your first project.`);
      }
    });
  },
  onLoggedOut: () => {
    model.replaceAll([]);
    scene.selectedId = null;
    setProject(null);
    setStatus("");
  },
});

// A 401 on a request that carried a token means the session expired.
onUnauthorized(() => auth.expire());

bind("new-project", async () => {
  const project = await createProject("My game");
  model.replaceAll(project.scene);
  setProject(project.id);
  setStatus(`Created project #${project.id}.`);
});

bind("save", async () => {
  const id = requireProject();
  if (id === null) return;
  const project = await saveScene(id, model.toJson());
  setStatus(`Saved ${project.scene.length} objects.`);
});

bind("load", async () => {
  const id = requireProject();
  if (id === null) return;
  const project = await getProject(id);
  model.replaceAll(project.scene);
  setStatus(`Loaded ${project.scene.length} objects.`);
});

bind("ask-ai", async () => {
  const id = requireProject();
  if (id === null) return;
  const prompt = promptEl.value.trim();
  if (prompt === "") {
    setStatus("Write what the AI should add.", true);
    return;
  }
  setStatus("Asking the AI...");
  const project = await askAi(id, prompt);
  model.replaceAll(project.scene);
  setStatus(`The AI updated the scene (${project.scene.length} objects).`);
});

bind("add-box", () => addObject("box"));
bind("add-coin", () => addObject("coin"));
bind("add-enemy", () => addObject("enemy"));
bind("delete", () => {
  if (scene.selectedId === null || !model.remove(scene.selectedId)) {
    setStatus("Click an object to select it first.", true);
    return;
  }
  scene.selectedId = null;
});
bind("undo", () => {
  if (!model.undo()) setStatus("Nothing to undo.");
});
bind("redo", () => {
  if (!model.redo()) setStatus("Nothing to redo.");
});

setProject(null);
void auth.restoreSession();
