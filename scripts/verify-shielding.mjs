// Contrôles du modèle de blindage (src/lib/shielding.ts).
//
//   node scripts/verify-shielding.mjs
//
// Le modèle est séparé du composant React pour se compiler seul et se vérifier
// sans navigateur.
//
// Deux familles de contrôles. Les identités doivent tomber exactement — une
// couche de demi-atténuation divise par deux, un dixième vaut log2(10) demis.
// Les données, elles, sont confrontées aux valeurs publiées : couches de
// demi-atténuation, parcours des α dans l'air, parcours des β. C'est le seul
// moyen de savoir si un coefficient tabulé de mémoire est juste.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'shield-'));

execFileSync(
  'npx',
  ['tsc', 'src/lib/shielding.ts', '--outDir', out, '--module', 'es2020',
   '--target', 'es2020', '--moduleResolution', 'node'],
  { cwd: root, stdio: 'inherit' }
);
renameSync(join(out, 'shielding.js'), join(out, 'shielding.mjs'));

const S = await import(pathToFileURL(join(out, 'shielding.mjs')).href);
const M = (id) => S.materialById(id);

let fails = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? '  OK   ' : '  ECHEC') + '  ' + name + (detail ? '  → ' + detail : ''));
  if (!cond) fails++;
};
const between = (v, lo, hi) => v >= lo && v <= hi;

// 1 ── Identités de l'atténuation exponentielle
console.log('\n1. Identités de l\'atténuation exponentielle');
{
  const m = M('plomb');
  const h = S.hvl(m, 'cs137');
  const r1 = S.attenuatePhotons(m, 'cs137', h).narrow;
  const r5 = S.attenuatePhotons(m, 'cs137', 5 * h).narrow;
  ok('une CDA divise par deux', Math.abs(r1 - 0.5) < 1e-12, `transmission ${r1.toFixed(6)}`);
  ok('cinq CDA divisent par 32', Math.abs(r5 - 1 / 32) < 1e-12, `transmission ${(1 / r5).toFixed(3)}⁻¹`);
  const ratio = S.tvl(m, 'cs137') / h;
  ok('CDX / CDA = log2(10)', Math.abs(ratio - Math.log2(10)) < 1e-12, `${ratio.toFixed(5)}`);
  const t100 = S.thicknessForFactor(m, 'cs137', 100);
  ok('épaisseur pour diviser par 100 = 2 CDX',
     Math.abs(t100 - 2 * S.tvl(m, 'cs137')) < 1e-12, `${t100.toFixed(3)} cm`);
}

// 2 ── Couches de demi-atténuation, contre les valeurs publiées
console.log('\n2. Couches de demi-atténuation (faisceau étroit)');
{
  const cases = [
    ['Cs-137 dans le plomb',   'plomb',      'cs137', 0.45, 0.70, '≈ 0,5 à 0,65 cm'],
    ['Co-60 dans le plomb',    'plomb',      'co60',  0.90, 1.30, '≈ 1,0 à 1,2 cm'],
    ['Cs-137 dans le béton',   'beton',      'cs137', 3.20, 5.00, '≈ 3,5 à 4,8 cm'],
    ['Co-60 dans le béton',    'beton',      'co60',  4.50, 6.80, '≈ 5 à 6,2 cm'],
    ['Cs-137 dans l\'acier',   'acier',      'cs137', 1.00, 1.60, '≈ 1,2 à 1,6 cm'],
    ['Ir-192 dans le plomb',   'plomb',      'ir192', 0.15, 0.35, '≈ 0,25 à 0,3 cm'],
    ['6 MV dans le plomb',     'plomb',      'mv6',   1.10, 1.80, '≈ 1,2 à 1,7 cm'],
  ];
  for (const [name, mat, src, lo, hi, ref] of cases) {
    const h = S.hvl(M(mat), src);
    ok(name, between(h, lo, hi), `${h.toFixed(2)} cm  (publié ${ref})`);
  }
  const hI = S.hvl(M('plomb'), 'i125') * 10; // en mm
  ok('I-125 dans le plomb', between(hI, 0.015, 0.035), `${hI.toFixed(3)} mm  (publié ≈ 0,025 mm)`);
}

// 3 ── L'ordre des matériaux doit être le bon, et dépendre de l'énergie
console.log('\n3. Classement des matériaux');
{
  const at = (mat, src) => S.hvl(M(mat), src);
  ok('à 30 keV, le plomb écrase l\'aluminium',
     at('plomb', 'i125') * 50 < at('aluminium', 'i125'),
     `${(at('aluminium', 'i125') / at('plomb', 'i125')).toFixed(0)}× plus mince`);
  ok('à 6 MV, l\'écart plomb / béton se resserre beaucoup',
     at('beton', 'mv6') / at('plomb', 'mv6') < 12,
     `${(at('beton', 'mv6') / at('plomb', 'mv6')).toFixed(1)}× contre ${(at('beton', 'i125') / at('plomb', 'i125')).toFixed(0)}× à 30 keV`);
  ok('le tungstène bat le plomb à toutes les énergies',
     S.PHOTON_SOURCES.every((s) => at('tungstene', s.id) < at('plomb', s.id)),
     'densité 19,3 contre 11,35');
  ok('le papier ne fait rien aux photons',
     S.attenuatePhotons(M('papier'), 'cs137', 0.02).narrow > 0.998,
     `transmission ${(S.attenuatePhotons(M('papier'), 'cs137', 0.02).narrow * 100).toFixed(2)} %`);
}

