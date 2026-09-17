import Link from 'next/link';
import { getThemeByCategory } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { Simulation } from '@/types/simulation';

export function SimulationCard({ simulation }: { simulation: Simulation }) {
  const theme = getThemeByCategory(simulation.categoryId);

  return (
    <Link
      href={`/simulation/${simulation.id}`}
      className={cn(
        'group flex flex-col h-full bg-white rounded-xl border border-gray-200 p-5 transition-all',
        'hover:shadow-lg hover:-translate-y-0.5',
        theme.ring
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-xl',
            theme.bgSoft
          )}
        >
          {simulation.icon}
        </div>
        <h3 className="font-semibold text-gray-900 leading-snug mt-1.5">
          {simulation.title}
        </h3>
      </div>

      <p className="text-sm text-gray-600 flex-1">{simulation.summary}</p>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {simulation.topics.slice(0, 3).map((topic) => (
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
        {simulation.topics.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
            +{simulation.topics.length - 3}
          </span>
        )}
      </div>

      <span
        className={cn(
          'mt-4 text-sm font-medium inline-flex items-center gap-1',
          theme.text
        )}
      >
        Ouvrir la simulation
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export default SimulationCard;
