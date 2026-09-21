import { cn } from '@/lib/utils';
import { GOLD_RGB } from './HeaderBleed';

// ---------------------------------------------------------------------------
// Motifs de physique posés en fond de section.
//
// Du SVG en trait fin, animé en CSS. Pas de canevas, donc pas de boucle
// d'animation supplémentaire : les transformations partent au compositeur, et
// « réduire les animations » du système les neutralise déjà par la règle
// globale de globals.css.
//
// Ils sont en `absolute` dans le conteneur de leur section, jamais en `fixed` :
// ils appartiennent au document et défilent avec lui. C'est toute la
// différence avec le réseau de fond qu'ils remplacent.
//
// Les figures sont reconnaissables — un vertex, une boucle de self-énergie, un
// échange en voie t, un ressort de gluon, des lignes de champ, une trace
// courbée dans un champ magnétique — mais tracées assez faiblement pour rester
// une texture. Elles ne portent aucune information : ce sont des décors, et
// elles sont marquées aria-hidden.
// ---------------------------------------------------------------------------

/** Ligne ondulée : le propagateur du photon */
function wave(x0: number, y: number, x1: number, amp = 5, period = 18): string {
  const half = period / 2;
  let d = `M ${x0} ${y}`;
  let up = true;
  for (let x = x0; x + half <= x1; x += half) {
    d += ` q ${half / 2} ${up ? -amp : amp} ${half} 0`;
    up = !up;
  }
  return d;
}

/** La même ondulation, mais verticale */
function waveV(x: number, y0: number, y1: number, amp = 5, period = 18): string {
  const half = period / 2;
  let d = `M ${x} ${y0}`;
  let right = true;
  for (let y = y0; y + half <= y1; y += half) {
    d += ` q ${right ? amp : -amp} ${half / 2} 0 ${half}`;
    right = !right;
  }
  return d;
}

/**
 * Ressort : le propagateur du gluon. Chaque boucle est un arc dont la corde
 * est plus courte que le diamètre, ce qui force l'arc à repasser par-dessus.
 */
function coil(x0: number, y: number, x1: number, r = 7, step = 9): string {
  let d = `M ${x0} ${y}`;
  for (let x = x0; x + step <= x1; x += step) d += ` a ${r} ${r} 0 1 1 ${step} 0`;
  return d;
}

