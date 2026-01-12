'use client';

import Link from 'next/link';
import { MODULES } from '@/types/question';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

export default function ModulesPage() {
  // TODO: Charger les vraies statistiques depuis l'API
  const moduleStats: Record<number, { completed: number; total: number }> = {
    1: { completed: 0, total: 5 },
    2: { completed: 0, total: 5 },
    3: { completed: 0, total: 5 },
    4: { completed: 0, total: 5 },
    5: { completed: 0, total: 5 },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Modules du cours
        </h1>
        <p className="text-gray-600">
          Sélectionnez un module pour commencer un quiz ou pratiquer des problèmes.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => {
          const stats = moduleStats[module.id];
          const progressPercent = stats.total > 0
            ? (stats.completed / stats.total) * 100
            : 0;

          return (
            <Card key={module.id} variant="bordered" className="flex flex-col">
              <CardContent className="flex-1">
                {/* Header du module */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{module.icon}</span>
                    <div>
                      <Badge variant="outline" size="sm">
                        Module {module.id}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Titre et description */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {module.titleFr}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {module.description}
                </p>

                {/* Compétences */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Compétences
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {module.competencies.slice(0, 4).map((comp) => (
                      <Badge key={comp} variant="info" size="sm">
                        {formatCompetency(comp)}
                      </Badge>
                    ))}
                    {module.competencies.length > 4 && (
                      <Badge variant="default" size="sm">
                        +{module.competencies.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progression */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progression</span>
                    <span className="font-medium text-gray-900">
                      {stats.completed}/{stats.total} questions
                    </span>
                  </div>
                  <Progress value={progressPercent} size="sm" />
                </div>
              </CardContent>

              <CardFooter>
                <Link href={`/quiz/${module.id}`} className="w-full">
                  <Button className="w-full">
                    Commencer le quiz
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Info section */}
      <div className="mt-12 bg-primary-50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-2">
          Comment fonctionnent les quiz?
        </h2>
        <ul className="space-y-2 text-primary-800">
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Chaque quiz contient 5 questions du module sélectionné</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Recevez un feedback immédiat après chaque réponse</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Les valeurs sont générées aléatoirement pour chaque session</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Votre progression est sauvegardée automatiquement</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function formatCompetency(comp: string): string {
  const mappings: Record<string, string> = {
    'trigonometry': 'Trigo',
    'vectors': 'Vecteurs',
    'decomposition': 'Décomp.',
    'cross-product': 'Prod. vect.',
    'dcl': 'DCL',
    'equilibrium-2d': 'Éq. 2D',
    'resultant': 'Résult.',
    'equilibrant': 'Équil.',
    'moment': 'Moment',
    'couple': 'Couple',
    'supports': 'Appuis',
    'truss-nodes': 'Nœuds',
    'truss-sections': 'Sections',
    'stress': 'Contr.',
    'strain': 'Déf.',
  };
  return mappings[comp] || comp;
}
