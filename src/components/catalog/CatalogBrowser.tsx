'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, SIMULATIONS, getThemeByCategory } from '@/lib/catalog';
import { SimulationCard } from './SimulationCard';
import { cn } from '@/lib/utils';
import type { CategoryId } from '@/types/simulation';
import { Icon } from '@/components/icons/Icon';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function CatalogBrowser() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');

  const counts = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const sim of SIMULATIONS) {
      map.set(sim.categoryId, (map.get(sim.categoryId) ?? 0) + 1);
    }
    return map;
  }, []);

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
      {/* Recherche et filtres */}
      <div className="md:sticky md:top-16 z-30 -mx-4 px-4 py-4 mb-10 glass border-y border-gold-400/[0.14]">
        <div className="relative mb-3">
          <span
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-600 text-sm"
          >
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : vecteurs, Doppler, treillis, demi-vie…"
            aria-label="Rechercher une simulation"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-stone-500
                       bg-ink-900/80 border border-gold-400/15
                       focus:outline-none focus:border-gold-400/60 focus:ring-2 focus:ring-gold-400/20
                       transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              activeCategory === 'all'
                ? 'bg-gold-400 text-ink-950'
                : 'text-stone-400 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-gold-400/35'
            )}
          >
            Toutes · {SIMULATIONS.length}
          </button>
          {CATEGORIES.map((category) => {
            const theme = getThemeByCategory(category.id);
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? theme.solid
                    : 'text-stone-400 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-gold-400/35'
                )}
              >
                <Icon name={category.icon} size={13} className="inline-block -mt-px mr-1.5 align-middle" />
                {category.title} · {counts.get(category.id) ?? 0}
              </button>
            );
          })}
        </div>
      </div>

      {totalShown === 0 && (
        <div className="text-center py-20">
          <Icon name="recherche-vide" size={40} className="mx-auto mb-4 text-stone-600" />
          <p className="text-stone-400">
            Aucune simulation ne correspond à «&nbsp;{query}&nbsp;».
          </p>
          <button
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 text-sm text-gold-300 hover:text-gold-200 transition-colors"
          >
            Réinitialiser la recherche
          </button>
        </div>
      )}

      <div className="space-y-16">
        {results.map(({ category, simulations }) => {
          const theme = getThemeByCategory(category.id);
          return (
            <section key={category.id} id={category.id} className="scroll-mt-36">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={cn(
                      'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-ink-950 bg-gradient-to-br',
                      theme.gradient
                    )}
                  >
                    <Icon name={category.icon} size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                        {category.title}
                      </h2>
                      <span className="text-xs font-mono text-gold-600">
                        {simulations.length}
                      </span>
                    </div>
                    <p className="text-sm text-stone-400 mt-1.5 max-w-2xl leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/categorie/${category.id}`}
                  className={cn(
                    'hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-medium mt-1.5 group',
                    theme.text
                  )}
                >
                  Section
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </div>

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
