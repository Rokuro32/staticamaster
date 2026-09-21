'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Formalisme TG-43 de l'AAPM (rapport TG-43U1, 2004) pour la curiethérapie.
//
//   Ḋ(r, θ) = S_K · Λ · [G_L(r,θ) / G_L(r₀,θ₀)] · g_L(r) · F(r,θ)
//
// Le formalisme lui-même est exact et sans ambiguïté : c'est lui qu'illustre
// cette simulation. Les jeux de données, eux, sont des valeurs de consensus
// arrondies, et l'anisotropie est une approximation lisse — voir l'avertissement
// affiché. Rien ici n'est utilisable pour une planification clinique.
// ---------------------------------------------------------------------------

interface SourceModel {
  id: string;
  label: string;
  isotope: string;
  halfLifeDays: number;
  /** Constante de débit de dose Λ, en cGy·h⁻¹·U⁻¹ */
  lambda: number;
  /** Longueur active L, en cm */
  activeLength: number;
  energy: string;
  /** Anisotropie : amplitude de la chute vers l'axe de la source */
  anisoDepth: number;
  /** Fonction de dose radiale g_L(r) : [r en cm, g_L] */
  gL: [number, number][];
  note: string;
}

const SOURCES: SourceModel[] = [
  {
    id: 'ir192',
    label: 'Ir-192 HDR',
    isotope: '¹⁹²Ir',
    halfLifeDays: 73.8,
    lambda: 1.109,
    activeLength: 0.35,
    energy: '≈ 380 keV (moyen)',
    anisoDepth: 0.33,
    gL: [
      [0.25, 0.990], [0.5, 0.993], [1, 1.000], [1.5, 1.005], [2, 1.007],
      [3, 1.006], [4, 1.001], [5, 0.994], [6, 0.983], [7, 0.969],
      [8, 0.952], [9, 0.930], [10, 0.905], [12, 0.849], [14, 0.781],
    ],
    note: 'Haut débit, source unique qui se déplace de position en position. g_L reste proche de 1 : à ces énergies, l’atténuation compense presque la diffusion.',
  },
  {
    id: 'i125',
    label: 'I-125',
    isotope: '¹²⁵I',
    halfLifeDays: 59.4,
    lambda: 0.965,
    activeLength: 0.30,
    energy: '≈ 28 keV',
    anisoDepth: 0.45,
    gL: [
      [0.25, 1.082], [0.5, 1.071], [0.75, 1.042], [1, 1.000], [1.5, 0.908],
      [2, 0.814], [3, 0.632], [4, 0.496], [5, 0.364], [6, 0.270],
      [7, 0.199], [8, 0.148], [9, 0.109], [10, 0.080],
    ],
    note: 'Implant permanent, typiquement la prostate. À basse énergie, g_L chute vite : la dose est très localisée, ce qui est à la fois la force et la fragilité de la technique.',
  },
  {
    id: 'pd103',
    label: 'Pd-103',
    isotope: '¹⁰³Pd',
    halfLifeDays: 17.0,
    lambda: 0.686,
    activeLength: 0.42,
    energy: '≈ 21 keV',
    anisoDepth: 0.48,
    gL: [
      [0.25, 1.243], [0.5, 1.284], [0.75, 1.145], [1, 1.000], [1.5, 0.749],
      [2, 0.566], [3, 0.327], [4, 0.189], [5, 0.111], [6, 0.066],
      [7, 0.039], [8, 0.023], [9, 0.014], [10, 0.008],
    ],
    note: 'Encore plus bas en énergie et deux fois plus court en demi-vie que l’I-125. La dose tombe encore plus vite — utile quand l’organe à risque est tout près.',
  },
];

type Geometry = 'unique' | 'catheter' | 'plan';

interface DwellPosition {
  /** Position le long de l'axe z du cathéter, en cm */
  z: number;
  /** Décalage latéral, en cm (implant plan) */
  x: number;
  /** Poids relatif du temps d'arrêt */
  weight: number;
}

/** Interpolation linéaire de g_L, extrapolée à plat au-delà de la table */
function radialDose(source: SourceModel, r: number): number {
  const t = source.gL;
  if (r <= t[0][0]) return t[0][1];
  if (r >= t[t.length - 1][0]) {
    // au-delà de la table, on prolonge la décroissance exponentielle observée
    const [r1, g1] = t[t.length - 2];
    const [r2, g2] = t[t.length - 1];
    const k = Math.log(g2 / g1) / (r2 - r1);
    return Math.max(0, g2 * Math.exp(k * (r - r2)));
  }
  for (let i = 0; i < t.length - 1; i++) {
    if (r >= t[i][0] && r <= t[i + 1][0]) {
      const f = (r - t[i][0]) / (t[i + 1][0] - t[i][0]);
      return t[i][1] + f * (t[i + 1][1] - t[i][1]);
    }
  }
  return 1;
}

