'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  CATEGORIES,
  SIMULATIONS,
  getThemeByCategory,
  TOTAL_SIMULATIONS,
} from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu à la navigation
  useEffect(() => setOpen(false), [pathname]);

  // Fermer au clic extérieur et à Échap
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeCategoryId = pathname.startsWith('/categorie/')
    ? pathname.split('/')[2]
    : undefined;

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-300 to-gold-600
                         flex items-center justify-center text-base
                         shadow-glow-sm shadow-gold-500/50"
            >
              🔬
            </span>
            <span className="font-display text-lg font-semibold text-white tracking-tight">
              Phet-ford
            </span>
            <span className="hidden lg:inline text-sm text-stone-500 border-l border-white/10 pl-2.5">
              Simulations de physique
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Menu des sections */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="true"
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  open
                    ? 'bg-white/10 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                Sections
                <span className="text-[10px] font-mono text-gold-600">
                  {CATEGORIES.length}
                </span>
                <svg
                  viewBox="0 0 12 12"
                  className={cn(
                    'w-2.5 h-2.5 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                  aria-hidden
                >
                  <path
                    d="M2 4.5 6 8.5 10 4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-[min(92vw,26rem)] rounded-xl overflow-hidden
                             bg-ink-850 border border-white/10 shadow-lift animate-fade-up"
                >
                  <div className="p-2 grid sm:grid-cols-2 gap-1">
                    {CATEGORIES.map((category) => {
                      const theme = getThemeByCategory(category.id);
                      const count = SIMULATIONS.filter(
                        (s) => s.categoryId === category.id
                      ).length;
                      const isActive = activeCategoryId === category.id;

                      return (
                        <Link
                          key={category.id}
                          href={`/categorie/${category.id}`}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors',
                            isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                          )}
                        >
                          <span
                            className={cn(
                              'w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-sm',
                              theme.chip
                            )}
                          >
                            {category.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-stone-200 truncate">
                              {category.title}
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-gold-600">
                            {count}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <Link
                    href="/"
                    className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07]
                               text-sm text-gold-300 hover:text-gold-200 hover:bg-white/[0.04] transition-colors"
                  >
                    Voir les {TOTAL_SIMULATIONS} simulations
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium
                         text-stone-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Catalogue
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
