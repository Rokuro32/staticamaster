// Contrôles du modèle ECG (src/lib/ecg.ts).
//
//   node scripts/verify-ecg.mjs
//
// Le modèle est volontairement séparé du composant React : il se compile seul
// et se vérifie sans navigateur. Les contrôles portent sur des identités qui
// doivent tomber exactement (Einthoven, Goldberger) et sur des ordres de
// grandeur physiologiques (amplitudes, durées, effet de la fréquence).
//
// Le vrai intérêt est là : une identité qui doit valoir zéro à l'arrondi
// machine près ne pardonne rien. C'est ce contrôle-là qui a révélé que les
// dérivations augmentées avaient été traitées comme des projections unitaires,
// alors que leur vecteur de dérivation vaut √3/2 de celui des dérivations des
// membres.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'ecg-'));

execFileSync(
  'npx',
  ['tsc', 'src/lib/ecg.ts', '--outDir', out, '--module', 'es2020',
   '--target', 'es2020', '--moduleResolution', 'node'],
  { cwd: root, stdio: 'inherit' }
);
renameSync(join(out, 'ecg.js'), join(out, 'ecg.mjs'));

const {
  LEADS, project, leadVoltage, leadById, cardiacVector, normalTiming,
  beatMarks, electricalAxis, leadExtremes,
} = await import(pathToFileURL(join(out, 'ecg.mjs')).href);

const V = (d, id) => leadVoltage(d, leadById(id));

let fails = 0;
const ok = (name, cond, detail='') => {
  console.log((cond ? '  OK   ' : '  ECHEC') + '  ' + name + (detail ? '  → ' + detail : ''));
  if (!cond) fails++;
};

// 1 ── Loi d'Einthoven : II = I + III, à chaque instant, pour tout axe
console.log('\n1. Loi d\'Einthoven  II = I + III');
for (const axis of [-60, 0, 30, 60, 90, 120]) {
  const tm = { ...normalTiming(72), axis };
  let worst = 0;
  for (let i = 0; i < 4000; i++) {
    const d = cardiacVector((i/4000)*tm.rr, tm);
    const r = V(d,'II') - (V(d,'I') + V(d,'III'));
    worst = Math.max(worst, Math.abs(r));
  }
  ok(`axe ${axis}°`, worst < 1e-12, `écart max ${worst.toExponential(1)} mV`);
}

// 2 ── Les trois identités de Goldberger pour les dérivations augmentées
console.log('\n2. Identités de Goldberger');
{
  const tm = normalTiming(72);
  const checks = [
    ['aVR = −(I + II)/2', (d) => V(d,'aVR') - (-(V(d,'I') + V(d,'II'))/2)],
    ['aVL = (I − III)/2',  (d) => V(d,'aVL') - ((V(d,'I') - V(d,'III'))/2)],
    ['aVF = (II + III)/2', (d) => V(d,'aVF') - ((V(d,'II') + V(d,'III'))/2)],
  ];
  for (const [name, f] of checks) {
    let worst = 0;
    for (let i = 0; i < 4000; i++) worst = Math.max(worst, Math.abs(f(cardiacVector((i/4000)*tm.rr, tm))));
    ok(name, worst < 1e-12, `écart max ${worst.toExponential(1)} mV`);
  }
}

// 3 ── L'axe retrouvé par les aires doit redonner l'axe imposé
console.log('\n3. Axe électrique retrouvé par la méthode des aires');
for (const axis of [-30, 0, 30, 60, 90, 120]) {
  const got = electricalAxis({ ...normalTiming(72), axis });
  ok(`axe imposé ${axis}°`, Math.abs(got - axis) < 6, `retrouvé ${got.toFixed(1)}°`);
}

// 4 ── La durée du QRS ne doit pas dépendre de la fréquence
console.log('\n4. Durée du QRS indépendante de la fréquence');
for (const bpm of [40, 72, 120, 180]) {
  const tm = normalTiming(bpm);
  ok(`${bpm} /min`, Math.abs(tm.qrsDur - 0.09) < 1e-9, `QRS ${(tm.qrsDur*1000).toFixed(0)} ms`);
}

// 5 ── QT raccourcit avec la fréquence, QTc reste constant (Bazett)
console.log('\n5. QT et QT corrigé');
let prevQT = Infinity;
for (const bpm of [40, 60, 90, 150]) {
  const tm = normalTiming(bpm);
  const qtc = tm.qt / Math.sqrt(tm.rr);
  ok(`${bpm} /min`, tm.qt < prevQT && Math.abs(qtc - 0.40) < 1e-9,
     `QT ${(tm.qt*1000).toFixed(0)} ms, QTc ${(qtc*1000).toFixed(0)} ms`);
  prevQT = tm.qt;
}

