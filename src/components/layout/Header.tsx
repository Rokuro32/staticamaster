'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, getThemeByCategory } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <span className="text-xl">🔬</span>
            <span className="text-xl font-bold text-gray-900">Phet-ford</span>
            <span className="hidden lg:inline text-sm text-gray-400 border-l border-gray-200 pl-2 ml-1">
              Simulations de physique
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {CATEGORIES.map((category) => {
              const href = `/categorie/${category.id}`;
              const isActive = pathname === href;
              const theme = getThemeByCategory(category.id);
              return (
                <Link
                  key={category.id}
                  href={href}
                  title={category.title}
                  className={cn(
                    'px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? `${theme.bg} text-white`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <span className="mr-1">{category.icon}</span>
                  <span className="hidden xl:inline">{category.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="md:hidden border-t border-gray-100">
        <div className="flex overflow-x-auto px-4 py-2 gap-2">
          {CATEGORIES.map((category) => {
            const href = `/categorie/${category.id}`;
            const isActive = pathname === href;
            const theme = getThemeByCategory(category.id);
            return (
              <Link
                key={category.id}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? `${theme.bg} text-white` : 'text-gray-600 bg-gray-100'
                )}
              >
                {category.icon} {category.title}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default Header;
