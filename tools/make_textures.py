"""Draw the textures the Kenney packs do not have as PNG files: the spike trap
and the projectiles (arrow, flying dagger, magic orb, spark) with their shadow.

Usage:  python tools/make_textures.py
Writes public/textures/<name>.png. Every other texture comes from
tools/import_kenney.py. The projectiles point to the right; the game rotates
them along their flight. The sprite is drawn on a small pixel grid and scaled
up 2x, so it stays crisp. No image library is needed.
"""
import pathlib
import struct
import zlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "textures"
SCALE = 2


def write_png(path: pathlib.Path, pixels: list, scale: int = SCALE) -> None:
    """pixels is a list of rows of (r, g, b, a) tuples."""
    height, width = len(pixels), len(pixels[0])
    raw = bytearray()
    for row in pixels:
        line = bytearray()
        for rgba in row:
            line.extend(bytes(rgba) * scale)
        for _ in range(scale):
            raw.append(0)  # filter type: none
            raw.extend(line)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width * scale, height * scale, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)



def rgba(hex_color: str) -> tuple:
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


CLEAR = (0, 0, 0, 0)


def from_grid(rows: list, palette: dict) -> list:
    """Each character of each row is a pixel; '.' is transparent."""
    width = len(rows[0])
    assert all(len(row) == width for row in rows), "rows must have the same width"
    return [[CLEAR if ch == "." else rgba(palette[ch]) for ch in row] for row in rows]


SPIKE = [
    "................",
    "................",
    "..s....s....s...",
    "..s....s....s...",
    ".sSs..sSs..sSs..",
    ".sSs..sSs..sSs..",
    "ssSSssSSSssSSs..",
    "sSSSsSSSSsSSSs..",
    "bbbbbbbbbbbbbbbb",
    "bBBBBBBBBBBBBBBb",
    "bbbbbbbbbbbbbbbb",
    "................",
    "..s....s....s...",
    ".sSs..sSs..sSs..",
    "sSSSssSSSssSSSs.",
    "bbbbbbbbbbbbbbbb",
]


def spike() -> list:
    return from_grid(SPIKE, {"s": "c9d1dc", "S": "7c8796", "b": "3b3f4a", "B": "565c6a"})


# A thin arrow pointing right: red fletching, wooden shaft, steel head.
ARROW = [
    "rr..........k..",
    ".rrsssssssssshk",
    "rr..........k..",
]

# A throwing dagger pointing right: leather grip, brass guard, steel blade.
DAGGER = [
    "...g.......",
    "bbbgsssssh.",
    "bbbgSSSSShh",
    "...g.......",
]

# A magic orb: white core, blue glow.
ORB = [
    "..bbbb..",
    ".bBBBBb.",
    "bBBwwBBb",
    "bBwwwwBb",
    "bBwwwwBb",
    "bBBwwBBb",
    ".bBBBBb.",
    "..bbbb..",
]

# The druid's spark: a small green star.
SPARK = [
    "...g...",
    "..gGg..",
    ".gGwGg.",
    "gGwwwGg",
    ".gGwGg.",
    "..gGg..",
    "...g...",
]

# The shadow under anything that flies.
SHADOW = [
    ".ssssss.",
    "ssssssss",
    ".ssssss.",
]


def arrow() -> list:
    return from_grid(ARROW, {"r": "d64545", "s": "a0693a", "h": "e8eef6", "k": "8a96a8"})


def dagger() -> list:
    return from_grid(DAGGER, {"b": "6b3f25", "g": "e0b84a", "s": "dfe7f1", "S": "9aa6b8", "h": "ffffff"})


def orb() -> list:
    return from_grid(ORB, {"b": "2d6cdf", "B": "5aa9ff", "w": "ffffff"})


def spark() -> list:
    return from_grid(SPARK, {"g": "1f9d6b", "G": "6ee7b7", "w": "ffffff"})


def shadow() -> list:
    return [[(0, 0, 0, 90) if ch == "s" else CLEAR for ch in row] for row in SHADOW]


SPRITES = {
    "spike": spike,
    "arrow": arrow,
    "dagger-flying": dagger,
    "orb": orb,
    "spark": spark,
    "shadow": shadow,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, draw in SPRITES.items():
        write_png(OUT / f"{name}.png", draw())
        print(f"textures/{name}.png")


if __name__ == "__main__":
    main()
