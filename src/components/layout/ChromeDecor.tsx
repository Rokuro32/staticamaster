import { HeroBackdrop } from './HeroBackdrop';
import { cn } from '@/lib/utils';

/**
 * Le décor des bandes sombres : deux balayages de dégradé qui glissent de
 * gauche à droite, et le champ de points animé.
 *
 * La grille, elle, appartient à HeaderBleed : elle doit descendre aussi bas
 * que la couleur du header et s'éteindre avec elle, ce qu'une couche bornée à
 * la hauteur du décor ne pouvait pas faire.
 *
 * Il est partagé par l'accueil, les pages de section, les pages de simulation
 * et les pages d'information — ce qui garantit qu'elles bougent toutes de la
 * même façon.
 */
export function ChromeDecor({
  height = 'h-80',
  accentRgb,
  density = 'dense',
  intensity = 1.75,
  fade = 'bottom',
  className,
}: {
  /** Classe de hauteur Tailwind de la bande */
  height?: string;
  /** Accent de la section, en « r, g, b » ; l'or de la marque par défaut */
  accentRgb?: string;
  density?: 'dense' | 'normal' | 'sparse' | 'ambient';
  /** Multiplie les opacités du réseau */
  intensity?: number;
  /** Sens de l'estompage : vers le bas, ou en éventail depuis le haut */
  fade?: 'bottom' | 'radial' | 'none';
  className?: string;
}) {
  const mask =
    fade === 'bottom' ? 'mask-fade-b' : fade === 'radial' ? 'mask-fade' : '';

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 overflow-hidden',
        height,
        className
      )}
    >
      <div className={cn('absolute inset-0 gradient-sweep', mask)} />
      <div className={cn('absolute inset-0 gradient-sweep-slow', mask)} />
      <HeroBackdrop
        accent={accentRgb}
        density={density}
        intensity={intensity}
        className={cn('absolute inset-0 h-full w-full', mask)}
      />
    </div>
  );
}

/** Convertit « #c9b37c » en « 201, 179, 124 », la forme attendue par le canvas */
export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default ChromeDecor;
