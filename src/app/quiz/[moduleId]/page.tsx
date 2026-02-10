'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MODULES, type ModuleId, type InstantiatedQuestion } from '@/types/question';
import { QuizContainer } from '@/components/quiz/QuizContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = parseInt(params.moduleId as string) as ModuleId;

  const [questions, setQuestions] = useState<InstantiatedQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const module = MODULES.find(m => m.id === moduleId);

  useEffect(() => {
    if (!module) {
      setError('Module non trouvé');
      setLoading(false);
      return;
    }

    loadQuestions();
  }, [moduleId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questions?moduleId=${moduleId}&all=true`);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les questions. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!module) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Module non trouvé</h1>
        <p className="text-gray-600 mb-8">Le module demandé n'existe pas.</p>
        <Button onClick={() => router.push('/modules')}>
          Retour aux modules
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card variant="bordered">
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
              <svg
                className="animate-spin w-10 h-10 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Chargement du quiz...
            </h2>
            <p className="text-gray-600">
              Préparation des questions pour le module {moduleId}: {module.titleFr}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card variant="bordered">
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-error-100 rounded-full mb-6">
              <svg
                className="w-8 h-8 text-error-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Aucune question disponible'}
            </h2>
            <p className="text-gray-600 mb-8">
              {questions?.length === 0
                ? 'Ce module ne contient pas encore de questions.'
                : 'Une erreur s\'est produite lors du chargement.'}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => router.push('/modules')}>
                Retour aux modules
              </Button>
              <Button onClick={loadQuestions}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <QuizContainer
      questions={questions}
      moduleId={moduleId}
      moduleName={module.titleFr}
    />
  );
}
