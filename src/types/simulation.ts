// Types du catalogue de simulations

export type CategoryId =
  | 'mathematiques'
  | 'statique'
  | 'cinematique'
  | 'mecanismes'
  | 'ondes'
  | 'electricite'
  | 'moderne'
  | 'nucleaire'
  | 'thermo-fluides';

/** Identifiant (slug) d'une simulation, utilisé dans les URLs /simulation/[simId] */
export type SimulationId = string;

export interface Category {
  id: CategoryId;
  title: string;
  /** Sous-titre affiché sur la carte de catégorie */
  tagline: string;
  description: string;
  icon: string;
}

export interface Simulation {
  id: SimulationId;
  categoryId: CategoryId;
  title: string;
  /** Description courte (carte du catalogue) */
  summary: string;
  /** Description longue (page de la simulation) */
  description: string;
  icon: string;
  /** Concepts couverts, affichés sous forme de puces */
  topics: string[];
}

/**
 * Thème d'une catégorie.
 * Le site a deux ambiances : le chrome sombre et la scène claire (page d'une
 * simulation). Chaque catégorie fournit donc ses classes pour les deux.
 * Toutes les classes sont écrites en toutes lettres pour que le JIT de
 * Tailwind les voie.
 */
export interface CategoryTheme {
  /** Accent brut, pour les styles en ligne (halos, --accent) */
  accent: string;
  /** Texte d'accent sur fond sombre */
  text: string;
  /** Pastille / étiquette sur fond sombre */
  chip: string;
  /** Pastille pleine (filtre actif) */
  solid: string;
  /** Dégradé de la tuile d'icône */
  gradient: string;
  /** Texte d'accent sur fond clair */
  lightText: string;
  /** Étiquette sur fond clair */
  lightChip: string;
}
