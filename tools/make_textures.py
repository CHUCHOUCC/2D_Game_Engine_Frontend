"""Draw the engine's pixel-art texture pack and save it as PNG files.

Usage:  python tools/make_textures.py
Writes public/textures/*.png. Every sprite is drawn on a small pixel grid and
scaled up 2x, so it stays crisp. No image library is needed.
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


def side_by_side(frames: list) -> list:
    """Join frames horizontally into a sprite sheet."""
    return [sum((frame[y] for frame in frames), []) for y in range(len(frames[0]))]

PLAYER_COLORS = {"h": "5b3a29", "s": "f2c6a0", "e": "1b1b2f", "b": "3d7bd9", "B": "2c5aa8",
                 "p": "2e3a4f", "k": "4a2f1f"}
PLAYER_TOP = [
    "......hhhh......",
    ".....hhhhhh.....",
    ".....hssssh.....",
    ".....sesses.....",
    ".....ssssss.....",
    "......ssss......",
    "....bbbbbbbb....",
    "...sbbBbbBbbs...",
    "...sbbbbbbbbs...",
    "....bbbbbbbb....",
    "....BBBBBBBB....",
]
PLAYER_LEGS = [
    [".....pppppp.....", ".....pp..pp.....", ".....pp..pp.....", ".....kk..kk.....", "................"],
    [".....pppppp.....", ".....pp...pp....", "....pp....pp....", "....kk.....kk...", "................"],
    [".....pppppp.....", ".....pp..pp.....", ".....pp..pp.....", ".....kk..kk.....", "................"],
    [".....pppppp.....", "....pp...pp.....", "....pp....pp....", "...kk.....kk....", "................"],
]


def player() -> list:
    return side_by_side([from_grid(PLAYER_TOP + legs, PLAYER_COLORS) for legs in PLAYER_LEGS])

BOX = [
    "oooooooooooooooo",
    "owwwwwwwwwwwwwwo",
    "owdwwwwwwwwwwdwo",
    "owwdwwwwwwwwdwwo",
    "owwwdwwwwwwdwwwo",
    "owwwwdwwwwdwwwwo",
    "owwwwwdwwdwwwwwo",
    "owwwwwwddwwwwwwo",
    "owwwwwwddwwwwwwo",
    "owwwwwdwwdwwwwwo",
    "owwwwdwwwwdwwwwo",
    "owwwdwwwwwwdwwwo",
    "owwdwwwwwwwwdwwo",
    "owdwwwwwwwwwwdwo",
    "owwwwwwwwwwwwwwo",
    "oooooooooooooooo",
]


def box() -> list:
    return from_grid(BOX, {"o": "4a2e14", "w": "c4893f", "d": "8a5a28"})



def wall() -> list:
    rows = []
    for course in range(4):
        joint = 7 if course % 2 == 0 else 3
        brick = "".join("m" if (x - joint) % 8 == 0 else "r" for x in range(16))
        light = brick.replace("r", "R")
        rows += [light, brick, brick, "m" * 16]
    return from_grid(rows, {"m": "9a948c", "r": "a4483a", "R": "c45c4a"})

TREE = [
    "......dddd......",
    "....ddGGggdd....",
    "...dGGGgggggd...",
    "..dGGgggggggd...",
    "..dGgggggGggdd..",
    ".dGggggGGgggggd.",
    ".dgggggggggGggd.",
    ".dggGgggggggggd.",
    "..dgggggggggdd..",
    "...ddggggggdd...",
    ".....ddtTdd.....",
    "......tTT.......",
    "......tTT.......",
    "......tTT.......",
    ".....ttTTT......",
    "................",
]


def tree() -> list:
    return from_grid(TREE, {"d": "24642a", "g": "3f9b3a", "G": "6cc24a", "t": "6b4423", "T": "4a2e17"})

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

COIN_FRAMES = [
    ["................", "................", ".....oooooo.....", "....oyyyyyyo....", "...oyYYyyyyyo...",
     "...oyYyyyyyyo...", "...oyyyooyyyo...", "...oyyyooyyyo...", "...oyyyooyyyo...", "...oyyyyyyyyo...",
     "...oyyyyyyyyo...", "....oyyyyyyo....", ".....oooooo.....", "................", "................",
     "................"],
    ["................", "................", "......oooo......", ".....oyyyyo.....", ".....oYyyyo.....",
     ".....oYyyyo.....", ".....oyyoyo.....", ".....oyyoyo.....", ".....oyyoyo.....", ".....oyyyyo.....",
     ".....oyyyyo.....", ".....oyyyyo.....", "......oooo......", "................", "................",
     "................"],
    ["................", "................", ".......oo.......", ".......oo.......", ".......Yo.......",
     ".......Yo.......", ".......yo.......", ".......yo.......", ".......yo.......", ".......yo.......",
     ".......yo.......", ".......oo.......", ".......oo.......", "................", "................",
     "................"],
]


def coin() -> list:
    palette = {"o": "a8741a", "y": "f6c945", "Y": "fff1a8"}
    frames = [from_grid(f, palette) for f in COIN_FRAMES]
    return side_by_side([frames[0], frames[1], frames[2], frames[1]])

SLIME_FRAMES = [
    ["................", "................", "................", "................", "......oooo......",
     "....oollllo.....", "...olllbbbbo....", "..olbbbbbbbbo...", "..olbwwbbwwbo...", ".olbbwkbbwkbbo..",
     ".obbbbbbbbbbbo..", ".obbbbbbbbbbbo..", ".obbbbbbbbbbbo..", "..oobbbbbbboo...", "....ooooooo.....",
     "................"],
    ["................", "................", "................", "................", "................",
     "................", ".....oooooo.....", "...oollllllo....", "..olbbwwbbwwbo..", ".olbbbwkbbwkbbo.",
     "obbbbbbbbbbbbbbo", "obbbbbbbbbbbbbbo", "obbbbbbbbbbbbbbo", ".oobbbbbbbbbboo.", "...oooooooooo...",
     "................"],
]


def slime() -> list:
    palette = {"o": "5a1730", "b": "c2335a", "l": "e8698a", "w": "ffffff", "k": "1b1b2f"}
    return side_by_side([from_grid(f, palette) for f in SLIME_FRAMES])



def grass() -> list:
    rows = []
    for y in range(16):
        row = ""
        for x in range(16):
            value = (x * 7 + y * 13 + x * y) % 11
            row += "G" if value == 0 else ("d" if value == 5 else "g")
        rows.append(row)
    return from_grid(rows, {"g": "4c9a3f", "G": "5bb24c", "d": "3f8434"})



def house() -> list:
    size = 48
    px = [[CLEAR] * size for _ in range(size)]

    def fill(x0, y0, x1, y1, color):
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[y][x] = rgba(color)

    fill(36, 2, 41, 12, "6b4a2a")              # chimney
    fill(5, 20, 43, 47, "6b4a2a")              # wall outline
    fill(6, 21, 42, 46, "e8d5a8")              # wall
    for y in range(4, 22):                     # roof, stepped like pixel art
        inset = max(0, 21 - y)
        fill(max(0, inset), y, min(size, size - inset), y + 1, "7a2a28" if y % 4 == 0 else "b0413e")
    fill(20, 32, 28, 47, "4a2e17")             # door frame
    fill(21, 33, 27, 47, "7a4a24")             # door
    fill(25, 39, 26, 41, "f6c945")             # knob
    for wx in (9, 32):                         # windows
        fill(wx, 26, wx + 8, 34, "6b4a2a")
        fill(wx + 1, 27, wx + 7, 33, "9fd3f0")
        fill(wx + 4, 27, wx + 5, 33, "6b4a2a")
        fill(wx + 1, 30, wx + 7, 31, "6b4a2a")
    fill(5, 46, 43, 48, "4a3a2a")              # foundation
    return px



def path_tile() -> list:
    rows = []
    for y in range(16):
        rows.append("".join("p" if (x * 5 + y * 3) % 9 else "P" for x in range(16)))
    return from_grid(rows, {"p": "d9c08a", "P": "c2a76f"})
