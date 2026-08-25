"""Genererar appens ikoner i alla storlekar.

Motivet är ett par solglasögon i legostil — platta, nästan kvadratiska glas i
grafit mot en ljust gul botten. Körs med `python tools/generate-icons.py` och
skriver över filerna i src/assets/icons. Inga beroenden utöver
standardbiblioteket.
"""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "icons"

# 180 för hemskärmen, 192 och 512 för manifestet, 1024 för Xcode.
SIZES = (180, 192, 512, 1024)

GRAPHITE = (48, 51, 56)
WHITE = (255, 255, 255)
YELLOW_TOP = (248, 218, 146)
YELLOW_BOTTOM = (232, 191, 112)

# Supersampling per axel. Ikonerna har hårda kanter, så det behövs för mjuka linjer.
SAMPLES = 3

# Legogubbens glasögon: platta, nästan kvadratiska glas, rak brygga och raka
# skalmstumpar. Enkelheten är hela poängen — inga vinklar, inga detaljer.
LENS_TOP, LENS_BOTTOM = 0.350, 0.650
LEFT_LENS = (0.130, 0.455)
RIGHT_LENS = (0.545, 0.870)
LENS_CORNER = 0.075
ARM_TOP, ARM_BOTTOM = 0.404, 0.474
BRIDGE_TOP, BRIDGE_BOTTOM = 0.452, 0.548

# Inget blänk: legostilen är platt. Vill du ha det tillbaka räcker det att
# sätta GLINT_STRENGTH till 0.6 igen.
GLINT_STROKES = (
    ((-0.075, -0.030), (-0.030, -0.030), 0.030),
)
GLINT_STRENGTH = 0.0
GLINT_FEATHER = 0.006


def lerp(a, b, t):
    t = min(max(t, 0.0), 1.0)
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def distance_to_segment(x, y, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    length_squared = dx * dx + dy * dy
    t = 0.0 if length_squared == 0 else ((x - x1) * dx + (y - y1) * dy) / length_squared
    t = min(max(t, 0.0), 1.0)
    return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))


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
    """Två nästan kvadratiska glas, rak brygga och raka skalmstumpar."""
    if ARM_TOP <= y <= ARM_BOTTOM and (0.038 <= x <= LEFT_LENS[0] or RIGHT_LENS[1] <= x <= 0.962):
        return True
    if LEFT_LENS[1] <= x <= RIGHT_LENS[0] and BRIDGE_TOP <= y <= BRIDGE_BOTTOM:
        return True
    return in_lens(x, y, LEFT_LENS) or in_lens(x, y, RIGHT_LENS)


def glint_alpha(x, y):
    """Hur mycket blänk punkten ligger i, 0 utanför glasen."""
    alpha = 0.0

    for lens in (LEFT_LENS, RIGHT_LENS):
        if not in_lens(x, y, lens):
            continue

        center_x = (lens[0] + lens[1]) / 2
        center_y = (LENS_TOP + LENS_BOTTOM) / 2

        for (start_x, start_y), (end_x, end_y), half_width in GLINT_STROKES:
            distance = distance_to_segment(
                x, y, center_x + start_x, center_y + start_y, center_x + end_x, center_y + end_y
            )
            if distance <= half_width:
                alpha = max(alpha, min(1.0, (half_width - distance) / GLINT_FEATHER))

    return alpha


def sample(x, y):
    if not in_glasses(x, y):
        return lerp(YELLOW_TOP, YELLOW_BOTTOM, y)
    return lerp(GRAPHITE, WHITE, glint_alpha(x, y) * GLINT_STRENGTH)


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
