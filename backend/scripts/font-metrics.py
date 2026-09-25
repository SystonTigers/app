"""Regenerates src/services/graphics/fonts/metrics.ts from the bundled fonts.

The graphics renderer needs text widths to fit names and headlines, and the
Worker can't measure text itself, so we keep each font's advance widths here.

Usage (needs `pip install fonttools`):
    python3 scripts/font-metrics.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont

FONT_DIR = Path(__file__).resolve().parent.parent / "src" / "services" / "graphics" / "fonts"
FONTS = {
    "Anton": "Anton-Regular.ttf",
    "Barlow Condensed SemiBold": "BarlowCondensed-SemiBold.ttf",
    "Barlow Condensed ExtraBold": "BarlowCondensed-ExtraBold.ttf",
    "Bebas Neue": "BebasNeue-Regular.ttf",
}


def main() -> None:
    lines = [
        "// Generated from the bundled fonts (scripts/font-metrics.py). Advance widths in ems.",
        "/* eslint-disable */",
        "export const FONT_METRICS: Record<string, { fallback: number; advances: Record<number, number> }> = {",
    ]
    for name, filename in FONTS.items():
        font = TTFont(FONT_DIR / filename)
        upm = font["head"].unitsPerEm
        hmtx = font["hmtx"]
        advances = {cp: round(hmtx[glyph][0] / upm, 4) for cp, glyph in sorted(font.getBestCmap().items())}
        fallback = round(sum(advances.values()) / len(advances), 4)
        pairs = ",".join(f"{cp}:{width}" for cp, width in advances.items())
        lines.append(f'  "{name}": {{ fallback: {fallback}, advances: {{{pairs}}} }},')
    lines.append("};")
    (FONT_DIR / "metrics.ts").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
