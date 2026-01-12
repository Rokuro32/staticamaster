// Chargement et gestion des questions

import fs from 'fs';
import path from 'path';
import type {
  Question,
  InstantiatedQuestion,
  ModuleId,
  CompetencyTag,
  Difficulty,
  Answer,
} from '@/types/question';
import { seededRandom, randomInRange, roundTo, createSeed } from './utils';

// Cache des questions
let questionsCache: Question[] | null = null;

/**
 * Charge toutes les questions depuis les fichiers JSON
 */
export function loadAllQuestions(): Question[] {
  if (questionsCache) {
    return questionsCache;
  }

  const questionsDir = path.join(process.cwd(), 'data', 'questions');
  const questions: Question[] = [];

  if (!fs.existsSync(questionsDir)) {
    console.warn('Le répertoire des questions n\'existe pas:', questionsDir);
    return [];
  }

  const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(questionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        questions.push(...data);
      } else if (data.questions && Array.isArray(data.questions)) {
        questions.push(...data.questions);
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de ${file}:`, error);
    }
  }

  questionsCache = questions;
  return questions;
}

/**
 * Recharge les questions (vide le cache)
 */
export function reloadQuestions(): Question[] {
  questionsCache = null;
  return loadAllQuestions();
}

/**
 * Récupère les questions par module
 */
export function getQuestionsByModule(moduleId: ModuleId): Question[] {
  const questions = loadAllQuestions();
  return questions.filter(q => q.module === moduleId && q.active !== false);
}

/**
 * Récupère les questions par tag de compétence
 */
export function getQuestionsByCompetency(tag: CompetencyTag): Question[] {
  const questions = loadAllQuestions();
  return questions.filter(q => q.tags.includes(tag) && q.active !== false);
}

/**
 * Récupère les questions par difficulté
 */
export function getQuestionsByDifficulty(difficulty: Difficulty): Question[] {
  const questions = loadAllQuestions();
  return questions.filter(q => q.difficulty === difficulty && q.active !== false);
}

/**
 * Récupère une question par ID
 */
export function getQuestionById(id: string): Question | null {
  const questions = loadAllQuestions();
  return questions.find(q => q.id === id) || null;
}

/**
 * Génère une variante de question avec des paramètres aléatoires
 */
export function instantiateQuestion(
  question: Question,
  seed?: number
): InstantiatedQuestion {
  const actualSeed = seed ?? createSeed(question.id);
  const random = seededRandom(actualSeed);

  // Si pas de paramètres, retourner la question telle quelle
  if (!question.parameters || Object.keys(question.parameters).length === 0) {
    return {
      ...question,
      seed: actualSeed,
      instantiatedGivens: question.givens,
      instantiatedAnswer: question.answer,
    };
  }

  // Générer les valeurs des paramètres
  const instantiatedGivens: Record<string, number | string> = { ...question.givens };

  for (const [key, param] of Object.entries(question.parameters)) {
    const value = randomInRange(param.min, param.max, param.step, random);
    instantiatedGivens[key] = roundTo(value, param.decimalPlaces ?? 2);
  }

  // Recalculer la réponse si une formule est fournie
  let instantiatedAnswer = question.answer;

  if (question.answerFormula) {
    instantiatedAnswer = calculateAnswer(
      question.answerFormula,
      instantiatedGivens,
      question.answer
    );
  }

  return {
    ...question,
    seed: actualSeed,
    instantiatedGivens,
    instantiatedAnswer,
  };
}

/**
 * Calcule la réponse à partir d'une formule
 */
function calculateAnswer(
  formula: string,
  givens: Record<string, number | string>,
  templateAnswer: Answer | Answer[]
): Answer | Answer[] {
  // Créer un contexte avec les variables
  const context: Record<string, number> = {};
  for (const [key, value] of Object.entries(givens)) {
    if (typeof value === 'number') {
      context[key] = value;
    }
  }

  // Fonctions mathématiques disponibles
  const mathFunctions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    pow: Math.pow,
    PI: Math.PI,
    rad: (deg: number) => deg * (Math.PI / 180),
    deg: (rad: number) => rad * (180 / Math.PI),
  };

  try {
    // Évaluer la formule de manière sécurisée
    const result = evaluateFormula(formula, { ...context, ...mathFunctions });

    if (Array.isArray(templateAnswer)) {
      return templateAnswer.map((ans, index) => ({
        ...ans,
        value: Array.isArray(result) ? result[index] : result,
      }));
    } else {
      return {
        ...templateAnswer,
        value: result,
      };
    }
  } catch (error) {
    console.error('Erreur lors du calcul de la réponse:', error);
    return templateAnswer;
  }
}

/**
 * Évalue une formule mathématique simple
 */
function evaluateFormula(
  formula: string,
  context: Record<string, number | Function>
): number {
  // Remplacer les variables par leurs valeurs
  let expression = formula;

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'number') {
      expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
    }
  }

  // Remplacer les fonctions
  expression = expression
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/PI/g, 'Math.PI')
    .replace(/rad\(/g, '((Math.PI/180)*(')
    .replace(/\)\)/g, '))');

  // Évaluation sécurisée (basique)
  // Note: Pour une production, utiliser une bibliothèque comme mathjs
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return ${expression}`);
    return fn();
  } catch {
    throw new Error(`Impossible d'évaluer la formule: ${formula}`);
  }
}

