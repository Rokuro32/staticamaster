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
  /** Masqué sous 768 px : sur mobile le contenu occupe déjà toute la largeur */
  desktopOnly?: boolean;
}

function Motif({ p, accentRgb }: { p: Placement; accentRgb: string }) {
  const f = FIGURES[p.name];
  const [w, h] = f.box;

  return (
    <div
      className={cn(
        'absolute motif-drift',
        p.desktopOnly && 'hidden md:block'
      )}
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
      </svg>
    </div>
  );
}

/**
 * Pose un jeu de motifs en fond de la section qui l'englobe. Le parent doit
 * être en `relative` et le contenu au-dessus en `relative` lui aussi.
 *
 * À n'employer que derrière une grille de cartes homogène, jamais derrière du
 * texte au fil de l'eau : aux largeurs courantes il n'y a pas de gouttière
 * libre, donc un motif posé sur une zone de texte finit par la traverser. Les
 * cartes, elles, sont opaques à 72 % — le motif s'y réduit à un fantôme et ne
 * se lit franchement que dans les intervalles.
 *
 * Le conteneur est en `overflow-hidden` : un motif débordant vers le haut est
 * coupé net au lieu de remonter sur le titre de la section.
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
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      {placements.map((p, i) => (
        <Motif key={`${p.name}-${i}`} p={p} accentRgb={accentRgb} />
      ))}
    </div>
  );
}

/**
 * Le motif dominant d'une section. Il change avec le sujet — un ressort de
 * gluon en physique moderne, des lignes de champ en électricité — ce qui
 * donne à chaque page un fond qui lui appartient.
 */
export function motifsForCategory(categoryId: string): Placement[] {
  const byCategory: Record<string, [MotifName, MotifName]> = {
    moderne: ['vertex', 'gluon'],
    nucleaire: ['track', 'loop'],
    electricite: ['field', 'exchange'],
    ondes: ['field', 'vertex'],
    cinematique: ['track', 'exchange'],
    dynamique: ['exchange', 'track'],
    statique: ['exchange', 'field'],
    mathematiques: ['track', 'vertex'],
    mecanismes: ['gluon', 'track'],
    'thermo-fluides': ['track', 'field'],
  };

  const [first, second] = byCategory[categoryId] ?? ['vertex', 'field'];

  return [
    { name: first, top: '2%', right: '-9%', size: 320, opacity: 0.2, desktopOnly: true },
    { name: second, top: '55%', left: '-9%', size: 290, opacity: 0.16, delay: '-9s', desktopOnly: true },
  ];
}

export default PhysicsMotifs;
