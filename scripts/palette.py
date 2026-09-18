"""Cibles de la palette : une seule source pour les hex des canevas et les
échelles Tailwind, afin que les deux restent d'accord."""
import colorsys

# (hue_min, hue_max, teinte cible, saturation cible, nom de l'échelle)
FAMILIES = [
    (200, 250, 38,  0.48, 'gold'),     # bleu / indigo    -> or (primaire)
    (250, 335, 330, 0.28, 'prune'),    # violet / pourpre -> prune
    (335, 361, 14,  0.55, 'brun'),     # rose / rouge     -> brun roux
    (0,    18, 14,  0.55, 'brun'),
    (18,   36, 30,  0.70, 'terre'),   # orange           -> orange brûlé
    (36,   58, 50,  0.82, 'ocre'),     # ambre / jaune    -> ocre vif
    (58,   98, 58,  0.62, 'ocre'),     # lime
    (98,  178, 72,  0.42, 'olive'),    # vert / émeraude  -> olive
    (178, 200, 205, 0.28, 'ardoise'),  # cyan / ciel      -> ardoise
]

# On décide « est-ce un gris ? » sur la chroma (max - min des canaux) plutôt
# que sur la saturation HSL : celle-ci s'emballe aux luminosités extrêmes et
# faisait passer des bruns et des verts sourds pour des gris.
GREY_CHROMA_MAX = 0.16
NEUTRAL_HUE, NEUTRAL_SAT = 32, 0.055

SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
LIGHT = [0.97, 0.93, 0.86, 0.76, 0.65, 0.53, 0.44, 0.35, 0.26, 0.17]
SAT_MULT = [0.55, 0.65, 0.80, 0.92, 1.00, 1.00, 0.95, 0.88, 0.80, 0.72]


def to_hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return '#{:02x}{:02x}{:02x}'.format(round(r * 255), round(g * 255), round(b * 255))


def map_hex(hex_str: str) -> str:
    h = hex_str.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    hue *= 360
    chroma = max(r, g, b) - min(r, g, b)

    if chroma <= GREY_CHROMA_MAX:
        if light >= 0.995 or light <= 0.005:
            return hex_str                     # blanc et noir purs intacts
        return to_hex(NEUTRAL_HUE, light, NEUTRAL_SAT)

    new_hue, new_sat = NEUTRAL_HUE, 0.30
    for lo, hi, th, ts, _ in FAMILIES:
        if lo <= hue < hi:
            new_hue, new_sat = th, ts
            break
    if light > 0.55:
        light *= 0.90                          # contraste sur fond clair
    return to_hex(new_hue, light, new_sat)


def scales():
    """Échelles 50→900 pour Tailwind, dérivées des mêmes teintes."""
    out = {}
    for _, _, hue, sat, name in FAMILIES:
        if name in out:
            continue
        out[name] = [to_hex(hue, l, sat * m) for l, m in zip(LIGHT, SAT_MULT)]
    return out
