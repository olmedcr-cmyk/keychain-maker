"""Draws the documentation figures, in light and dark.

    python3 docs/assets/src/ilustraciones.py

Writes docs/assets/<name>-light.svg and <name>-dark.svg. The keychain is
schematic: the proportions follow the app's defaults (3 mm base, 1.2 mm relief,
9 mm ring with a 5 mm hole), but the outline is drawn by hand, not exported.
"""

from __future__ import annotations

import math
from pathlib import Path

from iso import MONO, SANS, THEMES, Figure

OUT = Path(__file__).resolve().parent.parent

# App defaults, in millimetres (src/keychain.ts → DEFAULTS).
T = 3.0          # base thickness
H = 1.2          # relief height
R_OUT = 4.5      # ring outer radius (9 mm)
R_HOLE = 2.5     # ring hole radius (5 mm)


# -- 2D outlines (x/y in mm, counter-clockwise) ------------------------------
def arc(cx, cy, r, a0, a1, n=16):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


def circle(cx, cy, r, n=48):
    return arc(cx, cy, r, 0, 2 * math.pi, n)[:-1]


def rounded_rect(x0, y0, w, d, r):
    return (arc(x0 + w - r, y0 + r, r, -math.pi / 2, 0, 6)
            + arc(x0 + w - r, y0 + d - r, r, 0, math.pi / 2, 6)
            + arc(x0 + r, y0 + d - r, r, math.pi / 2, math.pi, 6)
            + arc(x0 + r, y0 + r, r, math.pi, 1.5 * math.pi, 6))


def tag(w, d, r, ring_cy):
    """A rounded plate with the ring tab on its -x side, as the app builds it:
    the hull of a circle on the ring centre and a smaller one on the edge."""
    cx = -(R_HOLE + (R_OUT - R_HOLE) * 0.55)   # loop distance from the edge
    a = R_OUT * 0.8
    pts = (arc(w - r, r, r, -math.pi / 2, 0, 6)
           + arc(w - r, d - r, r, 0, math.pi / 2, 6)
           + arc(r, d - r, r, math.pi / 2, math.pi, 6)
           + [(0, ring_cy + a)]
           + arc(cx, ring_cy, R_OUT, math.pi / 2, 1.5 * math.pi, 18)
           + [(0, ring_cy - a)]
           + arc(r, r, r, math.pi, 1.5 * math.pi, 6))
    return pts, (cx, ring_cy)


def star(cx, cy, ro, ri, n=5, rot=-math.pi / 2):
    return [(cx + (ro if i % 2 == 0 else ri) * math.cos(rot + math.pi * i / n),
             cy + (ro if i % 2 == 0 else ri) * math.sin(rot + math.pi * i / n)) for i in range(2 * n)]


# -- figures -----------------------------------------------------------------
def fig_llavero() -> Figure:
    f = Figure(1200, 760, 8.0, 560, 330,
               "Llavero en despiece isométrico: la base de 3 mm con la anilla de 9 mm y su agujero de 5 mm, "
               "y encima, separado, el relieve de 1,2 mm que se imprime en otro color")
    f.text(40, 52, "OBJ-02 | ANATOMÍA DE UN LLAVERO", "title")
    f.add('<line class="rule" x1="40" y1="72" x2="1160" y2="72"/>')

    W, D = 60, 36
    outline, (rcx, rcy) = tag(W, D, 7, D / 2)
    f.prism(outline, 0, T, holes=[circle(rcx, rcy, R_HOLE)])
    # Where the relief sits on the base
    design = star(W / 2 + 2, D / 2, 14, 6)
    f.poly([(x, y, T) for x, y in design], "ghost")
    # The relief, lifted to show it is a separate body
    lift = 16
    for x, y in (design[0], design[4], design[6], design[2], design[8]):
        f.line3([(x, y, T), (x, y, T + lift)], "ghost")
    f.prism(design, T + lift, H, hi=True, cls="accent")

    f.callout((W / 2, D, 0), 712, "01", "Base", sub="3 mm, color 1 · silueta, rectángulo o círculo")
    f.callout(design[0] + (T + lift + H,), 120, "02", "Relieve", sub="1,2 mm, color 2")
    f.callout((rcx - R_OUT, rcy, T), 210, "03", "Arandela", side="left", sub="Ø 9 mm, agujero de 5 mm")
    f.callout((W - 4, 2, T), 250, "04", "Borde", sub="3 mm alrededor del diseño")
    return f


