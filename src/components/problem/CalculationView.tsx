'use client';

import { useState } from 'react';
import type { InstantiatedQuestion } from '@/types/question';
import type { ValidationResult } from '@/types/validation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NumericInput, Input } from '@/components/ui/Input';

interface CalculationViewProps {
  question: InstantiatedQuestion;
  intermediateValues: Record<string, number>;
  finalAnswer: number | '';
  answerUnit: string;
  expectedUnit: string;
  onIntermediateChange: (values: Record<string, number>) => void;
  onFinalAnswerChange: (value: number | '') => void;
  onUnitChange: (unit: string) => void;
  onValidate: () => void;
  result?: ValidationResult;
  readonly?: boolean;
}

export function CalculationView({
  question,
  intermediateValues,
  finalAnswer,
  answerUnit,
  expectedUnit,
  onIntermediateChange,
  onFinalAnswerChange,
  onUnitChange,
  onValidate,
  result,
  readonly = false,
}: CalculationViewProps) {
  // Étapes de calcul suggérées basées sur les inconnues
  const calculationSteps = question.unknowns.length > 1
    ? question.unknowns.slice(0, -1)
    : [];

  const handleIntermediateChange = (variable: string, value: number | '') => {
    if (value === '') {
      const newValues = { ...intermediateValues };
      delete newValues[variable];
      onIntermediateChange(newValues);
    } else {
      onIntermediateChange({ ...intermediateValues, [variable]: value });
    }
  };

  const expectedAnswer = Array.isArray(question.instantiatedAnswer)
    ? question.instantiatedAnswer[0]
    : question.instantiatedAnswer;

  return (
    <Card variant="bordered">
      <CardContent>
        <h3 className="font-semibold text-gray-900 mb-4">
          Calculs et réponse finale
        </h3>

        <p className="text-sm text-gray-600 mb-6">
          Entrez vos calculs étape par étape. Les valeurs intermédiaires vous aident
          à vérifier votre raisonnement.
        </p>

        {/* Rappel des données */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Données du problème:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(question.instantiatedGivens).map(([key, value]) => (
              <div key={key} className="bg-white px-3 py-2 rounded border text-sm">
                <span className="text-gray-600">{key} = </span>
                <span className="font-mono font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Valeurs intermédiaires (optionnelles) */}
        {calculationSteps.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Valeurs intermédiaires (optionnel)
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {calculationSteps.map(variable => (
                <NumericInput
                  key={variable}
                  label={`Valeur de ${variable}`}
                  value={intermediateValues[variable] ?? ''}
                  onChange={(value) => handleIntermediateChange(variable, value)}
                  placeholder={`Entrez ${variable}`}
                  disabled={readonly}
                />
              ))}
            </div>
          </div>
        )}

        {/* Zone de calcul libre (note-taking) */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Espace de calcul (brouillon)
          </h4>
          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
            placeholder="Utilisez cet espace pour vos calculs...
Exemple:
ΣMA = 0
-F × 2m + Ry × 4m = 0
Ry = F × 2m / 4m
Ry = ..."
            disabled={readonly}
          />
          <p className="text-xs text-gray-500 mt-1">
            Cet espace n'est pas évalué, utilisez-le pour organiser vos calculs.
          </p>
        </div>

        {/* Réponse finale */}
        <div className="mb-6 p-6 bg-primary-50 rounded-lg border-2 border-primary-200">
          <h4 className="text-lg font-semibold text-primary-900 mb-4">
            Réponse finale
          </h4>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {expectedAnswer.variable} =
              </label>
              <NumericInput
                value={finalAnswer}
                onChange={onFinalAnswerChange}
                placeholder="Votre réponse"
                disabled={readonly}
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unité
              </label>
              <Input
                value={answerUnit}
                onChange={(e) => onUnitChange(e.target.value)}
                placeholder={expectedUnit}
                disabled={readonly}
              />
            </div>
          </div>

          <p className="text-sm text-primary-700 mt-3">
            Unité attendue: <strong>{expectedUnit}</strong>
          </p>
        </div>

        {/* Résultat de validation */}
        {result && (
          <div className={`mb-4 p-4 rounded-lg ${
            result.isCorrect ? 'bg-success-50 border border-success-200' : 'bg-error-50 border border-error-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.isCorrect ? (
                <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-medium ${result.isCorrect ? 'text-success-700' : 'text-error-700'}`}>
                {result.isCorrect ? 'Bonne réponse!' : 'Réponse incorrecte'}
              </span>
              <span className="text-sm text-gray-600">({result.score}%)</span>
            </div>

            {result.feedback.map(fb => (
              <p key={fb.id} className="text-sm text-gray-700 mt-1">
                {fb.message}
                {fb.suggestion && <span className="text-gray-500"> - {fb.suggestion}</span>}
              </p>
            ))}

            {!result.isCorrect && result.numericValidation && (
              <div className="mt-3 p-3 bg-white rounded">
                <p className="text-sm text-gray-600">
                  Erreur: {result.numericValidation.percentError.toFixed(1)}%
                </p>
                {!result.numericValidation.unitCorrect && (
                  <p className="text-sm text-warning-600 mt-1">
                    Vérifiez l'unité de votre réponse
                  </p>
                )}
                {!result.numericValidation.signCorrect && (
                  <p className="text-sm text-warning-600 mt-1">
                    Attention au signe de votre réponse
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Erreurs courantes */}
        {question.commonMistakes.length > 0 && !result && (
          <div className="mb-4 p-4 bg-warning-50 rounded-lg border border-warning-200">
            <h5 className="text-sm font-medium text-warning-800 mb-2">
              Erreurs courantes à éviter:
            </h5>
            <ul className="text-sm text-warning-700 space-y-1">
              {question.commonMistakes.slice(0, 3).map((mistake, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-warning-500">•</span>
                  <span>{mistake.category}: {mistake.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bouton de validation */}
        {!readonly && (
          <Button
            onClick={onValidate}
            disabled={finalAnswer === ''}
          >
            Vérifier ma réponse
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default CalculationView;
