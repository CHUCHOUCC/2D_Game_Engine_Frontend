# PixelForge · 2D Game Engine · Frontend

TypeScript + Vite + **Phaser 4 with Arcade Physics**. A full-screen 2D game engine: build a top-down
level with houses, walls, fences, boxes, barrels, spikes, coins, chests, weapons, five kinds of
enemies and friendly 2D characters, pick a hero and play it, and let the AI learn from your runs to
place harder (or easier) obstacles.

```
Frontend (this repo) ──► Backend (FastAPI) ──► PostgreSQL (53 tables)
                              │
                              └──► AI service (learns from every run)
```

The frontend only talks to the backend; it never calls the AI service or the database.

## Screens

The flow is **access → intro → home → editor**. Nothing of the engine (menu, options, navigation)
exists on the page until the user has logged in or registered.

| Screen | What it has |
|---|---|
| **Access** | Full window, always in the logo's dark look. Left: the living PixelForge logo (halo, rotating energy ring, light sweep over the letters, sparks, electric arcs and lightning strikes on a canvas) with the heroes walking around it: the knight chased by a slime, the barbarian and the archer on a lane, the wizard casting a bolt with his wand, a bat circling the logo and a ghost. Right: log in / create account with live validation (see below). |
| **Intro** | About 5 seconds after logging in or registering, while the workspace loads: the emblem lights up between lightning, the wordmark is wiped in with a glint and a bar fills. Skippable with any key or *Saltar*. Not shown again when a session is restored on reload. |
| **Home** | Navigation bar (*Inicio, Editor, Jugar, Proyectos, Ajustes*, it wraps instead of cutting options off), welcome with projects, games, best score and achievements, the four options and the recent projects. |
| **Editor** | Laid out like a 2D engine. Top bar: PixelForge button back to the home, project, tools (Seleccionar `V`, Mano `H`, Pincel `B`, Borrar `E`), undo/redo, **Jugar** in the middle, save state, settings, user. Left dock: **Biblioteca** (search; *Personajes, Enemigos, Construcción, Obstáculos, Objetos*; drag onto the map), **Escena** and **Proyectos**. Right dock: **Inspector**, **IA** and **Progreso**. Docks slide in, tools and cards glow in the logo's blue. |
| **Settings wheel** | Light, dark or system theme; grid on/off, snap and size; music and effects volume; security; shortcuts. Saved to the account. |
| **Hero select** | Before every run, one of eight heroes: Caballero (sword), Mago (wand), Arquero (bow), Bárbaro (axe), Pícaro (daggers), Vikingo (hammer), Lancero (spear) or Druida (staff), each with its health, speed and power. The last choice is remembered on the device. |
| **Play** | The map fills the window. HUD with the hero, a health bar, the weapon slot and the dash slot with their cooldowns, score, coins, enemies, time and the AI difficulty. A dialog at the end shows the result, what the AI learned and new achievements. |

### Validation of the access form

Every field is checked while typing (errors wait until the field has been left once) and says how to
fix the problem: username of 3-20 letters, digits or `_`; email with a detailed message for a missing
`@`, name, domain or ending; password checklist (length, letters with numbers or symbols, not common,
not your name or email) with a strength meter; confirmation; terms checkbox; Caps Lock warning. A
wrong login shows how many attempts are left before the 15-minute lockout (the backend sends
`X-Attempts-Remaining`). The backend checks the same rules again.

## Combat, objects and physics

