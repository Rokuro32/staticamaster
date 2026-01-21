// Moteur de validation des réponses

import type {
  Question,
  InstantiatedQuestion,
  Answer,
  Force,
  Support,
  CommonMistake,
} from '@/types/question';
import type {
  ValidationResult,
  FeedbackItem,
  UserAnswer,
  DCLValidation,
  EquationValidation,
  NumericValidation,
  WaveSketchValidation,
  ValidationConfig,
} from '@/types/validation';
import { DEFAULT_VALIDATION_CONFIG } from '@/types/validation';
import {
  isApproximatelyEqual,
  percentError,
  anglesAreSimilar,
  distance,
  unitsAreEquivalent,
  generateId,
} from './utils';

/**
 * Valide une réponse utilisateur complète
 */
export function validateAnswer(
  question: Question | InstantiatedQuestion,
  userAnswer: UserAnswer,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidationResult {
  const feedback: FeedbackItem[] = [];
  let totalScore = 0;
  let maxScore = 100;

  // Récupérer la réponse attendue
  const expectedAnswer = 'instantiatedAnswer' in question
    ? question.instantiatedAnswer
    : question.answer;

  // Validation selon le type de question
  switch (question.type) {
    case 'mcq':
      return validateMCQ(question, userAnswer, feedback);

    case 'numeric':
      return validateNumeric(expectedAnswer, userAnswer, question.commonMistakes, config, feedback);

    case 'dcl':
      return validateDCL(question, userAnswer, config, feedback);

    case 'equation':
      return validateEquations(question, userAnswer, config, feedback);

    case 'multi-step':
      return validateMultiStep(question, userAnswer, config, feedback);

    case 'wave-sketch':
      return validateWaveSketch(question, userAnswer, feedback);

    case 'wave-match':
      return validateWaveMatch(question, userAnswer, feedback);

    case 'parameter-identify':
      return validateParameterIdentify(question, userAnswer, feedback);

    default:
      feedback.push({
        id: generateId(),
        type: 'error',
        target: 'final-answer',
        message: 'Type de question non supporté',
      });
      return {
        isCorrect: false,
        score: 0,
        partialCredit: 0,
        feedback,
        competenciesAssessed: question.tags,
      };
  }
}

/**
 * Valide une question à choix multiples
 */
function validateMCQ(
  question: Question,
  userAnswer: UserAnswer,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.options || !userAnswer.selectedOption) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: 'Aucune réponse sélectionnée',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }

  const selectedOption = question.options.find(o => o.id === userAnswer.selectedOption);
  const correctOption = question.options.find(o => o.isCorrect);

  if (selectedOption?.isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'final-answer',
      message: 'Bonne réponse!',
    });
    return {
      isCorrect: true,
      score: 100,
      partialCredit: 100,
      feedback,
      competenciesAssessed: question.tags,
    };
  } else {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: selectedOption?.feedback || 'Réponse incorrecte',
      suggestion: correctOption ? `La bonne réponse était: ${correctOption.text}` : undefined,
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }
}

/**
 * Valide une réponse numérique
 */
