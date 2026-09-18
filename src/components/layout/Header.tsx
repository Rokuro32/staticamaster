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
import { INFO_LINKS } from '@/lib/siteNav';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

type MenuId = 'sections' | 'about';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Fermer à la navigation
  useEffect(() => setOpen(null), [pathname]);

  // Fermer au clic extérieur et à Échap
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
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
  const onInfoPage = INFO_LINKS.some((l) => l.href === pathname);

  const triggerClass = (isOpen: boolean, isActive: boolean) =>
    cn(
      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
      isOpen || isActive
        ? 'bg-white/10 text-white'
        : 'text-stone-300 hover:text-white hover:bg-white/[0.06]'
    );

  const chevron = (isOpen: boolean) => (
    <svg
      viewBox="0 0 12 12"
      className={cn('w-2.5 h-2.5 transition-transform duration-200', isOpen && 'rotate-180')}
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
  );

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-cegep.svg"
              alt=""
              width={26}
              height={30}
              className="h-[30px] w-auto"
            />
            <span className="font-display text-lg font-semibold text-white tracking-tight">
              Phet-ford
            </span>
            <span className="hidden lg:inline text-sm text-stone-500 border-l border-white/10 pl-2.5">
              Simulations de physique
            </span>
          </Link>

          <div className="flex items-center gap-1.5" ref={navRef}>
            {/* Menu des sections */}
            <div className="relative">
              <button
                onClick={() => setOpen((v) => (v === 'sections' ? null : 'sections'))}
                aria-expanded={open === 'sections'}
                aria-haspopup="true"
                className={triggerClass(open === 'sections', Boolean(activeCategoryId))}
              >
                Sections
                <span className="text-[10px] font-mono text-gold-600">
                  {CATEGORIES.length}
                </span>
                {chevron(open === 'sections')}
              </button>

              {open === 'sections' && (
                <div className="absolute right-0 mt-2 w-[min(92vw,26rem)] rounded-xl overflow-hidden bg-ink-850 border border-white/10 shadow-lift animate-fade-up">
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
                            <Icon name={category.icon} size={16} />
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
                    className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07] text-sm text-gold-300 hover:text-gold-200 hover:bg-white/[0.04] transition-colors"
                  >
                    Voir les {TOTAL_SIMULATIONS} simulations
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Menu À propos */}
            <div className="relative">
              <button
                onClick={() => setOpen((v) => (v === 'about' ? null : 'about'))}
                aria-expanded={open === 'about'}
                aria-haspopup="true"
                className={triggerClass(open === 'about', onInfoPage)}
              >
                À propos
                {chevron(open === 'about')}
              </button>

              {open === 'about' && (
                <div className="absolute right-0 mt-2 w-[min(92vw,20rem)] rounded-xl overflow-hidden bg-ink-850 border border-white/10 shadow-lift animate-fade-up">
                  <div className="p-2">
                    {INFO_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          'flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors',
                          pathname === link.href
                            ? 'bg-white/[0.08]'
                            : 'hover:bg-white/[0.05]'
                        )}
                      >
                        <span className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-sm bg-gold-400/10 ring-1 ring-inset ring-gold-400/20">
                          <Icon name={link.icon} size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-stone-200">
                            {link.label}
                          </span>
                          <span className="block text-xs text-stone-500 mt-0.5">
                            {link.description}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>

                  <a
                    href="https://github.com/Rokuro32/staticamaster"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07] text-sm text-stone-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    Code source sur GitHub
                    <span aria-hidden>↗</span>
                  </a>
                </div>
              )}
            </div>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium text-stone-300 hover:text-white hover:bg-white/[0.06] transition-colors"
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
