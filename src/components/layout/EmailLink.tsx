'use client';

import { useEffect, useState } from 'react';

// L'adresse n'est jamais écrite en entier dans le code : elle est recomposée
// au chargement, côté navigateur. Le HTML servi ne contient donc aucune chaîne
// de la forme « quelquechose@quelquechose », ce qui suffit à passer sous le
// radar des moissonneurs à spam, qui se contentent presque tous d'un regex sur
// la page. Un robot déterminé qui exécute le JavaScript la trouvera quand
// même — c'est une gêne, pas un verrou.
const USER = 'araxav2';
const DOMAIN = 'gmail';
const TLD = 'com';

export function EmailLink({ className }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(`${USER}@${DOMAIN}.${TLD}`);
  }, []);

  // Avant l'hydratation (et sans JavaScript), on affiche une forme lisible par
  // un humain mais pas par un regex d'adresse.
  if (!address) {
    return (
      <span className={className}>
        {USER} [arobase] {DOMAIN} [point] {TLD}
      </span>
    );
  }

  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  );
}

export default EmailLink;
