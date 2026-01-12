'use client';

import Link from 'next/link';
import { MODULES } from '@/types/question';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Bienvenue sur <span className="text-primary-600">StaticaMaster</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Application interactive d'évaluation pour le cours de statique.
          Testez vos connaissances sur l'équilibre et l'analyse des structures.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/modules">
            <Button size="lg">
              Commencer un quiz
            </Button>
          </Link>
          <Link href="/progress">
            <Button variant="outline" size="lg">
              Voir ma progression
            </Button>
          </Link>
        </div>
      </div>

      {/* Modules Overview */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Les 5 modules du cours
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((module) => (
            <Link key={module.id} href={`/quiz/${module.id}`}>
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
                      <p className="text-lg font-medium text-primary-700 mb-2">
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
            title="DCL interactif"
            description="Construisez vos diagrammes de corps libre par glisser-déposer"
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

      {/* Quick Start Guide */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Comment utiliser l'application?
        </h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
          <Step number={1} text="Choisissez un module" />
          <Arrow />
          <Step number={2} text="Lancez un quiz" />
          <Arrow />
          <Step number={3} text="Répondez aux questions" />
          <Arrow />
          <Step number={4} text="Analysez vos résultats" />
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

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center">
        {number}
      </div>
      <span className="text-gray-700 font-medium">{text}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      className="hidden sm:block w-6 h-6 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
