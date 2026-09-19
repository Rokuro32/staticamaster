import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import {
  SIMULATIONS,
  getCategoryById,
  getSimulationById,
  getSimulationsByCategory,
  getThemeByCategory,
} from '@/lib/catalog';
import { SimulationRenderer } from '@/components/simulations/SimulationRenderer';
import { ChromeDecor, hexToRgb } from '@/components/layout/ChromeDecor';
import { SurfaceMode } from '@/components/layout/SurfaceMode';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

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
    <div
      className="flex-1 flex flex-col"
      style={{ '--accent': theme.accent } as CSSProperties}
    >
      {/* La page d'une simulation passe en ambiance claire */}
      <SurfaceMode mode="light" />

      {/* Bande sombre : identité et contexte */}
      <div className="relative bg-ink-950 overflow-hidden">
        <ChromeDecor height="h-full" accentRgb={hexToRgb(theme.accent)} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
            <Link href="/" className="hover:text-gold-300 transition-colors">
              Simulations
            </Link>
            <span aria-hidden className="text-ink-600">
              /
            </span>
            <Link
              href={`/categorie/${category.id}`}
              className="hover:text-gold-300 transition-colors"
            >
              {category.title}
            </Link>
          </nav>

          <header className="flex items-start gap-5 animate-fade-up">
            <span
              className={cn(
                'w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-ink-950 bg-gradient-to-br',
                theme.gradient
              )}
            >
              <Icon name={simulation.icon} size={30} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-white">
                {simulation.title}
              </h1>
              <p className="text-stone-400 mt-3 max-w-3xl leading-relaxed">
                {simulation.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {simulation.topics.map((topic) => (
                  <span
                    key={topic}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-medium',
                      theme.chip
                    )}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Scène claire : la simulation, inchangée */}
      <div className="flex-1 bg-scene-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <SimulationRenderer simId={simulation.id} />

          {siblings.length > 0 && (
            <section className="mt-16 pt-8 border-t border-scene-200">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-4">
                Autres simulations en {category.title.toLowerCase()}
              </h2>
              <div className="flex flex-wrap gap-2">
                {siblings.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={`/simulation/${sibling.id}`}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      theme.lightChip,
                      'hover:brightness-95'
                    )}
                  >
                    <Icon name={sibling.icon} size={13} className="inline-block -mt-px mr-1.5 align-middle" />
                    {sibling.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
