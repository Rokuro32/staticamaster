import type { ReactNode, SVGProps } from 'react';

// ---------------------------------------------------------------------------
// Pictogrammes du site. Dessinés à la main sur une grille 24×24, trait 1.75,
// en currentColor : ils prennent donc la couleur d'accent de leur contexte.
//
// Pourquoi pas des emojis : un emoji est rendu par la police du système, donc
// il n'a ni le même dessin ni la même épaisseur sur macOS, Windows et Android.
// Impossible d'obtenir quelque chose d'uniforme avec.
//
// Les clés reprennent les identifiants des sections, des simulations et des
// pages, si bien qu'aucune table de correspondance n'est nécessaire.
// ---------------------------------------------------------------------------

const GLYPHS: Record<string, ReactNode> = {
  'mathematiques': <><circle cx="12" cy="12" r="8.5"/><path d="M12 12h8.5"/><path d="M12 12 18 6"/><path d="M16.2 12a4.2 4.2 0 0 0-1.23-2.97"/></>,
  'statique': <><path d="M2.5 17.5h19"/><path d="M6 8.5h12"/><path d="M2.5 17.5 6 8.5 12 17.5 18 8.5l3.5 9"/></>,
  'cinematique': <><path d="M2.5 20.5h19"/><path d="M3.5 20.5C7 4 17 4 20.5 20.5"/><circle cx="3.5" cy="20.5" r="1.7" fill="currentColor" stroke="none"/></>,
  'dynamique': <><circle cx="7.5" cy="12" r="3.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="3.6"/><path d="M1.5 9.4h2.4"/><path d="M1.5 12h2.4"/><path d="M1.5 14.6h2.4"/></>,
  'mecanismes': <><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.5v3"/><path d="M12 18.5v3"/><path d="M2.5 12h3"/><path d="M18.5 12h3"/><path d="M5.3 5.3 7.4 7.4"/><path d="M16.6 16.6l2.1 2.1"/><path d="M18.7 5.3 16.6 7.4"/><path d="M7.4 16.6l-2.1 2.1"/></>,
  'ondes': <><path d="M2.5 12c1.6-6 3.2-6 4.75 0s3.15 6 4.75 0 3.15-6 4.75 0 3.15 6 4.75 0"/></>,
  'electricite': <><path d="M2 12h4"/><path d="M6 7.5v9"/><path d="M9 9.5v5"/><path d="M9 12h2.5"/><path d="M11.5 12 13 8.5l2 7 2-7 1.5 3.5"/><path d="M18.5 12H22"/></>,
  'moderne': <><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/></>,
  'nucleaire': <><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M12 9.1V3.4"/><path d="M14.5 13.4 19.4 16.3"/><path d="M9.5 13.4 4.6 16.3"/><circle cx="12" cy="12" r="8.6" strokeDasharray="2 2.7"/></>,
  'thermo-fluides': <><path d="M12.5 13.8V5.2a2.5 2.5 0 0 0-5 0v8.6a4 4 0 1 0 5 0"/><circle cx="10" cy="17.2" r="1.7" fill="currentColor" stroke="none"/><path d="M16.5 7.5c1.6 0 1.6 2.2 3.2 2.2"/><path d="M16.5 12c1.6 0 1.6 2.2 3.2 2.2"/><path d="M16.5 16.5c1.6 0 1.6 2.2 3.2 2.2"/></>,
  'cercle-trigonometrique': <><circle cx="12" cy="12" r="8.5"/><path d="M12 12h8.5"/><path d="M12 12 18 6"/><path d="M16.2 12a4.2 4.2 0 0 0-1.23-2.97"/></>,
  'operations-vectorielles': <><path d="M3.5 19.5h9"/><path d="M10.4 17.4 12.5 19.5l-2.1 2.1"/><path d="M12.5 19.5V9"/><path d="M10.4 11.1 12.5 9l2.1 2.1"/><path d="M3.5 19.5 12.5 9"/></>,
  'addition-de-forces': <><circle cx="12" cy="13" r="1.9" fill="currentColor" stroke="none"/><path d="M12 13 4.5 8.2"/><path d="M4.5 8.2 8.2 8.5"/><path d="M4.5 8.2 5.6 11.6"/><path d="M12 13 19.5 8.2"/><path d="M19.5 8.2 15.8 8.5"/><path d="M19.5 8.2 18.4 11.6"/><path d="M12 13v7.8"/><path d="M12 20.8 9.4 17.8"/><path d="M12 20.8 14.6 17.8"/></>,
  'moments-et-rotation': <><path d="M2.5 11h19"/><path d="M8 11 5.5 17.5h5Z"/><path d="M18 11v7.5"/><path d="M15.9 16.4 18 18.5l2.1-2.1"/></>,
  'analyse-de-treillis': <><path d="M2.5 17.5h19"/><path d="M6 8.5h12"/><path d="M2.5 17.5 6 8.5 12 17.5 18 8.5l3.5 9"/></>,
  'resistance-des-materiaux': <><path d="M2.5 12h4.5"/><path d="M17 12h4.5"/><rect x="8.5" y="8" width="7" height="8" rx="1"/><path d="M4.8 9.7 2.5 12l2.3 2.3"/><path d="M19.2 9.7 21.5 12l-2.3 2.3"/></>,
  'cinematique-1d': <><path d="M4 4v16h16"/><path d="M4.5 18c4-1 6-8 15-12"/></>,
  'cinematique-2d': <><path d="M2.5 20.5h19"/><path d="M3.5 20.5C7 4 17 4 20.5 20.5"/><circle cx="3.5" cy="20.5" r="1.7" fill="currentColor" stroke="none"/></>,
  'mouvement-relatif': <><path d="M3 15V6"/><path d="M3 15h9"/><path d="M11 20v-6"/><path d="M11 20h10"/><path d="M14 9.5h6"/><path d="M18.2 7.7 20 9.5l-1.8 1.8"/></>,
  'mouvement-helicoidal': <><path d="M2.5 12h19" strokeDasharray="2.5 2.5"/><path d="M4 12c0-3.6 1.6-6.5 3.5-6.5s3.5 2.9 3.5 6.5 1.6 6.5 3.5 6.5S18 15.6 18 12"/><path d="M4 12c0 3.6 1.6 6.5 3.5 6.5S11 15.6 11 12s1.6-6.5 3.5-6.5S18 8.4 18 12"/></>,
  'quantite-de-mouvement': <><circle cx="7.5" cy="12" r="3.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="3.6"/><path d="M1.5 9.4h2.4"/><path d="M1.5 12h2.4"/><path d="M1.5 14.6h2.4"/></>,
  'train-planetaire': <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.9"/><circle cx="12" cy="6.1" r="2.2"/><circle cx="12" cy="17.9" r="2.2"/><circle cx="6.1" cy="12" r="2.2"/><circle cx="17.9" cy="12" r="2.2"/></>,
  'coulisseaux-croises': <><rect x="2.5" y="9.5" width="19" height="5" rx="2.5"/><rect x="9.5" y="2.5" width="5" height="19" rx="2.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></>,
  'bielle-manivelle': <><circle cx="6.2" cy="12" r="4.6"/><circle cx="6.2" cy="12" r="1.3" fill="currentColor" stroke="none"/><path d="M8.9 8.3 15 14"/><rect x="14.8" y="10.6" width="6.7" height="6.8" rx="1"/></>,
  'oscillations-et-ondes': <><path d="M12 2.8v1.7"/><path d="M12 4.5 8.8 6 15.2 8 8.8 10 15.2 12 12 13.6"/><path d="M12 13.6v1.9"/><rect x="8.3" y="15.5" width="7.4" height="5.7" rx="1"/></>,
  'ondes-sonores': <><circle cx="5.5" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M9.5 8.5a5.5 5.5 0 0 1 0 7"/><path d="M13 6a9.5 9.5 0 0 1 0 12"/><path d="M16.5 3.5a13.5 13.5 0 0 1 0 17"/></>,
  'corde-de-guitare': <><path d="M3 5v14"/><path d="M21 5v14"/><path d="M3 12c4.5-7 4.5 7 9 0s4.5 7 9 0"/></>,
  'ondes-electromagnetiques': <><path d="M2.5 12h19" strokeDasharray="2.5 2.5"/><path d="M3.5 12c2-6 4-6 6 0s4 6 6 0 4-6 5 0"/><path d="M5 12l3 3"/><path d="M9.5 12l3 3"/><path d="M14 12l3 3"/></>,
  'circuits-dc': <><path d="M2 12h4"/><path d="M6 7.5v9"/><path d="M9 9.5v5"/><path d="M9 12h2.5"/><path d="M11.5 12 13 8.5l2 7 2-7 1.5 3.5"/><path d="M18.5 12H22"/></>,
  'electrocardiogramme': <><path d="M2.5 13h4l1.5-3 2 8 2.5-11 2 6h7"/></>,
  'relativite-restreinte': <><circle cx="9.5" cy="12" r="6.5"/><path d="M9.5 8v4l2.8 1.8"/><path d="M18 6.5c2.5 2 2.5 9 0 11"/></>,
  'paradoxe-des-jumeaux': <><path d="M7 3.5v17"/><path d="M7 3.5c9 4.5 9 12.5 0 17"/><circle cx="7" cy="3.5" r="1.7" fill="currentColor" stroke="none"/><circle cx="7" cy="20.5" r="1.7" fill="currentColor" stroke="none"/></>,
  'physique-quantique': <><path d="M4 3.5v17"/><path d="M20 3.5v17"/><path d="M4 20.5h16"/><path d="M5.5 14c2-8 4.5-8 6.5 0s4.5 8 6.5 0"/></>,
  'physique-atomique': <><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.2"/><circle cx="18" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="2.8" r="1.8" fill="currentColor" stroke="none"/><circle cx="5.2" cy="16" r="1.8" fill="currentColor" stroke="none"/></>,
  'radioactivite': <><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M12 9.1V3.4"/><path d="M14.5 13.4 19.4 16.3"/><path d="M9.5 13.4 4.6 16.3"/><circle cx="12" cy="12" r="8.6" strokeDasharray="2 2.7"/></>,
  'rayonnement-thermique': <><path d="M4 4v16h16"/><path d="M4.5 19c1.5 0 2.5-11 5-11s3 15 10.5 9.5"/><path d="M9.5 8V19" strokeDasharray="2 2"/></>,
  'effet-de-serre': <><path d="M2.5 20.5h19"/><path d="M2.8 10h18.4" strokeDasharray="3 3"/><path d="M7.5 3v13.5"/><path d="M5.2 14.2 7.5 16.5l2.3-2.3"/><path d="M16.5 18.5V11.5"/><path d="M14.2 13.8 16.5 11.5l2.3 2.3"/></>,
  'tube-de-venturi': <><path d="M2.5 6.5c5 0 5 4 9 4s4-4 10-4"/><path d="M2.5 17.5c5 0 5-4 9-4s4 4 10 4"/><path d="M13.5 12h6"/><path d="M17.7 10.2 19.5 12l-1.8 1.8"/></>,
  'a-propos': <><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/></>,
  'fonctionnalites': <><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.5"/></>,
  'bibliographie': <><path d="M4 4.5h6a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h6v13h-6a2.5 2.5 0 0 0-2 1 2.5 2.5 0 0 0-2-1H4Z"/><path d="M12 5.5v13"/></>,
  'travaux': <><path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12.5h6"/><path d="M9 16h6"/></>,
  'contact': <><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.8 6.8 12 13l8.2-6.2"/></>,
  'biathlon': <><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M12 1.5v3"/><path d="M12 19.5v3"/><path d="M1.5 12h3"/><path d="M19.5 12h3"/></>,
  'code': <><path d="M8.5 7.5 3 12l5.5 4.5"/><path d="M15.5 7.5 21 12l-5.5 4.5"/><path d="M13.5 4.5 10.5 19.5"/></>,
  'recherche-vide': <><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2 20.5 20.5"/><path d="M8 10.5h5"/></>,
};

export type IconName = keyof typeof GLYPHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: string;
  /** Côté du carré, en pixels (défaut : 20) */
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {glyph}
    </svg>
  );
}

/** Vrai si un pictogramme existe pour cette clé */
export function hasIcon(name: string): boolean {
  return name in GLYPHS;
}

export default Icon;