function validateNumeric(
  expectedAnswer: Answer | Answer[],
  userAnswer: UserAnswer,
  commonMistakes: CommonMistake[],
  config: ValidationConfig,
  feedback: FeedbackItem[]
): ValidationResult {
  const expected = Array.isArray(expectedAnswer) ? expectedAnswer[0] : expectedAnswer;

  if (userAnswer.numericValue === undefined || userAnswer.numericValue === null) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: 'Aucune valeur numérique fournie',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: [],
      numericValidation: {
        isWithinTolerance: false,
        percentError: 100,
        absoluteError: Math.abs(expected.value),
        unitCorrect: false,
        signCorrect: true,
      },
    };
  }

  const userValue = userAnswer.numericValue;
  const userUnit = userAnswer.unit || '';

  // Vérifier les erreurs courantes d'abord
  const mistake = checkCommonMistakes(userValue, commonMistakes);
  if (mistake) {
    feedback.push({
      id: generateId(),
      type: 'warning',
      target: 'calculation',
      message: mistake.message,
      suggestion: mistake.hint,
    });
  }

  // Vérifier la tolérance
  const tolerance = expected.tolerance || config.defaultNumericTolerance;
  const toleranceType = expected.toleranceType || config.defaultToleranceType;
  const isWithinTolerance = isApproximatelyEqual(userValue, expected.value, tolerance, toleranceType);

  // Vérifier le signe
  const signCorrect = Math.sign(userValue) === Math.sign(expected.value) || expected.value === 0;

  // Vérifier l'unité
  const unitCorrect = !config.requireCorrectUnits ||
    !expected.unit ||
    unitsAreEquivalent(userUnit, expected.unit);

  // Calculer l'erreur
  const pctError = percentError(userValue, expected.value);
  const absError = Math.abs(userValue - expected.value);

  const numericValidation: NumericValidation = {
    isWithinTolerance,
    percentError: pctError,
    absoluteError: absError,
    unitCorrect,
    signCorrect,
  };

  // Déterminer si correct
  const isCorrect = isWithinTolerance && (unitCorrect || !config.requireCorrectUnits);

  // Calculer le score avec crédit partiel
  let score = 0;
  if (isCorrect) {
    score = 100;
  } else if (config.enablePartialCredit) {
    // Crédit partiel basé sur la proximité
    if (signCorrect && pctError < 50) {
      score = Math.max(0, 50 - pctError);
    }
    // Bonus si bonne valeur mais mauvaise unité
    if (isWithinTolerance && !unitCorrect) {
      score = 80;
    }
  }

  // Générer le feedback
  if (isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'final-answer',
      message: 'Bonne réponse!',
    });
  } else {
    if (!signCorrect) {
      feedback.push({
        id: generateId(),
        type: 'error',
        target: 'calculation',
        message: 'Attention au signe de votre réponse',
        suggestion: 'Vérifiez la convention de signes pour les axes',
      });
    }

    if (!isWithinTolerance) {
      feedback.push({
        id: generateId(),
        type: 'error',
        target: 'final-answer',
        message: `Valeur incorrecte (erreur de ${pctError.toFixed(1)}%)`,
        suggestion: `La réponse attendue était ${expected.value} ${expected.unit}`,
      });
    }

    if (!unitCorrect && config.requireCorrectUnits) {
      feedback.push({
        id: generateId(),
        type: 'warning',
        target: 'units',
        message: `Unité incorrecte: "${userUnit}"`,
        suggestion: `L'unité attendue était: ${expected.unit}`,
      });
    }
  }

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    numericValidation,
    competenciesAssessed: [],
  };
}

/**
 * Vérifie les erreurs courantes
 */
function checkCommonMistakes(
  value: number,
  mistakes: CommonMistake[]
): CommonMistake | null {
  for (const mistake of mistakes) {
    switch (mistake.patternType) {
      case 'value':
        if (isApproximatelyEqual(value, parseFloat(mistake.pattern), 2, 'percent')) {
          return mistake;
        }
        break;

      case 'range':
        if (
          mistake.minValue !== undefined &&
          mistake.maxValue !== undefined &&
          value >= mistake.minValue &&
          value <= mistake.maxValue
        ) {
          return mistake;
        }
        break;

      case 'regex':
        const regex = new RegExp(mistake.pattern);
        if (regex.test(value.toString())) {
          return mistake;
        }
        break;
    }
  }
  return null;
}

/**
 * Valide un diagramme de corps libre
 */
