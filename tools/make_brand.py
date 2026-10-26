"""Cut the PixelForge logo into the images the app uses.

Usage:  pip install pillow
        python tools/make_brand.py

Reads assets-src/brand/pixelforge-logo.jpeg (logo on black) and writes:
  public/brand/emblem.png     the "P/D" emblem with the pixel invader
  public/brand/wordmark.png   "PIXELFORGE" and "2D GAME ENGINE"
  public/brand/logo.png       the whole logo, smaller
  public/favicon.png          64 x 64 icon for the browser tab

The black background becomes transparent while the blue glow is kept as
partial transparency, so the logo blends with any dark background.
"""
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets-src" / "brand" / "pixelforge-logo.jpeg"
OUT = ROOT / "public" / "brand"

# Regions of the 1536 x 862 source image (left, top, right, bottom).
EMBLEM_BOX = (420, 60, 1110, 545)
WORDMARK_BOX = (175, 560, 1365, 775)
# Pixels darker than this are pure background (JPEG noise).
NOISE = 18


def unblack(image: Image.Image) -> Image.Image:
    """Turn black into transparency: alpha is the brightest channel, colours are un-mixed from black."""
    rgb = image.convert("RGB")
    out = Image.new("RGBA", rgb.size)
    pixels = []
    raw = rgb.tobytes()
    for i in range(0, len(raw), 3):
        r, g, b = raw[i], raw[i + 1], raw[i + 2]
        peak = max(r, g, b)
        if peak <= NOISE:
            pixels.append((0, 0, 0, 0))
            continue
        alpha = min(255, int((peak - NOISE) * 255 / (255 - NOISE)))
        scale = 255 / peak
        pixels.append((min(255, int(r * scale)), min(255, int(g * scale)), min(255, int(b * scale)), alpha))
    out.putdata(pixels)
    return out


def fit(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = unblack(Image.open(SOURCE))
    emblem = logo.crop(EMBLEM_BOX)
    fit(emblem, 480).save(OUT / "emblem.png", optimize=True)
    fit(logo.crop(WORDMARK_BOX), 900).save(OUT / "wordmark.png", optimize=True)
    fit(logo, 900).save(OUT / "logo.png", optimize=True)
    # The tab icon is the emblem on the logo's own black, so it reads on any tab colour.
    icon = Image.new("RGBA", (emblem.width + 40, emblem.width + 40), (3, 6, 13, 255))
    icon.alpha_composite(emblem, (20, (icon.height - emblem.height) // 2))
    icon.resize((64, 64), Image.LANCZOS).save(ROOT / "public" / "favicon.png", optimize=True)
    for path in sorted(OUT.glob("*.png")) + [ROOT / "public" / "favicon.png"]:
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
