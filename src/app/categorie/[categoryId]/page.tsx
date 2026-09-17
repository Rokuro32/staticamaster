import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CATEGORIES,
  getCategoryById,
  getSimulationsByCategory,
  getThemeByCategory,
} from '@/lib/catalog';
import { SimulationCard } from '@/components/catalog/SimulationCard';
import { cn } from '@/lib/utils';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Toutes les simulations
      </Link>

      <header className="mt-4 mb-8 flex items-start gap-4">
        <div
          className={cn(
            'w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl text-white bg-gradient-to-br',
            theme.gradient
          )}
        >
          {category.icon}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{category.title}</h1>
          <p className="text-gray-600 mt-1 max-w-3xl">{category.description}</p>
          <p className="text-sm text-gray-400 mt-2">
            {simulations.length} simulation{simulations.length > 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {simulations.map((simulation) => (
          <SimulationCard key={simulation.id} simulation={simulation} />
        ))}
      </div>

      <section className="mt-14 pt-8 border-t border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Autres sections
        </h2>
        <div className="flex flex-wrap gap-2">
          {others.map((other) => (
            <Link
              key={other.id}
              href={`/categorie/${other.id}`}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {other.icon} {other.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
