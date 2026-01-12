// Types pour le suivi de progression

import { CompetencyTag, ModuleId } from './question';

export interface User {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  moduleId: ModuleId;
  startedAt: string;
  completedAt?: string;
  score?: number;
  questionCount: number;
  correctCount: number;
}

export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  userAnswer: string; // JSON stringified
  isCorrect: boolean;
  score: number;
  timeSpent: number; // seconds
  feedback: string; // JSON stringified
  attemptedAt: string;
}

export interface CompetencyProgress {
  id: string;
  userId: string;
  competencyTag: CompetencyTag;
  attempts: number;
  successes: number;
  lastAttempt: string;
  masteryLevel: MasteryLevel;
}

export type MasteryLevel = 'not-started' | 'learning' | 'practicing' | 'mastered';

export function calculateMasteryLevel(attempts: number, successes: number): MasteryLevel {
  if (attempts === 0) return 'not-started';

  const successRate = successes / attempts;

  if (attempts < 3) return 'learning';
  if (successRate >= 0.8 && attempts >= 5) return 'mastered';
  if (successRate >= 0.5) return 'practicing';
  return 'learning';
}

// Statistiques agrégées
export interface ModuleStats {
  moduleId: ModuleId;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  averageScore: number;
  averageTime: number; // seconds
  completionRate: number; // 0-100
}

export interface CompetencyStats {
  tag: CompetencyTag;
  displayName: string;
  attempts: number;
  successes: number;
  successRate: number;
  masteryLevel: MasteryLevel;
  trend: 'improving' | 'stable' | 'declining';
}

export interface UserProgress {
  userId: string;
  totalSessions: number;
  totalAttempts: number;
  overallScore: number;
  moduleStats: ModuleStats[];
  competencyStats: CompetencyStats[];
  recentSessions: Session[];
  weakCompetencies: CompetencyTag[];
  strongCompetencies: CompetencyTag[];
}

// Pour l'export
export interface ExportData {
  exportedAt: string;
  user: User;
  sessions: Session[];
  attempts: Attempt[];
  competencyProgress: CompetencyProgress[];
  summary: UserProgress;
}

// Noms affichables des compétences
export const COMPETENCY_DISPLAY_NAMES: Record<CompetencyTag, string> = {
  'trigonometry': 'Trigonométrie',
  'vectors': 'Vecteurs',
  'decomposition': 'Décomposition vectorielle',
  'cross-product': 'Produit vectoriel',
  'dcl': 'Diagramme de corps libre',
  'equilibrium-2d': 'Équilibre 2D',
  'equilibrium-3d': 'Équilibre 3D',
  'resultant': 'Force résultante',
  'equilibrant': 'Force équilibrante',
  'two-force-member': 'Membrure à deux forces',
  'moment': 'Moment de force',
  'lever-arm': 'Bras de levier',
  'couple': 'Couple de forces',
  'sum-forces': 'Somme des forces',
  'sum-moments': 'Somme des moments',
  'supports': 'Types d\'appuis',
  'truss-nodes': 'Treillis - nœuds',
  'truss-sections': 'Treillis - sections',
  'frame': 'Cadres',
  'internal-forces': 'Forces internes',
  'stress': 'Contraintes',
  'strain': 'Déformations',
  'youngs-modulus': 'Module de Young',
  'safety-factor': 'Coefficient de sécurité',
  'stress-strain-diagram': 'Diagramme traction',
};
