// Générateur de variantes de questions

import type { Question, InstantiatedQuestion, Answer, ModuleId } from '@/types/question';
import { seededRandom, randomInRange, roundTo, createSeed } from './utils';
import { getQuestionsByModule } from './questions';

/**
 * Génère une variante de question avec des paramètres aléatoires
 */
export function generateVariant(
  question: Question,
  seed?: number
): InstantiatedQuestion {
  const actualSeed = seed ?? Date.now();
  const random = seededRandom(actualSeed);

  // Si pas de paramètres, retourner la question originale
  if (!question.parameters || Object.keys(question.parameters).length === 0) {
    return {
      ...question,
      seed: actualSeed,
      instantiatedGivens: { ...question.givens },
      instantiatedAnswer: question.answer,
    };
  }

  // Générer les valeurs des paramètres
  const instantiatedGivens: Record<string, number | string> = {};

  // Copier les valeurs fixes
  for (const [key, value] of Object.entries(question.givens)) {
    if (!(key in question.parameters)) {
      instantiatedGivens[key] = value;
    }
  }

  // Générer les valeurs paramétrées
  for (const [key, param] of Object.entries(question.parameters)) {
    const value = randomInRange(param.min, param.max, param.step, random);
    instantiatedGivens[key] = roundTo(value, param.decimalPlaces ?? 2);
  }

  // Calculer la réponse
  let instantiatedAnswer: Answer | Answer[];

  if (question.answerFormula) {
    instantiatedAnswer = evaluateAnswerFormula(
      question.answerFormula,
      instantiatedGivens,
      question.answer
    );
  } else {
    instantiatedAnswer = question.answer;
  }

  // Mettre à jour l'énoncé avec les nouvelles valeurs
  let updatedStatement = question.statement;
  for (const [key, value] of Object.entries(instantiatedGivens)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    updatedStatement = updatedStatement.replace(regex, String(value));
  }

  return {
    ...question,
    statement: updatedStatement,
    seed: actualSeed,
    instantiatedGivens,
    instantiatedAnswer,
  };
}

/**
 * Évalue une formule de réponse avec les paramètres donnés
 */
function evaluateAnswerFormula(
  formula: string,
  givens: Record<string, number | string>,
  templateAnswer: Answer | Answer[]
): Answer | Answer[] {
  // Construire le contexte d'évaluation
  const context: Record<string, number> = {};

  for (const [key, value] of Object.entries(givens)) {
    if (typeof value === 'number') {
      context[key] = value;
    } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      context[key] = parseFloat(value);
    }
  }

  try {
    // La formule peut être une expression simple ou un objet JSON
    let result: number | number[];

    if (formula.startsWith('{') || formula.startsWith('[')) {
      // Formule JSON complexe
      const formulaObj = JSON.parse(formula);
      result = evaluateFormulaObject(formulaObj, context);
    } else {
      // Expression simple
      result = evaluateExpression(formula, context);
    }

    // Mettre à jour les réponses
    if (Array.isArray(templateAnswer)) {
      return templateAnswer.map((ans, index) => ({
        ...ans,
        value: Array.isArray(result) ? result[index] : result,
      }));
    } else {
      return {
        ...templateAnswer,
        value: typeof result === 'number' ? result : result[0],
      };
    }
  } catch (error) {
    console.error('Erreur lors de l\'évaluation de la formule:', error);
    return templateAnswer;
  }
}

/**
 * Évalue une expression mathématique
 */
function evaluateExpression(expr: string, context: Record<string, number>): number {
  let expression = expr;

  // Remplacer les variables
  for (const [key, value] of Object.entries(context)) {
    expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), `(${value})`);
  }

  // Fonctions mathématiques
  expression = expression
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/asin\(/g, 'Math.asin(')
    .replace(/acos\(/g, 'Math.acos(')
    .replace(/atan\(/g, 'Math.atan(')
    .replace(/atan2\(/g, 'Math.atan2(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/PI/g, 'Math.PI')
    .replace(/rad\(([^)]+)\)/g, '(($1) * Math.PI / 180)')
    .replace(/deg\(([^)]+)\)/g, '(($1) * 180 / Math.PI)');

  // Évaluer (attention: ne pas utiliser en production avec des entrées non contrôlées)
  // eslint-disable-next-line no-new-func
  const fn = new Function(`return ${expression}`);
  return fn();
}

/**
 * Évalue un objet de formule complexe
 */
function evaluateFormulaObject(
  formulaObj: Record<string, string> | string[],
  context: Record<string, number>
): number | number[] {
  if (Array.isArray(formulaObj)) {
    return formulaObj.map(f => evaluateExpression(f, context));
  } else {
    const results: Record<string, number> = {};
    const orderedKeys = topologicalSort(formulaObj);

    for (const key of orderedKeys) {
      results[key] = evaluateExpression(formulaObj[key], { ...context, ...results });
    }

    return Object.values(results);
  }
}

/**
 * Tri topologique pour les dépendances de formules
 */
function topologicalSort(formulas: Record<string, string>): string[] {
  const keys = Object.keys(formulas);
  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);

    const expr = formulas[key];
    for (const other of keys) {
      if (other !== key && expr.includes(other)) {
        visit(other);
      }
    }
    sorted.push(key);
  }

  for (const key of keys) {
    visit(key);
  }

  return sorted;
}

/**
 * Génère plusieurs variantes pour un quiz
 */
export function generateQuizVariants(
  moduleId: ModuleId,
  count: number,
  baseSeed?: number
): InstantiatedQuestion[] {
  const questions = getQuestionsByModule(moduleId);
  const seed = baseSeed ?? Date.now();
  const random = seededRandom(seed);

  // Sélectionner des questions aléatoires
  const shuffled = [...questions].sort(() => random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Générer des variantes pour chaque question
  return selected.map((q, index) => generateVariant(q, seed + index * 1000));
}

/**
 * Génère une variante quotidienne (même seed pour tout le monde)
 */
export function generateDailyVariant(question: Question): InstantiatedQuestion {
  const today = new Date().toISOString().split('T')[0];
  const seed = createSeed(question.id, today);
  return generateVariant(question, seed);
}

/**
 * Vérifie si une question supporte les variantes
 */
export function supportsVariants(question: Question): boolean {
  return !!question.parameters && Object.keys(question.parameters).length > 0;
}

/**
 * Prévisualise les plages de valeurs possibles
 */
export function previewParameterRanges(
  question: Question
): Record<string, { min: number; max: number; examples: number[] }> {
  if (!question.parameters) return {};

  const result: Record<string, { min: number; max: number; examples: number[] }> = {};
  const random = seededRandom(12345);

  for (const [key, param] of Object.entries(question.parameters)) {
    const examples: number[] = [];
    for (let i = 0; i < 5; i++) {
      examples.push(randomInRange(param.min, param.max, param.step, random));
    }

    result[key] = {
      min: param.min,
      max: param.max,
      examples: examples.sort((a, b) => a - b),
    };
  }

  return result;
}
