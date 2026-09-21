import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { ChromeDecor } from '@/components/layout/ChromeDecor';
import {
  CATEGORIES,
  SIMULATIONS,
  TOTAL_SIMULATIONS,
  getFeaturedSimulation,
  getThemeByCategory,
} from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

export default function HomePage() {
  const featured = getFeaturedSimulation();

  return (
    <div className="relative">
      {/* Décor du hero */}
      <ChromeDecor height="h-[560px]" density="normal" fade="radial" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="pt-20 pb-14 text-center max-w-3xl mx-auto animate-fade-up">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-stone-300 ring-1 ring-inset ring-gold-400/20 bg-gold-400/[0.05] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shadow-glow-sm shadow-gold-400" />
            {TOTAL_SIMULATIONS} simulations · {CATEGORIES.length} sections
          </p>

          {/* Écusson du Cégep de Thetford. Le fichier vit dans public/ :
              pour le remplacer par l'officiel, écraser public/logo-cegep.svg. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-cegep.svg"
            alt="Écusson du Cégep de Thetford"
            width={88}
            height={100}
            className="mx-auto mb-6 h-[100px] w-auto drop-shadow-[0_8px_24px_rgba(201,179,124,0.25)]"
          />

          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-[-0.03em] text-gradient mb-6">
            Phet-ford
          </h1>

          <p className="text-lg text-stone-400 leading-relaxed text-balance">
            Des simulations qui peuvent être utiles les veilles d’examen à 3h
            quand tu sais pas c’est quoi la différence entre effet Doppler et
            3e loi de Newton
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
            <a
              href="#catalogue"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-ink-950 bg-gold-400
                         hover:bg-gold-300 transition-colors"
            >
              Parcourir le catalogue
            </a>
            <Link
              href={`/simulation/${featured.id}`}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-200
                         ring-1 ring-inset ring-gold-400/25 hover:bg-gold-400/[0.07] transition-colors"
            >
              Commencer par {featured.title}
            </Link>
          </div>
        </section>

        {/* Sections en un coup d'œil */}
        <section className="pb-20">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map((category, i) => {
              const theme = getThemeByCategory(category.id);
              const count = SIMULATIONS.filter(
                (s) => s.categoryId === category.id
              ).length;

              return (
                <Link
                  key={category.id}
                  href={`/categorie/${category.id}`}
                  style={
                    {
                      '--accent': theme.accent,
                      animationDelay: `${60 + i * 35}ms`,
                    } as CSSProperties
                  }
                  className={cn(
                    'group relative overflow-hidden rounded-2xl p-4',
                    'panel panel-hover accent-rule animate-fade-up',
                    'hover:border-[color:var(--accent)]/40'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-ink-950 bg-gradient-to-br',
                        'transition-transform duration-300 group-hover:scale-105',
                        theme.gradient
                      )}
                    >
                      <Icon name={category.icon} size={20} />
                    </span>
                    <span className="text-[11px] font-mono text-ink-500 mt-1">
                      {count}
                    </span>
                  </div>
                  <h2 className="font-display font-semibold text-white text-sm leading-snug">
                    {category.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    {category.tagline}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Catalogue complet */}
        <section id="catalogue" className="pb-24 scroll-mt-16">
          <CatalogBrowser />
        </section>
      </div>
    </div>
  );
}
