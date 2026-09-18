// Pages d'information, listées dans le menu « À propos » de l'en-tête.

export interface InfoLink {
  href: string;
  label: string;
  description: string;
  icon: string;
}

export const INFO_LINKS: InfoLink[] = [
  {
    href: '/a-propos',
    label: 'À propos',
    description: "Ce qu'est ce site et qui l'a fait",
    icon: 'ℹ️',
  },
  {
    href: '/fonctionnalites',
    label: 'Fonctionnalités',
    description: 'Ce que le site sait faire',
    icon: '🧰',
  },
  {
    href: '/bibliographie',
    label: 'Bibliographie',
    description: 'Ouvrages et ressources de référence',
    icon: '📚',
  },
];