/** Spirale d'Archimède : une trace qui perd son énergie dans un champ */
function spiral(cx: number, cy: number, turns = 2.6, r1 = 40, steps = 140): string {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const r = 3 + (r1 - 3) * t;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

/** Paquet d'ondes : une oscillation sous son enveloppe gaussienne */
function packet(x0: number, y: number, x1: number, amp = 26, k = 0.42): string {
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const x = x0 + ((x1 - x0) * i) / 120;
    const u = (x - (x0 + x1) / 2) / ((x1 - x0) / 4.2);
    const env = Math.exp(-u * u);
    const yy = y - amp * env * Math.sin(k * (x - x0));
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yy.toFixed(1)} `;
  }
  return d.trim();
}

/** Une figure : son tracé de fond, et le chemin que parcourt l'impulsion */
interface Figure {
  box: [number, number];
  paths: string[];
  dots?: [number, number][];
  /** Chemin sur lequel court l'impulsion lumineuse */
  trace: string;
  /** Longueur approchée de ce chemin, pour régler le pointillé */
  traceLen: number;
}

const FIGURES: Record<string, Figure> = {
  // Vertex de l'électrodynamique : deux fermions, un photon émis
  vertex: {
    box: [130, 110],
    paths: ['M 8 12 L 58 55', 'M 58 55 L 8 98', wave(58, 55, 124)],
    dots: [[58, 55]],
    trace: 'M 8 12 L 58 55 L 8 98',
    traceLen: 132,
  },

  // Self-énergie : un fermion qui émet puis réabsorbe son propre photon
  loop: {
    box: [130, 100],
    paths: [
      'M 4 72 L 34 72',
      'M 96 72 L 126 72',
      'M 34 72 A 31 31 0 1 1 96 72',
      'M 34 72 L 96 72',
    ],
    dots: [
      [34, 72],
      [96, 72],
    ],
    trace: 'M 4 72 L 34 72 M 96 72 L 126 72',
    traceLen: 60,
  },

  // Diffusion en voie t : l'interaction passe par l'échange d'un boson
  exchange: {
    box: [130, 120],
    paths: [
      'M 6 6 L 50 34',
      'M 124 6 L 80 34',
      'M 6 114 L 50 86',
      'M 124 114 L 80 86',
      'M 50 34 L 80 34',
      'M 50 86 L 80 86',
      waveV(65, 34, 86, 5, 13),
    ],
    dots: [
      [50, 34],
      [80, 34],
      [50, 86],
      [80, 86],
    ],
    trace: 'M 6 6 L 50 34 M 124 6 L 80 34',
    traceLen: 104,
  },

  // Ressort de gluon entre deux quarks
  gluon: {
    box: [130, 90],
    paths: ['M 4 24 L 26 45', 'M 4 66 L 26 45', 'M 126 45 L 104 24', 'M 126 45 L 104 66', coil(26, 45, 104)],
    dots: [
      [26, 45],
      [104, 45],
    ],
    trace: 'M 4 24 L 26 45 M 4 66 L 26 45',
    traceLen: 61,
  },

  // Lignes de champ d'un dipôle
  field: {
    box: [140, 110],
    paths: [
      'M 34 55 C 52 14, 88 14, 106 55',
      'M 34 55 C 56 30, 84 30, 106 55',
      'M 34 55 C 56 80, 84 80, 106 55',
      'M 34 55 C 52 96, 88 96, 106 55',
      'M 34 55 L 106 55',
    ],
    dots: [
      [34, 55],
      [106, 55],
    ],
    trace: 'M 34 55 C 52 14, 88 14, 106 55',
    traceLen: 104,
  },

  // Trace d'une particule chargée qui s'enroule en perdant de l'énergie
  track: {
    box: [110, 110],
    paths: [spiral(55, 55)],
    dots: [[55, 55]],
    trace: spiral(55, 55),
    traceLen: 340,
  },

  // Matérialisation : un photon se convertit en une paire électron-positron
  pair: {
    box: [130, 110],
    paths: [
      wave(6, 55, 64),
      'M 64 55 C 86 46, 106 30, 126 16',
      'M 64 55 C 86 64, 106 80, 126 94',
    ],
    dots: [[64, 55]],
    trace: 'M 64 55 C 86 46, 106 30, 126 16',
    traceLen: 76,
  },

  // Désintégration bêta : un W emporte la charge et se défait en deux leptons
  beta: {
    box: [130, 106],
    paths: [
      'M 4 22 L 62 22',
      'M 62 22 L 126 22',
      waveV(62, 22, 68, 5, 13),
      'M 62 68 L 126 52',
      'M 62 68 L 126 88',
    ],
    dots: [
      [62, 22],
      [62, 68],
    ],
    trace: 'M 4 22 L 62 22 L 126 22',
    traceLen: 122,
  },

  // Paquet d'ondes : une particule libre, localisée mais pas ponctuelle
  packet: {
    box: [140, 90],
    paths: [packet(8, 48, 132), 'M 4 48 L 136 48'],
    trace: packet(8, 48, 132),
    traceLen: 300,
  },

  // Interférence : deux sources, et les lieux où les fronts se rencontrent
  interference: {
    box: [140, 110],
    paths: [16, 28, 40, 52, 64].flatMap((r) => [
      `M 42 ${55 - r} A ${r} ${r} 0 0 1 42 ${55 + r}`,
      `M 98 ${55 - r} A ${r} ${r} 0 0 0 98 ${55 + r}`,
    ]),
    dots: [
      [42, 55],
      [98, 55],
    ],
    trace: 'M 42 3 A 52 52 0 0 1 42 107',
    traceLen: 164,
  },
};

export type MotifName = keyof typeof FIGURES;

export interface Placement {
  name: MotifName;
  /** Position dans la section, en pourcentage */
  top: string;
  left?: string;
  right?: string;
  /** Largeur rendue, en pixels */
  size: number;
  opacity: number;
  /** Décalage des animations, pour que rien ne batte à l'unisson */
  delay?: string;
  /**
   * L'impulsion court-elle le long du diagramme ?
   *
   * Contrairement à la dérive, qui part au compositeur, elle repeint son tracé
   * à chaque image. On la réserve donc aux figures du haut : plus bas, elles
   * sont de toute façon trop pâles pour qu'on la distingue.
   */
  pulse?: boolean;
}

function Motif({ p, accentRgb }: { p: Placement; accentRgb: string }) {
  const f = FIGURES[p.name];
  const [w, h] = f.box;

  return (
    <div
      className="absolute motif-drift"
      style={{
        top: p.top,
        left: p.left,
        right: p.right,
        width: p.size,
        opacity: p.opacity,
        color: `rgb(${accentRgb})`,
        animationDelay: p.delay,
      }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="auto"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        {f.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {f.dots?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={2.1} fill="currentColor" stroke="none" />
        ))}
        {/* L'impulsion qui court le long du diagramme */}
        {p.pulse !== false && (
        <path
          d={f.trace}
          className="motif-pulse"
          strokeWidth={1.8}
          style={
            {
              strokeDasharray: `14 ${f.traceLen}`,
              '--trace-len': `${f.traceLen + 14}`,
              animationDelay: p.delay,
            } as React.CSSProperties
          }
        />
        )}
      </svg>
    </div>
  );
}

/**
 * Masque latéral : les motifs ne vivent que sur les bords de la page et
 * s'éteignent avant d'atteindre la colonne de contenu.
 *
 * C'est ce qui permet de les poser sans se demander ce qu'il y a dessous. Aux
 * largeurs courantes il n'existe pas de gouttière — à 1334 px de fenêtre le
 * conteneur en fait 1280 — donc un motif placé sur le côté finirait forcément
 * par traverser du texte. Le masque règle le problème à la source : au centre,
 * il n'y a tout simplement rien à afficher. Sur un écran large les figures
 * respirent dans la marge ; sur un écran étroit elles se réduisent d'elles-
 * mêmes à une trace en lisière.
 */
const EDGE_MASK =
  'linear-gradient(to right, #000 0%, transparent 19%, transparent 81%, #000 100%)';

/**
 * Pose le décor de motifs sur toute la descente du header. Le parent doit être
 * en `relative`, et le contenu au-dessus en `relative` lui aussi.
 */
export function PhysicsMotifs({
  placements,
  accentRgb = GOLD_RGB,
  className,
}: {
  placements: Placement[];
  accentRgb?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        // Le calque couvre toute la page. Ce qui dépasse en bas est coupé :
        // c'est ce qui permet de poser un rythme en pixels sans connaître la
        // longueur de la page à l'avance.
        //
        // Rien sous 768 px : le contenu y occupe toute la largeur, il n'y a
        // aucune lisière où poser un décor.
        'pointer-events-none absolute inset-0 overflow-hidden',
        'hidden md:block',
        className
      )}
      style={{
        WebkitMaskImage: EDGE_MASK,
        maskImage: EDGE_MASK,
      }}
    >
      {placements.map((p, i) => (
        <Motif key={`${p.name}-${i}`} p={p} accentRgb={accentRgb} />
      ))}
    </div>
  );
}

/** L'ordre dans lequel les dix figures se succèdent en descendant */
const ORDER: MotifName[] = [
  'vertex',
  'packet',
  'gluon',
  'pair',
  'interference',
  'loop',
  'beta',
  'track',
  'field',
  'exchange',
];

/** Rythme vertical : une figure tous les tant de pixels */
const STEP = 330;

/**
 * Le décor commun à toutes les pages : les dix figures se succèdent de haut en
 * bas, puis le jeu se rejoue tant qu'il reste de la page.
 *
 * Le même jeu partout — c'est une signature, pas une illustration du sujet de
 * la page.
 *
 * Trois précautions pour que la répétition ne se voie pas. Le côté ne suit pas
 * la simple parité du rang : il décale d'un cran à chaque cycle, sinon une
 * figure donnée reviendrait toujours du même bord, le jeu comptant un nombre
 * pair d'entrées. La taille et le décalage d'animation sont tirés du rang par
 * des pas premiers avec la longueur du jeu, de sorte qu'aucun des deux ne se
 * remet en phase avec lui.
 *
 * L'opacité décroît avec la profondeur : rien ne s'arrête, tout s'éteint,
 * comme le dégradé du header.
 *
 * `depth` est la hauteur qu'on cherche à couvrir, en pixels. Elle n'a pas
 * besoin d'être juste : ce qui dépasse la page est coupé par le calque.
 */
export function buildBackdrop(depth: number): Placement[] {
  const count = Math.max(1, Math.ceil(depth / STEP));
  const out: Placement[] = [];

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0; // 0 en haut, 1 tout en bas
    const cycle = Math.floor(i / ORDER.length);
    const opacity = 0.05 + 0.17 * Math.pow(1 - t, 1.3);

    out.push({
      name: ORDER[i % ORDER.length],
      top: `${i * STEP + 40}px`,
      [(i + cycle) % 2 === 0 ? 'right' : 'left']: `${((i * 7) % 5) - 2}%`,
      size: 260 + ((i * 3) % 5) * 22,
      opacity: Number(opacity.toFixed(3)),
      delay: `-${((i * 7.3) % 34).toFixed(1)}s`,
      // en dessous, la figure est trop pâle pour qu'on distingue l'impulsion
      pulse: opacity > 0.1,
    });
  }

  return out;
}

export default PhysicsMotifs;
