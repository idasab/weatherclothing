"""Genererar appens ikoner i alla storlekar.

Motivet är en legogubbes ansikte: platta, nästan kvadratiska solglasögon och
ett streckleende i grafit mot en helt platt gul botten. Inga gradienter, inga
skuggor och inga reflexer — formen bär motivet, och det är hela poängen.

Körs med `python tools/generate-icons.py` och skriver över filerna i
src/assets/icons. Inga beroenden utöver standardbiblioteket.
"""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "icons"

# 180 för hemskärmen, 192 och 512 för manifestet, 1024 för Xcode.
SIZES = (180, 192, 512, 1024)

GRAPHITE = (28, 30, 34)
YELLOW = (247, 216, 138)

# Supersampling per axel. Ikonen har hårda kanter, så det behövs för mjuka linjer.
SAMPLES = 3

# Glasögonen: platta, nästan kvadratiska glas och en enda balk från kant till
# kant som är både brygga och skalm. Enkelheten är motivet.
LENS_TOP, LENS_BOTTOM = 0.325, 0.615
LEFT_LENS = (0.150, 0.455)
RIGHT_LENS = (0.545, 0.850)
LENS_CORNER = 0.085
BAR_TOP, BAR_BOTTOM = 0.432, 0.478
BAR_LEFT, BAR_RIGHT = 0.030, 0.970
BAR_CORNER = 0.023

# Munnen är nedre delen av en cirkelbåge. Mellanrummet upp till glasögonen är
# 0,100 av ikonens höjd — glasögonen sitter halva mellanrummet över mitten och
# munnen halva under, så motivet stannar centrerat.
MOUTH_CENTER = (0.500, 0.630)
MOUTH_RADIUS = 0.155
MOUTH_HALF_WIDTH = 0.022
MOUTH_MIN_DY = 0.085


def in_rounded_rect(x, y, x0, x1, y0, y1, radius):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    radius = min(radius, (x1 - x0) / 2, (y1 - y0) / 2)
    cx = min(max(x, x0 + radius), x1 - radius)
    cy = min(max(y, y0 + radius), y1 - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius


def in_lens(x, y, lens):
    return in_rounded_rect(x, y, lens[0], lens[1], LENS_TOP, LENS_BOTTOM, LENS_CORNER)


def in_glasses(x, y):
    """Två nästan kvadratiska glas på en genomgående balk."""
    if in_rounded_rect(x, y, BAR_LEFT, BAR_RIGHT, BAR_TOP, BAR_BOTTOM, BAR_CORNER):
        return True
    return in_lens(x, y, LEFT_LENS) or in_lens(x, y, RIGHT_LENS)


def in_mouth(x, y):
    """Legogubbens streckleende: bara bågens nedre del ritas."""
    center_x, center_y = MOUTH_CENTER
    dy = y - center_y
    if dy < MOUTH_MIN_DY:
        return False
    distance = math.hypot(x - center_x, dy)
    return abs(distance - MOUTH_RADIUS) <= MOUTH_HALF_WIDTH


def sample(x, y):
    if in_glasses(x, y) or in_mouth(x, y):
        return GRAPHITE
    return YELLOW


def chunk(tag, payload):
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def render(size):
    rows = bytearray()
    step = 1.0 / (size * SAMPLES)

    for py in range(size):
        rows.append(0)  # filtertyp None
        for px in range(size):
            red = green = blue = 0
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    color = sample(
                        (px * SAMPLES + sx + 0.5) * step,
                        (py * SAMPLES + sy + 0.5) * step,
                    )
                    red += color[0]
                    green += color[1]
                    blue += color[2]
            count = SAMPLES * SAMPLES
            rows += bytes((red // count, green // count, blue // count))

    return bytes(rows)


def write_png(path, size, pixels):
    # Färgtyp 2 = RGB utan alfa. iOS kräver ogenomskinliga ikoner, och
    # genomskinlighet skulle bli svart på hemskärmen.
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    # sRGB och gAMA taggar färgrymden. Utan dem är bilden otaggad och varje
    # visare får gissa, vilket kan ge en annan ton på skärmar med bredare
    # färgrymd än sRGB.
    srgb = chunk(b"sRGB", bytes([0]))  # 0 = perceptuell återgivning
    gama = chunk(b"gAMA", struct.pack(">I", 45455))  # 1/2,2
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + srgb
        + gama
        + chunk(b"IDAT", zlib.compress(pixels, 9))
        + chunk(b"IEND", b"")
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        target = OUT / f"icon-{size}.png"
        write_png(target, size, render(size))
        print(f"{target.name}: {target.stat().st_size} byte")


if __name__ == "__main__":
    main()
