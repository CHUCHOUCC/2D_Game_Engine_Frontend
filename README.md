# Motor 2D · Frontend

TypeScript + Vite + **Phaser 4 with Arcade Physics**. A full-screen 2D game editor and player:
build a top-down level with houses, walls, boxes, trees, spikes, coins and enemies, play it, and let
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
| **Editor** | Top bar (project name, save, undo/redo, play, zoom, settings wheel, user), object palette and project list on the left, the map in the centre, inspector, AI and progress on the right, status bar at the bottom. |
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
| `Esc` | Stop placing / leave the game |
| Right-click drag, wheel | Move and zoom the map |
