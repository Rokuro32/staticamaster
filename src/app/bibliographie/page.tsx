import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Bibliographie — Phet-ford',
  description:
    'Ouvrages et ressources de référence pour la physique et la mécanique couvertes par les simulations.',
};

// NOTE : liste de départ, composée d'ouvrages standards en physique collégiale
// et en mécanique. À ajuster pour refléter les sources réellement utilisées.

interface Entry {
  authors: string;
  title: string;
  publisher: string;
  note?: string;
}

const BOOKS: { section: string; entries: Entry[] }[] = [
  {
    section: 'Physique générale (niveau collégial)',
    entries: [
      {
        authors: 'Benson, H.',
        title: 'Physique 1 — Mécanique',
        publisher: 'ERPI',
        note: 'Cinématique, dynamique, quantité de mouvement, rotation.',
      },
      {
        authors: 'Benson, H.',
        title: 'Physique 2 — Électricité et magnétisme',
        publisher: 'ERPI',
        note: 'Circuits à courant continu, lois de Kirchhoff.',
      },
      {
        authors: 'Benson, H.',
        title: 'Physique 3 — Ondes, optique et physique moderne',
        publisher: 'ERPI',
        note: 'Oscillations, ondes, relativité, physique quantique et nucléaire.',
      },
      {
        authors: 'Halliday, D., Resnick, R. et Walker, J.',
        title: 'Fundamentals of Physics',
        publisher: 'Wiley',
      },
      {
        authors: 'Serway, R. A. et Jewett, J. W.',
        title: 'Physics for Scientists and Engineers',
        publisher: 'Cengage Learning',
      },
      {
        authors: 'Young, H. D. et Freedman, R. A.',
        title: 'University Physics with Modern Physics',
        publisher: 'Pearson',
      },
    ],
  },
  {
    section: 'Statique et résistance des matériaux',
    entries: [
      {
        authors: 'Hibbeler, R. C.',
        title: 'Engineering Mechanics: Statics',
        publisher: 'Pearson',
        note: 'Équilibre, treillis, méthodes des nœuds et des sections.',
      },
      {
        authors: 'Beer, F. P. et Johnston, E. R.',
        title: 'Vector Mechanics for Engineers: Statics and Dynamics',
        publisher: 'McGraw-Hill',
      },
      {
        authors: 'Beer, F. P. et Johnston, E. R.',
        title: 'Mechanics of Materials',
        publisher: 'McGraw-Hill',
        note: 'Contraintes, déformations, essai de traction.',
      },
    ],
  },
  {
    section: 'Réseaux complexes',
    entries: [
      {
        authors: 'Newman, M. E. J.',
        title: 'Networks',
        publisher: 'Oxford University Press',
        note: 'Chapitre 6 « Mathematics of networks » et chapitre 7 « Measures and metrics » : la base de la simulation sur les réseaux.',
      },
      {
        authors: 'Barabási, A.-L.',
        title: 'Network Science',
        publisher: 'Cambridge University Press',
        note: 'Disponible librement en ligne.',
      },
    ],
  },
  {
    section: 'Mécanismes et machines',
    entries: [
      {
        authors: 'Norton, R. L.',
        title: 'Design of Machinery',
        publisher: 'McGraw-Hill',
        note: 'Bielle-manivelle, coulisseaux, trains épicycloïdaux.',
      },
      {
        authors: 'Budynas, R. G. et Nisbett, J. K.',
        title: "Shigley's Mechanical Engineering Design",
        publisher: 'McGraw-Hill',
        note: 'Filetages, vis de transmission, angle d’hélice.',
      },
    ],
  },
];

const RESOURCES = [
  {
    label: 'PhET Interactive Simulations',
    org: 'University of Colorado Boulder',
    url: 'https://phet.colorado.edu',
    note: 'La référence du genre, et l’inspiration du nom de ce site.',
  },
  {
    label: 'CODATA — Fundamental Physical Constants',
    org: 'NIST',
    url: 'https://physics.nist.gov/cuu/Constants/',
    note: 'Valeurs de référence des constantes utilisées dans les simulations.',
  },
  {
    label: 'HyperPhysics',
    org: 'Georgia State University',
    url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html',
    note: 'Cartes conceptuelles reliant formules et phénomènes.',
  },
  {
    label: 'MIT OpenCourseWare — Physics',
    org: 'Massachusetts Institute of Technology',
    url: 'https://ocw.mit.edu/search/?d=Physics',
    note: 'Cours complets en accès libre.',
  },
];

export default function BibliographyPage() {
  return (
    <InfoPage
      eyebrow="Le site"
      title="Bibliographie"
      intro="Les ouvrages et ressources sur lesquels s’appuient les contenus, les formules et les ordres de grandeur des simulations."
      active="/bibliographie"
    >
      {BOOKS.map((group) => (
        <InfoSection key={group.section} title={group.section}>
          <ul className="space-y-4">
            {group.entries.map((entry) => (
              <li
                key={entry.title}
                className="pl-4 border-l-2 border-gold-400/25"
              >
                <p className="text-stone-200">
                  {entry.authors}{' '}
                  <span className="italic text-white">{entry.title}</span>.{' '}
                  <span className="text-stone-500">{entry.publisher}.</span>
                </p>
                {entry.note && (
                  <p className="text-sm text-stone-500 mt-1">{entry.note}</p>
                )}
              </li>
            ))}
          </ul>
        </InfoSection>
      ))}

      <InfoSection title="Ressources en ligne">
        <ul className="space-y-4">
          {RESOURCES.map((res) => (
            <li key={res.url} className="pl-4 border-l-2 border-gold-400/25">
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-300 hover:text-gold-200 underline underline-offset-2"
              >
                {res.label}
              </a>
              <span className="text-stone-500"> — {res.org}</span>
              <p className="text-sm text-stone-500 mt-1">{res.note}</p>
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="Constantes physiques">
        <p>
          Les constantes employées dans les simulations (constante de Planck,
          constante de Boltzmann, vitesse de la lumière, masse de l’électron,
          électronvolt) sont arrondies aux quatre chiffres significatifs à partir
          des valeurs CODATA publiées par le NIST. Elles sont regroupées dans un
          seul fichier du projet, afin que toutes les simulations travaillent sur
          les mêmes nombres.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
