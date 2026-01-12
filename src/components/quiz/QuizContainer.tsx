'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { InstantiatedQuestion, ModuleId } from '@/types/question';
import type { CourseId } from '@/types/course';
import type { UserAnswer, ValidationResult } from '@/types/validation';
import { QuestionCard } from './QuestionCard';
import { QuizResults } from './QuizResults';
import { ProblemContainer } from '@/components/problem/ProblemContainer';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { validateAnswer, DEFAULT_VALIDATION_CONFIG } from '@/lib/validation';

interface QuizContainerProps {
  questions: InstantiatedQuestion[];
  moduleId: ModuleId;
  moduleName: string;
  courseId?: CourseId;
}

export function QuizContainer({ questions, moduleId, moduleName, courseId = 'statics' }: QuizContainerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [results, setResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());

  const currentQuestion = questions[currentIndex];
  const currentResult = results.get(currentQuestion?.id);

  const handleSubmit = (answer: UserAnswer) => {
    // Valider la réponse
    const result = validateAnswer(currentQuestion, answer, DEFAULT_VALIDATION_CONFIG);

    // Sauvegarder
    setAnswers(prev => new Map(prev).set(currentQuestion.id, answer));
    setResults(prev => new Map(prev).set(currentQuestion.id, result));

    // Enregistrer dans la base de données (TODO: API call)
    saveAttempt(currentQuestion.id, answer, result);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Quiz terminé
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers(new Map());
    setResults(new Map());
    setIsComplete(false);
  };

  // Calculer les statistiques
  const stats = calculateStats(results, questions);

  if (isComplete) {
    return (
      <QuizResults
        questions={questions}
        results={results}
        stats={stats}
        moduleName={moduleName}
        totalTime={Math.floor((Date.now() - startTime) / 1000)}
        onRestart={handleRestart}
        onBackToModules={() => router.push(`/course/${courseId}/modules`)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header avec progression */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Module {moduleId}</p>
            <h1 className="text-2xl font-bold text-gray-900">{moduleName}</h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/course/${courseId}/modules`)}
          >
            Quitter
          </Button>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-4">
          <Progress
            value={(answers.size / questions.length) * 100}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-600">
            {answers.size}/{questions.length}
          </span>
        </div>

        {/* Indicateurs de questions */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {questions.map((q, index) => {
            const result = results.get(q.id);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-200 flex-shrink-0
                  ${isCurrent ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                  ${!result ? 'bg-gray-200 text-gray-600' :
                    result.isCorrect ? 'bg-success-500 text-white' : 'bg-error-500 text-white'}
                `}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question actuelle */}
      {currentQuestion && (
        currentQuestion.type === 'dcl' || currentQuestion.type === 'multi-step' ? (
          <ProblemContainer
            question={currentQuestion}
            onComplete={(result) => {
              setResults(prev => new Map(prev).set(currentQuestion.id, result));
              setAnswers(prev => new Map(prev).set(currentQuestion.id, {
                questionId: currentQuestion.id,
                timestamp: Date.now(),
                timeSpent: Math.floor((Date.now() - startTime) / 1000),
              }));
            }}
          />
        ) : (
          <QuestionCard
            question={currentQuestion}
            onSubmit={handleSubmit}
            onNext={handleNext}
            result={currentResult}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
          />
        )
      )}
    </div>
  );
}

// Fonction pour calculer les statistiques
function calculateStats(
  results: Map<string, ValidationResult>,
  questions: InstantiatedQuestion[]
): {
  totalScore: number;
  correctCount: number;
  averageScore: number;
  competencyScores: Record<string, { correct: number; total: number }>;
} {
  let totalScore = 0;
  let correctCount = 0;
  const competencyScores: Record<string, { correct: number; total: number }> = {};

  results.forEach((result, questionId) => {
    totalScore += result.score;
    if (result.isCorrect) correctCount++;

    // Par compétence
    const question = questions.find(q => q.id === questionId);
    if (question) {
      for (const tag of question.tags) {
        if (!competencyScores[tag]) {
          competencyScores[tag] = { correct: 0, total: 0 };
        }
        competencyScores[tag].total++;
        if (result.isCorrect) {
          competencyScores[tag].correct++;
        }
      }
    }
  });

  return {
    totalScore,
    correctCount,
    averageScore: results.size > 0 ? totalScore / results.size : 0,
    competencyScores,
  };
}

// Fonction pour sauvegarder une tentative (placeholder)
async function saveAttempt(
  questionId: string,
  answer: UserAnswer,
  result: ValidationResult
) {
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        answer,
        result,
      }),
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  }
}

export default QuizContainer;
