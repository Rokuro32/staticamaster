'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CourseHomePage() {
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
        <p className="text-gray-600 mb-8">Le cours demandé n'existe pas.</p>
        <Button onClick={() => router.push('/')}>
          Retour à la sélection
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${colors?.bg} text-4xl mb-6`}>
          {course.icon}
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          {course.title}
        </h1>
        <p className="text-lg text-gray-500 mb-2">{course.code}</p>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          {course.description}
        </p>
        <div className="flex justify-center gap-4">
          <Link href={`/course/${courseId}/modules`}>
            <Button size="lg" className={`${colors?.bg} text-white hover:opacity-90`}>
              Voir les modules
            </Button>
          </Link>
          <Link href={`/course/${courseId}/progress`}>
            <Button variant="outline" size="lg">
              Ma progression
            </Button>
          </Link>
        </div>
      </div>

      {/* Modules Overview */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Les {course.modules.length} modules du cours
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {course.modules.map((module) => (
            <Link key={module.id} href={`/course/${courseId}/quiz/${module.id}`}>
              <Card
                variant="bordered"
                className="h-full card-hover cursor-pointer"
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{module.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Module {module.id}
                      </h3>
                      <p className={`text-lg font-medium ${colors?.text} mb-2`}>
                        {module.titleFr}
                      </p>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Fonctionnalités
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="Quiz interactifs"
            description="QCM et réponses numériques avec validation instantanée"
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            }
            title="Problèmes interactifs"
            description="Résolvez des problèmes étape par étape avec feedback"
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="Suivi de progression"
            description="Visualisez vos performances par compétence et module"
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            title="Feedback ciblé"
            description="Explications détaillées de vos erreurs et conseils"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