// 6 ── Morphologie en dérivation II chez le sujet normal
console.log('\n6. Morphologie normale en dérivation II');
{
  const tm = normalTiming(72);
  const e = leadExtremes(tm, leadById('II'));
  ok('R positif ~1,6 mV', e.max > 1.4 && e.max < 1.8, `R = ${e.max.toFixed(2)} mV`);
  ok('S négatif', e.min < -0.05, `S = ${e.min.toFixed(2)} mV`);
  const m = beatMarks(tm);
  const vP = V(cardiacVector(m.pPeak, tm), 'II');
  const vT = V(cardiacVector(m.tPeak, tm), 'II');
  ok('P positive', vP > 0.1, `P = ${vP.toFixed(2)} mV`);
  ok('T positive (concordante avec le QRS)', vT > 0.1, `T = ${vT.toFixed(2)} mV`);
  ok('P plus petite que R', vP < e.max/3, `${vP.toFixed(2)} contre ${e.max.toFixed(2)}`);
}

// 7 ── aVR doit être négative chez le sujet normal
console.log('\n7. aVR négative chez le sujet normal');
{
  const tm = normalTiming(72);
  const e = leadExtremes(tm, leadById('aVR'));
  ok('déflexion dominante négative', Math.abs(e.min) > e.max, `max +${e.max.toFixed(2)}, min ${e.min.toFixed(2)} mV`);
}

// 8 ── Silence électrique pendant le délai nodal et le segment ST
console.log('\n8. Segments isoélectriques');
{
  const tm = normalTiming(72);
  const m = beatMarks(tm);
  let worstPR = 0, worstST = 0;
  for (let i = 1; i < 60; i++) {
    const tPR = m.pEnd + (i/60)*(m.qrsStart - m.pEnd);
    worstPR = Math.max(worstPR, Math.abs(V(cardiacVector(tPR, tm), 'II')));
    const tST = m.qrsEnd + (i/60)*(m.tStart - m.qrsEnd);
    worstST = Math.max(worstST, Math.abs(V(cardiacVector(tST, tm), 'II')));
  }
  ok('segment PR plat (délai du nœud AV)', worstPR < 1e-12, `${worstPR.toExponential(1)} mV`);
  ok('segment ST plat (pas de lésion)', worstST < 1e-12, `${worstST.toExponential(1)} mV`);
}

// 9 ── Le bloc de branche doit élargir le QRS sans qu'on le dessine
console.log('\n9. Bloc de branche : élargissement émergent');
{
  const base = normalTiming(72);
  const bbb = { ...base, bundleDelay: 0.055, qrsDur: 0.15 };
  const width = (tm) => {
    const m = beatMarks(tm);
    let a = null, b = null;
    const N = 4000;
    for (let i = 0; i <= N; i++) {
      const t = (i/N)*tm.rr;
      if (t < m.qrsStart - 0.01 || t > m.qrsEnd + 0.01) continue;
      if (Math.abs(V(cardiacVector(t, tm), 'II')) > 0.1) { if (a === null) a = t; b = t; }
    }
    return (b - a) * 1000;
  };
  const w0 = width(base), w1 = width(bbb);
  ok('QRS normal sous 120 ms', w0 < 120, `${w0.toFixed(0)} ms`);
  ok('QRS bloqué au-delà de 120 ms', w1 > 120, `${w1.toFixed(0)} ms`);
}

// 10 ── Lésion : sus-décalage effectif du segment ST
console.log('\n10. Lésion sous-épicardique');
{
  const tm = { ...normalTiming(78), stShift: 0.25, tAmp: 0.5 };
  const m = beatMarks(tm);
  const st = V(cardiacVector((m.qrsEnd + m.tStart)/2, tm), 'II');
  ok('ST sus-décalé en II', st > 0.15, `ST = ${st.toFixed(2)} mV`);
}

// 11 ── Fibrillation : plus aucune onde P
console.log('\n11. Fibrillation auriculaire');
{
  const tm = { ...normalTiming(96), pPresent: false };
  const m = beatMarks(tm);
  let worst = 0;
  for (let i = 0; i < 200; i++) worst = Math.max(worst, Math.abs(V(cardiacVector((i/200)*m.qrsStart, tm), 'II')));
  ok('aucune activité avant le QRS', worst < 1e-12, `${worst.toExponential(1)} mV`);
}

console.log('\n' + (fails === 0 ? 'TOUS LES CONTROLES PASSENT' : fails + ' CONTROLE(S) EN ECHEC'));
process.exit(fails ? 1 : 0);