// 4 ── Facteur d'accumulation
console.log('\n4. Faisceau large');
{
  const r = S.attenuatePhotons(M('beton'), 'co60', 30);
  ok('vaut 1 à épaisseur nulle',
     Math.abs(S.attenuatePhotons(M('beton'), 'co60', 0).buildup - 1) < 1e-12);
  ok('le faisceau large transmet plus que l\'étroit',
     r.broad > r.narrow, `${(r.broad / r.narrow).toFixed(1)}× à ${r.mux.toFixed(1)} libres parcours`);
  ok('accumulation plus faible à Z élevé',
     S.buildup(M('plomb'), 5) < S.buildup(M('eau'), 5),
     `plomb ${S.buildup(M('plomb'), 5).toFixed(1)} contre eau ${S.buildup(M('eau'), 5).toFixed(1)}`);
}

// 5 ── Bêta : parcours de Katz-Penfold
console.log('\n5. Parcours des bêta');
{
  const cases = [
    [0.5, 0.15, 0.20, '≈ 0,17 g/cm²'],
    [1.0, 0.38, 0.45, '≈ 0,41 g/cm²'],
    [2.0, 0.88, 1.05, '≈ 0,96 g/cm²'],
    [2.28, 1.00, 1.20, '≈ 1,1 g/cm² (Y-90)'],
  ];
  for (const [e, lo, hi, ref] of cases) {
    const r = S.betaRangeMassic(e);
    ok(`${e} MeV`, between(r, lo, hi), `${r.toFixed(3)} g/cm²  (publié ${ref})`);
  }
  const pmma = S.betaRange(M('pmma'), 2.28);
  ok('Y-90 arrêté par ~1 cm de plexiglas', between(pmma, 0.8, 1.2), `${pmma.toFixed(2)} cm`);
}

// 6 ── Le piège du blindage bêta
console.log('\n6. Rayonnement de freinage');
{
  const pb = S.bremsstrahlungYield(M('plomb'), 2.28);
  const pl = S.bremsstrahlungYield(M('pmma'), 2.28);
  ok('le plomb en produit beaucoup', between(pb, 0.04, 0.09), `${(pb * 100).toFixed(1)} % de l'énergie`);
  ok('le plastique presque pas', pl < 0.01, `${(pl * 100).toFixed(2)} % de l'énergie`);
  ok('rapport supérieur à dix', pb / pl > 10, `${(pb / pl).toFixed(0)}×`);
  const epais = S.attenuateBeta(M('plomb'), 2.28, 1.0);
  ok('un écran épais arrête tous les β', epais.stopped && epais.transmitted === 0);
  ok('...mais laisse le freinage', epais.brems > 0.04, `${(epais.brems * 100).toFixed(1)} %`);
}

// 7 ── Alpha
console.log('\n7. Parcours des alpha');
{
  const air = S.alphaRangeAir(5.5);
  ok('Am-241 dans l\'air', between(air, 3.6, 4.6), `${air.toFixed(2)} cm  (publié ≈ 4,1 cm)`);
  const eau = S.alphaRange(M('eau'), 5.5) * 1e4; // en µm
  ok('...et dans les tissus', between(eau, 25, 70), `${eau.toFixed(0)} µm  (publié ≈ 40 à 50 µm)`);
  const pap = S.attenuateAlpha(M('papier'), 5.5, 0.01); // 100 µm de papier
  ok('arrêté par une feuille de papier', pap.stopped, `parcours ${(pap.range * 1e4).toFixed(0)} µm`);
}

// 8 ── Neutrons : c'est la masse qui compte, pas l'épaisseur
console.log('\n8. Neutrons rapides');
{
  const pe = S.attenuateNeutrons(M('polyethylene'), 10);
  const pb = S.attenuateNeutrons(M('plomb'), 10);
  ok('par centimètre, le plomb fait presque jeu égal',
     Math.abs(pe.tvl - pb.tvl) / pe.tvl < 0.2,
     `CDX ${pe.tvl.toFixed(1)} cm contre ${pb.tvl.toFixed(1)} cm`);
  const massPE = pe.tvl * M('polyethylene').rho;
  const massPb = pb.tvl * M('plomb').rho;
  ok('...mais à plus de dix fois la masse', massPb / massPE > 10,
     `${massPE.toFixed(0)} g/cm² contre ${massPb.toFixed(0)} g/cm²`);
  ok('et il ne ralentit rien',
     S.attenuateNeutrons(M('plomb'), 10).moderation === 0 &&
     S.attenuateNeutrons(M('polyethylene'), 10).moderation === 1,
     'hydrogène : 14,4 % contre 0 %');
  ok('l\'acier retire le plus par centimètre',
     S.MATERIALS.every((m) => m.sigmaR <= M('acier').sigmaR || m.id === 'tungstene'),
     `Σ retrait ${M('acier').sigmaR} cm⁻¹`);
}

// 9 ── Équivalences entre matériaux
console.log('\n9. Équivalences');
{
  const eq = S.equivalentThickness(M('plomb'), 1, 'co60');
  const beton = eq.find((e) => e.material.id === 'beton');
  const plomb = eq.find((e) => e.material.id === 'plomb');
  ok('le plomb est son propre équivalent', Math.abs(plomb.cm - 1) < 1e-12);
  ok('1 cm de plomb ≈ 5 cm de béton', between(beton.cm, 4, 6.5), `${beton.cm.toFixed(1)} cm`);
  const same = eq.map((e) => S.attenuatePhotons(e.material, 'co60', e.cm).narrow);
  ok('toutes les équivalences transmettent autant',
     Math.max(...same) - Math.min(...same) < 1e-12,
     `transmission ${same[0].toFixed(6)}`);
}

console.log('\n' + (fails === 0 ? 'TOUS LES CONTROLES PASSENT' : fails + ' CONTROLE(S) EN ECHEC'));
process.exit(fails ? 1 : 0);
