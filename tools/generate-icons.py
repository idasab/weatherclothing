"""Genererar appens ikoner i alla storlekar.

Motivet är en legogubbes ansikte: platta, nästan kvadratiska solglasögon och
ett streckleende i grafit mot en helt platt gul botten. Inga gradienter, inga
skuggor och inga reflexer — formen bär motivet, och det är hela poängen.

Kanterna beräknas analytiskt. Varje form har en avståndsfunktion som säger hur
långt en punkt ligger från formens rand, negativt inuti och positivt utanför,
och ur avståndet faller pixelns täckning ut direkt. Det ger full åttabitars
precision i kanten. Alternativet — att skjuta ett rutnät av delprover per pixel
— ger bara så många täckningsnivåer som det finns delprover, och med 3x3 blev
kurvorna synligt grumliga eftersom de bara hade nio steg att tona genom.

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

# Geometrin anges i hela pixlar vid 180, alltså hemskärmens storlek, och räknas
# om till andelar av bredden. Skälet är att en rak kant som hamnar mitt mellan
# två pixlar blir en halvtonad linje längs hela kanten, och det läser som
# suddigt. Ligger kanten på en pixelgräns blir pixlarna på var sida helt
# täckta respektive helt otäckta, alltså knivskarpa. Rastret går bara att
# träffa i en storlek åt gången — 512 och 1024 får fraktionella kanter, men där
# är en halv pixel för liten att se.
GRID = 180


def frac(pixels):
    return pixels / GRID


# Glasögonen: platta, nästan kvadratiska glas — 55 x 53 pixlar vid 180 — och en
# enda balk från kant till kant som är både brygga och skalm.
LENS_TOP, LENS_BOTTOM = frac(58), frac(111)
LEFT_LENS = (frac(27), frac(82))
# Spegelvänt så att motivet är exakt symmetriskt kring mitten.
RIGHT_LENS = (frac(GRID - 82), frac(GRID - 27))
LENS_CORNER = frac(15)
BAR_TOP, BAR_BOTTOM = frac(78), frac(86)
BAR_LEFT, BAR_RIGHT = frac(5), frac(GRID - 5)
# Halva balkhöjden ger helt runda ändar på balken.
BAR_CORNER = frac(4)

# Munnen är nedre delen av en cirkelbåge. Bågens översta punkt ligger 18 pixlar
# under glasögonen, alltså en tiondel av ikonens höjd — det mellanrum som
# valdes. Radien i hela pixlar gör dessutom bågens nedersta del skarp, där den
# är som mest vågrät.
MOUTH_CENTER = (0.500, frac(113))
MOUTH_RADIUS = frac(28)
MOUTH_HALF_WIDTH = frac(4)
MOUTH_MIN_DY = frac(16)


def sd_rounded_rect(x, y, x0, x1, y0, y1, radius):
    """Avstånd till en rundad rektangels rand. Negativt inuti."""
    center_x, center_y = (x0 + x1) / 2, (y0 + y1) / 2
    half_w, half_h = (x1 - x0) / 2, (y1 - y0) / 2
    radius = min(radius, half_w, half_h)

    qx = abs(x - center_x) - (half_w - radius)
    qy = abs(y - center_y) - (half_h - radius)

    outside = math.hypot(max(qx, 0.0), max(qy, 0.0))
    inside = min(max(qx, qy), 0.0)
    return outside + inside - radius


def sd_lens(x, y, lens):
    return sd_rounded_rect(x, y, lens[0], lens[1], LENS_TOP, LENS_BOTTOM, LENS_CORNER)


def sd_mouth(x, y):
    """Streckleendet: en cirkelring som kapas av så bara nedre delen blir kvar."""
    center_x, center_y = MOUTH_CENTER
    dy = y - center_y
    ring = abs(math.hypot(x - center_x, dy) - MOUTH_RADIUS) - MOUTH_HALF_WIDTH
    # Snittet med halvplanet dy >= MOUTH_MIN_DY ger bågens raka avslut.
    return max(ring, MOUTH_MIN_DY - dy)


def signed_distance(x, y):
    """Avstånd till hela motivets rand. Union av formerna är minsta avståndet."""
    return min(
        sd_rounded_rect(x, y, BAR_LEFT, BAR_RIGHT, BAR_TOP, BAR_BOTTOM, BAR_CORNER),
        sd_lens(x, y, LEFT_LENS),
        sd_lens(x, y, RIGHT_LENS),
        sd_mouth(x, y),
    )


def sample(x, y, size):
    """Pixelns färg. En pixel är 1/size breda, och täckningen följer avståndet."""
    coverage = 0.5 - signed_distance(x, y) * size
    if coverage <= 0.0:
        return YELLOW
    if coverage >= 1.0:
        return GRAPHITE
    return tuple(
        round(YELLOW[i] + (GRAPHITE[i] - YELLOW[i]) * coverage) for i in range(3)
    )


def chunk(tag, payload):
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def render(size):
    rows = bytearray()

    for py in range(size):
        rows.append(0)  # filtertyp None
        y = (py + 0.5) / size
        for px in range(size):
            rows += bytes(sample((px + 0.5) / size, y, size))

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
