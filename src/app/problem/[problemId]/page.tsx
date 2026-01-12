'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { InstantiatedQuestion } from '@/types/question';
import { ProblemContainer } from '@/components/problem/ProblemContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProblemPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;

  const [question, setQuestion] = useState<InstantiatedQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProblem();
  }, [problemId]);

  const loadProblem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questions?all=true`);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      const found = data.questions?.find((q: any) => q.id === problemId);

      if (found) {
        // Simuler l'instantiation (pour les valeurs paramétrées)
        setQuestion({
          ...found,
          seed: Date.now(),
          instantiatedGivens: found.givens,
          instantiatedAnswer: found.answer,
        });
      } else {
        setError('Problème non trouvé');
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger le problème');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (result: any) => {
    console.log('Résultat:', result);
    // TODO: Sauvegarder le résultat
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Chargement du problème...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card variant="bordered">
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-error-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Problème non trouvé'}
            </h2>
            <p className="text-gray-600 mb-8">
              Le problème demandé n'existe pas ou n'est pas disponible.
            </p>
            <Button onClick={() => router.push('/modules')}>
              Retour aux modules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <ProblemContainer
        question={question}
        onComplete={handleComplete}
        showHints={true}
      />
    </div>
  );
}
