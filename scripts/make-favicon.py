"""Build favicons from the approved solid-silhouette example (no text)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "favicon-source.png"
WHITE = (255, 255, 255)


def prepare_square(src: Image.Image, size: int, pad: float = 0.04) -> Image.Image:
    im = src.convert("RGBA")
    bg = Image.new("RGBA", im.size, (*WHITE, 255))
    flat = Image.alpha_composite(bg, im).convert("RGB")

    px = flat.load()
    w, h = flat.size
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 245 or g < 245 or b < 245:
                xs.append(x)
                ys.append(y)
    if not xs:
        return Image.new("RGB", (size, size), WHITE)
    cropped = flat.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    canvas = Image.new("RGB", (size, size), WHITE)
    inner = int(size * (1 - pad * 2))
    fitted = cropped.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def main() -> None:
    src = Image.open(SRC)
    print("source", SRC.relative_to(ROOT), src.size)

    for size, out, pad in (
        (64, ROOT / "public/favicon.png", 0.05),
        (180, ROOT / "public/apple-touch-icon.png", 0.05),
        (192, ROOT / "public/icon-192.png", 0.05),
        (512, ROOT / "public/icon-512.png", 0.05),
    ):
        prepare_square(src, size, pad).save(out, format="PNG")

    i16 = prepare_square(src, 16, 0.04)
    i32 = prepare_square(src, 32, 0.04)
    i48 = prepare_square(src, 48, 0.05)
    i32.save(
        ROOT / "public/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[i16, i48],
    )
    print("ok")


if __name__ == "__main__":
    main()
