import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { ChromeDecor } from '@/components/layout/ChromeDecor';
import { HeaderBleed } from '@/components/layout/HeaderBleed';
import { PhysicsMotifs, buildBackdrop } from '@/components/layout/PhysicsMotifs';

export default function NotFound() {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      <HeaderBleed height={900} strength={0.1} />
      <PhysicsMotifs placements={buildBackdrop(1000)} />
      <ChromeDecor height="h-full" fade="radial" />

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
