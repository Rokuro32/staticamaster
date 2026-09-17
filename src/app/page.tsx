import Link from 'next/link';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { CATEGORIES, TOTAL_SIMULATIONS, getThemeByCategory } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto mb-10">
        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-sm text-gray-600 mb-5">
          🔬 {TOTAL_SIMULATIONS} simulations interactives
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4">
          Phet-ford
        </h1>
        <p className="text-lg text-gray-600">
          Une collection de simulations de physique à manipuler directement dans le
          navigateur. Déplacez les curseurs, changez les paramètres, et observez la
          physique réagir en temps réel.
        </p>
      </section>

      {/* Sections en un coup d'œil */}
      <section className="mb-12">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category) => {
            const theme = getThemeByCategory(category.id);
            return (
              <Link
                key={category.id}
                href={`/categorie/${category.id}`}
                className={cn(
                  'group bg-white rounded-xl border border-gray-200 p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
                  theme.ring
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3',
                    theme.bgSoft
                  )}
                >
                  {category.icon}
                </div>
                <h2 className="font-semibold text-gray-900 text-sm leading-snug">
                  {category.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">{category.tagline}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Catalogue complet */}
      <CatalogBrowser />
    </div>
  );
}
