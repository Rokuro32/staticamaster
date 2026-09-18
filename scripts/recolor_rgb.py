"""Passe complémentaire : littéraux rgb()/rgba() à composantes numériques.

Le codemod principal ne traitait que les #rrggbb ; or plusieurs canevas
écrivent leurs couleurs en rgba() pour gérer l'opacité. On réutilise la même
table de correspondance pour rester cohérent.

Les rgb()/rgba() construits par interpolation (`rgb(${r}, ...)`) ne sont pas
touchés : ce sont ceux qui encodent une grandeur physique.
"""
import collections, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from palette import map_hex

ROOT = pathlib.Path('src/components/simulations')
RGB_RE = re.compile(
    r'\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,[^)]*)?\)')


def main() -> None:
    changes = collections.Counter()
    files = 0

    for path in sorted(ROOT.rglob('*.tsx')):
        src = path.read_text()

        def sub(m):
            r, g, b = (int(m.group(i)) for i in (1, 2, 3))
            alpha = m.group(4) or ''
            old_hex = '#{:02x}{:02x}{:02x}'.format(r, g, b)
            new_hex = map_hex(old_hex)
            if new_hex.lower() == old_hex.lower():
                return m.group(0)
            changes[old_hex] += 1
            nr, ng, nb = (int(new_hex[i:i + 2], 16) for i in (1, 3, 5))
            fn = 'rgba' if alpha else 'rgb'
            return f'{fn}({nr}, {ng}, {nb}{alpha})'

        out = RGB_RE.sub(sub, src)
        if out != src:
            path.write_text(out)
            files += 1

    print(f'fichiers modifiés : {files}')
    print(f'rgb()/rgba() remappés : {sum(changes.values())} '
          f'({len(changes)} distincts)')
    for c, n in changes.most_common(8):
        print(f'  {c} -> {map_hex(c)}  ({n}x)')


if __name__ == '__main__':
    main()
