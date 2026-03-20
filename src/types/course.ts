// Types pour le support multi-cours

export type CourseId = 'statics' | 'kinematics' | 'waves_modern' | 'electricity';

export interface Course {
  id: CourseId;
  code: string;        // ex: "203-4A3-RA"
  title: string;       // Titre complet
  shortTitle: string;  // Titre court pour le header
  description: string;
  icon: string;
  color: string;       // Couleur thème (Tailwind class)
  modules: CourseModule[];
}

export interface CourseModule {
  id: number;
  title: string;
  titleFr: string;
  description: string;
  competencies: string[];
  icon: string;
}

// Définition des 4 cours
export const COURSES: Course[] = [
  {
    id: 'statics',
    code: '203-4A3-RA',
    title: 'Équilibre et analyse des structures',
    shortTitle: 'Statique',
    description: 'Étude de l\'équilibre des corps rigides, analyse des structures et résistance des matériaux.',
    icon: '⚖️',
    color: 'primary',
    modules: [
      {
        id: 1,
        title: 'Mathematical Foundations',
        titleFr: 'Bases mathématiques',
        description: 'Trigonométrie, vecteurs, décomposition en composantes, produit vectoriel',
        competencies: ['trigonometry', 'vectors', 'decomposition', 'cross-product'],
        icon: '📐',
      },
      {
        id: 2,
        title: 'Particle Equilibrium',
        titleFr: 'Équilibre d\'un point matériel',
        description: 'DCL au point, équilibre 2D, force résultante et équilibrante',
        competencies: ['dcl', 'equilibrium-2d', 'resultant', 'equilibrant', 'two-force-member'],
        icon: '⚖️',
      },
      {
        id: 3,
        title: 'Rigid Body Equilibrium',
        titleFr: 'Équilibre d\'un corps rigide',
        description: 'Moments, couples, conditions d\'équilibre, types d\'appuis',
        competencies: ['moment', 'lever-arm', 'couple', 'sum-forces', 'sum-moments', 'supports'],
        icon: '🔩',
      },
      {
        id: 4,
        title: 'Structural Equilibrium',
        titleFr: 'Équilibre des structures',
        description: 'Treillis 2D, méthodes des nœuds et sections, cadres',
        competencies: ['truss-nodes', 'truss-sections', 'frame', 'internal-forces'],
        icon: '🏗️',
      },
      {
        id: 5,
        title: 'Strength of Materials',
        titleFr: 'Résistance des matériaux',
        description: 'Contraintes, déformations, module de Young, coefficient de sécurité',
        competencies: ['stress', 'strain', 'youngs-modulus', 'safety-factor', 'stress-strain-diagram'],
        icon: '🔬',
      },
    ],
  },
  {
    id: 'kinematics',
    code: '203-FBC-03',
    title: 'Mouvements de translation',
    shortTitle: 'Cinématique',
    description: 'Étude du mouvement des corps : déplacement, vitesse, accélération, mouvement circulaire.',
    icon: '🚀',
    color: 'emerald',
    modules: [
      {
        id: 1,
        title: '1D Motion',
        titleFr: 'Mouvement 1D',
        description: 'Déplacement, vitesse, accélération, MRU, MRUA, chute libre',
        competencies: ['displacement', 'velocity', 'acceleration', 'mru', 'mrua', 'free-fall'],
        icon: '➡️',
      },
      {
        id: 2,
        title: '2D Motion',
        titleFr: 'Mouvement 2D',
        description: 'Balistique, mouvement dans un plan, mouvement circulaire, mouvement relatif',
        competencies: ['projectile', 'planar-motion', 'circular-motion', 'relative-motion'],
        icon: '🎯',
      },
      {
        id: 3,
        title: 'Rotation',
        titleFr: 'Rotation',
        description: 'Paramètres angulaires, rotation accélérée, transmission de vitesse, centripète/centrifuge',
        competencies: ['angular-parameters', 'angular-acceleration', 'speed-transmission', 'centripetal', 'centrifugal'],
        icon: '🔄',
      },
      {
        id: 4,
        title: 'Machines',
        titleFr: 'Machines',
        description: 'Vitesse d\'avance, vitesse de coupe, articulations, indexage, train planétaire',
        competencies: ['feed-rate', 'cutting-speed', 'joints', 'indexing', 'planetary-gear'],
        icon: '⚙️',
      },
    ],
  },
  {
    id: 'waves_modern',
    code: '203-SN3-RE',
    title: 'Ondes et physique moderne',
    shortTitle: 'Ondes & Moderne',
    description: 'Oscillations, ondes mécaniques et électromagnétiques, introduction à la physique moderne.',
    icon: '🌊',
    color: 'violet',
    modules: [
      {
        id: 1,
        title: 'Oscillations & Mechanical Waves',
        titleFr: 'Oscillations et ondes mécaniques',
        description: 'MHS, énergie, amortissement, résonance, ondes mécaniques, superposition, son, Doppler',
        competencies: ['shm', 'wave-energy', 'damping', 'resonance', 'superposition', 'interference', 'standing-waves', 'sound', 'doppler'],
        icon: '〰️',
      },
      {
        id: 2,
        title: 'Electromagnetic Waves',
        titleFr: 'Ondes électromagnétiques',
        description: 'Spectre EM, polarisation, réfraction, diffraction, interférence, réseaux',
        competencies: ['em-spectrum', 'polarization', 'malus', 'refraction', 'dispersion', 'huygens', 'young', 'thin-films', 'diffraction', 'gratings'],
        icon: '💡',
      },
      {
        id: 3,
        title: 'Modern Physics',
        titleFr: 'Physique moderne',
        description: 'Relativité, effet photoélectrique, dualité onde-particule, mécanique quantique, nucléaire',
        competencies: ['relativity', 'photon', 'blackbody', 'photoelectric', 'compton', 'wave-particle', 'de-broglie', 'heisenberg', 'schrodinger', 'quantum-numbers', 'nuclear', 'radioactivity'],
        icon: '⚛️',
      },
      {
        id: 4,
        title: 'Concept Identification',
        titleFr: 'Identification des concepts',
        description: 'Associer des situations physiques aux bons concepts : MHS, ondes stationnaires, Doppler, interférence, etc.',
        competencies: ['concept-matching', 'shm', 'standing-waves', 'doppler', 'interference', 'diffraction', 'polarization', 'photoelectric', 'relativity'],
        icon: '🎯',
      },
      {
        id: 5,
        title: 'EM Waves Comprehension',
        titleFr: 'Compréhension - Ondes EM',
        description: 'Questions conceptuelles sur les ondes électromagnétiques : nature, propriétés, spectre, applications.',
        competencies: ['em-nature', 'em-spectrum', 'em-properties', 'em-applications', 'light', 'radiation'],
        icon: '💡',
      },
    ],
  },
  {
    id: 'electricity',
    code: '203-NYC-05',
    title: 'Électricité et Magnétisme',
    shortTitle: 'Électricité',
    description: 'Circuits DC, lois de Kirchhoff, résistances en série et parallèle, piles réelles et résistance interne.',
    icon: '⚡',
    color: 'amber',
    modules: [
      {
        id: 1,
        title: 'DC Circuits',
        titleFr: 'Circuits DC',
        description: 'Loi d\'Ohm, résistances en série et parallèle, circuits mixtes, pile réelle',
        competencies: ['ohms-law', 'series-resistance', 'parallel-resistance', 'mixed-circuits', 'internal-resistance'],
        icon: '🔋',
      },
    ],
  },
];

// Helper functions
export function getCourseById(courseId: CourseId): Course | undefined {
  return COURSES.find(c => c.id === courseId);
}

export function getModulesByCourse(courseId: CourseId): CourseModule[] {
  const course = getCourseById(courseId);
  return course?.modules || [];
}

export function getModuleById(courseId: CourseId, moduleId: number): CourseModule | undefined {
  const modules = getModulesByCourse(courseId);
  return modules.find(m => m.id === moduleId);
}

// Couleurs Tailwind par cours
export const COURSE_COLORS: Record<CourseId, { bg: string; text: string; border: string; hover: string }> = {
  statics: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-500',
    hover: 'hover:bg-blue-50',
  },
  kinematics: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    hover: 'hover:bg-emerald-50',
  },
  waves_modern: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-500',
    hover: 'hover:bg-violet-50',
  },
  electricity: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    hover: 'hover:bg-amber-50',
  },
};
