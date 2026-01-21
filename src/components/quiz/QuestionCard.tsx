'use client';

import { useState } from 'react';
import type { InstantiatedQuestion } from '@/types/question';
import type { UserAnswer, ValidationResult, FeedbackItem } from '@/types/validation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NumericInput } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { WaveSketchQuestion } from './WaveSketchQuestion';
import { WaveMatchQuestion } from './WaveMatchQuestion';
import { ParameterIdentifyQuestion } from './ParameterIdentifyQuestion';

interface QuestionCardProps {
  question: InstantiatedQuestion;
  onSubmit: (answer: UserAnswer) => void;
  onNext: () => void;
  result?: ValidationResult;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({
  question,
  onSubmit,
  onNext,
  result,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [startTime] = useState(Date.now());
  const [drawnPoints, setDrawnPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [identifiedParams, setIdentifiedParams] = useState<Record<string, number>>({});

  const isAnswered = !!result;

  const handleSubmit = () => {
    const answer: UserAnswer = {
      questionId: question.id,
      timestamp: Date.now(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
    };

    if (question.type === 'mcq') {
      answer.selectedOption = selectedOption || undefined;
    } else if (question.type === 'numeric') {
      answer.numericValue = numericValue === '' ? undefined : numericValue;
      answer.unit = unit;
    } else if (question.type === 'wave-sketch') {
      answer.drawnPoints = drawnPoints;
    } else if (question.type === 'wave-match') {
      answer.selectedWaveOption = selectedOption || undefined;
    } else if (question.type === 'parameter-identify') {
      answer.identifiedParameters = identifiedParams;
    }

    onSubmit(answer);
  };

  const handleWaveSketchComplete = (points: Array<{ x: number; y: number }>) => {
    setDrawnPoints(points);
    const answer: UserAnswer = {
      questionId: question.id,
      timestamp: Date.now(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
      drawnPoints: points,
    };
    onSubmit(answer);
  };

  const handleParameterIdentify = (params: Record<string, number>) => {
    setIdentifiedParams(params);
    const answer: UserAnswer = {
      questionId: question.id,
      timestamp: Date.now(),
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
      identifiedParameters: params,
    };
    onSubmit(answer);
  };

  const expectedAnswer = Array.isArray(question.instantiatedAnswer)
    ? question.instantiatedAnswer[0]
    : question.instantiatedAnswer;

  return (
    <Card variant="elevated" padding="lg" className="max-w-3xl mx-auto">
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Badge variant="info">
              Question {questionNumber}/{totalQuestions}
            </Badge>
            <Badge variant={
              question.difficulty === 'beginner' ? 'success' :
              question.difficulty === 'intermediate' ? 'warning' : 'error'
            }>
              {question.difficulty === 'beginner' ? 'Débutant' :
               question.difficulty === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
            </Badge>
          </div>
          <div className="flex gap-1">
            {question.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Énoncé */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {question.title}
          </h2>
          <div className="question-statement prose prose-sm max-w-none">
            <p>{renderStatement(question.statement, question.instantiatedGivens)}</p>
          </div>

          {/* Données */}
          {Object.keys(question.instantiatedGivens).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Données:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(question.instantiatedGivens).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-gray-600">{formatVariableName(key)}:</span>{' '}
                    <span className="font-mono font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zone de réponse */}
        {question.type === 'mcq' && question.options && (
          <MCQOptions
            options={question.options}
            selectedOption={selectedOption}
            onSelect={setSelectedOption}
            isAnswered={isAnswered}
            result={result}
          />
        )}

        {question.type === 'numeric' && (
          <NumericAnswer
            value={numericValue}
            unit={unit}
            expectedUnit={expectedAnswer.unit}
            onChange={setNumericValue}
            onUnitChange={setUnit}
            isAnswered={isAnswered}
            result={result}
          />
        )}

        {question.type === 'wave-sketch' && question.waveSketch && (
          <WaveSketchQuestion
            config={question.waveSketch}
            onDrawingComplete={handleWaveSketchComplete}
            isAnswered={isAnswered}
            showCorrect={isAnswered}
          />
        )}

        {question.type === 'wave-match' && question.waveMatch && (
          <WaveMatchQuestion
            config={question.waveMatch}
            selectedOption={selectedOption}
            onSelect={setSelectedOption}
            isAnswered={isAnswered}
          />
        )}

        {question.type === 'parameter-identify' && question.parameterIdentify && (
          <ParameterIdentifyQuestion
            config={question.parameterIdentify}
            onSubmit={handleParameterIdentify}
            isAnswered={isAnswered}
            correctValues={isAnswered ? Object.fromEntries(
              Object.entries({
                amplitude: question.parameterIdentify.waveConfig.amplitude,
                wavelength: question.parameterIdentify.waveConfig.wavelength,
                frequency: question.parameterIdentify.waveConfig.frequency,
                phase: question.parameterIdentify.waveConfig.phase,
              }).filter(([_, v]) => v !== undefined)
            ) as Record<string, number> : undefined}
          />
        )}

        {/* Feedback */}
        {result && (
          <FeedbackPanel feedback={result.feedback} score={result.score} />
        )}

        {/* Explication après réponse */}
        {isAnswered && question.explanation && (
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <p className="text-sm font-medium text-primary-800 mb-2">Explication:</p>
            <p className="text-sm text-primary-700">{question.explanation}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          {!isAnswered ? (
            // wave-sketch, parameter-identify have their own submit buttons
            (question.type !== 'wave-sketch' && question.type !== 'parameter-identify') && (
              <Button
                onClick={handleSubmit}
                disabled={
                  (question.type === 'mcq' && !selectedOption) ||
                  (question.type === 'numeric' && numericValue === '') ||
                  (question.type === 'wave-match' && !selectedOption)
                }
              >
                Valider ma réponse
              </Button>
            )
          ) : (
            <Button onClick={onNext}>
              {questionNumber < totalQuestions ? 'Question suivante' : 'Voir les résultats'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les options QCM
interface MCQOptionsProps {
  options: NonNullable<InstantiatedQuestion['options']>;
  selectedOption: string | null;
  onSelect: (id: string) => void;
  isAnswered: boolean;
  result?: ValidationResult;
}

function MCQOptions({ options, selectedOption, onSelect, isAnswered, result }: MCQOptionsProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedOption === option.id;
        const showCorrect = isAnswered && option.isCorrect;
        const showIncorrect = isAnswered && isSelected && !option.isCorrect;

        return (
          <button
            key={option.id}
            onClick={() => !isAnswered && onSelect(option.id)}
            disabled={isAnswered}
            className={cn(
              'option-button',
              isSelected && !isAnswered && 'selected',
              showCorrect && 'correct',
              showIncorrect && 'incorrect'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
                showCorrect && 'border-success-500 bg-success-500',
                showIncorrect && 'border-error-500 bg-error-500'
              )}>
                {(isSelected || showCorrect) && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-gray-800">{option.text}</span>
            </div>
            {isAnswered && option.feedback && (
              <p className="mt-2 text-sm text-gray-600 pl-9">{option.feedback}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Composant pour réponse numérique
interface NumericAnswerProps {
  value: number | '';
  unit: string;
  expectedUnit: string;
  onChange: (value: number | '') => void;
  onUnitChange: (unit: string) => void;
  isAnswered: boolean;
  result?: ValidationResult;
}

function NumericAnswer({
  value,
  unit,
  expectedUnit,
  onChange,
  onUnitChange,
  isAnswered,
  result,
}: NumericAnswerProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <NumericInput
            label="Votre réponse"
            value={value}
            onChange={onChange}
            placeholder="Entrez la valeur"
            disabled={isAnswered}
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unité
          </label>
          <input
            type="text"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            placeholder={expectedUnit}
            disabled={isAnswered}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500 disabled:bg-gray-50"
          />
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Entrez votre réponse numérique avec l'unité appropriée (ex: {expectedUnit})
      </p>
    </div>
  );
}

// Composant pour le feedback
interface FeedbackPanelProps {
  feedback: FeedbackItem[];
  score: number;
}

function FeedbackPanel({ feedback, score }: FeedbackPanelProps) {
  const isCorrect = score >= 90;

  return (
    <div className="mt-6 space-y-3">
      {/* Score badge */}
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg',
        isCorrect ? 'bg-success-50' : 'bg-error-50'
      )}>
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          isCorrect ? 'bg-success-500' : 'bg-error-500'
        )}>
          {isCorrect ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div>
          <p className={cn(
            'font-semibold',
            isCorrect ? 'text-success-700' : 'text-error-700'
          )}>
            {isCorrect ? 'Bonne réponse!' : 'Réponse incorrecte'}
          </p>
          <p className={cn(
            'text-sm',
            isCorrect ? 'text-success-600' : 'text-error-600'
          )}>
            Score: {score}%
          </p>
        </div>
      </div>

      {/* Détails du feedback */}
      {feedback.filter(f => f.type !== 'success' || !isCorrect).map((item) => (
        <div
          key={item.id}
          className={cn(
            'p-4 rounded-lg',
            item.type === 'error' && 'feedback-error',
            item.type === 'warning' && 'feedback-warning',
            item.type === 'hint' && 'feedback-hint',
            item.type === 'info' && 'bg-gray-50'
          )}
        >
          <p className="font-medium text-gray-800">{item.message}</p>
          {item.suggestion && (
            <p className="mt-1 text-sm text-gray-600">{item.suggestion}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Utilitaires
function renderStatement(statement: string, givens: Record<string, number | string>): string {
  let result = statement;
  for (const [key, value] of Object.entries(givens)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

function formatVariableName(name: string): string {
  const mappings: Record<string, string> = {
    'F': 'Force F',
    'F1': 'Force F₁',
    'F2': 'Force F₂',
    'angle': 'Angle θ',
    'angle1': 'Angle θ₁',
    'angle2': 'Angle θ₂',
    'length': 'Longueur L',
    'mass': 'Masse m',
    'distance': 'Distance d',
    'area': 'Aire A',
    'stress': 'Contrainte σ',
    'strain': 'Déformation ε',
  };
  return mappings[name] || name;
}

export default QuestionCard;
