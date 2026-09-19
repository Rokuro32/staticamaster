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
    icon: 'mathematiques',
  },
  {
    id: 'statique',
    title: 'Statique',
    tagline: 'Forces, moments et structures',
    description:
      "Équilibre des corps rigides : addition de forces, moments et couples, analyse de treillis et résistance des matériaux.",
    icon: 'statique',
  },
  {
    id: 'cinematique',
    title: 'Cinématique',
    tagline: 'Mouvement des corps',
    description:
      "Description du mouvement : position, vitesse et accélération en 1D et 2D, tir balistique, mouvement circulaire, mouvement relatif et mouvement hélicoïdal.",
    icon: 'cinematique',
  },
  {
    id: 'dynamique',
    title: 'Dynamique',
    tagline: 'Chocs et quantité de mouvement',
    description:
      "Ce qui se conserve quand des corps interagissent : quantité de mouvement, impulsion, énergie cinétique, et ce qui distingue un choc élastique d'un choc mou.",
    icon: 'dynamique',
  },
  {
    id: 'mecanismes',
    title: 'Mécanismes et machines',
    tagline: 'Engrenages et liaisons',
    description:
      "Transmission du mouvement dans les machines : trains d'engrenages planétaires, coulisseaux croisés et systèmes bielle-manivelle.",
    icon: 'mecanismes',
  },
  {
    id: 'ondes',
    title: 'Ondes et oscillations',
    tagline: 'Du ressort à la lumière',
    description:
      "Mouvement harmonique simple, ondes mécaniques, son et ondes électromagnétiques : superposition, interférence, résonance et diffraction.",
    icon: 'ondes',
  },
  {
    id: 'electricite',
    title: 'Électricité',
    tagline: 'Circuits et signaux',
    description:
      "Circuits à courant continu, loi d'Ohm, associations série et parallèle, résistance interne, et signaux bioélectriques.",
    icon: 'electricite',
  },
  {
    id: 'moderne',
    title: 'Physique moderne',
    tagline: 'Relativité et quantique',
    description:
      "Relativité restreinte, naissance de la physique quantique et structure de l'atome : les idées qui ont refondé la physique du 20ᵉ siècle.",
    icon: 'moderne',
  },
  {
    id: 'nucleaire',
    title: 'Physique nucléaire',
    tagline: 'Noyaux et rayonnements',
    description:
      "Décroissance radioactive, rayonnements α, β et γ, chaînes de désintégration, fission, fusion et accélération de particules.",
    icon: 'nucleaire',
  },
  {
    id: 'thermo-fluides',
    title: 'Thermodynamique et fluides',
    tagline: 'Chaleur et écoulements',
    description:
      "Rayonnement thermique des corps, bilan radiatif de l'atmosphère et écoulement des fluides incompressibles.",
    icon: 'thermo-fluides',
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
    icon: 'cercle-trigonometrique',
    topics: ['Cercle unité', 'sin, cos, tan', 'Quadrants', 'Angles remarquables'],
  },
  {
    id: 'operations-vectorielles',
    categoryId: 'mathematiques',
    title: 'Opérations vectorielles',
    summary: "Addition, soustraction, produit scalaire et produit vectoriel en 2D et 3D.",
    description:
      "Créez des vecteurs, modifiez leur module et leur orientation, puis observez la résultante, les composantes, le produit scalaire et le produit vectoriel. L'addition et la soustraction sont construites par la méthode du triangle : les vecteurs sont mis bout à bout, et A − B est montré comme A + (−B). Une vue 3D permet de visualiser l'orientation du produit vectoriel.",
    icon: 'operations-vectorielles',
    topics: [
      'Méthode du triangle',
      'Composantes',
      'Résultante',
      'Produit scalaire',
      'Produit vectoriel',
      'Vue 3D',
    ],
  },

  // ------------------------------------------------------------- Statique
  {
    id: 'addition-de-forces',
    categoryId: 'statique',
    title: 'Addition de forces',
    summary: "Placez des forces sur un corps et obtenez la résultante et l'équilibrante.",
    description:
      "Ajoutez des forces sur une boîte ou librement sur le canevas, ajustez leur module et leur direction, et suivez le calcul de la force résultante et de la force équilibrante, composante par composante.",
    icon: 'addition-de-forces',
    topics: ['Force résultante', 'Équilibrante', 'Décomposition', 'Équilibre au point'],
  },
  {
    id: 'moments-et-rotation',
    categoryId: 'statique',
    title: 'Moments, couples et rotation',
    summary: "Moment de force, bras de levier, moment d'inertie et conditions d'équilibre.",
    description:
      "Huit modules interactifs autour de la rotation : moment d'une force, couple, bras de levier, moment d'inertie selon la géométrie, relation M = Iα, énergie de rotation, types d'appuis et équilibre du corps rigide.",
    icon: 'moments-et-rotation',
    topics: ['Moment de force', 'Couple', 'Bras de levier', "Moment d'inertie", 'Types d’appui'],
  },
  {
    id: 'analyse-de-treillis',
    categoryId: 'statique',
    title: 'Analyse de treillis',
    summary: "Méthode des nœuds et méthode des sections sur des treillis 2D.",
    description:
      "Construisez ou chargez un treillis, appliquez des charges et résolvez-le pas à pas par la méthode des nœuds ou par la méthode des sections. Les barres en traction et en compression sont identifiées visuellement.",
    icon: 'analyse-de-treillis',
    topics: ['Méthode des nœuds', 'Méthode des sections', 'Traction / compression', 'Réactions d’appui'],
  },
  {
    id: 'resistance-des-materiaux',
    categoryId: 'statique',
    title: 'Résistance des matériaux',
    summary: "Contraintes, déformations et essai de traction jusqu'à la rupture.",
    description:
      "Explorez la relation contrainte-déformation, le module de Young, la limite élastique et le coefficient de sécurité, puis menez un essai de traction virtuel sur différents matériaux jusqu'à la rupture.",
    icon: 'resistance-des-materiaux',
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
    icon: 'cinematique-1d',
    topics: ['MRU', 'MRUA', 'Chute libre', 'Graphiques x-t, v-t, a-t'],
  },
  {
    id: 'cinematique-2d',
    categoryId: 'cinematique',
    title: 'Mouvement de projectile',
    summary: "Tir balistique et mouvement circulaire : trajectoire, portée et vecteurs.",
    description:
      "Lancez un projectile en réglant la vitesse initiale, l'angle et la hauteur de départ, et suivez la décomposition du mouvement en composantes indépendantes, la portée, la flèche et le temps de vol.",
    icon: 'cinematique-2d',
    topics: ['Tir balistique', 'Portée et flèche', 'Composantes x et y', 'Mouvement circulaire'],
  },
  {
    id: 'mouvement-relatif',
    categoryId: 'cinematique',
    title: 'Mouvement relatif',
    summary: "Changement de référentiel et composition des vitesses.",
    description:
      "Comparez le mouvement d'un objet vu de deux référentiels différents et construisez la composition des vitesses. Utile pour les problèmes de bateau dans un courant ou d'avion dans le vent.",
    icon: 'mouvement-relatif',
    topics: ['Référentiels', 'Composition des vitesses', 'Vitesse relative'],
  },
  {
    id: 'mouvement-helicoidal',
    categoryId: 'cinematique',
    title: 'Mouvement hélicoïdal',
    summary: "Une rotation qui entraîne une translation le long du même axe.",
    description:
      "Réglez le rayon, le pas et la vitesse de rotation, et suivez le point qui décrit l'hélice. Une seconde vue déroule une spire à plat : le triangle rectangle qui apparaît donne d'un coup l'angle d'hélice, la longueur réelle parcourue et la composition des deux vitesses. Préréglages : vis-mère de tour, ressort, foret, vis d'Archimède.",
    icon: 'mouvement-helicoidal',
    topics: [
      'Pas et avance',
      "Angle d'hélice",
      'Vitesse tangentielle et axiale',
      'Développement de l\u2019hélice',
      'Vis et écrou',
    ],
  },

  // ------------------------------------------------------------- Dynamique
  {
    id: 'quantite-de-mouvement',
    categoryId: 'dynamique',
    title: 'Conservation de la quantité de mouvement',
    summary: "Deux chariots se percutent : p se conserve, l'énergie pas toujours.",
    description:
      "Réglez les masses et les vitesses de deux chariots, choisissez le type de choc, et comparez l'avant et l'après. La quantité de mouvement totale ne bouge jamais ; l'énergie cinétique, elle, ne se conserve que dans un choc parfaitement élastique. Le centre de masse, marqué sur la piste, avance à vitesse constante même pendant la collision — c'est la conservation rendue visible.",
    icon: 'quantite-de-mouvement',
    topics: [
      'Quantité de mouvement',
      'Impulsion',
      'Choc élastique',
      'Choc mou',
      'Coefficient de restitution',
      'Centre de masse',
    ],
  },

  // ----------------------------------------------------------- Mécanismes
  {
    id: 'train-planetaire',
    categoryId: 'mecanismes',
    title: 'Train planétaire',
    summary: "Train épicycloïdal : planétaire, satellites et couronne.",
    description:
      "Animez un train d'engrenages épicycloïdal et observez les rapports de vitesse selon l'élément bloqué. La formule de Willis est appliquée en direct sur la configuration choisie.",
    icon: 'train-planetaire',
    topics: ['Train épicycloïdal', 'Formule de Willis', 'Rapport de transmission'],
  },
  {
    id: 'coulisseaux-croises',
    categoryId: 'mecanismes',
    title: 'Coulisseaux croisés',
    summary: "Conversion d'un mouvement circulaire en mouvement alternatif.",
    description:
      "Suivez un système de coulisseaux croisés qui transforme la rotation en translation sinusoïdale, avec les courbes de position, de vitesse et d'accélération du coulisseau.",
    icon: 'coulisseaux-croises',
    topics: ['Mouvement alternatif', 'Rotation vers translation', 'Courbes cinématiques'],
  },
  {
    id: 'bielle-manivelle',
    categoryId: 'mecanismes',
    title: 'Système bielle-manivelle',
    summary: "Le mécanisme du moteur à pistons, analysé en direct.",
    description:
      "Réglez le rayon de manivelle et la longueur de bielle, puis observez la course du piston, sa vitesse et son accélération. L'écart avec un mouvement purement sinusoïdal apparaît clairement quand la bielle raccourcit.",
    icon: 'bielle-manivelle',
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
    icon: 'oscillations-et-ondes',
    topics: ['MHS', 'Énergie', 'Amortissement', 'Résonance', 'Superposition'],
  },
  {
    id: 'ondes-sonores',
    categoryId: 'ondes',
    title: 'Ondes sonores',
    summary: "Compression de l'air, intensité, battements et effet Doppler.",
    description:
      "Visualisez une onde sonore comme une succession de compressions et de raréfactions, et manipulez fréquence, amplitude et vitesse de la source pour comprendre l'intensité, les battements et l'effet Doppler.",
    icon: 'ondes-sonores',
    topics: ['Onde longitudinale', 'Intensité et décibels', 'Battements', 'Effet Doppler'],
  },
  {
    id: 'corde-de-guitare',
    categoryId: 'ondes',
    title: 'Corde de guitare et harmoniques',
    summary: "Ondes stationnaires, modes propres et timbre d'un instrument.",
    description:
      "Pincez une corde, changez sa tension et sa longueur, et observez les modes propres qui s'installent. La superposition des harmoniques montre d'où vient le timbre d'un instrument.",
    icon: 'corde-de-guitare',
    topics: ['Ondes stationnaires', 'Fondamentale et harmoniques', 'Nœuds et ventres', 'Timbre'],
  },
  {
    id: 'ondes-electromagnetiques',
    categoryId: 'ondes',
    title: 'Ondes électromagnétiques',
    summary: "Champs E et B, polarisation, spectre, interférence et diffraction.",
    description:
      "Huit modules sur la lumière : propagation des champs E et B en 3D, polarisation et loi de Malus, spectre électromagnétique, champs créés par des charges, réfraction, expérience de Young, diffraction et loi de Bragg.",
    icon: 'ondes-electromagnetiques',
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
    icon: 'circuits-dc',
    topics: ["Loi d'Ohm", 'Série et parallèle', 'Circuits mixtes', 'Résistance interne', 'Puissance'],
  },
  {
    id: 'electrocardiogramme',
    categoryId: 'electricite',
    title: 'Électrocardiogramme (ECG)',
    summary: "Le signal électrique du cœur, onde par onde.",
    description:
      "Suivez la genèse du tracé ECG : onde P, complexe QRS et onde T mis en relation avec la dépolarisation et la repolarisation du muscle cardiaque, avec plusieurs rythmes à comparer.",
    icon: 'electrocardiogramme',
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
    icon: 'relativite-restreinte',
    topics: ['Facteur de Lorentz', 'Dilatation du temps', 'Contraction des longueurs', 'E = mc²'],
  },
  {
    id: 'paradoxe-des-jumeaux',
    categoryId: 'moderne',
    title: 'Paradoxe des jumeaux',
    summary: "Deux jumeaux, deux lignes d'univers, deux temps propres.",
    description:
      "Envoyez un jumeau en voyage à vitesse relativiste et comparez les âges au retour. La dissymétrie du paradoxe apparaît au moment du demi-tour, quand le voyageur change de référentiel.",
    icon: 'paradoxe-des-jumeaux',
    topics: ['Temps propre', 'Ligne d’univers', 'Changement de référentiel'],
  },
  {
    id: 'physique-quantique',
    categoryId: 'moderne',
    title: 'Naissance de la physique quantique',
    summary: "Corps noir, photoélectrique, Compton, Bohr, dualité, incertitude, Schrödinger, spin.",
    description:
      "Huit expériences fondatrices présentées en ordre chronologique, de la catastrophe ultraviolette (1900) au spin (1922) en passant par l'effet photoélectrique, l'effet Compton, le modèle de Bohr, la dualité onde-corpuscule, le principe d'incertitude et la particule dans une boîte.",
    icon: 'physique-quantique',
    topics: ['Corps noir', 'Effet photoélectrique', 'Effet Compton', 'Modèle de Bohr', 'Incertitude', 'Schrödinger'],
  },
  {
    id: 'physique-atomique',
    categoryId: 'moderne',
    title: 'Physique atomique',
    summary: "Notation isotopique, principe d'exclusion et bandes d'énergie.",
    description:
      "Construisez la notation d'un isotope à partir de A et Z, remplissez les couches électroniques selon le principe d'exclusion de Pauli, puis voyez naître les bandes d'énergie des solides — et la différence entre conducteur, semi-conducteur et isolant.",
    icon: 'physique-atomique',
    topics: ['Isotopes (A, Z)', 'Principe de Pauli', 'Configuration électronique', 'Bandes d’énergie'],
  },

  {
    id: 'modele-standard',
    categoryId: 'moderne',
    title: 'Le Modèle standard',
    summary: "Les 17 particules élémentaires, et ce qui sépare vraiment leurs familles.",
    description:
      "Le tableau habituel du Modèle standard : trois générations de fermions, les bosons de jauge, le boson de Higgs. Cliquez sur une particule pour sa masse, sa charge, son spin, sa charge de couleur et les interactions qu'elle ressent. Six modes de lecture recolorent le tableau selon le critère qui vous intéresse — c'est là qu'on voit pourquoi un quark n'est pas un lepton, et pourquoi la couleur n'existe que chez les quarks et les gluons.",
    icon: 'modele-standard',
    topics: [
      'Fermions et bosons',
      'Quarks et leptons',
      'Charge de couleur',
      'Spin',
      'Générations',
      'Bosons de jauge',
    ],
  },

  {
    id: 'reseaux-complexes',
    categoryId: 'moderne',
    title: 'Réseaux complexes',
    summary: "Matrice d'adjacence, chemins, centralités : ce qu'on mesure sur un réseau.",
    description:
      "Construisez un réseau — aléatoire, sans échelle, petit monde, en communautés — puis changez de mesure et regardez ce qui change de place. Degré, proximité, intermédiarité, vecteur propre et PageRank ne classent pas les sommets dans le même ordre, et c'est tout l'intérêt. Cliquez un sommet pour voir ses mesures côte à côte, affichez la matrice d'adjacence et la distribution des degrés. D'après les chapitres 6 et 7 de « Networks » de Newman.",
    icon: 'reseaux-complexes',
    topics: [
      "Matrice d'adjacence",
      'Degré et densité',
      'Chemins et composantes',
      'Centralités',
      'Clustering',
      'Assortativité',
    ],
  },

  // ------------------------------------------------------------ Nucléaire
  {
    id: 'radioactivite',
    categoryId: 'nucleaire',
    title: 'Radioactivité et réactions nucléaires',
    summary: "Décroissance, rayonnements α β γ, chaînes, fission, fusion et cyclotron.",
    description:
      "Six modules : loi de décroissance et demi-vie, pouvoir de pénétration des rayonnements α, β et γ, chaînes de désintégration, fission en réaction en chaîne, fusion stellaire, et accélération de particules dans un cyclotron.",
    icon: 'radioactivite',
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
    icon: 'rayonnement-thermique',
    topics: ['Corps noir', 'Loi de Wien', 'Stefan-Boltzmann', 'Émissivité'],
  },
  {
    id: 'effet-de-serre',
    categoryId: 'thermo-fluides',
    title: 'Effet de serre',
    summary: "Bilan radiatif de l'atmosphère et température d'équilibre.",
    description:
      "Faites varier la concentration de gaz à effet de serre et l'albédo, puis suivez le bilan entre rayonnement solaire entrant et rayonnement infrarouge sortant jusqu'à la nouvelle température d'équilibre.",
    icon: 'effet-de-serre',
    topics: ['Bilan radiatif', 'Albédo', 'Infrarouge', 'Température d’équilibre'],
  },
  {
    id: 'tube-de-venturi',
    categoryId: 'thermo-fluides',
    title: 'Tube de Venturi',
    summary: "Conservation du débit et théorème de Bernoulli.",
    description:
      "Rétrécissez la section d'un tube et observez la vitesse augmenter pendant que la pression chute. L'équation de continuité et le théorème de Bernoulli sont calculés en direct sur chaque section.",
    icon: 'tube-de-venturi',
    topics: ['Équation de continuité', 'Théorème de Bernoulli', 'Débit', 'Pression dynamique'],
  },
];

