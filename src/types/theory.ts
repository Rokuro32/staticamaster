/**
 * Types for the theory content system
 */

export interface TheoryTopic {
  slug: string;
  title: string;
  description?: string;
  order: number;
}

export interface CourseTheory {
  courseId: string;
  topics: TheoryTopic[];
}

/**
 * Theory topics configuration for each course
 */
export const THEORY_CONFIG: Record<string, CourseTheory> = {
  waves_modern: {
    courseId: 'waves_modern',
    topics: [
      { slug: 'oscillations', title: 'Oscillations', description: 'Mouvement harmonique simple, amortissement et résonance', order: 1 },
      { slug: 'ondes-mecaniques', title: 'Ondes mécaniques', description: 'Propagation, superposition et ondes stationnaires', order: 2 },
      { slug: 'ondes-sonores', title: 'Ondes sonores', description: 'Nature du son, effet Doppler et intensité', order: 3 },
      { slug: 'ondes-electromagnetiques', title: 'Ondes électromagnétiques', description: 'Spectre EM, polarisation et énergie', order: 4 },
      { slug: 'interferences-diffraction', title: 'Interférences et diffraction', description: 'Expérience de Young, réseaux et Rayleigh', order: 5 },
      { slug: 'relativite', title: 'Relativité restreinte', description: 'Postulats d\'Einstein, dilatation du temps et contraction des longueurs', order: 6 },
    ],
  },
  statics: {
    courseId: 'statics',
    topics: [
      { slug: 'introduction', title: 'Introduction à la statique', description: 'Rôle de la statique et hypothèses fondamentales', order: 1 },
      { slug: 'geometrie-trigonometrie', title: 'Géométrie et trigonométrie', description: 'Angles, triangles et fonctions trigonométriques', order: 2 },
      { slug: 'vecteurs', title: 'Vecteurs', description: 'Opérations vectorielles et produit vectoriel', order: 3 },
      { slug: 'forces', title: 'Forces et types de forces', description: 'Forces de contact, à distance et DCL', order: 4 },
      { slug: 'equilibre', title: 'Équilibre du point matériel', description: 'Conditions d\'équilibre et résolution', order: 5 },
    ],
  },
  kinematics: {
    courseId: 'kinematics',
    topics: [
      { slug: 'introduction', title: 'Introduction à la cinématique', description: 'Définitions et notions de référentiel', order: 1 },
      { slug: 'mouvement-1d', title: 'Mouvement en 1D', description: 'Position, déplacement et représentation graphique', order: 2 },
      { slug: 'vitesse', title: 'Vitesse', description: 'Vitesse moyenne, instantanée et MRU', order: 3 },
      { slug: 'acceleration', title: 'Accélération', description: 'Accélération et MRUA', order: 4 },
      { slug: 'chute-libre', title: 'Chute libre', description: 'Mouvement vertical sous gravité', order: 5 },
    ],
  },
};

/**
 * Get theory configuration for a course
 */
export function getTheoryConfig(courseId: string): CourseTheory | null {
  return THEORY_CONFIG[courseId] || null;
}

/**
 * Get a specific topic from a course
 */
export function getTheoryTopic(courseId: string, topicSlug: string): TheoryTopic | null {
  const config = THEORY_CONFIG[courseId];
  if (!config) return null;
  return config.topics.find((t) => t.slug === topicSlug) || null;
}
