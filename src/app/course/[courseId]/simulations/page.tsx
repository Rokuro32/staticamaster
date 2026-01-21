'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { Button } from '@/components/ui/Button';
import { OscillationsWaveSimulator } from '@/components/simulations/OscillationsWaveSimulator';
import { SoundWaveSimulator } from '@/components/simulations/SoundWaveSimulator';
import { RelativitySimulator } from '@/components/simulations/RelativitySimulator';

export default function SimulationsPage() {
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

  // Cette page n'est disponible que pour le cours d'ondes
  if (courseId !== 'waves_modern') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Simulations non disponibles
        </h1>
        <p className="text-gray-600 mb-8">
          Les simulations interactives ne sont actuellement disponibles que pour le cours d'Ondes et physique moderne.
        </p>
        <Link href={`/course/${courseId}`}>
          <Button>Retour au cours</Button>
        </Link>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/course/${courseId}`}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Retour
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl ${colors?.bg} flex items-center justify-center text-2xl`}>
            🔬
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Simulations interactives</h1>
            <p className="text-gray-600">{course.title}</p>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-violet-900 mb-2">
          Apprenez par l'expérimentation
        </h2>
        <p className="text-violet-700">
          Les simulations interactives vous permettent de visualiser les concepts physiques
          et de comprendre intuitivement les relations entre les différents paramètres.
          Manipulez les curseurs et observez en temps réel les effets sur le comportement des ondes.
        </p>
      </div>

      {/* Simulations Grid */}
      <div className="space-y-8">
        {/* Oscillations and Waves Simulator Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">〰️</span>
            <h2 className="text-xl font-bold text-gray-900">
              Oscillations et Ondes Mécaniques
            </h2>
          </div>
          <OscillationsWaveSimulator />
        </section>

        {/* Sound Wave Simulator Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔊</span>
            <h2 className="text-xl font-bold text-gray-900">
              Ondes sonores
            </h2>
          </div>
          <SoundWaveSimulator />
        </section>

        {/* Relativity Simulator Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚀</span>
            <h2 className="text-xl font-bold text-gray-900">
              Relativité Restreinte
            </h2>
          </div>
          <RelativitySimulator />
        </section>

        {/* More simulations can be added here */}
        <section className="bg-gray-50 rounded-xl p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Plus de simulations à venir
          </h3>
          <p className="text-gray-500 mb-4">
            D'autres simulations interactives seront ajoutées prochainement :
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200">
              💡 Interférence de Young (lumière)
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200">
              🌈 Diffraction
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200">
              ⚛️ Effet photoélectrique
            </span>
          </div>
        </section>
      </div>

      {/* Related Resources */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Ressources associées
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href={`/course/${courseId}/quiz/1`}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-2">〰️</div>
            <h4 className="font-medium text-gray-900">Module 1: Oscillations</h4>
            <p className="text-sm text-gray-500">Quiz et problèmes sur le MHS</p>
          </Link>
          <Link
            href={`/course/${courseId}/quiz/2`}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-2">💡</div>
            <h4 className="font-medium text-gray-900">Module 2: Ondes EM</h4>
            <p className="text-sm text-gray-500">Quiz sur les ondes électromagnétiques</p>
          </Link>
          <Link
            href={`/course/${courseId}/modules`}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-2">📚</div>
            <h4 className="font-medium text-gray-900">Tous les modules</h4>
            <p className="text-sm text-gray-500">Voir l'ensemble du cours</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
