import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  SIMULATIONS,
  getCategoryById,
  getSimulationById,
  getSimulationsByCategory,
  getThemeByCategory,
} from '@/lib/catalog';
import { SimulationRenderer } from '@/components/simulations/SimulationRenderer';
import { cn } from '@/lib/utils';

interface PageProps {
  params: { simId: string };
}

export function generateStaticParams() {
  return SIMULATIONS.map((simulation) => ({ simId: simulation.id }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const simulation = getSimulationById(params.simId);
  if (!simulation) return { title: 'Simulation introuvable' };
  return {
    title: `${simulation.title} — Simulation | Phet-ford`,
    description: simulation.summary,
  };
}

export default function SimulationPage({ params }: PageProps) {
  const simulation = getSimulationById(params.simId);
  if (!simulation) notFound();

  const category = getCategoryById(simulation.categoryId)!;
  const theme = getThemeByCategory(simulation.categoryId);
  const siblings = getSimulationsByCategory(category.id).filter(
    (s) => s.id !== simulation.id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-800 transition-colors">
          Simulations
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/categorie/${category.id}`}
          className="hover:text-gray-800 transition-colors"
        >
          {category.title}
        </Link>
      </nav>

      {/* En-tête */}
      <header className="flex items-start gap-4 mb-6">
        <div
          className={cn(
            'w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl text-white bg-gradient-to-br',
            theme.gradient
          )}
        >
          {simulation.icon}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{simulation.title}</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">{simulation.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {simulation.topics.map((topic) => (
              <span
                key={topic}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  theme.bgSoft,
                  theme.text
                )}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Simulation */}
      <SimulationRenderer simId={simulation.id} />

      {/* Simulations voisines */}
      {siblings.length > 0 && (
        <section className="mt-14 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Autres simulations en {category.title.toLowerCase()}
          </h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                href={`/simulation/${sibling.id}`}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {sibling.icon} {sibling.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
