"""Clean solid favicon: navy silhouettes on white, no text."""
from __future__ import annotations

import math

from PIL import Image, ImageDraw

NAVY = (27, 39, 64)
WHITE = (255, 255, 255)


def draw_mark(size: int) -> Image.Image:
    im = Image.new("RGB", (size, size), WHITE)
    d = ImageDraw.Draw(im)
    s = float(size)
    stroke = max(3, round(s * 0.065))

    # Table
    ty0, ty1 = s * 0.68, s * 0.82
    d.polygon(
        [(s * 0.16, ty0), (s * 0.84, ty0), (s * 0.92, ty1), (s * 0.08, ty1)],
        fill=NAVY,
    )

    # Arch ending at table bottom corners
    cx, cy, r = s * 0.5, ty1, s * 0.44
    pts = [
        (cx + r * math.cos(math.radians(deg)), cy + r * math.sin(math.radians(deg)))
        for deg in range(198, 343)
    ]
    d.line(pts, fill=NAVY, width=stroke, joint="curve")

    # Cup — solid
    d.polygon(
        [
            (s * 0.23, s * 0.26),
            (s * 0.47, s * 0.26),
            (s * 0.43, ty0),
            (s * 0.27, ty0),
        ],
        fill=NAVY,
    )
    d.rectangle([s * 0.21, s * 0.20, s * 0.49, s * 0.28], fill=NAVY)
    d.rectangle([s * 0.27, s * 0.14, s * 0.36, s * 0.21], fill=NAVY)

    # Burger — one solid mass (no gaps)
    # top dome
    d.ellipse([s * 0.48, s * 0.26, s * 0.86, s * 0.55], fill=NAVY)
    # body down to table
    d.rectangle([s * 0.50, s * 0.40, s * 0.84, ty0], fill=NAVY)
    d.ellipse([s * 0.50, ty0 - s * 0.12, s * 0.84, ty0 + s * 0.04], fill=NAVY)

    return im


def main() -> None:
    for size, path in (
        (64, "public/favicon.png"),
        (180, "public/apple-touch-icon.png"),
        (192, "public/icon-192.png"),
        (512, "public/icon-512.png"),
    ):
        draw_mark(size).save(path, format="PNG")

    a, b, c = draw_mark(16), draw_mark(32), draw_mark(48)
    b.save(
        "public/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[a, c],
    )
    print("ok")


if __name__ == "__main__":
    main()