function validateDCL(
  question: Question,
  userAnswer: UserAnswer,
  config: ValidationConfig,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.schema) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'dcl-forces',
      message: 'Pas de schéma défini pour cette question',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }

  const { correctForces, correctSupports } = question.schema;
  const placedForces = userAnswer.placedForces || [];
  const placedSupports = userAnswer.placedSupports || [];

  // Valider les forces
  const missingForces: string[] = [];
  const extraForces: string[] = [];
  const wrongDirections: string[] = [];
  let forcesCorrect = true;

  for (const expected of correctForces) {
    const found = placedForces.find(pf =>
      pf.name === expected.name ||
      (distance(pf.applicationPoint, expected.applicationPoint) < 20 &&
        anglesAreSimilar(pf.angle, expected.angle, 15))
    );

    if (!found) {
      missingForces.push(expected.name);
      forcesCorrect = false;
    } else if (!anglesAreSimilar(found.angle, expected.angle, 15)) {
      wrongDirections.push(expected.name);
      forcesCorrect = false;
    }
  }

  // Forces en trop
  for (const placed of placedForces) {
    const matches = correctForces.find(cf =>
      cf.name === placed.name ||
      (distance(placed.applicationPoint, cf.applicationPoint) < 20 &&
        anglesAreSimilar(placed.angle, cf.angle, 15))
    );
    if (!matches) {
      extraForces.push(placed.name || 'Force inconnue');
    }
  }

  // Valider les appuis
  let supportsCorrect = true;
  for (const expected of correctSupports) {
    const found = placedSupports.find(ps =>
      ps.type === expected.type &&
      distance(ps.position, expected.position) < 20
    );
    if (!found) {
      supportsCorrect = false;
    }
  }

  const dclValidation: DCLValidation = {
    forcesPresent: missingForces.length === 0,
    forcesCorrect: forcesCorrect && extraForces.length === 0,
    supportsCorrect,
    directionsCorrect: wrongDirections.length === 0,
    missingForces,
    extraForces,
    wrongDirections,
  };

  // Calculer le score
  let score = 0;
  const totalElements = correctForces.length + correctSupports.length;
  const correctElements =
    (correctForces.length - missingForces.length - wrongDirections.length) +
    (supportsCorrect ? correctSupports.length : 0);

  score = Math.round((correctElements / totalElements) * 100);

  // Générer le feedback
  if (missingForces.length > 0) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'dcl-forces',
      message: `Forces manquantes: ${missingForces.join(', ')}`,
      suggestion: 'Identifiez toutes les forces agissant sur le corps',
    });
  }

  if (extraForces.length > 0) {
    feedback.push({
      id: generateId(),
      type: 'warning',
      target: 'dcl-forces',
      message: `Forces en trop: ${extraForces.join(', ')}`,
      suggestion: 'Vérifiez si ces forces agissent réellement sur le corps isolé',
    });
  }

  if (wrongDirections.length > 0) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'dcl-directions',
      message: `Directions incorrectes: ${wrongDirections.join(', ')}`,
      suggestion: 'Vérifiez le sens des forces (vers le corps ou s\'éloignant)',
    });
  }

  if (!supportsCorrect) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'dcl-supports',
      message: 'Appuis incorrects ou manquants',
      suggestion: 'Vérifiez le type d\'appui et les réactions associées',
    });
  }

  const isCorrect = score === 100;

  if (isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'dcl-forces',
      message: 'DCL correct! Toutes les forces et appuis sont bien identifiés.',
    });
  }

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    dclValidation,
    competenciesAssessed: question.tags,
  };
}

/**
 * Valide les équations sélectionnées
 */
