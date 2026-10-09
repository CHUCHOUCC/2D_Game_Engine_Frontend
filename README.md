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
