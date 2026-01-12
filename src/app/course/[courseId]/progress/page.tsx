'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';

interface ModuleStats {
  moduleId: number;
  moduleName: string;
  totalAttempts: number;
  correctAnswers: number;
  averageScore: number;
}

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as CourseId;

  const setSelectedCourse = useAppStore((state) => state.setSelectedCourse);
  const selectedCourse = useAppStore((state) => state.selectedCourse);
  const user = useAppStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalQuizzes: number;
    totalQuestions: number;
    averageScore: number;
    moduleStats: ModuleStats[];
  } | null>(null);

  const course = getCourseById(courseId);
  const colors = course ? COURSE_COLORS[courseId] : null;

  // Mettre à jour le store avec le cours sélectionné
  useEffect(() => {
    if (courseId && courseId !== selectedCourse) {
      setSelectedCourse(courseId);
    }
  }, [courseId, selectedCourse, setSelectedCourse]);

  // Charger les statistiques
  useEffect(() => {
    loadStats();
  }, [courseId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // TODO: Implémenter l'API pour les stats par cours
      // Pour l'instant, utiliser des données fictives
      await new Promise(resolve => setTimeout(resolve, 500));

      if (course) {
        setStats({
          totalQuizzes: 0,
          totalQuestions: 0,
          averageScore: 0,
          moduleStats: course.modules.map(m => ({
            moduleId: m.id,
            moduleName: m.titleFr,
            totalAttempts: 0,
            correctAnswers: 0,
            averageScore: 0,
          })),
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cours non trouvé</h1>
        <Button onClick={() => router.push('/')}>
          Retour à la sélection
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{course.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ma progression - {course.shortTitle}
            </h1>
            <p className="text-gray-500">{course.code}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg
            className={`animate-spin w-10 h-10 ${colors?.text}`}
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
      ) : (
        <>
          {/* Stats globales */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card variant="elevated">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {stats?.totalQuizzes || 0}
                </p>
                <p className="text-gray-600">Quiz complétés</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {stats?.totalQuestions || 0}
                </p>
                <p className="text-gray-600">Questions répondues</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="p-6 text-center">
                <p className={`text-4xl font-bold ${colors?.text} mb-2`}>
                  {stats?.averageScore.toFixed(0) || 0}%
                </p>
                <p className="text-gray-600">Score moyen</p>
              </CardContent>
            </Card>
          </div>

          {/* Progression par module */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Progression par module
          </h2>
          <div className="space-y-4">
            {stats?.moduleStats.map((moduleStat) => (
              <Card key={moduleStat.moduleId} variant="bordered">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Module {moduleStat.moduleId}: {moduleStat.moduleName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {moduleStat.totalAttempts} questions tentées
                      </p>
                    </div>
                    <Badge
                      variant={
                        moduleStat.averageScore >= 80
                          ? 'success'
                          : moduleStat.averageScore >= 60
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {moduleStat.averageScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={moduleStat.averageScore} />
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/course/${courseId}/quiz/${moduleStat.moduleId}`)}
                    >
                      Continuer ce module
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Message si pas de données */}
          {stats?.totalQuizzes === 0 && (
            <Card variant="bordered" className="mt-8">
              <CardContent className="p-8 text-center">
                <p className="text-gray-600 mb-4">
                  Vous n'avez pas encore commencé ce cours.
                </p>
                <Button
                  className={`${colors?.bg} text-white hover:opacity-90`}
                  onClick={() => router.push(`/course/${courseId}/modules`)}
                >
                  Commencer maintenant
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
