import Link from 'next/link';
import { CATEGORIES, TOTAL_SIMULATIONS } from '@/lib/catalog';
import { INFO_LINKS } from '@/lib/siteNav';

export function Footer() {
  return (
    <footer className="relative bg-ink-950 border-t border-gold-400/[0.14] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr_auto]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-cegep.svg" alt="" width={20} height={23} className="h-[23px] w-auto" />
              <span className="font-display text-lg font-semibold text-white">
                Phet-ford
              </span>
            </Link>
            <p className="text-sm text-stone-400 mt-3 max-w-xs leading-relaxed">
              {TOTAL_SIMULATIONS} simulations de physique à manipuler
              directement dans le navigateur.
            </p>
          </div>

          <nav>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-600 mb-4">
              Sections
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categorie/${category.id}`}
                    className="text-sm text-stone-400 hover:text-gold-300 transition-colors"
                  >
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-600 mb-4">
              Le site
            </h2>
            <ul className="space-y-2.5">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 hover:text-gold-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-gold-400/[0.14] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-stone-400">
            Conçu par{' '}
            <span className="text-stone-200 font-medium">
              Xavier Arata, B.Ing, CPI
            </span>
          </p>
          <p className="text-xs text-ink-500 font-mono">
            v3.1.0 · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