export const CATEGORY_THEMES: Record<CategoryId, CategoryTheme> = {
  mathematiques: {
    accent: '#c9b37c',
    text: 'text-sec-math',
    chip: 'bg-sec-math/10 text-sec-math ring-1 ring-inset ring-sec-math/25',
    solid: 'bg-sec-math/20 text-sec-math ring-1 ring-inset ring-sec-math/45',
    gradient: 'from-gold-300 to-gold-500',
    lightText: 'text-sec-math-deep',
    lightChip: 'bg-sec-math/15 text-sec-math-deep ring-1 ring-inset ring-sec-math/35',
  },
  statique: {
    accent: '#b08968',
    text: 'text-sec-statique',
    chip: 'bg-sec-statique/10 text-sec-statique ring-1 ring-inset ring-sec-statique/25',
    solid: 'bg-sec-statique/20 text-sec-statique ring-1 ring-inset ring-sec-statique/45',
    gradient: 'from-[#c39c79] to-[#8f6c50]',
    lightText: 'text-sec-statique-deep',
    lightChip: 'bg-sec-statique/15 text-sec-statique-deep ring-1 ring-inset ring-sec-statique/35',
  },
  cinematique: {
    accent: '#8fae84',
    text: 'text-sec-cinema',
    chip: 'bg-sec-cinema/10 text-sec-cinema ring-1 ring-inset ring-sec-cinema/25',
    solid: 'bg-sec-cinema/20 text-sec-cinema ring-1 ring-inset ring-sec-cinema/45',
    gradient: 'from-[#a6c199] to-[#6d8f64]',
    lightText: 'text-sec-cinema-deep',
    lightChip: 'bg-sec-cinema/15 text-sec-cinema-deep ring-1 ring-inset ring-sec-cinema/35',
  },
  dynamique: {
    accent: '#cf8a4e',
    text: 'text-sec-dynamique',
    chip: 'bg-sec-dynamique/10 text-sec-dynamique ring-1 ring-inset ring-sec-dynamique/25',
    solid: 'bg-sec-dynamique/20 text-sec-dynamique ring-1 ring-inset ring-sec-dynamique/45',
    gradient: 'from-[#e0a468] to-[#a9652e]',
    lightText: 'text-sec-dynamique-deep',
    lightChip: 'bg-sec-dynamique/15 text-sec-dynamique-deep ring-1 ring-inset ring-sec-dynamique/35',
  },
  mecanismes: {
    accent: '#9aa5ae',
    text: 'text-sec-meca',
    chip: 'bg-sec-meca/10 text-sec-meca ring-1 ring-inset ring-sec-meca/25',
    solid: 'bg-sec-meca/20 text-sec-meca ring-1 ring-inset ring-sec-meca/45',
    gradient: 'from-[#b3bcc4] to-[#78848d]',
    lightText: 'text-sec-meca-deep',
    lightChip: 'bg-sec-meca/15 text-sec-meca-deep ring-1 ring-inset ring-sec-meca/35',
  },
  ondes: {
    accent: '#8098b8',
    text: 'text-sec-ondes',
    chip: 'bg-sec-ondes/10 text-sec-ondes ring-1 ring-inset ring-sec-ondes/25',
    solid: 'bg-sec-ondes/20 text-sec-ondes ring-1 ring-inset ring-sec-ondes/45',
    gradient: 'from-[#9ab0cc] to-[#5f7799]',
    lightText: 'text-sec-ondes-deep',
    lightChip: 'bg-sec-ondes/15 text-sec-ondes-deep ring-1 ring-inset ring-sec-ondes/35',
  },
  electricite: {
    accent: '#dcc05a',
    text: 'text-sec-elec',
    chip: 'bg-sec-elec/10 text-sec-elec ring-1 ring-inset ring-sec-elec/25',
    solid: 'bg-sec-elec/20 text-sec-elec ring-1 ring-inset ring-sec-elec/45',
    gradient: 'from-[#ecd684] to-[#bb9d34]',
    lightText: 'text-sec-elec-deep',
    lightChip: 'bg-sec-elec/15 text-sec-elec-deep ring-1 ring-inset ring-sec-elec/35',
  },
  moderne: {
    accent: '#9e8cb8',
    text: 'text-sec-moderne',
    chip: 'bg-sec-moderne/10 text-sec-moderne ring-1 ring-inset ring-sec-moderne/25',
    solid: 'bg-sec-moderne/20 text-sec-moderne ring-1 ring-inset ring-sec-moderne/45',
    gradient: 'from-[#b6a6cc] to-[#7d6b98]',
    lightText: 'text-sec-moderne-deep',
    lightChip: 'bg-sec-moderne/15 text-sec-moderne-deep ring-1 ring-inset ring-sec-moderne/35',
  },
  nucleaire: {
    accent: '#c1705a',
    text: 'text-sec-nucleaire',
    chip: 'bg-sec-nucleaire/10 text-sec-nucleaire ring-1 ring-inset ring-sec-nucleaire/25',
    solid: 'bg-sec-nucleaire/20 text-sec-nucleaire ring-1 ring-inset ring-sec-nucleaire/45',
    gradient: 'from-[#d48f79] to-[#9c5340]',
    lightText: 'text-sec-nucleaire-deep',
    lightChip: 'bg-sec-nucleaire/15 text-sec-nucleaire-deep ring-1 ring-inset ring-sec-nucleaire/35',
  },
  'thermo-fluides': {
    accent: '#7fb0a4',
    text: 'text-sec-fluides',
    chip: 'bg-sec-fluides/10 text-sec-fluides ring-1 ring-inset ring-sec-fluides/25',
    solid: 'bg-sec-fluides/20 text-sec-fluides ring-1 ring-inset ring-sec-fluides/45',
    gradient: 'from-[#9bc5ba] to-[#5c8f83]',
    lightText: 'text-sec-fluides-deep',
    lightChip: 'bg-sec-fluides/15 text-sec-fluides-deep ring-1 ring-inset ring-sec-fluides/35',
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
