'use client';

import { useState, useCallback } from 'react';
import type { InstantiatedQuestion, Force, Support } from '@/types/question';
import type { UserAnswer, ValidationResult } from '@/types/validation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SchemaView } from './SchemaView';
import { EquationView } from './EquationView';
import { CalculationView } from './CalculationView';
import { validateAnswer, DEFAULT_VALIDATION_CONFIG } from '@/lib/validation';
import { generateId } from '@/lib/utils';

interface ProblemContainerProps {
  question: InstantiatedQuestion;
  onComplete: (result: ValidationResult) => void;
  showHints?: boolean;
}

export function ProblemContainer({
  question,
  onComplete,
  showHints = true,
}: ProblemContainerProps) {
  const [activeView, setActiveView] = useState<'schema' | 'equations' | 'calculation'>('schema');
  const [startTime] = useState(Date.now());

  // État pour le DCL
  const [placedForces, setPlacedForces] = useState<Force[]>([]);
  const [placedSupports, setPlacedSupports] = useState<Support[]>([]);

  // État pour les équations
  const [selectedEquations, setSelectedEquations] = useState<string[]>([]);

  // État pour les calculs
  const [intermediateValues, setIntermediateValues] = useState<Record<string, number>>({});
  const [finalAnswer, setFinalAnswer] = useState<number | ''>('');
  const [answerUnit, setAnswerUnit] = useState('');

  // Validation par étape
  const [stepResults, setStepResults] = useState<{
    schema?: ValidationResult;
    equations?: ValidationResult;
    calculation?: ValidationResult;
  }>({});

  // État final
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalResult, setFinalResult] = useState<ValidationResult | null>(null);

  // Indices utilisés
  const [usedHints, setUsedHints] = useState<number>(0);

  const handleValidateStep = useCallback((step: 'schema' | 'equations' | 'calculation') => {
    const userAnswer: UserAnswer = {
      questionId: question.id,
      timestamp: Date.now(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
      placedForces,
      placedSupports: placedSupports.map(s => ({
        id: s.id,
        type: s.type,
        position: s.position,
      })),
      selectedEquations,
      intermediateValues,
      finalAnswer: typeof finalAnswer === 'number' ? finalAnswer : undefined,
      unit: answerUnit,
    };

    const result = validateAnswer(question, userAnswer, DEFAULT_VALIDATION_CONFIG);

    setStepResults(prev => ({
      ...prev,
      [step]: result,
    }));

    // Passer à l'étape suivante si correct
    if (result.score >= 70) {
      if (step === 'schema') setActiveView('equations');
      else if (step === 'equations') setActiveView('calculation');
    }
  }, [question, startTime, placedForces, placedSupports, selectedEquations, intermediateValues, finalAnswer, answerUnit]);

  const handleFinalSubmit = useCallback(() => {
    const userAnswer: UserAnswer = {
      questionId: question.id,
      timestamp: Date.now(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
      placedForces,
      placedSupports: placedSupports.map(s => ({
        id: s.id,
        type: s.type,
        position: s.position,
      })),
      selectedEquations,
      intermediateValues,
      finalAnswer: typeof finalAnswer === 'number' ? finalAnswer : undefined,
      unit: answerUnit,
      numericValue: typeof finalAnswer === 'number' ? finalAnswer : undefined,
    };

    const result = validateAnswer(question, userAnswer, DEFAULT_VALIDATION_CONFIG);

    // Ajuster le score si des indices ont été utilisés
    const hintPenalty = usedHints * 5;
    result.score = Math.max(0, result.score - hintPenalty);

    setFinalResult(result);
    setIsSubmitted(true);
    onComplete(result);
  }, [question, startTime, placedForces, placedSupports, selectedEquations, intermediateValues, finalAnswer, answerUnit, usedHints, onComplete]);

  const handleUseHint = () => {
    if (usedHints < question.hints.length) {
      setUsedHints(prev => prev + 1);
    }
  };

  const expectedAnswer = Array.isArray(question.instantiatedAnswer)
    ? question.instantiatedAnswer[0]
    : question.instantiatedAnswer;

  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête du problème */}
      <Card variant="bordered" className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">Module {question.module}</Badge>
                <Badge variant={
                  question.difficulty === 'beginner' ? 'success' :
                  question.difficulty === 'intermediate' ? 'warning' : 'error'
                }>
                  {question.difficulty}
                </Badge>
                {question.tags.map(tag => (
                  <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
                ))}
              </div>
              <CardTitle>{question.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700">{question.statement}</p>
          </div>

          {/* Données */}
          {Object.keys(question.instantiatedGivens).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Données:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(question.instantiatedGivens).map(([key, value]) => (
                  <div key={key} className="bg-white px-3 py-2 rounded border text-sm">
                    <span className="text-gray-600">{key}:</span>{' '}
                    <span className="font-mono font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inconnues */}
          {question.unknowns.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600">
                <strong>À trouver:</strong> {question.unknowns.join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onglets des vues */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList className="mb-6">
          <TabsTrigger
            value="schema"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              </svg>
            }
          >
            Schéma / DCL
            {stepResults.schema && (
              <Badge
                variant={stepResults.schema.isCorrect ? 'success' : 'error'}
                size="sm"
                className="ml-2"
              >
                {stepResults.schema.score}%
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="equations"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01" />
              </svg>
            }
          >
            Équations
            {stepResults.equations && (
              <Badge
                variant={stepResults.equations.isCorrect ? 'success' : 'error'}
                size="sm"
                className="ml-2"
              >
                {stepResults.equations.score}%
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="calculation"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          >
            Calculs
            {stepResults.calculation && (
              <Badge
                variant={stepResults.calculation.isCorrect ? 'success' : 'error'}
                size="sm"
                className="ml-2"
              >
                {stepResults.calculation.score}%
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema">
          <SchemaView
            question={question}
            placedForces={placedForces}
            placedSupports={placedSupports}
            onForcesChange={setPlacedForces}
            onSupportsChange={setPlacedSupports}
            onValidate={() => handleValidateStep('schema')}
            result={stepResults.schema}
            readonly={isSubmitted}
          />
        </TabsContent>

        <TabsContent value="equations">
          <EquationView
            question={question}
            selectedEquations={selectedEquations}
            onEquationsChange={setSelectedEquations}
            onValidate={() => handleValidateStep('equations')}
            result={stepResults.equations}
            readonly={isSubmitted}
          />
        </TabsContent>

        <TabsContent value="calculation">
          <CalculationView
            question={question}
            intermediateValues={intermediateValues}
            finalAnswer={finalAnswer}
            answerUnit={answerUnit}
            expectedUnit={expectedAnswer.unit}
            onIntermediateChange={setIntermediateValues}
            onFinalAnswerChange={setFinalAnswer}
            onUnitChange={setAnswerUnit}
            onValidate={() => handleValidateStep('calculation')}
            result={stepResults.calculation}
            readonly={isSubmitted}
          />
        </TabsContent>
      </Tabs>

      {/* Section indices */}
      {showHints && question.hints.length > 0 && !isSubmitted && (
        <Card variant="bordered" className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Besoin d'aide?</p>
                <p className="text-xs text-gray-500">
                  {usedHints}/{question.hints.length} indices utilisés
                  {usedHints > 0 && ` (-${usedHints * 5} points)`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseHint}
                disabled={usedHints >= question.hints.length}
              >
                Voir un indice
              </Button>
            </div>

            {usedHints > 0 && (
              <div className="mt-4 space-y-2">
                {question.hints.slice(0, usedHints).map((hint, index) => (
                  <div key={index} className="p-3 bg-primary-50 rounded-lg text-sm text-primary-800">
                    <strong>Indice {index + 1}:</strong> {hint}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bouton de soumission finale */}
      {!isSubmitted && (
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={handleFinalSubmit}
            disabled={finalAnswer === ''}
          >
            Soumettre ma réponse finale
          </Button>
        </div>
      )}

      {/* Résultat final */}
      {finalResult && (
        <Card
          variant="bordered"
          className={`mt-6 ${finalResult.isCorrect ? 'border-success-500 bg-success-50' : 'border-error-500 bg-error-50'}`}
        >
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                finalResult.isCorrect ? 'bg-success-500' : 'bg-error-500'
              }`}>
                {finalResult.isCorrect ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-xl font-bold ${finalResult.isCorrect ? 'text-success-700' : 'text-error-700'}`}>
                  {finalResult.isCorrect ? 'Excellent!' : 'Pas tout à fait...'}
                </p>
                <p className="text-gray-600">
                  Score: {finalResult.score}%
                </p>
              </div>
            </div>

            {/* Explication */}
            {question.explanation && (
              <div className="mt-4 p-4 bg-white rounded-lg">
                <p className="font-medium text-gray-800 mb-2">Explication:</p>
                <p className="text-gray-600">{question.explanation}</p>
              </div>
            )}

            {/* Réponse attendue */}
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="font-medium text-gray-800 mb-2">Réponse attendue:</p>
              <p className="font-mono text-lg">
                {expectedAnswer.variable} = {expectedAnswer.value} {expectedAnswer.unit}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProblemContainer;
