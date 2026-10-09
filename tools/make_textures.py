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
