'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function ModulesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as CourseId;

  const setSelectedCourse = useAppStore((state) => state.setSelectedCourse);
  const selectedCourse = useAppStore((state) => state.selectedCourse);

  const course = getCourseById(courseId);
  const colors = course ? COURSE_COLORS[courseId] : null;

  // Mettre à jour le store avec le cours sélectionné
  useEffect(() => {
    if (courseId && courseId !== selectedCourse) {
      setSelectedCourse(courseId);
    }
  }, [courseId, selectedCourse, setSelectedCourse]);

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
              Modules - {course.shortTitle}
            </h1>
            <p className="text-gray-500">{course.code}</p>
          </div>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          Choisissez un module pour commencer un quiz. Chaque module contient des questions
          de difficulté variée pour tester vos connaissances.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {course.modules.map((module) => (
          <Card
            key={module.id}
            variant="elevated"
            className="group hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${colors?.bg} flex items-center justify-center text-2xl`}>
                    {module.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Module {module.id}</p>
                    <h2 className="text-xl font-bold text-gray-900">
                      {module.titleFr}
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                {module.description}
              </p>

              {/* Compétences */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Compétences:</p>
                <div className="flex flex-wrap gap-1">
                  {module.competencies.slice(0, 5).map((comp) => (
                    <Badge key={comp} variant="outline" size="sm">
                      {comp}
                    </Badge>
                  ))}
                  {module.competencies.length > 5 && (
                    <Badge variant="outline" size="sm">
                      +{module.competencies.length - 5}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link href={`/course/${courseId}/quiz/${module.id}`} className="flex-1">
                  <Button className={`w-full ${colors?.bg} text-white hover:opacity-90`}>
                    Commencer le quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
