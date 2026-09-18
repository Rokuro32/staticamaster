"""Recolore les simulations sur la palette du Cégep de Thetford.

Passe 1 : couleurs hex des canevas. On conserve la luminosité de la couleur
d'origine (c'est elle qui rend deux séries distinguables) et on rabat la
teinte sur la famille chaude correspondante.

Passe 2 : classes utilitaires Tailwind, remappées sur les échelles de marque.

Les couleurs calculées depuis une grandeur physique (longueur d'onde,
température) passent par rgb()/hsl() et ne sont donc jamais touchées ici.
"""
import collections, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from palette import map_hex

ROOT = pathlib.Path('src/components/simulations')

CLASS_FAMILY = {
    'red': 'brun', 'rose': 'brun', 'pink': 'brun',
    'orange': 'terre',
    'amber': 'ocre', 'yellow': 'ocre',
    'lime': 'olive', 'green': 'olive', 'emerald': 'olive',
    'teal': 'ardoise', 'cyan': 'ardoise', 'sky': 'ardoise',
    'blue': 'gold', 'indigo': 'gold',
    'violet': 'prune', 'purple': 'prune', 'fuchsia': 'prune',
    'gray': 'stone', 'slate': 'stone', 'zinc': 'stone', 'neutral': 'stone',
}

PREFIXES = ('bg', 'text', 'border', 'ring', 'from', 'via', 'to', 'accent',
            'fill', 'stroke', 'divide', 'shadow', 'outline', 'decoration',
            'caret', 'placeholder')

CLASS_RE = re.compile(
    r'\b(' + '|'.join(PREFIXES) + r')(-[a-z]+)?-(' +
    '|'.join(CLASS_FAMILY) + r')-(\d{2,3})\b')
HEX_RE = re.compile(r'#[0-9a-fA-F]{6}\b')


def main() -> None:
    hex_changes = collections.Counter()
    class_changes = collections.Counter()
    files = 0

    for path in sorted(ROOT.rglob('*.tsx')):
        src = path.read_text()

        def sub_hex(m):
            old = m.group(0)
            new = map_hex(old)
            if new.lower() != old.lower():
                hex_changes[old.lower()] += 1
            return new

        out = HEX_RE.sub(sub_hex, src)

        def sub_class(m):
            prefix, side, family, shade = m.groups()
            class_changes[family] += 1
            return f"{prefix}{side or ''}-{CLASS_FAMILY[family]}-{shade}"

        out = CLASS_RE.sub(sub_class, out)

        if out != src:
            path.write_text(out)
            files += 1

    print(f'fichiers modifiés            : {files}')
    print(f'classes Tailwind remappées   : {sum(class_changes.values())}')
    print(f'hex remappés                 : {sum(hex_changes.values())} '
          f'({len(hex_changes)} distincts)')
    print('\npar famille de classe :')
    for fam, n in class_changes.most_common():
        print(f'  {fam:9s} -> {CLASS_FAMILY[fam]:8s} {n}')


if __name__ == '__main__':
    main()
