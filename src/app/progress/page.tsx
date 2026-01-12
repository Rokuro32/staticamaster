'use client';

import { useState, useEffect } from 'react';
import { MODULES, type ModuleId } from '@/types/question';
import { COMPETENCY_DISPLAY_NAMES } from '@/types/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { formatTime } from '@/lib/utils';

interface ProgressData {
  user: { id: string; name: string };
  stats: {
    totalSessions: number;
    averageScore: number | null;
    totalQuestions: number;
    totalCorrect: number;
    moduleStats: Array<{
      moduleId: number;
      sessions: number;
      averageScore: number;
      totalQuestions: number;
      correctAnswers: number;
    }>;
  };
  sessions: Array<{
    id: string;
    moduleId: number;
    startedAt: string;
    completedAt: string | null;
    score: number | null;
    questionCount: number;
    correctCount: number;
  }>;
  competencies: Array<{
    competencyTag: string;
    attempts: number;
    successes: number;
    masteryLevel: string;
  }>;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/progress?userName=Étudiant');
      if (!response.ok) throw new Error('Erreur de chargement');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Impossible de charger la progression');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Chargement de votre progression...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-error-600 mb-4">{error || 'Erreur inconnue'}</p>
        <Button onClick={loadProgress}>Réessayer</Button>
      </div>
    );
  }

  const overallScore = data.stats.averageScore ?? 0;
  const totalQuestions = data.stats.totalQuestions || 0;
  const totalCorrect = data.stats.totalCorrect || 0;
  const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ma progression</h1>
        <p className="text-gray-600">
          Suivez vos performances et identifiez les compétences à améliorer.
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Sessions complétées"
          value={data.stats.totalSessions}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          title="Questions répondues"
          value={totalQuestions}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Taux de réussite"
          value={`${successRate.toFixed(0)}%`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          variant={successRate >= 70 ? 'success' : successRate >= 50 ? 'warning' : 'error'}
        />
        <StatCard
          title="Score moyen"
          value={`${overallScore.toFixed(0)}%`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          variant={overallScore >= 70 ? 'success' : overallScore >= 50 ? 'warning' : 'error'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Progression par module */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Progression par module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {MODULES.map(module => {
                const moduleStat = data.stats.moduleStats?.find(
                  s => s.moduleId === module.id
                );
                const score = moduleStat?.averageScore ?? 0;
                const sessions = moduleStat?.sessions ?? 0;

                return (
                  <div key={module.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{module.icon}</span>
                        <span className="font-medium text-gray-800">
                          Module {module.id}: {module.titleFr}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {sessions} session{sessions !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Progress
                      value={score}
                      size="md"
                      variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'}
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Score moyen</span>
                      <span>{score.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Maîtrise des compétences */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Maîtrise des compétences</CardTitle>
          </CardHeader>
          <CardContent>
            {data.competencies.length > 0 ? (
              <div className="space-y-4">
                {data.competencies.map(comp => {
                  const successRate = comp.attempts > 0
                    ? (comp.successes / comp.attempts) * 100
                    : 0;
                  const displayName = COMPETENCY_DISPLAY_NAMES[comp.competencyTag as keyof typeof COMPETENCY_DISPLAY_NAMES] || comp.competencyTag;

                  return (
                    <div key={comp.competencyTag} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {displayName}
                          </span>
                          <Badge
                            variant={
                              comp.masteryLevel === 'mastered' ? 'success' :
                              comp.masteryLevel === 'practicing' ? 'info' :
                              comp.masteryLevel === 'learning' ? 'warning' : 'default'
                            }
                            size="sm"
                          >
                            {comp.masteryLevel === 'mastered' ? 'Maîtrisé' :
                             comp.masteryLevel === 'practicing' ? 'En pratique' :
                             comp.masteryLevel === 'learning' ? 'En apprentissage' : 'Non commencé'}
                          </Badge>
                        </div>
                        <Progress value={successRate} size="sm" />
                        <p className="text-xs text-gray-500 mt-1">
                          {comp.successes}/{comp.attempts} réussi{comp.successes !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune compétence évaluée pour le moment.</p>
                <p className="text-sm mt-1">Complétez des quiz pour voir votre progression.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique des sessions */}
      <Card variant="bordered" className="mt-8">
        <CardHeader>
          <CardTitle>Sessions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Module</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Questions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map(session => {
                    const module = MODULES.find(m => m.id === session.moduleId);
                    const date = new Date(session.startedAt);

                    return (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {date.toLocaleDateString('fr-CA')} {date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span>{module?.icon}</span>
                            <span className="text-sm">{module?.titleFr}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {session.correctCount}/{session.questionCount}
                        </td>
                        <td className="py-3 px-4">
                          {session.score !== null ? (
                            <Badge
                              variant={session.score >= 70 ? 'success' : session.score >= 50 ? 'warning' : 'error'}
                            >
                              {session.score.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={session.completedAt ? 'success' : 'warning'}>
                            {session.completedAt ? 'Terminé' : 'En cours'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune session enregistrée.</p>
              <Button variant="primary" className="mt-4" onClick={() => window.location.href = '/modules'}>
                Commencer un quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant de carte de statistique
function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const colors = {
    default: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    warning: 'text-warning-600 bg-warning-50',
    error: 'text-error-600 bg-error-50',
  };

  return (
    <Card variant="bordered">
      <CardContent className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[variant]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
