import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';

export default function NotFound() {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid bg-grid mask-fade" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-gold-400/[0.1] blur-[110px]" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-28 text-center animate-fade-up">
        <Icon name="recherche-vide" size={44} className="mx-auto mb-5 text-gold-500" />
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold-600 mb-3">
          Erreur 404
        </p>
        <h1 className="font-display text-3xl font-bold text-white mb-3">
          Page introuvable
        </h1>
        <p className="text-stone-400 mb-9">
          Cette simulation ou cette section n&apos;existe pas (ou plus).
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gold-400 text-ink-950
                     text-sm font-semibold hover:bg-gold-300 transition-colors"
        >
          Voir toutes les simulations
        </Link>
      </div>
    </div>
  );
}