/**
 * Génère un quiz avec un nombre défini de questions
 */
export function generateQuiz(
  moduleId: ModuleId,
  count: number = 5,
  seed?: number
): InstantiatedQuestion[] {
  const questions = getQuestionsByModule(moduleId);

  if (questions.length === 0) {
    return [];
  }

  const actualSeed = seed ?? Date.now();
  const random = seededRandom(actualSeed);

  // Mélanger et sélectionner
  const shuffled = [...questions].sort(() => random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Instancier chaque question avec un seed unique
  return selected.map((q, index) =>
    instantiateQuestion(q, actualSeed + index)
  );
}

/**
 * Génère un quiz équilibré par difficulté
 */
export function generateBalancedQuiz(
  moduleId: ModuleId,
  counts: { beginner: number; intermediate: number; advanced: number },
  seed?: number
): InstantiatedQuestion[] {
  const questions = getQuestionsByModule(moduleId);
  const actualSeed = seed ?? Date.now();
  const random = seededRandom(actualSeed);

  const byDifficulty = {
    beginner: questions.filter(q => q.difficulty === 'beginner'),
    intermediate: questions.filter(q => q.difficulty === 'intermediate'),
    advanced: questions.filter(q => q.difficulty === 'advanced'),
  };

  const selected: Question[] = [];

  for (const [difficulty, count] of Object.entries(counts)) {
    const pool = byDifficulty[difficulty as Difficulty];
    const shuffled = [...pool].sort(() => random() - 0.5);
    selected.push(...shuffled.slice(0, count));
  }

  // Mélanger le résultat final
  const finalOrder = [...selected].sort(() => random() - 0.5);

  return finalOrder.map((q, index) =>
    instantiateQuestion(q, actualSeed + index)
  );
}

/**
 * Sauvegarde une question dans un fichier JSON
 */
export function saveQuestion(question: Question, moduleId?: ModuleId): void {
  const targetModule = moduleId ?? question.module;
  const fileName = `module${targetModule}-questions.json`;
  const filePath = path.join(process.cwd(), 'data', 'questions', fileName);

  let questions: Question[] = [];

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    questions = Array.isArray(data) ? data : data.questions || [];
  }

  // Chercher si la question existe déjà
  const existingIndex = questions.findIndex(q => q.id === question.id);

  if (existingIndex >= 0) {
    questions[existingIndex] = question;
  } else {
    questions.push(question);
  }

  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');

  // Invalider le cache
  questionsCache = null;
}

/**
 * Supprime une question
 */
export function deleteQuestion(questionId: string): boolean {
  const questionsDir = path.join(process.cwd(), 'data', 'questions');
  const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(questionsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    let questions: Question[] = Array.isArray(data) ? data : data.questions || [];

    const initialLength = questions.length;
    questions = questions.filter(q => q.id !== questionId);

    if (questions.length < initialLength) {
      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
      questionsCache = null;
      return true;
    }
  }

  return false;
}

/**
 * Bascule l'état actif d'une question
 */
export function toggleQuestionActive(questionId: string): boolean {
  const question = getQuestionById(questionId);
  if (!question) return false;

  question.active = !question.active;
  saveQuestion(question);
  return true;
}