| Kind | Arcade Physics body | In the game |
|---|---|---|
| Héroe | dynamic, WASD/arrows | walking has inertia (agility per hero) and slows while aiming; `Espacio` attacks after a windup, `Shift` dashes (short invulnerability) |
| Espada, Hacha | — | the weapon goes back, the hero steps forward and sweeps an arc in front |
| Martillo | — | raised overhead, then slams the ground: a shockwave hits and pushes everything around |
| Lanza | — | pulled back, then a long thrust with a jump forward |
| Varita | — | an orb gathers at the tip, then flies, speeds up and explodes on contact (area damage) |
| Báculo | — | a spark that bounces off walls up to three times and goes through one enemy |
| Dagas | — | three spinning daggers thrown in a fan |
| Arco | arrows are dynamic bodies | the hero draws the bow (hold `Espacio` to draw further); the arrow flies in an arc with a shadow, tilts as it rises and falls, and sticks in walls and the ground |
| Slime, Murciélago, Araña, Fantasma, Ogro, Rata | dynamic | each has its own health bar, speed, damage, points and way of moving; bats and ghosts pass over walls |
| Arquero oscuro, Nigromante | dynamic | keep their distance and strafe; a red aiming line or gathering magic warns before they shoot arrows or cursed orbs. Dash through shots (Shift) or knock them out of the air with a melee swing |
| Demonio (jefe) | dynamic, heavy | 30 health; chases, alternates aimed volleys and rings of fireballs, and gets faster at half health |
| Mímico | dynamic | sleeps disguised as a chest until the player comes close |
| Agua | static | blocks walking (not bats, ghosts or projectiles); arrows that fall in it splash |
| Camino, Arena, Puente | none | ground drawn under everything |
| Cofre | static | touching it opens it: a weapon or a potion jumps out |
| Poción, armas | overlap | picked up: heals 2, or changes the weapon |
| Caja, Barril | dynamic and **pushable** (the barrel is heavier) | |
| Pared, Casa, Árbol, Arbusto, Valla | static | |
| Pinchos | overlap | hurt |
| Moneda | overlap | collected; all coins win the level |
| Aldeana, Caballero, Mago | dynamic, not pushable | wander, stop to face the player and say a line |

Hits flash the target, push it back and show the damage; enemies get faster as the AI difficulty grows.
Projectiles have a ground position and a height with gravity (`src/game/projectiles.ts`): the shadow carries the physics body and the sprite is drawn above it. The rules live without Phaser in `src/game/combat.ts`, `projectiles.ts`, `RunTracker.ts` and `ScoreCounter.ts` and are
unit tested.

### Sound

Effects for every attack, hit, pickup, enemy shot and footstep, and a jingle when a run is won or lost, from Kenney's RPG Audio, Impact Sounds, Interface Sounds, Digital Audio and Music Jingles packs (CC0; licences in `assets-src/kenney/audio/`). Each sound is in `public/audio/` as OGG and MP3 (for browsers without OGG). The effects and music sliders in the settings drawer set their volume (`src/game/audio.ts`).

## Textures and brand

The textures are the **Kenney "Tiny Dungeon" and "Tiny Town"** packs (CC0, by kenney.nl; the original
sheets and licences are in `assets-src/kenney/`). `tools/import_kenney.py` cuts the 16 px tiles, scales
them 2× with nearest neighbour and writes `public/textures/`. `tools/make_textures.py` draws the
spikes. `tools/make_brand.py` cuts the PixelForge logo (`assets-src/brand/`) into the emblem, the
wordmark and the favicon, turning its black background into transparency.

### Ready-made maps

"Nuevo proyecto" shows each map with a small picture of it (`src/ui/mapPreview.ts`). Besides the
empty scene and the village, the backend offers five of Kenney's sample maps (CC0): a dungeon
(Tiny Dungeon), a kingdom, a house and a city with streets (1-Bit Pack), and a village with a lake,
forest and camp (Roguelike/RPG pack). Streets and stone paths use the `path` kind: ground drawn
under everything, with no body. Where the maps come from and how they were converted is in the
backend repo, `maps/README.md`.

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

The game is published on Vercel: https://2-d-game-engine-frontend.vercel.app. Every merge to
`main` goes to production by itself, and every pull request gets its own preview link.

```bash
npm install
cp .env.example .env     # set VITE_API_URL if the backend is not on localhost:8000
npm run dev              # http://localhost:5173
npm test                 # unit tests (Vitest)
npm run build            # production build in dist/
npm run textures         # rebuild the textures from the Kenney sheets
npm run brand            # rebuild the logo images
npm run e2e              # browser tests (Playwright) on a local stack
```

| Variable | Meaning | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend | `http://localhost:8000` |

The backend must allow this site's origin in its `FRONTEND_ORIGINS` variable (CORS).
