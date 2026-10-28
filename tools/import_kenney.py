"""Turn the Kenney "Tiny Dungeon" and "Tiny Town" packs into the engine's textures.

Usage:  pip install pillow
        python tools/import_kenney.py

Reads the original sheets in assets-src/kenney/ (CC0, see the License.txt files)
and writes public/textures/*.png. Every 16 px tile is scaled 2x with nearest
neighbour, so it stays crisp on the 32 px grid of the engine.
"""
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets-src" / "kenney"
OUT = ROOT / "public" / "textures"
TILE = 16
COLUMNS = 12
SCALE = 2

DUNGEON = "tiny-dungeon"
TOWN = "tiny-town"

# texture name -> (pack, tile index). Indexes follow the sheets, left to right, top to bottom.
SINGLE_TILES = {
    # player characters (one per hero class) and the generic player icon
    "player": (DUNGEON, 85),
    "hero-knight": (DUNGEON, 96),
    "hero-wizard": (DUNGEON, 84),
    "hero-archer": (DUNGEON, 112),
    "hero-barbarian": (DUNGEON, 88),
    "hero-rogue": (DUNGEON, 98),
    "hero-viking": (DUNGEON, 87),
    "hero-lancer": (DUNGEON, 86),
    "hero-druid": (DUNGEON, 100),
    # friendly 2D characters
    "villager": (DUNGEON, 99),
    "knight": (DUNGEON, 97),
    "wizard": (DUNGEON, 111),
    # enemies
    "enemy-slime": (DUNGEON, 108),
    "bat": (DUNGEON, 120),
    "spider": (DUNGEON, 122),
    "ghost": (DUNGEON, 121),
    "brute": (DUNGEON, 109),
    # obstacles and buildings
    "wall": (DUNGEON, 40),
    "box": (DUNGEON, 63),
    "barrel": (DUNGEON, 82),
    "tree": (TOWN, 16),
    "bush": (TOWN, 5),
    "fence": (TOWN, 45),
    # items
    "coin": (TOWN, 93),
    "chest": (DUNGEON, 89),
    "chest-open": (DUNGEON, 91),
    "potion": (DUNGEON, 115),
    "sword": (DUNGEON, 104),
    "axe": (DUNGEON, 118),
    "wand": (DUNGEON, 130),
    "bow": (TOWN, 118),
    # weapons only heroes carry (named after the weapon, like the ones above)
    "dagger": (DUNGEON, 103),
    "hammer": (DUNGEON, 117),
    "spear": (DUNGEON, 131),
    "staff": (DUNGEON, 129),
    # ground
    "grass": (TOWN, 0),
    "path": (TOWN, 25),
}

# Buildings made of several tiles: rows of (pack, tile index).
COMPOSITES = {
    "house": [
        [(TOWN, 52), (TOWN, 53), (TOWN, 54)],
        [(TOWN, 64), (TOWN, 65), (TOWN, 66)],
        [(TOWN, 84), (TOWN, 85), (TOWN, 84)],
    ],
}


def load_sheets() -> dict:
    return {pack: Image.open(SOURCE / pack / "tilemap_packed.png").convert("RGBA") for pack in (DUNGEON, TOWN)}


def tile(sheets: dict, pack: str, index: int) -> Image.Image:
    column, row = index % COLUMNS, index // COLUMNS
    return sheets[pack].crop((column * TILE, row * TILE, (column + 1) * TILE, (row + 1) * TILE))


def scaled(image: Image.Image) -> Image.Image:
    return image.resize((image.width * SCALE, image.height * SCALE), Image.NEAREST)


def composite(sheets: dict, rows: list) -> Image.Image:
    image = Image.new("RGBA", (len(rows[0]) * TILE, len(rows) * TILE), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, (pack, index) in enumerate(row):
            image.alpha_composite(tile(sheets, pack, index), (x * TILE, y * TILE))
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sheets = load_sheets()
    for name, (pack, index) in SINGLE_TILES.items():
        scaled(tile(sheets, pack, index)).save(OUT / f"{name}.png")
        print(f"textures/{name}.png")
    for name, rows in COMPOSITES.items():
        scaled(composite(sheets, rows)).save(OUT / f"{name}.png")
        print(f"textures/{name}.png")


if __name__ == "__main__":
    main()
