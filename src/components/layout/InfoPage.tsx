import Link from 'next/link';
import { INFO_LINKS } from '@/lib/siteNav';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

/** Gabarit commun aux pages d'information (à propos, fonctionnalités, etc.) */
export function InfoPage({
  eyebrow,
  title,
  intro,
  active,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid mask-fade-b" />
        <div className="absolute -top-32 left-1/3 w-[34rem] h-[34rem] rounded-full bg-gold-400/[0.1] blur-[110px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-gold-300 transition-colors"
        >
          <span aria-hidden>←</span> Toutes les simulations
        </Link>

        <header className="mt-6 mb-8 animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600 mb-2">
            {eyebrow}
          </p>
          <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-white">
            {title}
          </h1>
          <p className="text-stone-400 mt-3 leading-relaxed">{intro}</p>
        </header>

        {/* Navigation entre les pages d'information */}
        <nav className="flex flex-wrap gap-2 mb-10 pb-8 border-b border-gold-400/[0.14]">
          {INFO_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                link.href === active
                  ? 'bg-gold-400 text-ink-950'
                  : 'text-stone-400 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-gold-400/35'
              )}
            >
              <Icon name={link.icon} size={13} className="inline-block -mt-px mr-1.5 align-middle" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-10 pb-12">{children}</div>
      </div>
    </div>
  );
}

/** Une section de contenu, avec son titre */
export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-stone-400 leading-relaxed">{children}</div>
    </section>
  );
}

export default InfoPage;
