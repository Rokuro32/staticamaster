import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { EmailLink } from '@/components/layout/EmailLink';
import { Icon } from '@/components/icons/Icon';

export const metadata: Metadata = {
  title: 'Contact — Phet-ford',
  description: 'Comment joindre Xavier Arata à propos de Phet-ford.',
};

const LINKS = [
  {
    label: 'Instagram — biathlon',
    handle: '@la_boite_a_feur',
    href: 'https://www.instagram.com/la_boite_a_feur/',
    note: 'Les courses, les entraînements et le reste de la saison.',
    icon: 'biathlon',
  },
  {
    label: 'GitHub — code du site',
    handle: 'Rokuro32/staticamaster',
    href: 'https://github.com/Rokuro32/staticamaster',
    note: 'Le dépôt de Phet-ford, si vous voulez voir comment une simulation est faite.',
    icon: 'code',
  },
];

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Le site"
      title="Contact"
      intro="Une question, une erreur repérée dans une simulation, une idée de sujet à ajouter : écrivez-moi."
      active="/contact"
    >
      <InfoSection title="Courriel">
        <p>
          Le plus direct. Pour tout ce qui touche au site : un résultat qui
          semble faux, une formule mal affichée, une simulation qui manque.
        </p>
        <p className="text-lg">
          <EmailLink className="text-gold-300 hover:text-gold-200 underline underline-offset-2" />
        </p>
      </InfoSection>

      <InfoSection title="Ailleurs">
        <ul className="space-y-3">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3.5 panel panel-hover rounded-2xl p-4 hover:border-gold-400/40"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg bg-gold-400/10 ring-1 ring-inset ring-gold-400/20">
                  <Icon name={link.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-semibold text-white">
                      {link.label}
                    </span>
                    <span className="text-xs font-mono text-gold-600">
                      {link.handle}
                    </span>
                  </span>
                  <span className="block text-sm text-stone-400 mt-1 leading-relaxed">
                    {link.note}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-stone-500 transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
