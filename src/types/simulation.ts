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

/** Classes Tailwind par catégorie (écrites en toutes lettres pour le JIT) */
export interface CategoryTheme {
  bg: string;
  bgSoft: string;
  text: string;
  border: string;
  ring: string;
  gradient: string;
}