function validateEquations(
  question: Question,
  userAnswer: UserAnswer,
  config: ValidationConfig,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.equations) {
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback: [{
        id: generateId(),
        type: 'error',
        target: 'equation-selection',
        message: 'Pas d\'équations définies pour cette question',
      }],
      competenciesAssessed: question.tags,
    };
  }

  const { required } = question.equations;
  const selected = userAnswer.selectedEquations || [];

  const missingEquations = required.filter(eq => !selected.includes(eq));
  const wrongEquations = selected.filter(eq => !required.includes(eq));

  const equationValidation: EquationValidation = {
    equationsSelected: selected.length > 0,
    equationsCorrect: missingEquations.length === 0 && wrongEquations.length === 0,
    termsCorrect: true, // Simplifié pour l'instant
    signsCorrect: true,
    missingEquations,
    wrongEquations,
  };

  let score = 0;
  if (required.length > 0) {
    const correctCount = required.length - missingEquations.length;
    score = Math.round((correctCount / required.length) * 100);
    // Pénalité pour équations fausses
    score = Math.max(0, score - wrongEquations.length * 20);
  }

  // Feedback
  if (missingEquations.length > 0) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'equation-selection',
      message: `Équations manquantes: ${missingEquations.join(', ')}`,
      suggestion: 'Pour un problème d\'équilibre 2D, vous avez besoin de ΣFx=0, ΣFy=0 et ΣM=0',
    });
  }

  if (wrongEquations.length > 0) {
    feedback.push({
      id: generateId(),
      type: 'warning',
      target: 'equation-selection',
      message: `Équations non nécessaires: ${wrongEquations.join(', ')}`,
    });
  }

  const isCorrect = missingEquations.length === 0 && wrongEquations.length === 0;

  if (isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'equation-selection',
      message: 'Bonnes équations sélectionnées!',
    });
  }

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    equationValidation,
    competenciesAssessed: question.tags,
  };
}

/**
 * Valide un problème multi-étapes
 */
function validateMultiStep(
  question: Question | InstantiatedQuestion,
  userAnswer: UserAnswer,
  config: ValidationConfig,
  feedback: FeedbackItem[]
): ValidationResult {
  let totalScore = 0;
  let stepCount = 0;

  // Valider le DCL si présent
  if (question.schema && userAnswer.placedForces) {
    const dclResult = validateDCL(question as Question, userAnswer, config, []);
    feedback.push(...dclResult.feedback);
    totalScore += dclResult.score * config.dclWeight;
    stepCount++;
  }

  // Valider les équations si présentes
  if (question.equations && userAnswer.selectedEquations) {
    const eqResult = validateEquations(question as Question, userAnswer, config, []);
    feedback.push(...eqResult.feedback);
    totalScore += eqResult.score * config.equationWeight;
    stepCount++;
  }

  // Valider la réponse finale
  const expectedAnswer = 'instantiatedAnswer' in question
    ? question.instantiatedAnswer
    : question.answer;

  if (userAnswer.finalAnswer !== undefined) {
    const numResult = validateNumeric(
      expectedAnswer,
      { ...userAnswer, numericValue: userAnswer.finalAnswer },
      question.commonMistakes,
      config,
      []
    );
    feedback.push(...numResult.feedback);
    totalScore += numResult.score * config.calculationWeight;
    stepCount++;
  }

  // Normaliser le score
  const score = stepCount > 0 ? Math.round(totalScore / stepCount) : 0;
  const isCorrect = score >= 90;

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    competenciesAssessed: question.tags,
  };
}

/**
 * Valide un dessin d'onde (wave-sketch)
 */
