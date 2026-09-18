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
