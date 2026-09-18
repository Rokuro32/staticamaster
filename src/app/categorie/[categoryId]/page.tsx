import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import {
  CATEGORIES,
  getCategoryById,
  getSimulationsByCategory,
  getThemeByCategory,
} from '@/lib/catalog';
import { SimulationCard } from '@/components/catalog/SimulationCard';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

interface PageProps {
  params: { categoryId: string };
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ categoryId: category.id }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const category = getCategoryById(params.categoryId);
  if (!category) return { title: 'Section introuvable' };
  return {
    title: `${category.title} — Simulations | Phet-ford`,
    description: category.description,
  };
}

export default function CategoryPage({ params }: PageProps) {
  const category = getCategoryById(params.categoryId);
  if (!category) notFound();

  const simulations = getSimulationsByCategory(category.id);
  const theme = getThemeByCategory(category.id);
  const others = CATEGORIES.filter((c) => c.id !== category.id);

  return (
    <div
      className="relative"
      style={{ '--accent': theme.accent } as CSSProperties}
    >
      {/* Décor */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid mask-fade-b" />
        <div
          className="absolute -top-32 left-1/3 w-[34rem] h-[34rem] rounded-full blur-[110px] opacity-[0.13]"
          style={{ background: theme.accent }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-gold-300 transition-colors"
        >
          <span aria-hidden>←</span> Toutes les simulations
        </Link>

        <header className="mt-6 mb-10 flex items-start gap-5 animate-fade-up">
          <span
            className={cn(
              'w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-ink-950 bg-gradient-to-br',
              theme.gradient
            )}
          >
            <Icon name={category.icon} size={30} />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5',
                theme.text
              )}
            >
              Section · {simulations.length} simulation
              {simulations.length > 1 ? 's' : ''}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-white">
              {category.title}
            </h1>
            <p className="text-stone-400 mt-3 max-w-3xl leading-relaxed">
              {category.description}
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((simulation) => (
            <SimulationCard key={simulation.id} simulation={simulation} />
          ))}
        </div>

        <section className="mt-16 pt-8 border-t border-gold-400/[0.14]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600 mb-4">
            Autres sections
          </h2>
          <div className="flex flex-wrap gap-2">
            {others.map((other) => {
              const otherTheme = getThemeByCategory(other.id);
              return (
                <Link
                  key={other.id}
                  href={`/categorie/${other.id}`}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    'text-stone-400 ring-1 ring-inset ring-white/10',
                    'hover:text-white hover:ring-gold-400/35'
                  )}
                >
                  <Icon
                    name={other.icon}
                    size={13}
                    className={cn('inline-block -mt-px mr-1.5 align-middle', otherTheme.text)}
                  />
                  {other.title}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
