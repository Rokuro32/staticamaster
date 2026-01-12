'use client';

import type { InstantiatedQuestion } from '@/types/question';
import type { ValidationResult } from '@/types/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CircularProgress, Progress } from '@/components/ui/Progress';
import { COMPETENCY_DISPLAY_NAMES } from '@/types/progress';
import { formatTime } from '@/lib/utils';

interface QuizResultsProps {
  questions: InstantiatedQuestion[];
  results: Map<string, ValidationResult>;
  stats: {
    totalScore: number;
    correctCount: number;
    averageScore: number;
    competencyScores: Record<string, { correct: number; total: number }>;
  };
  moduleName: string;
  totalTime: number;
  onRestart: () => void;
  onBackToModules: () => void;
}

export function QuizResults({
  questions,
  results,
  stats,
  moduleName,
  totalTime,
  onRestart,
  onBackToModules,
}: QuizResultsProps) {
  const scorePercent = Math.round(stats.averageScore);
  const variant = scorePercent >= 80 ? 'success' : scorePercent >= 50 ? 'warning' : 'error';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* En-tête avec score global */}
      <Card variant="elevated" className="mb-8">
        <CardContent className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz terminé!
          </h1>
          <p className="text-gray-600 mb-6">{moduleName}</p>

          <div className="flex justify-center mb-6">
            <CircularProgress
              value={scorePercent}
              size={160}
              strokeWidth={12}
              variant={variant}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {stats.correctCount}/{questions.length}
              </p>
              <p className="text-sm text-gray-500">Bonnes réponses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {scorePercent}%
              </p>
              <p className="text-sm text-gray-500">Score moyen</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatTime(totalTime)}
              </p>
              <p className="text-sm text-gray-500">Temps total</p>
            </div>
          </div>

          {/* Message de félicitations ou d'encouragement */}
          <div className={`mt-6 p-4 rounded-lg ${
            scorePercent >= 80 ? 'bg-success-50' :
            scorePercent >= 50 ? 'bg-warning-50' : 'bg-error-50'
          }`}>
            <p className={`font-medium ${
              scorePercent >= 80 ? 'text-success-700' :
              scorePercent >= 50 ? 'text-warning-700' : 'text-error-700'
            }`}>
              {scorePercent >= 80
                ? 'Excellent travail! Vous maîtrisez bien ces concepts.'
                : scorePercent >= 50
                ? 'Bon effort! Continuez à pratiquer pour améliorer votre score.'
                : 'Continuez à étudier. N\'hésitez pas à revoir les concepts et à refaire le quiz.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Résultats par compétence */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle>Performance par compétence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.competencyScores).map(([tag, score]) => {
              const percent = Math.round((score.correct / score.total) * 100);
              const displayName = COMPETENCY_DISPLAY_NAMES[tag as keyof typeof COMPETENCY_DISPLAY_NAMES] || tag;

              return (
                <div key={tag}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {displayName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {score.correct}/{score.total} ({percent}%)
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    size="sm"
                    variant={percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'error'}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Détail des réponses */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle>Détail des réponses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const result = results.get(question.id);
              if (!result) return null;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.isCorrect
                      ? 'bg-success-50 border-success-500'
                      : 'bg-error-50 border-error-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          Question {index + 1}
                        </span>
                        <Badge
                          variant={result.isCorrect ? 'success' : 'error'}
                          size="sm"
                        >
                          {result.score}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{question.title}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      result.isCorrect ? 'bg-success-500' : 'bg-error-500'
                    }`}>
                      {result.isCorrect ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Feedback résumé */}
                  {result.feedback.length > 0 && !result.isCorrect && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {result.feedback.slice(0, 2).map(fb => (
                        <p key={fb.id} className="text-sm text-gray-600">
                          {fb.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onBackToModules}>
          Retour aux modules
        </Button>
        <Button onClick={onRestart}>
          Refaire le quiz
        </Button>
      </div>
    </div>
  );
}

export default QuizResults;