function validateWaveSketch(
  question: Question | InstantiatedQuestion,
  userAnswer: UserAnswer,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.waveSketch || !userAnswer.drawnPoints || userAnswer.drawnPoints.length < 10) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'wave-shape',
      message: 'Dessin insuffisant - tracez plus de points',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }

  const config = question.waveSketch;
  const points = userAnswer.drawnPoints;

  // Sort points by x
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);

  // Calculate expected wave function
  const expectedY = (x: number): number => {
    let phaseRad = config.phase;
    if (config.phaseUnit === 'deg') {
      phaseRad = (config.phase * Math.PI) / 180;
    }

    let k = 0;
    if (config.wavelength) {
      k = (2 * Math.PI) / config.wavelength;
    } else if (config.frequency) {
      k = 2 * Math.PI * config.frequency;
    }

    if (config.waveType === 'cosine') {
      return config.amplitude * Math.cos(k * x + phaseRad);
    } else {
      return config.amplitude * Math.sin(k * x + phaseRad);
    }
  };

  // Analyze the drawn wave
  // Find amplitude from drawn points
  const yValues = sortedPoints.map(p => p.y);
  const drawnMax = Math.max(...yValues);
  const drawnMin = Math.min(...yValues);
  const drawnAmplitude = (drawnMax - drawnMin) / 2;

  // Calculate amplitude error
  const amplitudeError = Math.abs(drawnAmplitude - config.amplitude) / config.amplitude * 100;
  const amplitudeCorrect = amplitudeError < 20;

  // Sample points and compare to expected
  let totalError = 0;
  let sampleCount = 0;

  for (const point of sortedPoints) {
    const expected = expectedY(point.x);
    const error = Math.abs(point.y - expected) / config.amplitude;
    totalError += error;
    sampleCount++;
  }

  const averageError = sampleCount > 0 ? totalError / sampleCount : 1;
  const shapeAccuracy = Math.max(0, 100 - averageError * 50);
  const shapeCorrect = shapeAccuracy > 60;

  // Estimate wavelength from zero crossings
  let wavelengthError = 0;
  let wavelengthCorrect = true;

  if (config.wavelength) {
    // Find zero crossings (approximate)
    const crossings: number[] = [];
    for (let i = 1; i < sortedPoints.length; i++) {
      if (sortedPoints[i - 1].y * sortedPoints[i].y < 0) {
        // Linear interpolation to find crossing
        const x1 = sortedPoints[i - 1].x;
        const y1 = sortedPoints[i - 1].y;
        const x2 = sortedPoints[i].x;
        const y2 = sortedPoints[i].y;
        const crossX = x1 - y1 * (x2 - x1) / (y2 - y1);
        crossings.push(crossX);
      }
    }

    if (crossings.length >= 2) {
      // Half wavelength is distance between consecutive crossings
      const halfWavelengths: number[] = [];
      for (let i = 1; i < crossings.length; i++) {
        halfWavelengths.push(crossings[i] - crossings[i - 1]);
      }
      const avgHalfWavelength = halfWavelengths.reduce((a, b) => a + b, 0) / halfWavelengths.length;
      const estimatedWavelength = avgHalfWavelength * 2;
      wavelengthError = Math.abs(estimatedWavelength - config.wavelength) / config.wavelength * 100;
      wavelengthCorrect = wavelengthError < 25;
    }
  }

  // Phase is harder to validate precisely, be lenient
  const phaseCorrect = shapeAccuracy > 50;
  const phaseError = shapeCorrect ? 10 : 45;

  const waveSketchValidation: WaveSketchValidation = {
    amplitudeCorrect,
    wavelengthCorrect,
    phaseCorrect,
    shapeCorrect,
    amplitudeError,
    wavelengthError,
    phaseError,
    overallAccuracy: shapeAccuracy,
  };

  // Calculate overall score
  let score = 0;
  if (amplitudeCorrect) score += 30;
  if (wavelengthCorrect) score += 30;
  if (shapeCorrect) score += 40;

  const isCorrect = score >= 80;

  // Generate feedback
  if (isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'wave-shape',
      message: 'Excellent! Votre onde correspond bien a l\'equation.',
    });
  } else {
    if (!amplitudeCorrect) {
      feedback.push({
        id: generateId(),
        type: 'error',
        target: 'wave-amplitude',
        message: `Amplitude incorrecte (erreur: ${amplitudeError.toFixed(0)}%)`,
        suggestion: `L'amplitude attendue est ${config.amplitude}`,
      });
    }

    if (!wavelengthCorrect && config.wavelength) {
      feedback.push({
        id: generateId(),
        type: 'error',
        target: 'wave-wavelength',
        message: `Longueur d'onde incorrecte (erreur: ${wavelengthError.toFixed(0)}%)`,
        suggestion: `La longueur d'onde attendue est ${config.wavelength}`,
      });
    }

    if (!shapeCorrect) {
      feedback.push({
        id: generateId(),
        type: 'warning',
        target: 'wave-shape',
        message: 'La forme generale de l\'onde n\'est pas tout a fait correcte',
        suggestion: 'Verifiez la phase initiale et la forme sinusoidale',
      });
    }
  }

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    waveSketchValidation,
    competenciesAssessed: question.tags,
  };
}

