# scripts/

Codemods ponctuels, gardés pour que la recoloration soit rejouable et
vérifiable.

- `palette.py` — les cibles de la palette du Cégep de Thetford : plages de
  teintes sources, teinte et saturation cibles, et génération des échelles
  Tailwind. C'est la seule source de vérité : les hex des canevas et les
  classes Tailwind en sortent tous les deux.
- `recolor.py` — passe principale : couleurs `#rrggbb` des canevas et classes
  utilitaires Tailwind, sur `src/components/simulations/**`.
- `recolor_rgb.py` — passe complémentaire pour les littéraux `rgb()`/`rgba()`.

Ces scripts **ne sont pas idempotents** : les relancer sur du code déjà
recoloré assombrirait à nouveau les tons clairs. Ils s'exécutent depuis la
racine du projet, sur un arbre propre.

Ce qui n'est volontairement pas touché : les couleurs calculées depuis une
grandeur physique (longueur d'onde → couleur visible, température → couleur du
corps noir). Elles passent par `rgb()`/`hsl()` interpolés et encodent une
information réelle ; les recolorer serait faux.

## verify-ecg.mjs

Contrôles du modèle ECG (`src/lib/ecg.ts`) :

```
node scripts/verify-ecg.mjs
```

Contrairement aux codemods ci-dessus, ce script est rejouable et sans effet de
bord. Le modèle du vecteur cardiaque est séparé du composant React précisément
pour ça : il se compile seul et se vérifie sans navigateur.

Les contrôles portent sur des identités qui doivent tomber exactement — la loi
d'Einthoven II = I + III, et les trois identités de Goldberger pour les
dérivations augmentées — puis sur des ordres de grandeur physiologiques.

C'est le contrôle de Goldberger qui a révélé que les dérivations augmentées
avaient d'abord été traitées comme des projections unitaires, alors que leur
vecteur de dérivation vaut √3/2 de celui des dérivations des membres. Une
identité qui doit valoir zéro à l'arrondi machine près ne laisse rien passer ;
une simple inspection visuelle du tracé n'aurait jamais montré ces 13 %.

## verify-shielding.mjs

Contrôles du modèle de blindage (`src/lib/shielding.ts`) :

```
node scripts/verify-shielding.mjs
```

Deux familles de contrôles. Les identités doivent tomber exactement — une
couche de demi-atténuation divise par deux, une couche de dixième vaut
log2(10) demis, et toutes les épaisseurs équivalentes transmettent la même
fraction. Les données, elles, sont confrontées aux valeurs publiées : couches
de demi-atténuation du Cs-137 et du Co-60 dans le plomb, le béton et l'acier,
parcours des β de Katz-Penfold, parcours des α dans l'air et dans les tissus.

C'est indispensable ici : un coefficient d'atténuation massique tabulé de
mémoire se vérifie mal à l'œil, alors qu'une couche de demi-atténuation hors
de la fourchette publiée saute aux yeux.
