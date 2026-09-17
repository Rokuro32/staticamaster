// Catalogue des simulations : catégories, métadonnées et helpers.
// Ce fichier ne contient QUE des données (aucun composant React) afin de
// pouvoir être importé depuis les composants serveur.

import type {
  Category,
  CategoryId,
  CategoryTheme,
  Simulation,
  SimulationId,
} from '@/types/simulation';

export const CATEGORIES: Category[] = [
  {
    id: 'mathematiques',
    title: 'Mathématiques',
    tagline: 'Trigonométrie et vecteurs',
    description:
      "Les outils mathématiques de base de la physique : cercle trigonométrique, décomposition en composantes et opérations vectorielles en 2D et 3D.",
    icon: '📐',
  },
  {
    id: 'statique',
    title: 'Statique',
    tagline: 'Forces, moments et structures',
    description:
      "Équilibre des corps rigides : addition de forces, moments et couples, analyse de treillis et résistance des matériaux.",
    icon: '⚖️',
  },
  {
    id: 'cinematique',
    title: 'Cinématique',
    tagline: 'Mouvement des corps',
    description:
      "Description du mouvement : position, vitesse et accélération en 1D et 2D, tir balistique, mouvement circulaire et mouvement relatif.",
    icon: '🚀',
  },
  {
    id: 'mecanismes',
    title: 'Mécanismes et machines',
    tagline: 'Engrenages et liaisons',
    description:
      "Transmission du mouvement dans les machines : trains d'engrenages planétaires, coulisseaux croisés et systèmes bielle-manivelle.",
    icon: '⚙️',
  },
  {
    id: 'ondes',
    title: 'Ondes et oscillations',
    tagline: 'Du ressort à la lumière',
    description:
      "Mouvement harmonique simple, ondes mécaniques, son et ondes électromagnétiques : superposition, interférence, résonance et diffraction.",
    icon: '〰️',
  },
  {
    id: 'electricite',
    title: 'Électricité',
    tagline: 'Circuits et signaux',
    description:
      "Circuits à courant continu, loi d'Ohm, associations série et parallèle, résistance interne, et signaux bioélectriques.",
    icon: '⚡',
  },
  {
    id: 'moderne',
    title: 'Physique moderne',
    tagline: 'Relativité et quantique',
    description:
      "Relativité restreinte, naissance de la physique quantique et structure de l'atome : les idées qui ont refondé la physique du 20ᵉ siècle.",
    icon: '⚛️',
  },
  {
    id: 'nucleaire',
    title: 'Physique nucléaire',
    tagline: 'Noyaux et rayonnements',
    description:
      "Décroissance radioactive, rayonnements α, β et γ, chaînes de désintégration, fission, fusion et accélération de particules.",
    icon: '☢️',
  },
  {
    id: 'thermo-fluides',
    title: 'Thermodynamique et fluides',
    tagline: 'Chaleur et écoulements',
    description:
      "Rayonnement thermique des corps, bilan radiatif de l'atmosphère et écoulement des fluides incompressibles.",
    icon: '🌡️',
  },
];

