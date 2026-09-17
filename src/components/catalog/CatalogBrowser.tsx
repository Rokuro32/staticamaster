'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, SIMULATIONS, getThemeByCategory } from '@/lib/catalog';
import { SimulationCard } from './SimulationCard';
import { cn } from '@/lib/utils';
import type { CategoryId } from '@/types/simulation';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function CatalogBrowser() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');

  const results = useMemo(() => {
    const q = normalize(query.trim());

    const matching = SIMULATIONS.filter((sim) => {
      if (activeCategory !== 'all' && sim.categoryId !== activeCategory) return false;
      if (!q) return true;
      const haystack = normalize(
        [sim.title, sim.summary, sim.description, ...sim.topics].join(' ')
      );
      return haystack.includes(q);
    });

    return CATEGORIES.map((category) => ({
      category,
      simulations: matching.filter((s) => s.categoryId === category.id),
    })).filter((group) => group.simulations.length > 0);
  }, [query, activeCategory]);

  const totalShown = results.reduce((sum, g) => sum + g.simulations.length, 0);

  return (
    <div>
      {/* Barre de recherche + filtres */}
      <div className="md:sticky md:top-16 z-30 -mx-4 px-4 py-4 bg-gray-50/95 backdrop-blur border-b border-gray-200 mb-8">
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une simulation (vecteurs, Doppler, treillis…)"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeCategory === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            Toutes ({SIMULATIONS.length})
          </button>
          {CATEGORIES.map((category) => {
            const theme = getThemeByCategory(category.id);
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? `${theme.bg} text-white`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                )}
              >
                {category.icon} {category.title}
              </button>
            );
          })}
        </div>
      </div>

      {totalShown === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔭</p>
          <p>Aucune simulation ne correspond à « {query} ».</p>
        </div>
      )}

      <div className="space-y-12">
        {results.map(({ category, simulations }) => {
          const theme = getThemeByCategory(category.id);
          return (
            <section key={category.id} id={category.id} className="scroll-mt-32">
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                      theme.bgSoft
                    )}
                  >
                    {category.icon}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                  <span className="text-sm text-gray-400">
                    {simulations.length} simulation{simulations.length > 1 ? 's' : ''}
                  </span>
                </div>
                <Link
                  href={`/categorie/${category.id}`}
                  className={cn('text-sm font-medium hidden sm:inline', theme.text)}
                >
                  Voir la section →
                </Link>
              </div>

              <p className="text-gray-600 mb-5 ml-[3.25rem]">{category.description}</p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {simulations.map((simulation) => (
                  <SimulationCard key={simulation.id} simulation={simulation} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default CatalogBrowser;
