# Motor 2D · Frontend

TypeScript + Vite + **Phaser 4 with Arcade Physics**. A full-screen 2D game editor and player:
build a top-down level with houses, walls, boxes, trees, spikes, coins, enemies and friendly 2D characters
(villager, knight, wizard) that walk around and talk, play it, and let
the AI learn from your runs to place harder (or easier) obstacles.

```
Frontend (this repo) ──► Backend (FastAPI) ──► PostgreSQL (53 tables)
                              │
                              └──► AI service (learns from every run)
```

The frontend only talks to the backend; it never calls the AI service or the database.

## Screens

| Screen | What it has |
|---|---|
| **Login** | Full window. Log in / create account tabs, eye button to show the password, strength meter, spinner in the button and an animated loading logo while it signs in. |
| **Editor** | Laid out like a 2D engine. Top bar: project, tools (Seleccionar `V`, Mano `H`, Pincel `B`, Borrar `E`), undo/redo, **Jugar** in the middle, save state, settings, user. Left dock: **Biblioteca** (search, categories, drag onto the map), **Escena** (hierarchy of the scene's objects; click selects, double click centres) and **Proyectos**. Right dock: **Inspector**, **IA** and **Progreso**. Viewport with zoom controls and a getting-started guide when the scene is empty. |
| **Settings wheel** | Light, dark or system theme; grid on/off, snap and size; music and effects volume; shortcuts. Saved to the account. |
| **Play** | The map fills the window. HUD with hearts, score, coins, enemies, time and the AI difficulty. A dialog at the end shows the result, what the AI learned and new achievements. |

## Texture pack and physics

| Kind | Texture | Arcade Physics body |
|---|---|---|
| Jugador | `player.png` (4-frame walk) | dynamic, moved by arrows/WASD, Space attacks |
| Caja | `box.png` | dynamic and **pushable**, drag 400 |
| Pared | `wall.png` | static |
| Casa | `house.png` (96 × 96) | static |
| Árbol | `tree.png` | static |
| Pinchos | `spike.png` | overlap: hurts |
| Moneda | `coin.png` (4-frame spin) | overlap: collected |
| Enemigo | `enemy-slime.png` (2 frames) | dynamic, chases the player; 3 hits to defeat |
| Aldeano, Caballero, Mago | `villager.png`, `knight.png`, `wizard.png` (4-frame walk) | dynamic, not pushable; wander, stop to face the player and say a line in a speech bubble |

All textures are original pixel art drawn by `tools/make_textures.py` (no third-party assets).
Enemies chase faster and from further away as the AI difficulty grows.

## Tokens

`src/api/tokens.ts` keeps the access token (15 min) and the refresh token in `sessionStorage`.
`src/api/http.ts` adds `Authorization: Bearer …` to every request, refreshes the pair shortly before
it expires or after a 401 (one refresh shared by parallel requests), and returns to the login screen
when the session cannot be renewed.

## Data structures (written by hand)

| Structure | File | Used for |
|---|---|---|
| `Node` | `src/structures/Node.ts` | Building block: data + next |
| `LinkedList` | `src/structures/LinkedList.ts` | Objects of the scene (`SceneModel`) and events of a run (`RunTracker`) |
| `Stack` | `src/structures/Stack.ts` | Undo and redo |
| `Queue` | `src/structures/Queue.ts` | Game events in `ScoreCounter` |

`SceneModel` is the single source of truth; Phaser only draws it. It is copied into a plain array
only to send it to the backend as JSON.

## Shortcuts

| Keys | Action |
|---|---|
| `Ctrl+S` | Save |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Supr` | Delete the selected object |
| `P` | Play |
| `V` `H` `B` `E` | Select, hand, brush, erase |
| `F` | Centre the view on the selection |
| `Esc` | Stop placing / leave the game |
| Right-click drag, wheel | Move and zoom the map |

## Run it

```bash
npm install
cp .env.example .env     # set VITE_API_URL if the backend is not on localhost:8000
npm run dev              # http://localhost:5173
npm test                 # unit tests (Vitest)
npm run build            # production build in dist/
npm run textures         # redraw the texture pack
```

| Variable | Meaning | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend | `http://localhost:8000` |

The backend must allow this site's origin in its `FRONTEND_ORIGINS` variable (CORS).
