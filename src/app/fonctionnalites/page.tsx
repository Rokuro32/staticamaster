import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { CATEGORIES, SIMULATIONS, TOTAL_SIMULATIONS } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Fonctionnalités — Phet-ford',
  description: 'Ce que le site sait faire : catalogue, recherche, simulations interactives.',
};

const FEATURES = [
  {
    title: 'Recherche et filtres',
    body: "La page d'accueil cherche dans les titres, les descriptions et les concepts couverts. La recherche ignore les accents, donc « helicoidal » trouve « hélicoïdal ». Les filtres par section restreignent le catalogue d'un clic.",
  },
  {
    title: 'Paramètres en temps réel',
    body: 'Chaque simulation se pilote au curseur. Les grandeurs dérivées se recalculent à chaque image : on voit tout de suite quelle variable compte et laquelle ne change presque rien.',
  },
  {
    title: 'Formules affichées',
    body: "Les relations utilisées sont écrites en notation mathématique sous chaque simulation, avec les valeurs courantes. Rien n'est calculé dans une boîte noire.",
  },
  {
    title: 'Préréglages',
    body: "Plusieurs simulations proposent des cas concrets prêts à charger — vis-mère de tour, foret, choc parfaitement mou — avec une phrase qui dit ce qu'il faut regarder.",
  },
  {
    title: 'Vues 3D',
    body: "Les opérations vectorielles et les ondes électromagnétiques offrent une vue 3D orientable, utile quand la géométrie ne tient pas dans un plan (produit vectoriel, champs E et B).",
  },
  {
    title: 'Simulations à onglets',
    body: "Les gros sujets regroupent plusieurs modules sous forme d'onglets : la physique quantique en couvre huit, la radioactivité six.",
  },
  {
    title: 'Chargement à la demande',
    body: "Seule la simulation ouverte est téléchargée. Les pages du catalogue sont pré-générées en statique, donc elles s'affichent immédiatement.",
  },
  {
    title: 'Utilisable sur téléphone',
    body: 'La mise en page se réorganise sur petit écran. Les simulations qui reposent sur un canevas large restent lisibles en tenant le téléphone à l’horizontale.',
  },
  {
    title: 'Aucun compte, aucun suivi',
    body: "Pas d'inscription, pas de cookie de suivi, aucune donnée d'usage collectée. Tout tourne sur votre appareil.",
  },
  {
    title: 'Confort de lecture',
    body: "Les animations sont désactivées si le système est réglé sur « réduire les animations ». Le contraste des textes et les cibles de clic ont été vérifiés.",
  },
];

export default function FeaturesPage() {
  const withTabs = ['physique-quantique', 'radioactivite', 'ondes-electromagnetiques'];
  const tabbedCount = SIMULATIONS.filter((s) => withTabs.includes(s.id)).length;

  return (
    <InfoPage
      eyebrow="Le site"
      title="Fonctionnalités"
      intro={`${TOTAL_SIMULATIONS} simulations réparties en ${CATEGORIES.length} sections, et ce qu’il y a autour pour s’y retrouver.`}
      active="/fonctionnalites"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="panel rounded-2xl p-5"
          >
            <h2 className="font-display font-semibold text-white mb-1.5">
              {feature.title}
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed">{feature.body}</p>
          </div>
        ))}
      </div>

      <InfoSection title="En chiffres">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: TOTAL_SIMULATIONS, label: 'simulations' },
            { value: CATEGORIES.length, label: 'sections' },
            { value: tabbedCount, label: 'simulations à onglets' },
            { value: 0, label: 'compte requis' },
          ].map((stat) => (
            <div key={stat.label} className="panel rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-gold-300">
                {stat.value}
              </div>
              <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="Sous le capot">
        <p>
          Le site est une application Next.js en TypeScript. Les simulations sont
          des composants React qui dessinent sur un canevas 2D, ou sur une scène
          three.js pour les vues 3D. Les formules sont rendues avec KaTeX, la
          mise en page avec Tailwind CSS.
        </p>
        <p>
          Les pages de catalogue et de simulation sont générées à la compilation,
          ce qui permet d’héberger le tout sans base de données ni serveur
          applicatif.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