/**
 * Fonction géométrique, approximation de source linéaire (TG-43U1 éq. 4).
 * θ est mesuré depuis l'axe long de la source.
 */
function geometryLine(r: number, thetaRad: number, L: number): number {
  if (r < 1e-6) return 0;
  const sinT = Math.abs(Math.sin(thetaRad));
  if (sinT < 1e-4) {
    // sur l'axe : la formule en β/(L r sinθ) dégénère
    const d = r * r - (L * L) / 4;
    return d > 1e-6 ? 1 / d : 1 / 1e-6;
  }
  // β : angle sous lequel le point voit la longueur active
  const z = r * Math.cos(thetaRad);
  const y = r * sinT;
  const beta = Math.atan2(L / 2 - z, y) + Math.atan2(L / 2 + z, y);
  return beta / (L * y);
}

function geometryPoint(r: number): number {
  return r > 1e-6 ? 1 / (r * r) : 1e12;
}

/**
 * Anisotropie F(r, θ). Approximation lisse valant 1 sur l'axe transverse et
 * décroissant vers les extrémités de la source — PAS la table du fabricant.
 */
function anisotropy(thetaRad: number, r: number, depth: number): number {
  const s = Math.abs(Math.sin(thetaRad));
  // la chute est plus marquée près de la source
  const amp = depth * (1 + 0.6 / (1 + r));
  return Math.max(0.15, 1 - amp * (1 - Math.pow(s, 1.7)));
}

