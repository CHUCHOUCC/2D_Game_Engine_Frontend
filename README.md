# 2D Game Editor — Frontend

TypeScript + Vite + Phaser. This is the **frontend** of a 2D game editor. It only talks to the
**backend** (FastAPI); it never calls the AI service or the database directly.

```
Frontend (this repo) ──► Backend (FastAPI) ──► Database (PostgreSQL / Supabase)
                              │
                              └──► AI service (separate deployment) ──► external AI API
```

## What it does

- Create a project, add boxes / coins / enemies, drag them, delete them.
- Undo / redo (two stacks).
- Save the scene to the backend and load it back.
- "Ask AI": send a text prompt to the backend, which asks the AI service and returns the updated scene.

## Data structures (written by hand, no native `Array`/`Map` as the implementation)

| Structure | File | Used for |
|---|---|---|
| `Node` | `src/structures/Node.ts` | Building block of the others: data + reference to the next node |
| `LinkedList` | `src/structures/LinkedList.ts` | The list of objects in the scene (`SceneModel`) |
| `Stack` | `src/structures/Stack.ts` | Undo and redo history (two stacks of commands) |

`SceneModel` (`src/model/SceneModel.ts`) is the single source of truth. Phaser only draws it
(`src/game/EditorScene.ts`). The scene is copied into a plain array only at the last moment, to
send it as JSON to the backend.

## Project layout

```
src/
  api/client.ts          calls to the backend (fetch)
  game/EditorScene.ts    Phaser scene: draws the model, handles drag and selection
  model/                 GameObject type and SceneModel (LinkedList + Stacks)
  structures/            Node, LinkedList, Stack (+ tests)
  main.ts                Phaser game and toolbar wiring
```

## Run it

```bash
npm install
cp .env.example .env     # set VITE_API_URL if the backend is not on localhost:8000
npm run dev              # http://localhost:5173
npm test                 # unit tests (Vitest)
npm run build            # production build in dist/
```

## Configuration

| Variable | Meaning | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend | `http://localhost:8000` |

The backend must allow this site's origin in its `FRONTEND_ORIGINS` variable (CORS).
