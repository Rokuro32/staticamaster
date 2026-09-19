'use client';

import { usePathname } from 'next/navigation';
import { HeroBackdrop } from './HeroBackdrop';

/**
 * Le même réseau de points, en fond de toutes les pages — mais à maille très
 * lâche et à faible opacité, pour rester un décor.
 *
 * Il est absent des pages de simulation : là, le corps de page est la scène
 * claire où travaille le simulateur, et un décor animé derrière n'aurait rien
 * à y faire. La bande sombre du haut, elle, garde son propre décor.
 */
export function AmbientBackdrop() {
  const pathname = usePathname();
  if (pathname.startsWith('/simulation/')) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <HeroBackdrop
        density="ambient"
        intensity={0.55}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

export default AmbientBackdrop;