def fig_estilos() -> Figure:
    f = Figure(1200, 520, 7.0, 210, 250,
               "Los tres estilos de relieve sobre la misma base: en relieve, que sobresale; grabado, hundido en la base; "
               "e incrustado al ras, un hueco relleno con la pieza del segundo color")
    f.text(40, 52, "OBJ-03 | TRES ESTILOS", "title")
    f.add('<line class="rule" x1="40" y1="72" x2="1160" y2="72"/>')
    S = 30
    base = rounded_rect(0, 0, S, S, 4)
    labels = [("01", "En relieve", "sobresale 1,2 mm"),
              ("02", "Grabado", "se hunde 1,2 mm"),
              ("03", "Incrustado al ras", "hueco + pieza, misma altura")]
    for k, (idx, name, sub) in enumerate(labels):
        dx, dy = k * 33, -k * 33
        b = [(x + dx, y + dy) for x, y in base]
        d = [(x + dx, y + dy) for x, y in star(S / 2, S / 2, 11, 4.6)]
        if k == 0:
            f.prism(b, 0, T)
            f.prism(d, T, H, hi=True, cls="accent")
        elif k == 1:
            f.prism(b, 0, T)
            # The pocket: its floor, then the far walls that face the viewer,
            # all clipped to the opening on the top face.
            cid = f"pocket{k}"
            opening = " ".join(f"{X:.2f},{Y:.2f}" for X, Y in (f.p(x, y, T) for x, y in d))
            f.add(f'<clipPath id="{cid}"><polygon points="{opening}"/></clipPath><g clip-path="url(#{cid})">')
            f.poly([(x, y, T - H) for x, y in d], "face top accent")
            cw = d[::-1]  # star() is counter-clockwise; walls of a hole face inwards
            walls = []
            for i in range(len(cw)):
                (x0, y0), (x1, y1) = cw[i - 1], cw[i]
                if (y1 - y0) - (x1 - x0) > 1e-9:
                    walls.append(((x0 + x1 + y0 + y1) / 2, (x0, y0), (x1, y1)))
            for _, (x0, y0), (x1, y1) in sorted(walls):
                f.poly([(x0, y0, T - H), (x1, y1, T - H), (x1, y1, T), (x0, y0, T)], "face side")
            f.add('</g>')
            f.add(f'<polygon class="sil hi" points="{opening}"/>')
        else:
            f.prism(b, 0, T)
            f.poly([(x, y, T) for x, y in d], "face top accent")
            f.poly([(x, y, T) for x, y in d], "sil hi")
        X, _ = f.p(S + dx, S + dy, 0)
        f.text(X - 150, 470, f'<tspan class="idx">{idx}</tspan>  {name}', "label")
        f.text(X - 150, 492, sub, "sub")
    return f


BANNER_STYLE = """
.big{{font:56px {sans};fill:{ink};letter-spacing:-1.6px}}
.lede{{font:22px {sans};fill:{text}}}
.meta{{font:13px {mono};fill:{text};letter-spacing:.5px}}
"""


def fig_banner() -> Figure:
    f = Figure(1280, 400, 3.4, 1110, 170, "Keychain Maker · Divina Machina by Qs Ventures")
    for x in (40, 280, 520, 760, 1000, 1240):
        f.add(f'<line class="rule" x1="{x}" y1="0" x2="{x}" y2="80"/>')
        f.add(f'<line class="rule" x1="{x}" y1="320" x2="{x}" y2="400"/>')
    f.add('<line class="rule" x1="0" y1="80" x2="1280" y2="80"/>')
    f.add('<line class="rule" x1="0" y1="320" x2="1280" y2="320"/>')
    f.text(52, 52, "OBJ-01 | KEYCHAIN MAKER", "meta")
    f.text(772, 52, "SVG · TEXTO · STL · CLOUDFLARE", "meta")
    for i, (x, t) in enumerate(((52, "01 DISEÑO"), (292, "02 BASE"), (532, "03 ARANDELA"), (772, "04 STL"))):
        f.text(x, 356, t, "meta")
    f.text(1012, 356, "DIVINA MACHINA BY QS VENTURES", "meta")
    f.text(52, 196, "Keychain Maker", "big")
    f.text(52, 252, "Un SVG o una palabra entra; sale un llavero listo para imprimir.", "lede")
    outline, (rcx, rcy) = tag(44, 26, 5, 13)
    f.prism(outline, 0, T, holes=[circle(rcx, rcy, R_HOLE)])
    f.prism(star(24, 13, 10, 4.2), T, H, hi=True, cls="accent")
    return f


def write(name: str, fig: Figure, extra_style: str = "") -> None:
    for theme in ("light", "dark"):
        svg = fig.svg(theme)
        if extra_style:
            css = extra_style.format(mono=MONO, sans=SANS, **THEMES[theme])
            svg = svg.replace("</style>", css + "</style>", 1)
        (OUT / f"{name}-{theme}.svg").write_text(svg, encoding="utf-8")
        print("wrote", OUT / f"{name}-{theme}.svg")


if __name__ == "__main__":
    write("banner", fig_banner(), BANNER_STYLE)
    write("llavero", fig_llavero())
    write("estilos", fig_estilos())
