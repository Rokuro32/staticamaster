import Link from 'next/link';
import { getThemeByCategory } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import type { Simulation } from '@/types/simulation';
import { Icon } from '@/components/icons/Icon';

export function SimulationCard({ simulation }: { simulation: Simulation }) {
  const theme = getThemeByCategory(simulation.categoryId);

  return (
    <Link
      href={`/simulation/${simulation.id}`}
      style={{ '--accent': theme.accent } as CSSProperties}
      className={cn(
        'group relative isolate flex flex-col h-full overflow-hidden rounded-2xl p-5',
        'panel panel-hover accent-rule',
        'hover:border-[color:var(--accent)]/40'
      )}
    >
      {/* Halo d'accent au survol */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 h-48 w-48 rounded-full
                   opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.18]"
        style={{ background: theme.accent }}
      />

      <div className="flex items-start gap-3.5 mb-3.5">
        <span
          className={cn(
            'w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-ink-950',
            'bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
            theme.gradient
          )}
        >
          <Icon name={simulation.icon} size={22} />
        </span>
        <h3 className="font-display font-semibold text-white leading-snug mt-1.5 text-[15px]">
          {simulation.title}
        </h3>
      </div>

      <p className="text-sm text-stone-400 leading-relaxed flex-1">
        {simulation.summary}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {simulation.topics.slice(0, 3).map((topic) => (
          <span
            key={topic}
            className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', theme.chip)}
          >
            {topic}
          </span>
        ))}
        {simulation.topics.length > 3 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-stone-500 ring-1 ring-inset ring-white/10">
            +{simulation.topics.length - 3}
          </span>
        )}
      </div>

      <span
        className={cn(
          'mt-5 pt-4 border-t border-gold-400/[0.12] text-sm font-medium inline-flex items-center gap-1.5',
          theme.text
        )}
      >
        Ouvrir
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export default SimulationCard;
