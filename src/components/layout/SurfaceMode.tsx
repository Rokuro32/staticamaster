'use client';

import { useEffect } from 'react';

/**
 * Bascule l'ambiance du <body> : le chrome du site est sombre, mais la page
 * d'une simulation est claire (les simulations peignent leurs propres
 * surfaces en clair). N'affecte que le fond de dépassement de défilement et
 * la barre de défilement — la page pose sa propre couleur.
 */
export function SurfaceMode({ mode }: { mode: 'dark' | 'light' }) {
  useEffect(() => {
    document.body.dataset.surface = mode;
    return () => {
      delete document.body.dataset.surface;
    };
  }, [mode]);

  return null;
}

export default SurfaceMode;