/**
 * Valide une question wave-match (associer equation au graphique)
 */
function validateWaveMatch(
  question: Question | InstantiatedQuestion,
  userAnswer: UserAnswer,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.waveMatch || !userAnswer.selectedWaveOption) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: 'Aucune reponse selectionnee',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }

  const selectedOption = question.waveMatch.options.find(
    o => o.id === userAnswer.selectedWaveOption
  );
  const correctOption = question.waveMatch.options.find(o => o.isCorrect);

  if (selectedOption?.isCorrect) {
    feedback.push({
      id: generateId(),
      type: 'success',
      target: 'final-answer',
      message: 'Bonne reponse! Vous avez correctement identifie l\'equation.',
    });
    return {
      isCorrect: true,
      score: 100,
      partialCredit: 100,
      feedback,
      competenciesAssessed: question.tags,
    };
  } else {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: selectedOption?.feedback || 'Equation incorrecte',
      suggestion: correctOption ? `La bonne reponse etait: ${correctOption.equation}` : undefined,
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }
}

/**
 * Valide une question parameter-identify (identifier les parametres d'un graphique)
 */
function validateParameterIdentify(
  question: Question | InstantiatedQuestion,
  userAnswer: UserAnswer,
  feedback: FeedbackItem[]
): ValidationResult {
  if (!question.parameterIdentify || !userAnswer.identifiedParameters) {
    feedback.push({
      id: generateId(),
      type: 'error',
      target: 'final-answer',
      message: 'Aucun parametre identifie',
    });
    return {
      isCorrect: false,
      score: 0,
      partialCredit: 0,
      feedback,
      competenciesAssessed: question.tags,
    };
  }

  const config = question.parameterIdentify.waveConfig;
  const params = userAnswer.identifiedParameters;
  const toFind = question.parameterIdentify.parametersToFind;

  let correctCount = 0;
  const results: Record<string, boolean> = {};

  for (const param of toFind) {
    let expected: number | undefined;
    let tolerance = 0.1; // 10% tolerance

    switch (param) {
      case 'amplitude':
        expected = config.amplitude;
        break;
      case 'wavelength':
        expected = config.wavelength;
        break;
      case 'frequency':
        expected = config.frequency;
        break;
      case 'period':
        expected = config.frequency ? 1 / config.frequency : undefined;
        break;
      case 'phase':
        expected = config.phase;
        tolerance = 0.2; // More tolerance for phase
        break;
    }

    if (expected !== undefined && params[param] !== undefined) {
      const error = Math.abs(params[param] - expected) / expected;
      const isCorrect = error < tolerance;
      results[param] = isCorrect;

      if (isCorrect) {
        correctCount++;
        feedback.push({
          id: generateId(),
          type: 'success',
          target: 'final-answer',
          message: `${param}: Correct!`,
        });
      } else {
        feedback.push({
          id: generateId(),
          type: 'error',
          target: 'final-answer',
          message: `${param}: Incorrect (votre valeur: ${params[param]}, attendu: ${expected})`,
        });
      }
    }
  }

  const score = Math.round((correctCount / toFind.length) * 100);
  const isCorrect = correctCount === toFind.length;

  return {
    isCorrect,
    score,
    partialCredit: score,
    feedback,
    competenciesAssessed: question.tags,
  };
}

export { DEFAULT_VALIDATION_CONFIG };
