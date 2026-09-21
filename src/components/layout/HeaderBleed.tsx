import { cn } from '@/lib/utils';

/**
 * Le prolongement du header : sa couleur et sa grille, qui descendent
 * ensemble et se dissolvent ensemble.
 *
 * La bande du haut ne s'arrête plus net — sa teinte descend sur toute la
 * hauteur de ce calque et s'y éteint. Un seul dégradé vertical, posé derrière
 * le décor : aucun coût d'animation, rien à recalculer au défilement.
 *
 * Il est en `absolute` dans le conteneur de la page, jamais en `fixed` : il
 * fait partie du document et s'en va avec lui quand on défile.
 *
 * La grille suit le même profil, appliqué en masque. Les deux couches
 * partagent littéralement la même liste d'arrêts, si bien qu'elles ne peuvent
 * pas se désynchroniser : la grille s'efface exactement là où la couleur
 * s'efface.
 *
 * Ces arrêts ne sont pas régulièrement répartis. Un dégradé linéaire à deux
 * arrêts laisse voir une bande de transition ; en concentrant la chute sur le
 * premier tiers puis en étalant une longue traîne, l'œil ne trouve plus de
 * limite.
 */

/** L'or de la marque, en « r, g, b » */
export const GOLD_RGB = '201, 179, 124';

/** Profil d'extinction commun à la couleur et à la grille : [position %, part] */
const STOPS: [number, number][] = [
  [0, 1],
  [12, 0.82],
  [26, 0.55],
  [42, 0.32],
  [60, 0.16],
  [78, 0.06],
  [100, 0],
];

export function HeaderBleed({
  accentRgb = GOLD_RGB,
  /** Hauteur totale de la descente, en pixels */
  height = 900,
  /** Opacité au sommet. Au-delà de 0.16 la teinte commence à se voir comme un aplat. */
  strength = 0.1,
  /** La grille descend-elle avec la couleur ? */
  grid = true,
  className,
}: {
  accentRgb?: string;
  height?: number;
  strength?: number;
  grid?: boolean;
  className?: string;
}) {
  const colour = `linear-gradient(to bottom, ${STOPS.map(
    ([pos, k]) => `rgba(${accentRgb}, ${(strength * k).toFixed(4)}) ${pos}%`
  ).join(', ')})`;

  const fade = `linear-gradient(to bottom, ${STOPS.map(
    ([pos, k]) => `rgba(0, 0, 0, ${k}) ${pos}%`
  ).join(', ')})`;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0', className)}
      style={{ height }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: colour }} />
      {grid && (
        <div
          className="absolute inset-0 bg-grid"
          style={{ WebkitMaskImage: fade, maskImage: fade }}
        />
      )}
    </div>
  );
}

export default HeaderBleed;