export function BrachyTG43Simulator() {
  const [sourceId, setSourceId] = useState('ir192');
  const [geometry, setGeometry] = useState<Geometry>('unique');
  const [sk, setSk] = useState(40000);        // U = cGy·cm²·h⁻¹
  const [useLineSource, setUseLineSource] = useState(true);
  const [useAnisotropy, setUseAnisotropy] = useState(true);

  const [nDwells, setNDwells] = useState(5);
  const [spacing, setSpacing] = useState(0.5); // cm
  const [nRows, setNRows] = useState(3);
  const [rowSpacing, setRowSpacing] = useState(1.0);

  const [dwellTime, setDwellTime] = useState(60); // s, par position
  const [px, setPx] = useState(1.0);
  const [pz, setPz] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileRef = useRef<HTMLCanvasElement>(null);

  const source = SOURCES.find((s) => s.id === sourceId)!;
  const L = source.activeLength;

  // positions des sources selon la géométrie choisie
  const dwells = useMemo<DwellPosition[]>(() => {
    if (geometry === 'unique') return [{ z: 0, x: 0, weight: 1 }];
    if (geometry === 'catheter') {
      const span = (nDwells - 1) * spacing;
      return Array.from({ length: nDwells }, (_, i) => ({
        z: -span / 2 + i * spacing, x: 0, weight: 1,
      }));
    }
    const span = (nDwells - 1) * spacing;
    const rowSpan = (nRows - 1) * rowSpacing;
    const list: DwellPosition[] = [];
    for (let row = 0; row < nRows; row++) {
      for (let i = 0; i < nDwells; i++) {
        list.push({
          z: -span / 2 + i * spacing,
          x: -rowSpan / 2 + row * rowSpacing,
          weight: 1,
        });
      }
    }
    return list;
  }, [geometry, nDwells, spacing, nRows, rowSpacing]);

  /** Débit de dose en un point du plan (x, z), en cGy/h */
  const doseRate = useCallback((x: number, z: number): number => {
    const gRef = useLineSource
      ? geometryLine(1, Math.PI / 2, L)
      : geometryPoint(1);

    let total = 0;
    for (const d of dwells) {
      const dx = x - d.x;
      const dz = z - d.z;
      const r = Math.hypot(dx, dz);
      if (r < 0.05) return NaN;               // trop près : le formalisme ne vaut plus
      const theta = Math.atan2(Math.abs(dx), dz); // θ depuis l'axe long (z)
      const G = useLineSource ? geometryLine(r, theta, L) : geometryPoint(r);
      const F = useAnisotropy && useLineSource
        ? anisotropy(theta, r, source.anisoDepth)
        : 1;
      total += d.weight * sk * source.lambda * (G / gRef) * radialDose(source, r) * F;
    }
    return total;
  }, [dwells, sk, source, L, useLineSource, useAnisotropy]);

  // --- valeurs au point de calcul, facteur par facteur
  const detail = useMemo(() => {
    const r = Math.hypot(px, pz);
    const theta = Math.atan2(Math.abs(px), pz);
    const gRef = useLineSource ? geometryLine(1, Math.PI / 2, L) : geometryPoint(1);
    const G = useLineSource ? geometryLine(r, theta, L) : geometryPoint(r);
    const F = useAnisotropy && useLineSource ? anisotropy(theta, r, source.anisoDepth) : 1;
    return {
      r, thetaDeg: (theta * 180) / Math.PI,
      G, gRef, ratio: G / gRef,
      g: radialDose(source, r),
      F,
      rate: doseRate(px, pz),
    };
  }, [px, pz, L, useLineSource, useAnisotropy, source, doseRate]);

  const totalTimeHours = (dwellTime * dwells.length) / 3600;
  const totalDose = detail.rate * totalTimeHours;

  // ------------------------------------------------------------ carte de dose
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const half = geometry === 'plan' ? 5 : 4;   // demi-champ affiché, en cm
    const scale = Math.min(W, H) / (2 * half);
    const toPx = (x: number) => W / 2 + x * scale;
    const toPz = (z: number) => H / 2 - z * scale;

    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    // dose de référence : le débit à 1 cm sur l'axe transverse d'une source
    const ref = sk * source.lambda;

    // fond coloré en échelle logarithmique
    const cell = 4;
    for (let sx = 0; sx < W; sx += cell) {
      for (let sy = 0; sy < H; sy += cell) {
        const x = (sx + cell / 2 - W / 2) / scale;
        const z = (H / 2 - sy - cell / 2) / scale;
        const d = doseRate(x, z);
        if (!Number.isFinite(d) || d <= 0) continue;
        const rel = d / ref;
        const t = Math.max(0, Math.min(1, (Math.log10(rel) + 2.2) / 3));
        if (t <= 0.02) continue;
        const rr = Math.round(250 - t * 160);
        const gg = Math.round(246 - t * 180);
        const bb = Math.round(238 - t * 200);
        ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
        ctx.fillRect(sx, sy, cell, cell);
      }
    }

    // isodoses, en pourcentage de la dose au point de calcul
    const levels = [200, 150, 100, 75, 50, 25];
    const colors = ['#84422e', '#a8663f', '#c96445', '#c1964e', '#8b9d43', '#668da9'];
    const target = detail.rate;
    if (Number.isFinite(target) && target > 0) {
      levels.forEach((lvl, li) => {
        const want = (target * lvl) / 100;
        ctx.strokeStyle = colors[li];
        ctx.lineWidth = lvl === 100 ? 2.4 : 1.4;
        ctx.beginPath();
        // marching squares grossier : on marque les changements de signe
        const step = 3;
        for (let sx = 0; sx < W - step; sx += step) {
          for (let sy = 0; sy < H - step; sy += step) {
            const x0 = (sx - W / 2) / scale;
            const z0 = (H / 2 - sy) / scale;
            const x1 = (sx + step - W / 2) / scale;
            const z1 = (H / 2 - sy - step) / scale;
            const a = doseRate(x0, z0) - want;
            const b = doseRate(x1, z0) - want;
            const c = doseRate(x0, z1) - want;
            if (!Number.isFinite(a)) continue;
            if (Number.isFinite(b) && a * b < 0) {
              ctx.moveTo(sx + step / 2, sy);
              ctx.lineTo(sx + step / 2, sy + step);
            }
            if (Number.isFinite(c) && a * c < 0) {
              ctx.moveTo(sx, sy + step / 2);
              ctx.lineTo(sx + step, sy + step / 2);
            }
          }
        }
        ctx.stroke();
      });
    }

    // les sources
    dwells.forEach((d) => {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(
        toPx(d.x) - 2.5, toPz(d.z) - (L * scale) / 2,
        5, Math.max(L * scale, 4), 2
      );
      ctx.fill();
    });

    // point de calcul
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(toPx(px), toPz(pz), 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toPx(px) - 11, toPz(pz));
    ctx.lineTo(toPx(px) + 11, toPz(pz));
    ctx.moveTo(toPx(px), toPz(pz) - 11);
    ctx.lineTo(toPx(px), toPz(pz) + 11);
    ctx.stroke();

    // repère : cercle à 1 cm
    ctx.strokeStyle = 'rgba(120,113,108,.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(toPx(0), toPz(0), scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#78716c';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('axe long de la source : vertical', 10, 18);
    ctx.textAlign = 'right';
    ctx.fillText(`champ ${2 * half} × ${2 * half} cm`, W - 10, 18);
    ctx.textAlign = 'left';
    ctx.fillText('isodoses en % de la dose au point de calcul', 10, H - 10);
  }, [doseRate, dwells, px, pz, L, sk, source, geometry, detail.rate]);

  // ------------------------------------------------- profil sur l'axe transverse
  useEffect(() => {
    const canvas = profileRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 46, r: 12, t: 14, b: 28 };
    const rMax = 8;
    const ref = doseRate(1, 0);
    const toX = (r: number) => pad.l + (r / rMax) * (W - pad.l - pad.r);
    // échelle log sur trois décades
    const toY = (rel: number) => {
      const t = Math.max(0, Math.min(1, (Math.log10(Math.max(rel, 1e-4)) + 3) / 3.3));
      return H - pad.b - t * (H - pad.t - pad.b);
    };

    ctx.strokeStyle = '#eae9e8';
    ctx.lineWidth = 1;
    for (const dec of [1, 0.1, 0.01, 0.001]) {
      const y = toY(dec);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#a8a29e';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(dec >= 1 ? '1' : dec.toString(), pad.l - 4, y + 3);
    }

    ctx.strokeStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();

    // profil complet
    ctx.strokeStyle = '#c96445';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let r = 0.1; r <= rMax; r += 0.02) {
      const d = doseRate(r, 0) / ref;
      if (!Number.isFinite(d) || d <= 0) continue;
      const X = toX(r); const Y = toY(d);
      if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // comparaison : loi en 1/r² seule
    ctx.strokeStyle = 'rgba(120,113,108,.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let r = 0.1; r <= rMax; r += 0.05) {
      const d = 1 / (r * r);
      const X = toX(r); const Y = toY(d);
      if (r <= 0.11) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // point de calcul
    const rP = Math.hypot(px, pz);
    if (rP <= rMax) {
      ctx.strokeStyle = '#1c1917';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toX(rP), pad.t); ctx.lineTo(toX(rP), H - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#78716c';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('r (cm), axe transverse', (pad.l + W - pad.r) / 2, H - 8);
    ctx.textAlign = 'left';
    ctx.fillText('dose relative à r = 1 cm', pad.l + 4, pad.t + 8);
    ctx.fillStyle = '#a8a29e';
    ctx.fillText('— — 1/r² seul', pad.l + 4, pad.t + 20);
  }, [doseRate, px, pz]);

  const onMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const half = geometry === 'plan' ? 5 : 4;
    const scale = Math.min(canvas.width, canvas.height) / (2 * half);
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    setPx(Number(((mx - canvas.width / 2) / scale).toFixed(2)));
    setPz(Number(((canvas.height / 2 - my) / scale).toFixed(2)));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Curiethérapie — formalisme TG-43
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Le calcul de dose autour d&apos;une source scellée, facteur par
          facteur. Cliquez dans la carte pour déplacer le point de calcul.
        </p>
      </div>

      <div className="text-sm text-brun-900 bg-brun-50 border-l-4 border-brun-500 rounded-r-lg px-4 py-3">
        <strong>Outil pédagogique.</strong> Le formalisme est celui du rapport
        TG-43U1 de l&apos;AAPM et il est implémenté tel quel. Les jeux de
        données (Λ, g_L) sont des valeurs de consensus arrondies, et
        l&apos;anisotropie est une approximation lisse, pas la table du
        fabricant. Aucun usage clinique.
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">Source</span>
            <div className="grid grid-cols-3 gap-1.5">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSourceId(s.id)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sourceId === s.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>{s.label}</button>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-1.5">{source.note}</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">Géométrie</span>
            <div className="grid grid-cols-1 gap-1.5">
              {([['unique', 'Source unique'], ['catheter', 'Cathéter (positions alignées)'],
                 ['plan', 'Implant plan']] as [Geometry, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setGeometry(id)}
                  className={`py-1.5 px-3 rounded-lg text-sm font-medium text-left transition-colors ${
                    geometry === id ? 'bg-ocre-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {geometry !== 'unique' && (
            <>
              <div>
                <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                  <span>Positions par cathéter</span>
                  <span className="font-mono text-stone-900">{nDwells}</span>
                </label>
                <input type="range" min={2} max={12} step={1} value={nDwells}
                  onChange={(e) => setNDwells(Number(e.target.value))}
                  className="w-full accent-ocre-600" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                  <span>Pas entre positions</span>
                  <span className="font-mono text-stone-900">{spacing.toFixed(2)} cm</span>
                </label>
                <input type="range" min={0.25} max={1.5} step={0.05} value={spacing}
                  onChange={(e) => setSpacing(Number(e.target.value))}
                  className="w-full accent-ocre-600" />
              </div>
            </>
          )}

          {geometry === 'plan' && (
            <>
              <div>
                <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                  <span>Nombre de cathéters</span>
                  <span className="font-mono text-stone-900">{nRows}</span>
                </label>
                <input type="range" min={2} max={6} step={1} value={nRows}
                  onChange={(e) => setNRows(Number(e.target.value))}
                  className="w-full accent-ocre-600" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                  <span>Écart entre cathéters</span>
                  <span className="font-mono text-stone-900">{rowSpacing.toFixed(1)} cm</span>
                </label>
                <input type="range" min={0.5} max={2} step={0.1} value={rowSpacing}
                  onChange={(e) => setRowSpacing(Number(e.target.value))}
                  className="w-full accent-ocre-600" />
              </div>
            </>
          )}

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Intensité S_K</span>
              <span className="font-mono text-stone-900">{(sk / 1000).toFixed(0)} kU</span>
            </label>
            <input type="range" min={2000} max={60000} step={500} value={sk}
              onChange={(e) => setSk(Number(e.target.value))}
              className="w-full accent-gold-600" />
            <p className="text-xs text-stone-500 mt-1">
              U = cGy·cm²·h⁻¹. Une source HDR d&apos;Ir-192 neuve fait environ
              40 kU.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Temps par position</span>
              <span className="font-mono text-stone-900">{dwellTime} s</span>
            </label>
            <input type="range" min={5} max={300} step={5} value={dwellTime}
              onChange={(e) => setDwellTime(Number(e.target.value))}
              className="w-full accent-gold-600" />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useLineSource}
                onChange={(e) => setUseLineSource(e.target.checked)}
                className="w-4 h-4 accent-ocre-600" />
              <span className="text-sm text-stone-700">Source linéaire (sinon ponctuelle)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useAnisotropy} disabled={!useLineSource}
                onChange={(e) => setUseAnisotropy(e.target.checked)}
                className="w-4 h-4 accent-ocre-600 disabled:opacity-40" />
              <span className={`text-sm ${useLineSource ? 'text-stone-700' : 'text-stone-400'}`}>
                Anisotropie F(r, θ)
              </span>
            </label>
          </div>
        </div>

        {/* Carte et résultats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
              <canvas ref={canvasRef} width={420} height={420}
                onClick={onMapClick} className="w-full cursor-crosshair" />
            </div>
            <div className="space-y-3">
              <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
                <canvas ref={profileRef} width={420} height={200} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="flex justify-between text-xs text-stone-600 mb-1">
                    <span>x du point</span>
                    <span className="font-mono">{px.toFixed(2)} cm</span>
                  </label>
                  <input type="range" min={-4} max={4} step={0.05} value={px}
                    onChange={(e) => setPx(Number(e.target.value))}
                    className="w-full accent-stone-700" />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-stone-600 mb-1">
                    <span>z du point</span>
                    <span className="font-mono">{pz.toFixed(2)} cm</span>
                  </label>
                  <input type="range" min={-4} max={4} step={0.05} value={pz}
                    onChange={(e) => setPz(Number(e.target.value))}
                    className="w-full accent-stone-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Décomposition du calcul */}
          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700">
              Le calcul au point P, facteur par facteur
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['r', `${detail.r.toFixed(2)} cm`, 'distance au centre de la source'],
                  ['θ', `${detail.thetaDeg.toFixed(1)}°`, "depuis l'axe long de la source"],
                  ['S_K', `${sk.toLocaleString('fr-CA')} U`, 'intensité de référence en kerma dans l’air'],
                  ['Λ', `${source.lambda} cGy·h⁻¹·U⁻¹`, 'constante de débit de dose'],
                  ['G(r,θ) / G(r₀,θ₀)', detail.ratio.toFixed(4), useLineSource ? 'source linéaire' : 'source ponctuelle, 1/r²'],
                  ['g_L(r)', detail.g.toFixed(4), 'atténuation et diffusion dans l’eau'],
                  ['F(r,θ)', detail.F.toFixed(4), useAnisotropy && useLineSource ? 'anisotropie (approximation)' : 'désactivée'],
                ].map(([k, v, note], i) => (
                  <tr key={k} className={i % 2 ? 'bg-stone-50/60' : ''}>
                    <td className="px-4 py-1.5 font-mono text-stone-700 whitespace-nowrap">{k}</td>
                    <td className="px-4 py-1.5 font-mono text-stone-900 text-right whitespace-nowrap">{v}</td>
                    <td className="px-4 py-1.5 text-xs text-stone-500">{note}</td>
                  </tr>
                ))}
                <tr className="bg-ocre-50 border-t-2 border-ocre-300">
                  <td className="px-4 py-2 font-semibold text-ocre-900">Débit de dose</td>
                  <td className="px-4 py-2 font-mono font-semibold text-ocre-900 text-right whitespace-nowrap">
                    {Number.isFinite(detail.rate) ? `${detail.rate.toFixed(1)} cGy/h` : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-ocre-700">
                    {dwells.length > 1 ? `somme de ${dwells.length} positions` : 'source unique'}
                  </td>
                </tr>
                <tr className="bg-ocre-50">
                  <td className="px-4 py-2 font-semibold text-ocre-900">Dose totale</td>
                  <td className="px-4 py-2 font-mono font-semibold text-ocre-900 text-right whitespace-nowrap">
                    {Number.isFinite(totalDose) ? `${totalDose.toFixed(1)} cGy` : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-ocre-700">
                    {dwells.length} × {dwellTime} s = {(totalTimeHours * 60).toFixed(1)} min
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">Théorie — TG-43</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">Le formalisme 2D</h4>
            <BlockMath math="\dot{D}(r,\theta) = S_K \Lambda \frac{G_L(r,\theta)}{G_L(r_0,\theta_0)} g_L(r) F(r,\theta)" />
            <p className="text-ocre-700 mt-2">
              Avec <InlineMath math="r_0 = 1" /> cm et{' '}
              <InlineMath math="\theta_0 = 90°" />. Chaque facteur isole un effet
              physique distinct, ce qui rend le calcul vérifiable terme à terme.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Fonction géométrique</h4>
            <BlockMath math="G_L(r,\theta) = \frac{\beta}{L\,r\sin\theta} \quad (\theta \neq 0)" />
            <p className="text-gold-700 mt-2">
              Purement géométrique : elle ne décrit que la répartition de
              l&apos;activité sur la longueur L. Loin de la source elle tend vers
              1/r², tout près elle s&apos;en écarte nettement — comparez avec la
              case « source ponctuelle ».
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Fonction radiale g_L(r)</h4>
            <p className="text-brun-700">
              Ce que l&apos;eau fait au faisceau, une fois la géométrie retirée :
              atténuation d&apos;un côté, diffusion de l&apos;autre. À 380 keV
              (Ir-192) les deux se compensent presque et g_L reste proche de 1.
              À 28 keV (I-125) l&apos;atténuation gagne largement.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Anisotropie F(r,θ)</h4>
            <p className="text-ardoise-700">
              La source n&apos;est pas nue : son encapsulation et sa propre
              longueur absorbent davantage vers les extrémités. D&apos;où une
              dose plus faible sur l&apos;axe long que sur l&apos;axe transverse,
              à distance égale.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Superposition</h4>
            <p className="text-olive-700">
              TG-43 ignore l&apos;atténuation entre sources et suppose un
              fantôme d&apos;eau infini : les contributions s&apos;additionnent
              simplement. C&apos;est ce qui rend le calcul rapide — et c&apos;est
              aussi sa principale limite, que les algorithmes basés modèle
              corrigent.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Le gradient</h4>
            <p className="text-prune-700">
              Près d&apos;une source, la dose varie comme 1/r² : un millimètre
              d&apos;erreur de positionnement à 5 mm change la dose de près de
              50 %. C&apos;est toute la difficulté de la curiethérapie, et la
              raison pour laquelle la robustesse du positionnement compte autant.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Référence : Rivard M. J. et al., « Update of AAPM Task Group No. 43
          Report », <em>Medical Physics</em> 31(3), 2004.
        </p>
      </div>
    </div>
  );
}

export default BrachyTG43Simulator;
