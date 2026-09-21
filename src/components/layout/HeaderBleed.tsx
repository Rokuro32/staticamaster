import { cn } from '@/lib/utils';

/**
 * Le prolongement coloré du header.
 *
 * La bande du haut ne s'arrête plus net : sa teinte descend sur toute la
 * hauteur de ce calque et s'y dissout complètement. C'est un seul dégradé
 * vertical, posé derrière le décor — donc aucun coût d'animation, et rien à
 * recalculer au défilement.
 *
 * Il est en `absolute` dans le conteneur de la page, jamais en `fixed` : il
 * fait partie du document et s'en va avec lui quand on défile.
 *
 * Les arrêts ne sont pas répartis régulièrement. Un dégradé linéaire à deux
 * arrêts laisse voir une bande de transition ; en concentrant la chute sur le
 * premier tiers puis en étalant une longue traîne, l'œil ne trouve plus de
 * limite.
 */

/** L'or de la marque, en « r, g, b » */
export const GOLD_RGB = '201, 179, 124';

export function HeaderBleed({
  accentRgb = GOLD_RGB,
  /** Hauteur totale de la descente, en pixels */
  height = 900,
  /** Opacité au sommet. Au-delà de 0.16 la teinte commence à se voir comme un aplat. */
  strength = 0.1,
  className,
}: {
  accentRgb?: string;
  height?: number;
  strength?: number;
  className?: string;
}) {
  const a = (k: number) => `rgba(${accentRgb}, ${(strength * k).toFixed(4)})`;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0', className)}
      style={{
        height,
        backgroundImage: `linear-gradient(to bottom,
          ${a(1)} 0%,
          ${a(0.82)} 12%,
          ${a(0.55)} 26%,
          ${a(0.32)} 42%,
          ${a(0.16)} 60%,
          ${a(0.06)} 78%,
          ${a(0)} 100%)`,
      }}
    />
  );
}

export default HeaderBleed;
