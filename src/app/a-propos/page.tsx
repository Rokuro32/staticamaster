import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { EmailLink } from '@/components/layout/EmailLink';
import { CATEGORIES, TOTAL_SIMULATIONS } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'À propos — Phet-ford',
  description:
    'Ce qu’est Phet-ford, pourquoi le site n’héberge que des simulations, et qui le maintient.',
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Le site"
      title="À propos"
      intro="Phet-ford héberge des simulations de physique interactives, et rien d’autre."
      active="/a-propos"
    >
      <InfoSection title="Ce que c’est">
        <p>
          Un catalogue de {TOTAL_SIMULATIONS} simulations de physique, réparties
          en {CATEGORIES.length} sections, qui tournent entièrement dans le
          navigateur. On déplace un curseur, on change une masse ou un angle, et
          le résultat se recalcule tout de suite.
        </p>
        <p>
          Le site ne contient volontairement ni notes de cours, ni exercices, ni
          quiz. L’idée est qu’une simulation serve à voir un comportement — ce
          qui se passe quand on double la masse, quand on raidit une hélice,
          quand un choc devient mou — pas à remplacer le cours ni l’évaluation.
        </p>
      </InfoSection>

      <InfoSection title="Qui le fait">
        <p>
          Conçu et développé par{' '}
          <span className="text-stone-200 font-medium">
            Xavier Arata, B.&nbsp;Ing, CPI
          </span>
          , dans le contexte de l’enseignement de la physique et de la mécanique
          au Cégep de Thetford. L’identité visuelle du site reprend les couleurs
          de l’écusson du cégep.
        </p>
        <p>
          Baccalauréat en génie physique à l’Université Laval, où il complète
          aujourd’hui une maîtrise en physique. Celle-ci porte sur la robustesse
          des traitements en curiethérapie — à quel point un plan de traitement
          tient encore la route quand la réalité s’écarte de ce qui a été
          planifié.
        </p>
        <p>
          Avant cela, trois ans de travail dans le domaine de la biophotonique,
          à l’interface de l’optique et du vivant.
        </p>
        <p>
          En dehors du laboratoire et de la salle de classe : biathlète de
          niveau national.
        </p>
      </InfoSection>

      <InfoSection title="Le nom">
        <p>
          « Phet-ford » est un clin d’œil aux simulations{' '}
          <a
            href="https://phet.colorado.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-300 hover:text-gold-200 underline underline-offset-2"
          >
            PhET
          </a>{' '}
          de l’Université du Colorado, qui ont ouvert la voie à ce genre d’outil,
          et à Thetford. Ce site n’est ni affilié à PhET ni dérivé de son code :
          toutes les simulations qu’on y trouve ont été écrites pour lui.
        </p>
      </InfoSection>

      <InfoSection title="Signaler un problème">
        <p>
          Une simulation qui donne un résultat douteux, une formule mal
          affichée, une idée de sujet à ajouter : écrivez-moi.
        </p>
        <p>
          <EmailLink className="text-gold-300 hover:text-gold-200 underline underline-offset-2" />
        </p>
      </InfoSection>

      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gold-400 text-ink-950 text-sm font-semibold hover:bg-gold-300 transition-colors"
        >
          Voir les simulations
        </Link>
      </div>
    </InfoPage>
  );
}