export const SIMULATIONS: Simulation[] = [
  // ---------------------------------------------------------------- Maths
  {
    id: 'cercle-trigonometrique',
    categoryId: 'mathematiques',
    title: 'Cercle trigonométrique',
    summary: "Sinus, cosinus et tangente construits directement sur le cercle unité.",
    description:
      "Déplacez l'angle sur le cercle unité et voyez se construire en temps réel le sinus, le cosinus et la tangente, ainsi que les courbes associées. Idéal pour ancrer les identités remarquables et les signes par quadrant.",
    icon: '🔵',
    topics: ['Cercle unité', 'sin, cos, tan', 'Quadrants', 'Angles remarquables'],
  },
  {
    id: 'operations-vectorielles',
    categoryId: 'mathematiques',
    title: 'Opérations vectorielles',
    summary: "Addition, soustraction, produit scalaire et produit vectoriel en 2D et 3D.",
    description:
      "Créez des vecteurs, modifiez leur module et leur orientation, puis observez la résultante, les composantes, le produit scalaire et le produit vectoriel. Une vue 3D permet de visualiser l'orientation du produit vectoriel.",
    icon: '📐',
    topics: ['Composantes', 'Résultante', 'Produit scalaire', 'Produit vectoriel', 'Vue 3D'],
  },

  // ------------------------------------------------------------- Statique
  {
    id: 'addition-de-forces',
    categoryId: 'statique',
    title: 'Addition de forces',
    summary: "Placez des forces sur un corps et obtenez la résultante et l'équilibrante.",
    description:
      "Ajoutez des forces sur une boîte ou librement sur le canevas, ajustez leur module et leur direction, et suivez le calcul de la force résultante et de la force équilibrante, composante par composante.",
    icon: '⚖️',
    topics: ['Force résultante', 'Équilibrante', 'Décomposition', 'Équilibre au point'],
  },
  {
    id: 'moments-et-rotation',
    categoryId: 'statique',
    title: 'Moments, couples et rotation',
    summary: "Moment de force, bras de levier, moment d'inertie et conditions d'équilibre.",
    description:
      "Huit modules interactifs autour de la rotation : moment d'une force, couple, bras de levier, moment d'inertie selon la géométrie, relation M = Iα, énergie de rotation, types d'appuis et équilibre du corps rigide.",
    icon: '🔄',
    topics: ['Moment de force', 'Couple', 'Bras de levier', "Moment d'inertie", 'Types d’appui'],
  },
  {
    id: 'analyse-de-treillis',
    categoryId: 'statique',
    title: 'Analyse de treillis',
    summary: "Méthode des nœuds et méthode des sections sur des treillis 2D.",
    description:
      "Construisez ou chargez un treillis, appliquez des charges et résolvez-le pas à pas par la méthode des nœuds ou par la méthode des sections. Les barres en traction et en compression sont identifiées visuellement.",
    icon: '🏗️',
    topics: ['Méthode des nœuds', 'Méthode des sections', 'Traction / compression', 'Réactions d’appui'],
  },
  {
    id: 'resistance-des-materiaux',
    categoryId: 'statique',
    title: 'Résistance des matériaux',
    summary: "Contraintes, déformations et essai de traction jusqu'à la rupture.",
    description:
      "Explorez la relation contrainte-déformation, le module de Young, la limite élastique et le coefficient de sécurité, puis menez un essai de traction virtuel sur différents matériaux jusqu'à la rupture.",
    icon: '🔩',
    topics: ['Contrainte', 'Déformation', 'Module de Young', 'Essai de traction', 'Coefficient de sécurité'],
  },

  // ---------------------------------------------------------- Cinématique
  {
    id: 'cinematique-1d',
    categoryId: 'cinematique',
    title: 'Cinématique 1D et graphiques',
    summary: "MRU, MRUA, chute libre et mouvement harmonique, avec les trois graphiques.",
    description:
      "Choisissez un type de mouvement et lisez simultanément les graphiques position-temps, vitesse-temps et accélération-temps. Les liens entre pente, aire sous la courbe et équations du mouvement deviennent visibles.",
    icon: '📈',
    topics: ['MRU', 'MRUA', 'Chute libre', 'Graphiques x-t, v-t, a-t'],
  },
  {
    id: 'cinematique-2d',
    categoryId: 'cinematique',
    title: 'Mouvement de projectile',
    summary: "Tir balistique et mouvement circulaire : trajectoire, portée et vecteurs.",
    description:
      "Lancez un projectile en réglant la vitesse initiale, l'angle et la hauteur de départ, et suivez la décomposition du mouvement en composantes indépendantes, la portée, la flèche et le temps de vol.",
    icon: '🎯',
    topics: ['Tir balistique', 'Portée et flèche', 'Composantes x et y', 'Mouvement circulaire'],
  },
  {
    id: 'mouvement-relatif',
    categoryId: 'cinematique',
    title: 'Mouvement relatif',
    summary: "Changement de référentiel et composition des vitesses.",
    description:
      "Comparez le mouvement d'un objet vu de deux référentiels différents et construisez la composition des vitesses. Utile pour les problèmes de bateau dans un courant ou d'avion dans le vent.",
    icon: '🚂',
    topics: ['Référentiels', 'Composition des vitesses', 'Vitesse relative'],
  },

  // ----------------------------------------------------------- Mécanismes
  {
    id: 'train-planetaire',
    categoryId: 'mecanismes',
    title: 'Train planétaire',
    summary: "Train épicycloïdal : planétaire, satellites et couronne.",
    description:
      "Animez un train d'engrenages épicycloïdal et observez les rapports de vitesse selon l'élément bloqué. La formule de Willis est appliquée en direct sur la configuration choisie.",
    icon: '⚙️',
    topics: ['Train épicycloïdal', 'Formule de Willis', 'Rapport de transmission'],
  },
  {
    id: 'coulisseaux-croises',
    categoryId: 'mecanismes',
    title: 'Coulisseaux croisés',
    summary: "Conversion d'un mouvement circulaire en mouvement alternatif.",
    description:
      "Suivez un système de coulisseaux croisés qui transforme la rotation en translation sinusoïdale, avec les courbes de position, de vitesse et d'accélération du coulisseau.",
    icon: '↔️',
    topics: ['Mouvement alternatif', 'Rotation vers translation', 'Courbes cinématiques'],
  },
  {
    id: 'bielle-manivelle',
    categoryId: 'mecanismes',
    title: 'Système bielle-manivelle',
    summary: "Le mécanisme du moteur à pistons, analysé en direct.",
    description:
      "Réglez le rayon de manivelle et la longueur de bielle, puis observez la course du piston, sa vitesse et son accélération. L'écart avec un mouvement purement sinusoïdal apparaît clairement quand la bielle raccourcit.",
    icon: '🔧',
    topics: ['Manivelle et bielle', 'Course du piston', 'Vitesse et accélération'],
  },

  // ---------------------------------------------------------------- Ondes
  {
    id: 'oscillations-et-ondes',
    categoryId: 'ondes',
    title: 'Oscillations et ondes mécaniques',
    summary: "MHS, énergie, amortissement, résonance et superposition.",
    description:
      "Explorez le mouvement harmonique simple d'un ressort ou d'un pendule, le partage entre énergie cinétique et potentielle, l'amortissement, la résonance, puis la propagation et la superposition d'ondes sur une corde.",
    icon: '〰️',
    topics: ['MHS', 'Énergie', 'Amortissement', 'Résonance', 'Superposition'],
  },
  {
    id: 'ondes-sonores',
    categoryId: 'ondes',
    title: 'Ondes sonores',
    summary: "Compression de l'air, intensité, battements et effet Doppler.",
    description:
      "Visualisez une onde sonore comme une succession de compressions et de raréfactions, et manipulez fréquence, amplitude et vitesse de la source pour comprendre l'intensité, les battements et l'effet Doppler.",
    icon: '🔊',
    topics: ['Onde longitudinale', 'Intensité et décibels', 'Battements', 'Effet Doppler'],
  },
  {
    id: 'corde-de-guitare',
    categoryId: 'ondes',
    title: 'Corde de guitare et harmoniques',
    summary: "Ondes stationnaires, modes propres et timbre d'un instrument.",
    description:
      "Pincez une corde, changez sa tension et sa longueur, et observez les modes propres qui s'installent. La superposition des harmoniques montre d'où vient le timbre d'un instrument.",
    icon: '🎸',
    topics: ['Ondes stationnaires', 'Fondamentale et harmoniques', 'Nœuds et ventres', 'Timbre'],
  },
  {
    id: 'ondes-electromagnetiques',
    categoryId: 'ondes',
    title: 'Ondes électromagnétiques',
    summary: "Champs E et B, polarisation, spectre, interférence et diffraction.",
    description:
      "Huit modules sur la lumière : propagation des champs E et B en 3D, polarisation et loi de Malus, spectre électromagnétique, champs créés par des charges, réfraction, expérience de Young, diffraction et loi de Bragg.",
    icon: '💡',
    topics: ['Champs E et B', 'Polarisation', 'Spectre EM', 'Fentes de Young', 'Diffraction', 'Loi de Bragg'],
  },

  // ---------------------------------------------------------- Électricité
  {
    id: 'circuits-dc',
    categoryId: 'electricite',
    title: 'Circuits à courant continu',
    summary: "Loi d'Ohm, série, parallèle, circuits mixtes et pile réelle.",
    description:
      "Montez un circuit, ajustez les résistances et la tension de la source, et suivez le recalcul instantané des courants, tensions et puissances. La résistance interne de la pile montre l'écart entre f.é.m. et tension aux bornes.",
    icon: '🔋',
    topics: ["Loi d'Ohm", 'Série et parallèle', 'Circuits mixtes', 'Résistance interne', 'Puissance'],
  },
  {
    id: 'electrocardiogramme',
    categoryId: 'electricite',
    title: 'Électrocardiogramme (ECG)',
    summary: "Le signal électrique du cœur, onde par onde.",
    description:
      "Suivez la genèse du tracé ECG : onde P, complexe QRS et onde T mis en relation avec la dépolarisation et la repolarisation du muscle cardiaque, avec plusieurs rythmes à comparer.",
    icon: '💓',
    topics: ['Onde P, QRS, T', 'Dépolarisation', 'Rythme cardiaque', 'Biopotentiels'],
  },

  // ------------------------------------------------------ Physique moderne
  {
    id: 'relativite-restreinte',
    categoryId: 'moderne',
    title: 'Relativité restreinte',
    summary: "Dilatation du temps, contraction des longueurs et facteur de Lorentz.",
    description:
      "Poussez la vitesse vers c et observez le facteur de Lorentz s'emballer : horloges qui ralentissent, longueurs qui se contractent, masse relativiste et énergie totale.",
    icon: '🚀',
    topics: ['Facteur de Lorentz', 'Dilatation du temps', 'Contraction des longueurs', 'E = mc²'],
  },
  {
    id: 'paradoxe-des-jumeaux',
    categoryId: 'moderne',
    title: 'Paradoxe des jumeaux',
    summary: "Deux jumeaux, deux lignes d'univers, deux temps propres.",
    description:
      "Envoyez un jumeau en voyage à vitesse relativiste et comparez les âges au retour. La dissymétrie du paradoxe apparaît au moment du demi-tour, quand le voyageur change de référentiel.",
    icon: '👥',
    topics: ['Temps propre', 'Ligne d’univers', 'Changement de référentiel'],
  },
  {
    id: 'physique-quantique',
    categoryId: 'moderne',
    title: 'Naissance de la physique quantique',
    summary: "Corps noir, photoélectrique, Compton, Bohr, dualité, incertitude, Schrödinger, spin.",
    description:
      "Huit expériences fondatrices présentées en ordre chronologique, de la catastrophe ultraviolette (1900) au spin (1922) en passant par l'effet photoélectrique, l'effet Compton, le modèle de Bohr, la dualité onde-corpuscule, le principe d'incertitude et la particule dans une boîte.",
    icon: '⚛️',
    topics: ['Corps noir', 'Effet photoélectrique', 'Effet Compton', 'Modèle de Bohr', 'Incertitude', 'Schrödinger'],
  },
  {
    id: 'physique-atomique',
    categoryId: 'moderne',
    title: 'Physique atomique',
    summary: "Notation isotopique, principe d'exclusion et bandes d'énergie.",
    description:
      "Construisez la notation d'un isotope à partir de A et Z, remplissez les couches électroniques selon le principe d'exclusion de Pauli, puis voyez naître les bandes d'énergie des solides — et la différence entre conducteur, semi-conducteur et isolant.",
    icon: '🧪',
    topics: ['Isotopes (A, Z)', 'Principe de Pauli', 'Configuration électronique', 'Bandes d’énergie'],
  },

  // ------------------------------------------------------------ Nucléaire
  {
    id: 'radioactivite',
    categoryId: 'nucleaire',
    title: 'Radioactivité et réactions nucléaires',
    summary: "Décroissance, rayonnements α β γ, chaînes, fission, fusion et cyclotron.",
    description:
      "Six modules : loi de décroissance et demi-vie, pouvoir de pénétration des rayonnements α, β et γ, chaînes de désintégration, fission en réaction en chaîne, fusion stellaire, et accélération de particules dans un cyclotron.",
    icon: '☢️',
    topics: ['Demi-vie', 'Rayonnements α β γ', 'Chaînes de désintégration', 'Fission', 'Fusion', 'Cyclotron'],
  },

  // -------------------------------------------------- Thermo et fluides
  {
    id: 'rayonnement-thermique',
    categoryId: 'thermo-fluides',
    title: 'Rayonnement thermique',
    summary: "Corps noir, loi de Wien et loi de Stefan-Boltzmann.",
    description:
      "Chauffez un corps et suivez le déplacement du pic d'émission vers le bleu (loi de Wien) ainsi que la croissance en T⁴ de la puissance rayonnée (loi de Stefan-Boltzmann).",
    icon: '🌡️',
    topics: ['Corps noir', 'Loi de Wien', 'Stefan-Boltzmann', 'Émissivité'],
  },
  {
    id: 'effet-de-serre',
    categoryId: 'thermo-fluides',
    title: 'Effet de serre',
    summary: "Bilan radiatif de l'atmosphère et température d'équilibre.",
    description:
      "Faites varier la concentration de gaz à effet de serre et l'albédo, puis suivez le bilan entre rayonnement solaire entrant et rayonnement infrarouge sortant jusqu'à la nouvelle température d'équilibre.",
    icon: '🌍',
    topics: ['Bilan radiatif', 'Albédo', 'Infrarouge', 'Température d’équilibre'],
  },
  {
    id: 'tube-de-venturi',
    categoryId: 'thermo-fluides',
    title: 'Tube de Venturi',
    summary: "Conservation du débit et théorème de Bernoulli.",
    description:
      "Rétrécissez la section d'un tube et observez la vitesse augmenter pendant que la pression chute. L'équation de continuité et le théorème de Bernoulli sont calculés en direct sur chaque section.",
    icon: '💧',
    topics: ['Équation de continuité', 'Théorème de Bernoulli', 'Débit', 'Pression dynamique'],
  },
];

