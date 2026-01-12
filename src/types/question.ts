// Types pour les questions et le contenu pédagogique

export type ModuleId = 1 | 2 | 3 | 4 | 5;

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type QuestionType = 'mcq' | 'numeric' | 'dcl' | 'equation' | 'multi-step';

// Tags de compétences
export type CompetencyTag =
  | 'trigonometry'
  | 'vectors'
  | 'decomposition'
  | 'cross-product'
  | 'dcl'
  | 'equilibrium-2d'
  | 'equilibrium-3d'
  | 'resultant'
  | 'equilibrant'
  | 'two-force-member'
  | 'moment'
  | 'lever-arm'
  | 'couple'
  | 'sum-forces'
  | 'sum-moments'
  | 'supports'
  | 'truss-nodes'
  | 'truss-sections'
  | 'frame'
  | 'internal-forces'
  | 'stress'
  | 'strain'
  | 'youngs-modulus'
  | 'safety-factor'
  | 'stress-strain-diagram';

// Modules du cours
export interface Module {
  id: ModuleId;
  title: string;
  titleFr: string;
  description: string;
  competencies: CompetencyTag[];
  icon: string;
}

export const MODULES: Module[] = [
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
];

// Éléments de schéma pour DCL
export interface Point2D {
  x: number;
  y: number;
}

export interface Force {
  id: string;
  name: string;
  magnitude?: number;
  angle: number; // degrees from horizontal
  applicationPoint: Point2D;
  color?: string;
  isUnknown?: boolean;
}

export type SupportType = 'pin' | 'roller' | 'fixed' | 'cable' | 'link';

export interface Support {
  id: string;
  type: SupportType;
  position: Point2D;
  angle?: number; // for roller direction
  reactions: string[]; // names of reaction forces
}

export interface SchemaElement {
  id: string;
  type: 'beam' | 'point' | 'joint' | 'member' | 'load' | 'dimension';
  start?: Point2D;
  end?: Point2D;
  position?: Point2D;
  label?: string;
  length?: number;
}

export interface Schema {
  type: 'beam' | 'truss' | 'frame' | 'point';
  width: number;
  height: number;
  elements: SchemaElement[];
  correctForces: Force[];
  correctSupports: Support[];
}

// Équations
export interface EquationForm {
  id: string;
  latex: string; // LaTeX representation
  terms: string[];
  acceptedVariants?: string[];
}

export interface EquationSet {
  required: string[]; // e.g., ["ΣFx=0", "ΣFy=0", "ΣMA=0"]
  forms: EquationForm[];
}

// Réponses
export interface Answer {
  variable: string;
  value: number;
  unit: string;
  tolerance: number;
  toleranceType: 'percent' | 'absolute';
  significantFigures?: number;
}

// Erreurs courantes
export interface CommonMistake {
  pattern: string; // Regex pattern or approximate value
  patternType: 'regex' | 'value' | 'range';
  minValue?: number;
  maxValue?: number;
  message: string;
  hint: string;
  category: 'sign' | 'unit' | 'formula' | 'concept' | 'calculation';
}

// Options QCM
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

// Paramètres pour variantes
export interface ParameterDef {
  min: number;
  max: number;
  step: number;
  unit: string;
  decimalPlaces?: number;
}

// Question principale
export interface Question {
  id: string;
  module: ModuleId;
  tags: CompetencyTag[];
  difficulty: Difficulty;
  type: QuestionType;
  active: boolean;

  // Contenu
  title: string;
  statement: string; // Supports Markdown and LaTeX
  statementImage?: string; // Optional image path

  // Données
  givens: Record<string, number | string>;
  unknowns: string[];

  // Pour questions DCL interactives
  schema?: Schema;

  // Pour questions d'équations
  equations?: EquationSet;

  // Pour QCM
  options?: MCQOption[];

  // Réponses
  answer: Answer | Answer[];

  // Pédagogie
  hints: string[];
  commonMistakes: CommonMistake[];
  explanation: string;
  solutionSteps?: string[];

  // Paramétrage
  parameters?: Record<string, ParameterDef>;
  answerFormula?: string; // Formula to recalculate answer from parameters

  // Métadonnées
  createdAt?: string;
  updatedAt?: string;
}

// Question avec paramètres instanciés
export interface InstantiatedQuestion extends Omit<Question, 'parameters' | 'answerFormula'> {
  seed: number;
  instantiatedGivens: Record<string, number | string>;
  instantiatedAnswer: Answer | Answer[];
}
