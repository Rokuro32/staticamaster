import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Travaux — Phet-ford',
  description:
    'Mémoire de maîtrise, articles et communications de Xavier Arata.',
};

// ---------------------------------------------------------------------------
// Pour ajouter une entrée : une ligne dans THESIS ou PUBLICATIONS ci-dessous.
// Seuls `title` et `kind` sont obligatoires. Avec `href`, l'entrée devient
// cliquable ; sans, elle s'affiche simplement. Les sections vides ne sont pas
// rendues — inutile de les commenter.
// ---------------------------------------------------------------------------

interface Work {
  title: string;
  /** Type : mémoire, article, affiche, communication… */
  kind: string;
  /** Revue, université, conférence */
  venue?: string;
  year?: string;
  /** « En cours », « Soumis », « Publié »… */
  status?: string;
  summary?: string;
  /** Lien vers le document, le DOI ou la page de dépôt */
  href?: string;
  authors?: string;
}

const THESIS: Work[] = [
  {
    title: 'Robustesse des traitements en curiethérapie',
    kind: 'Mémoire de maîtrise',
    venue: 'Université Laval',
    status: 'En cours',
    summary:
      'À quel point un plan de traitement tient encore la route quand la réalité s’écarte de ce qui a été planifié.',
  },
];

const PUBLICATIONS: Work[] = [
  // Exemple de la forme attendue, à décommenter et remplir :
  // {
  //   title: 'Titre de l’article',
  //   kind: 'Article',
  //   authors: 'Arata, X., et al.',
  //   venue: 'Nom de la revue',
  //   year: '2026',
  //   href: 'https://doi.org/…',
  // },
];

function WorkEntry({ work }: { work: Work }) {
  const meta = [work.venue, work.year].filter(Boolean).join(' · ');

  const body = (
    <>
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">
          {work.kind}
        </span>
        {work.status && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gold-400/10 text-gold-300 ring-1 ring-inset ring-gold-400/20">
            {work.status}
          </span>
        )}
      </div>

      <h3 className="font-display font-semibold text-white mt-1.5 leading-snug">
        {work.title}
        {work.href && (
          <span
            aria-hidden
            className="inline-block ml-1.5 text-stone-500 transition-transform duration-200 group-hover:translate-x-0.5"
          >
            ↗
          </span>
        )}
      </h3>

      {work.authors && (
        <p className="text-sm text-stone-400 mt-1">{work.authors}</p>
      )}
      {meta && <p className="text-sm text-stone-500 mt-1">{meta}</p>}
      {work.summary && (
        <p className="text-sm text-stone-400 mt-2 leading-relaxed">
          {work.summary}
        </p>
      )}
    </>
  );

  const className = cn(
    'block panel rounded-2xl p-5',
    work.href && 'group panel-hover hover:border-gold-400/40'
  );

  return work.href ? (
    <a href={work.href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default function WorksPage() {
  const hasAnything = THESIS.length > 0 || PUBLICATIONS.length > 0;

  return (
    <InfoPage
      eyebrow="Le site"
      title="Travaux"
      intro="Les travaux de recherche de Xavier Arata, en marge des simulations."
      active="/travaux"
    >
      {THESIS.length > 0 && (
        <InfoSection title="Mémoire de maîtrise">
          <div className="space-y-3">
            {THESIS.map((work) => (
              <WorkEntry key={work.title} work={work} />
            ))}
          </div>
        </InfoSection>
      )}

      <InfoSection title="Articles et communications">
        {PUBLICATIONS.length > 0 ? (
          <div className="space-y-3">
            {PUBLICATIONS.map((work) => (
              <WorkEntry key={work.title} work={work} />
            ))}
          </div>
        ) : (
          <p className="text-stone-500 italic">
            Rien à afficher pour l’instant. Cette section se remplira au fur et
            à mesure des publications.
          </p>
        )}
      </InfoSection>

      {!hasAnything && (
        <p className="text-stone-500 italic">Page en construction.</p>
      )}
    </InfoPage>
  );
}