export const CATEGORY_THEMES: Record<CategoryId, CategoryTheme> = {
  mathematiques: {
    bg: 'bg-sky-500',
    bgSoft: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    ring: 'hover:border-sky-400',
    gradient: 'from-sky-500 to-cyan-500',
  },
  statique: {
    bg: 'bg-blue-600',
    bgSoft: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    ring: 'hover:border-blue-400',
    gradient: 'from-blue-600 to-indigo-600',
  },
  cinematique: {
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'hover:border-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
  },
  mecanismes: {
    bg: 'bg-slate-600',
    bgSoft: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    ring: 'hover:border-slate-400',
    gradient: 'from-slate-600 to-gray-700',
  },
  ondes: {
    bg: 'bg-violet-500',
    bgSoft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    ring: 'hover:border-violet-400',
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  electricite: {
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'hover:border-amber-400',
    gradient: 'from-amber-500 to-orange-500',
  },
  moderne: {
    bg: 'bg-indigo-500',
    bgSoft: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    ring: 'hover:border-indigo-400',
    gradient: 'from-indigo-500 to-purple-600',
  },
  nucleaire: {
    bg: 'bg-orange-600',
    bgSoft: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    ring: 'hover:border-orange-400',
    gradient: 'from-orange-600 to-red-600',
  },
  'thermo-fluides': {
    bg: 'bg-rose-500',
    bgSoft: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'hover:border-rose-400',
    gradient: 'from-rose-500 to-pink-500',
  },
};

// ------------------------------------------------------------------ Helpers

export function getCategoryById(categoryId: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === categoryId);
}

export function getSimulationById(simId: string): Simulation | undefined {
  return SIMULATIONS.find((s) => s.id === simId);
}

export function getSimulationsByCategory(categoryId: string): Simulation[] {
  return SIMULATIONS.filter((s) => s.categoryId === categoryId);
}

export function getThemeByCategory(categoryId: CategoryId): CategoryTheme {
  return CATEGORY_THEMES[categoryId];
}

/** Catégories accompagnées de leurs simulations, dans l'ordre du catalogue */
export function getCatalog(): { category: Category; simulations: Simulation[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    simulations: getSimulationsByCategory(category.id),
  }));
}

export const TOTAL_SIMULATIONS = SIMULATIONS.length;

export type { Category, CategoryId, CategoryTheme, Simulation, SimulationId };
