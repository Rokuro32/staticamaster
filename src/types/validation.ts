// Types pour le moteur de validation

import { CompetencyTag } from './question';

export type FeedbackType = 'success' | 'error' | 'warning' | 'hint' | 'info';

export type ValidationTarget =
  | 'dcl-forces'
  | 'dcl-supports'
  | 'dcl-directions'
  | 'equation-selection'
  | 'equation-terms'
  | 'equation-signs'
  | 'calculation'
  | 'units'
  | 'final-answer';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  target: ValidationTarget;
  message: string;
  suggestion?: string;
  relatedHint?: number; // Index of related hint
}

export interface DCLValidation {
  forcesPresent: boolean;
  forcesCorrect: boolean;
  supportsCorrect: boolean;
  directionsCorrect: boolean;
  missingForces: string[];
  extraForces: string[];
  wrongDirections: string[];
}

export interface EquationValidation {
  equationsSelected: boolean;
  equationsCorrect: boolean;
  termsCorrect: boolean;
  signsCorrect: boolean;
  missingEquations: string[];
  wrongEquations: string[];
}

export interface NumericValidation {
  isWithinTolerance: boolean;
  percentError: number;
  absoluteError: number;
  unitCorrect: boolean;
  signCorrect: boolean;
}

export interface ValidationResult {
  isCorrect: boolean;
  score: number; // 0-100
  partialCredit: number; // 0-100
  feedback: FeedbackItem[];

  // Validations détaillées par mode
  dclValidation?: DCLValidation;
  equationValidation?: EquationValidation;
  numericValidation?: NumericValidation;

  // Pour le suivi
  competenciesAssessed: (CompetencyTag | string)[];
  timeSpent?: number;
}

// Réponse utilisateur
export interface UserAnswer {
  questionId: string;
  timestamp: number;
  timeSpent: number; // seconds

  // Selon le type de question
  selectedOption?: string; // MCQ
  numericValue?: number;
  unit?: string;

  // DCL
  placedForces?: Array<{
    id: string;
    name: string;
    angle: number;
    applicationPoint: { x: number; y: number };
  }>;
  placedSupports?: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
  }>;

  // Équations
  selectedEquations?: string[];
  equationTerms?: Record<string, string[]>;

  // Calculs intermédiaires
  intermediateValues?: Record<string, number>;
  finalAnswer?: number;
}

// Configuration de validation
export interface ValidationConfig {
  // Tolérances
  defaultNumericTolerance: number;
  defaultToleranceType: 'percent' | 'absolute';

  // Crédit partiel
  enablePartialCredit: boolean;
  dclWeight: number; // 0-1
  equationWeight: number; // 0-1
  calculationWeight: number; // 0-1

  // Strictness
  requireCorrectUnits: boolean;
  requireCorrectSign: boolean;
  significantFiguresCheck: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  defaultNumericTolerance: 2,
  defaultToleranceType: 'percent',
  enablePartialCredit: true,
  dclWeight: 0.3,
  equationWeight: 0.3,
  calculationWeight: 0.4,
  requireCorrectUnits: true,
  requireCorrectSign: true,
  significantFiguresCheck: false,
};
