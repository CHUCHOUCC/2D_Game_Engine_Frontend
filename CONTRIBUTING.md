# Contributing guide

Read this once, top to bottom, before writing any code. It takes 10 minutes.

## 1. The project in one minute

A 2D game **editor**. Four independent components:

```
Frontend (this repo) ──► Backend (FastAPI) ──► Database (PostgreSQL / Supabase)
                              │
                              └──► AI service (separate repo) ──► external AI API
```

- The **frontend** (TypeScript + Vite + Phaser) talks **only to the backend**. It never calls the AI service or the database.
- The scene data lives in `SceneModel` (`src/model/SceneModel.ts`). Phaser only **draws** it.
- Backend (deployed): https://twod-game-engine.onrender.com
- Read `README.md` first: it explains the folders and the data structures.

## 2. Non-negotiable rules

1. **All code in English**: identifiers, comments, commit messages, tests, README.
2. **Our own data structures.** Do not use `Array`, `Map`, `Set` or any library as the *implementation* of a structure. Use or write linked-node structures (`Node`, `LinkedList`, `Stack`, `Queue`). A plain array is only fine to hand data to an API (for example JSON) or to a library.
3. **No secrets in Git.** Never commit `.env`, keys or passwords. The frontend does not need any secret: only the public backend URL.
4. **Never push to `main`.** Work in a branch and open a Pull Request.
5. **You must be able to explain every line you commit.** You will be asked about it in the defense.

## 3. Set up (once)

```bash
git clone https://github.com/CHUCHOUCC/2D_Game_Engine_Frontend.git
cd 2D_Game_Engine_Frontend
npm install
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
npm run dev                 # open http://localhost:5173
npm test                    # must pass
```

The default `.env` points to `http://localhost:8000`. To use the deployed backend, set:

```
VITE_API_URL=https://twod-game-engine.onrender.com
```

The deployed backend runs on a free plan: the **first request can take about a minute** (it is waking up). That is normal.

## 4. Your Git identity (important: this is how your work is counted)

Your commits only count for you if the **name and email match your GitHub account**:

```bash
git config user.name "YOUR-GITHUB-USERNAME"
git config user.email "THE-EMAIL-LINKED-TO-YOUR-GITHUB-ACCOUNT"
git config user.email   # check it
```

After your first push, open the commit on GitHub and check that **your avatar** appears next to it. If it shows a grey ghost, the email is wrong.

## 5. Workflow for every piece of work

```bash
git checkout main
git pull
git checkout -b feature/short-name       # for example feature/play-mode

# ...work in small steps...
git add <only the files you changed>
git commit -m "Add player movement with arrow keys"
git push -u origin feature/short-name
```

Then, on GitHub: **Pull requests → New pull request**, base `main`, compare `feature/short-name`.
Another member reviews it and merges it. Delete the branch afterwards.

- Make **small, frequent commits** (one idea each), with a clear message in English that starts with a verb: `Add ...`, `Fix ...`, `Rename ...`.
- Do not use `git add .` or `git add -A` (you may add files you did not mean to).
- Before opening a PR run: `npm test` and `npm run build`. Both must pass.
- If Git says there is a **merge conflict** in `src/main.ts`, keep **both** sides' lines and ask in the group chat if you are not sure.

## 6. Tasks

The two tasks touch **different files**, so you will not step on each other. Each of you adds one
small `setup...` call to `src/main.ts` and `src/style.css`/`index.html` only if needed.

### Task A: Play mode  (branch `feature/play-mode`)

Goal: a **Play** button that runs the scene you edited as a tiny game, and an **Edit** button to go back.

- Create `src/game/PlayScene.ts`: a Phaser scene that reads the objects from `SceneModel`.
- A **player** (a shape of a different color) moves with the arrow keys and stays inside the 800x600 world.
- Touching a **coin** removes that coin from the *play* (not from the edited scene) and adds 1 to a **score** text.
- Touching an **enemy** shows "Game over" and a way to restart.
- Going back to Edit must show the scene exactly as it was edited.
- Register the scene in `src/main.ts` and add the two buttons in `index.html`.
- Tip: do not modify `SceneModel` to store play state; copy what you need when Play starts.

Done when: you can add coins/enemies in the editor, press Play, collect coins, and press Edit to return.

### Task B: Event queue and project list  (branch `feature/event-queue`)

Goal 1, **own Queue** (small, do it first): `src/structures/Queue.ts` with linked nodes
(`enqueue`, `dequeue`, `front`, `isEmpty`, `size`) and its tests in `src/structures/Queue.test.ts`.
Use `src/structures/Stack.ts` as a model. FIFO means first in, first out.

Goal 2, **score counter**: `src/model/ScoreCounter.ts` that receives game events (`{ type: "coin" }`,
`{ type: "enemy" }`) through your `Queue`, and keeps a score (+1 per coin). Tests included.
Task A will connect it to Play mode later.

Goal 3, **project list**: a panel that lists the user's projects with an **Open** button that
loads the chosen one. `listProjects()` already exists in `src/api/client.ts` (see how
`src/ui/AuthPanel.ts` and `src/main.ts` use it). Put the UI in `src/ui/ProjectList.ts`
and show the project name and last update. The editor is only visible after logging in.

Done when: the Queue and ScoreCounter tests pass, and the list shows the projects created in the editor.

### Later (whoever finishes first)

- Connect `ScoreCounter` (Task B) to `PlayScene` (Task A).
- Add a short "How to use" section to `README.md`.

## 7. Login

The app now has a login screen (`src/ui/AuthPanel.ts`). The token is kept in `sessionStorage` and sent
by `src/api/client.ts`; if the backend answers 401 the user goes back to the login screen.
To test locally you need an account: use **Register** on the login screen.

## 8. If you get stuck

1. Run `npm test` and read the first error.
2. Check the browser console (F12) and the Network tab.
3. Ask in the group chat with the **exact error text** and what you already tried.
