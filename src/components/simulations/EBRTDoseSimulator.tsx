'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Radiothérapie externe : dose dans un fantôme d'eau, géométrie simple.
//
// Le rendement en profondeur est modélisé par
//   PDD(d) ∝ [1 − e^{−d/τ}] · e^{−µ(d−d_max)} · ((SSD+d_max)/(SSD+d))²
// c'est-à-dire montée de build-up, atténuation exponentielle, et loi inverse
// du carré. µ est calibré pour que le PDD à 10 cm retombe sur la valeur typique
// de l'énergie choisie.
//
// C'est un modèle paramétrique calé sur des valeurs typiques, pas un jeu de
// données mesuré : un faisceau réel se caractérise machine par machine.
// ---------------------------------------------------------------------------

interface BeamQuality {
  id: string;
  label: string;
  dmax: number;     // cm
  pdd10: number;    // % à 10 cm, champ 10×10, DSP 100
  penumbra: number; // largeur 80-20 en surface, cm
  note: string;
}

const QUALITIES: BeamQuality[] = [
  { id: 'co60', label: 'Co-60', dmax: 0.5, pdd10: 55.6, penumbra: 1.1,
    note: 'Photons de 1,25 MeV. Build-up très court, donc peu d’épargne cutanée, et une pénombre large à cause de la taille de la source.' },
  { id: '6mv', label: '6 MV', dmax: 1.5, pdd10: 66.5, penumbra: 0.6,
    note: 'Le cheval de bataille clinique. Bon compromis entre épargne cutanée et pénétration.' },
  { id: '10mv', label: '10 MV', dmax: 2.3, pdd10: 73.0, penumbra: 0.65,
    note: 'Plus pénétrant : utile pour les cibles profondes, au prix d’un build-up plus long.' },
  { id: '18mv', label: '18 MV', dmax: 3.2, pdd10: 79.0, penumbra: 0.75,
    note: 'Très pénétrant, mais au-delà de 10 MV la production de neutrons devient un enjeu de radioprotection.' },
];

type Arrangement = 'simple' | 'opposes' | 'boite';

const PHANTOM = 30;      // côté du fantôme, cm
const SSD_REF = 100;     // DSP de référence de l'étalonnage, cm

/** Fonction d'erreur, approximation d'Abramowitz-Stegun 7.1.26 */
function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export function EBRTDoseSimulator() {
  const [qualityId, setQualityId] = useState('6mv');
  const [fieldSize, setFieldSize] = useState(10);   // cm
  const [ssd, setSsd] = useState(100);              // cm
  const [arrangement, setArrangement] = useState<Arrangement>('simple');
  const [prescription, setPrescription] = useState(200); // cGy au point de calcul
  const [depth, setDepth] = useState(10);           // cm, profondeur du point
  const [lateral, setLateral] = useState(0);        // cm, décalage latéral

  const [showIsodoses, setShowIsodoses] = useState(true);

  const mapRef = useRef<HTMLCanvasElement>(null);
  const pddRef = useRef<HTMLCanvasElement>(null);
  const profRef = useRef<HTMLCanvasElement>(null);

  const q = QUALITIES.find((x) => x.id === qualityId)!;

  // ------------------------------------------------------- modèle du faisceau
  /** Coefficient d'atténuation calibré sur le PDD à 10 cm de cette énergie */
  const mu = useMemo(() => {
    const tau = q.dmax / 2.2;
    const B = (d: number) => 1 - Math.exp(-d / tau);
    const isf = (d: number) => Math.pow((SSD_REF + q.dmax) / (SSD_REF + d), 2);
    const target = q.pdd10 / 100;
    const ratio = (B(10) * isf(10)) / (B(q.dmax) * isf(q.dmax));
    return Math.log(ratio / target) / (10 - q.dmax);
  }, [q]);

  /** Rendement en profondeur, en %, pour la taille de champ et la DSP courantes */
  const pdd = useCallback((d: number): number => {
    if (d < 0) return 0;
    const tau = q.dmax / 2.2;
    const B = (x: number) => 1 - Math.exp(-x / tau);
    // Plus le champ est grand, plus la diffusion remonte le PDD en profondeur
    const muEff = mu * (1 - 0.055 * Math.log(fieldSize / 10));
    const isfRef = (x: number) => Math.pow((SSD_REF + q.dmax) / (SSD_REF + x), 2);
    const base = 100 * (B(d) * Math.exp(-muEff * (d - q.dmax)) * isfRef(d)) /
                 (B(q.dmax) * isfRef(q.dmax));
    if (ssd === SSD_REF) return base;
    // Facteur de Mayneord : correction de PDD pour une autre DSP
    const F = Math.pow((ssd + q.dmax) / (SSD_REF + q.dmax), 2) *
              Math.pow((SSD_REF + d) / (ssd + d), 2);
    return base * F;
  }, [q, mu, fieldSize, ssd]);

  /** Facteur de diffusion total S_c,p, normalisé à 1 pour un champ 10 × 10 */
  const scatterFactor = useMemo(
    () => 1 + 0.072 * Math.log(fieldSize / 10),
    [fieldSize]
  );

  /** Profil latéral à la profondeur d : plateau + pénombre en erf */
  const profile = useCallback((x: number, d: number): number => {
    const halfWidth = (fieldSize / 2) * ((ssd + d) / ssd);   // divergence
    // la pénombre s'élargit avec la profondeur
    const sigma = (q.penumbra / 2.56) * (1 + d / 28);
    const k = 1 / (sigma * Math.SQRT2);
    return 0.5 * (erf((halfWidth + x) * k) + erf((halfWidth - x) * k));
  }, [fieldSize, ssd, q]);

  /** Faisceaux actifs : angle en degrés, 0 = entrée par le haut */
  const beams = useMemo(() => {
    if (arrangement === 'simple') return [0];
    if (arrangement === 'opposes') return [0, 180];
    return [0, 90, 180, 270];
  }, [arrangement]);

  /**
   * Dose par UM en un point du fantôme, en cGy/UM.
   * Repère : x latéral, y profondeur depuis la face d'entrée du faisceau à 0°.
   */
  const dosePerMU = useCallback((x: number, y: number): number => {
    let total = 0;
    for (const ang of beams) {
      let d: number;   // profondeur le long de l'axe du faisceau
      let off: number; // décalage latéral dans le repère du faisceau
      switch (ang) {
        case 0:   d = y;              off = x;              break;
        case 180: d = PHANTOM - y;    off = -x;             break;
        case 90:  d = PHANTOM / 2 + x; off = y - PHANTOM / 2; break;
        default:  d = PHANTOM / 2 - x; off = y - PHANTOM / 2; break;
      }
      if (d < 0 || d > PHANTOM) continue;
      total += (pdd(d) / 100) * profile(off, d) * scatterFactor;
    }
    return total;
  }, [beams, pdd, profile, scatterFactor]);

  // point de calcul : profondeur depuis la face d'entrée du premier faisceau
  const pointDose = dosePerMU(lateral, depth);
  const mu_needed = pointDose > 1e-6 ? prescription / pointDose : NaN;

  // dose maximale dans le fantôme, pour situer la prescription
  const maxDose = useMemo(() => {
    let m = 0;
    for (let y = 0; y <= PHANTOM; y += 0.5) {
      for (let x = -PHANTOM / 2; x <= PHANTOM / 2; x += 0.5) {
        m = Math.max(m, dosePerMU(x, y));
      }
    }
    return m;
  }, [dosePerMU]);

  // ---------------------------------------------------------- carte de dose
  useEffect(() => {
    const canvas = mapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = 26;
    const scale = Math.min(W - 2 * pad, H - 2 * pad) / PHANTOM;
    const toX = (x: number) => W / 2 + x * scale;
    const toY = (y: number) => pad + y * scale;

    ctx.fillStyle = '#f3f1ec';
    ctx.fillRect(0, 0, W, H);

    // fantôme
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(toX(-PHANTOM / 2), toY(0), PHANTOM * scale, PHANTOM * scale);

    const norm = pointDose > 1e-6 ? pointDose : maxDose;
    const cell = 3;
    for (let sx = toX(-PHANTOM / 2); sx < toX(PHANTOM / 2); sx += cell) {
      for (let sy = toY(0); sy < toY(PHANTOM); sy += cell) {
        const x = (sx + cell / 2 - W / 2) / scale;
        const y = (sy + cell / 2 - pad) / scale;
        const rel = dosePerMU(x, y) / norm;
        if (rel < 0.03) continue;
        const t = Math.min(1, rel / 1.15);
        ctx.fillStyle = `rgb(${Math.round(250 - t * 160)}, ${Math.round(246 - t * 175)}, ${Math.round(238 - t * 200)})`;
        ctx.fillRect(sx, sy, cell, cell);
      }
    }

    // isodoses en % de la dose prescrite au point
    if (showIsodoses && norm > 1e-6) {
      const levels = [110, 100, 95, 80, 50, 20];
      const colors = ['#84422e', '#c96445', '#c1964e', '#8b9d43', '#668da9', '#a8a29e'];
      levels.forEach((lvl, li) => {
        ctx.strokeStyle = colors[li];
        ctx.lineWidth = lvl === 100 ? 2.2 : 1.3;
        ctx.beginPath();
        const step = 3;
        for (let sx = toX(-PHANTOM / 2); sx < toX(PHANTOM / 2) - step; sx += step) {
          for (let sy = toY(0); sy < toY(PHANTOM) - step; sy += step) {
            const x0 = (sx - W / 2) / scale, y0 = (sy - pad) / scale;
            const x1 = (sx + step - W / 2) / scale, y1 = (sy + step - pad) / scale;
            const want = (lvl / 100) * norm;
            const a = dosePerMU(x0, y0) - want;
            if (a * (dosePerMU(x1, y0) - want) < 0) {
              ctx.moveTo(sx + step / 2, sy); ctx.lineTo(sx + step / 2, sy + step);
            }
            if (a * (dosePerMU(x0, y1) - want) < 0) {
              ctx.moveTo(sx, sy + step / 2); ctx.lineTo(sx + step, sy + step / 2);
            }
          }
        }
        ctx.stroke();
      });
    }

    // contour du fantôme
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toX(-PHANTOM / 2), toY(0), PHANTOM * scale, PHANTOM * scale);

    // faisceaux : flèche d'entrée et bords du champ
    beams.forEach((ang) => {
      ctx.save();
      ctx.translate(W / 2, pad + (PHANTOM * scale) / 2);
      ctx.rotate((ang * Math.PI) / 180);
      const halfPh = (PHANTOM * scale) / 2;
      const hw = (fieldSize / 2) * scale;
      ctx.strokeStyle = 'rgba(193,150,78,.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      const hwOut = hw * ((ssd + PHANTOM) / ssd);
      ctx.beginPath();
      ctx.moveTo(-hw, -halfPh - 22); ctx.lineTo(-hwOut, halfPh);
      ctx.moveTo(hw, -halfPh - 22); ctx.lineTo(hwOut, halfPh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c1964e';
      ctx.beginPath();
      ctx.moveTo(0, -halfPh - 8);
      ctx.lineTo(-6, -halfPh - 20);
      ctx.lineTo(6, -halfPh - 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // point de calcul
    const pxp = toX(lateral);
    const pyp = toY(depth);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pxp, pyp, 6, 0, Math.PI * 2);
    ctx.moveTo(pxp - 10, pyp); ctx.lineTo(pxp + 10, pyp);
    ctx.moveTo(pxp, pyp - 10); ctx.lineTo(pxp, pyp + 10);
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`fantôme d'eau ${PHANTOM} × ${PHANTOM} cm`, 8, 14);
    ctx.textAlign = 'right';
    ctx.fillText('isodoses en % de la dose au point', W - 8, H - 8);
  }, [dosePerMU, beams, fieldSize, ssd, depth, lateral, pointDose, maxDose, showIsodoses]);

  // --------------------------------------------------- rendement en profondeur
  useEffect(() => {
    const canvas = pddRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#faf9f7'; ctx.fillRect(0, 0, W, H);
    const pad = { l: 38, r: 10, t: 12, b: 26 };
    const toX = (d: number) => pad.l + (d / PHANTOM) * (W - pad.l - pad.r);
    const toY = (p: number) => H - pad.b - (p / 115) * (H - pad.t - pad.b);

    ctx.strokeStyle = '#eae9e8'; ctx.lineWidth = 1;
    for (const p of [0, 25, 50, 75, 100]) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(p)); ctx.lineTo(W - pad.r, toY(p)); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(String(p), pad.l - 4, toY(p) + 3);
    }

    // chaque qualité de faisceau, pour comparaison
    QUALITIES.forEach((other) => {
      const tau = other.dmax / 2.2;
      const B = (x: number) => 1 - Math.exp(-x / tau);
      const isf = (x: number) => Math.pow((SSD_REF + other.dmax) / (SSD_REF + x), 2);
      const m = Math.log((B(10) * isf(10)) / (B(other.dmax) * isf(other.dmax)) / (other.pdd10 / 100)) / (10 - other.dmax);
      ctx.strokeStyle = other.id === qualityId ? '#c96445' : 'rgba(168,162,158,.45)';
      ctx.lineWidth = other.id === qualityId ? 2.4 : 1.2;
      ctx.beginPath();
      for (let d = 0; d <= PHANTOM; d += 0.1) {
        const p = 100 * (B(d) * Math.exp(-m * (d - other.dmax)) * isf(d)) / (B(other.dmax) * isf(other.dmax));
        if (d === 0) ctx.moveTo(toX(d), toY(p)); else ctx.lineTo(toX(d), toY(p));
      }
      ctx.stroke();
    });

    // profondeur du point
    ctx.strokeStyle = '#1c1917'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(toX(depth), pad.t); ctx.lineTo(toX(depth), H - pad.b); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#78716c'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('profondeur (cm)', (pad.l + W - pad.r) / 2, H - 7);
    ctx.textAlign = 'left';
    ctx.fillText(`PDD (%) — ${q.label}, d_max = ${q.dmax} cm`, pad.l + 4, pad.t + 8);
  }, [q, qualityId, depth]);

  // ------------------------------------------------------------ profil latéral
  useEffect(() => {
    const canvas = profRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#faf9f7'; ctx.fillRect(0, 0, W, H);
    const pad = { l: 38, r: 10, t: 12, b: 26 };
    const half = PHANTOM / 2;
    const toX = (x: number) => pad.l + ((x + half) / PHANTOM) * (W - pad.l - pad.r);
    const norm = pointDose > 1e-6 ? pointDose : 1;
    const toY = (v: number) => H - pad.b - Math.min(v / 1.25, 1) * (H - pad.t - pad.b);

    ctx.strokeStyle = '#eae9e8';
    for (const v of [0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(v)); ctx.lineTo(W - pad.r, toY(v)); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`${(v * 100).toFixed(0)}%`, pad.l - 4, toY(v) + 3);
    }

    ctx.strokeStyle = '#556884'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -half; x <= half; x += 0.1) {
      const v = dosePerMU(x, depth) / norm;
      if (x === -half) ctx.moveTo(toX(x), toY(v)); else ctx.lineTo(toX(x), toY(v));
    }
    ctx.stroke();

    ctx.strokeStyle = '#1c1917'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(toX(lateral), pad.t); ctx.lineTo(toX(lateral), H - pad.b); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#78716c'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('position latérale (cm)', (pad.l + W - pad.r) / 2, H - 7);
    ctx.textAlign = 'left';
    ctx.fillText(`profil à ${depth.toFixed(1)} cm de profondeur`, pad.l + 4, pad.t + 8);
  }, [dosePerMU, depth, lateral, pointDose]);

  const onMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mapRef.current!;
    const rect = canvas.getBoundingClientRect();
    const pad = 26;
    const scale = Math.min(canvas.width - 2 * pad, canvas.height - 2 * pad) / PHANTOM;
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    setLateral(Number(Math.max(-14, Math.min(14, (mx - canvas.width / 2) / scale)).toFixed(1)));
    setDepth(Number(Math.max(0, Math.min(PHANTOM, (my - pad) / scale)).toFixed(1)));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Radiothérapie externe — dose dans un fantôme
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Un ou plusieurs faisceaux de photons sur un fantôme d&apos;eau.
          Cliquez dans la carte pour déplacer le point de calcul.
        </p>
      </div>

      <div className="text-sm text-brun-900 bg-brun-50 border-l-4 border-brun-500 rounded-r-lg px-4 py-3">
        <strong>Outil pédagogique.</strong> Le rendement en profondeur est un
        modèle paramétrique (build-up, atténuation, inverse du carré) calibré sur
        des valeurs de PDD typiques — pas un jeu de données mesuré. Un faisceau
        réel se caractérise machine par machine. Aucun usage clinique.
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">Énergie</span>
            <div className="grid grid-cols-4 gap-1.5">
              {QUALITIES.map((x) => (
                <button key={x.id} onClick={() => setQualityId(x.id)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    qualityId === x.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>{x.label}</button>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-1.5">{q.note}</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">Balistique</span>
            <div className="grid grid-cols-1 gap-1.5">
              {([['simple', 'Un faisceau'], ['opposes', 'Deux faisceaux opposés'],
                 ['boite', 'Boîte à quatre faisceaux']] as [Arrangement, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setArrangement(id)}
                  className={`py-1.5 px-3 rounded-lg text-sm font-medium text-left transition-colors ${
                    arrangement === id ? 'bg-ocre-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Taille de champ</span>
              <span className="font-mono text-stone-900">{fieldSize} × {fieldSize} cm</span>
            </label>
            <input type="range" min={3} max={25} step={1} value={fieldSize}
              onChange={(e) => setFieldSize(Number(e.target.value))}
              className="w-full accent-gold-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>DSP</span>
              <span className="font-mono text-stone-900">{ssd} cm</span>
            </label>
            <input type="range" min={80} max={130} step={5} value={ssd}
              onChange={(e) => setSsd(Number(e.target.value))}
              className="w-full accent-gold-600" />
            <p className="text-xs text-stone-500 mt-1">
              Le PDD est corrigé par le facteur de Mayneord lorsque la DSP
              s&apos;écarte de {SSD_REF} cm.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Dose prescrite au point</span>
              <span className="font-mono text-stone-900">{prescription} cGy</span>
            </label>
            <input type="range" min={50} max={400} step={10} value={prescription}
              onChange={(e) => setPrescription(Number(e.target.value))}
              className="w-full accent-ocre-600" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="flex justify-between text-xs text-stone-600 mb-1">
                <span>Profondeur</span>
                <span className="font-mono">{depth.toFixed(1)} cm</span>
              </label>
              <input type="range" min={0} max={PHANTOM} step={0.5} value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full accent-stone-700" />
            </div>
            <div>
              <label className="flex justify-between text-xs text-stone-600 mb-1">
                <span>Latéral</span>
                <span className="font-mono">{lateral.toFixed(1)} cm</span>
              </label>
              <input type="range" min={-14} max={14} step={0.5} value={lateral}
                onChange={(e) => setLateral(Number(e.target.value))}
                className="w-full accent-stone-700" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showIsodoses}
              onChange={(e) => setShowIsodoses(e.target.checked)}
              className="w-4 h-4 accent-ocre-600" />
            <span className="text-sm text-stone-700">Courbes isodoses</span>
          </label>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
              <canvas ref={mapRef} width={420} height={420}
                onClick={onMapClick} className="w-full cursor-crosshair" />
            </div>
            <div className="space-y-3">
              <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
                <canvas ref={pddRef} width={420} height={200} className="w-full" />
              </div>
              <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
                <canvas ref={profRef} width={420} height={180} className="w-full" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700">
              Calcul des unités moniteur
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['PDD à la profondeur', `${pdd(depth).toFixed(1)} %`, `${q.label}, champ ${fieldSize} cm, DSP ${ssd} cm`],
                  ['Profil latéral', `${(profile(lateral, depth) * 100).toFixed(1)} %`, 'plateau puis pénombre'],
                  ['Facteur de diffusion S_c,p', scatterFactor.toFixed(3), 'normalisé à 1 pour 10 × 10'],
                  ['Faisceaux', String(beams.length), beams.map((b) => `${b}°`).join(', ')],
                ].map(([k, v, n], i) => (
                  <tr key={k} className={i % 2 ? 'bg-stone-50/60' : ''}>
                    <td className="px-4 py-1.5 text-stone-700">{k}</td>
                    <td className="px-4 py-1.5 font-mono text-stone-900 text-right whitespace-nowrap">{v}</td>
                    <td className="px-4 py-1.5 text-xs text-stone-500">{n}</td>
                  </tr>
                ))}
                <tr className="bg-ocre-50 border-t-2 border-ocre-300">
                  <td className="px-4 py-2 font-semibold text-ocre-900">Dose par UM au point</td>
                  <td className="px-4 py-2 font-mono font-semibold text-ocre-900 text-right">
                    {pointDose.toFixed(4)} cGy/UM
                  </td>
                  <td className="px-4 py-2 text-xs text-ocre-700">
                    étalonnage : 1 cGy/UM à d_max, 10 × 10, DSP 100
                  </td>
                </tr>
                <tr className="bg-ocre-50">
                  <td className="px-4 py-2 font-semibold text-ocre-900">UM à délivrer</td>
                  <td className="px-4 py-2 font-mono font-semibold text-ocre-900 text-right">
                    {Number.isFinite(mu_needed) ? mu_needed.toFixed(0) : '—'} UM
                  </td>
                  <td className="px-4 py-2 text-xs text-ocre-700">
                    pour {prescription} cGy, réparties sur {beams.length} faisceau{beams.length > 1 ? 'x' : ''}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-stone-700">Dose maximale dans le fantôme</td>
                  <td className="px-4 py-2 font-mono text-stone-900 text-right">
                    {pointDose > 1e-6 ? `${((maxDose / pointDose) * 100).toFixed(0)} %` : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-500">
                    en pourcentage de la dose au point de prescription
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Dose en radiothérapie externe
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">Le calcul d&apos;UM</h4>
            <BlockMath math="UM = \frac{D}{\dot{D}_{ref}\; \text{PDD}\; S_{c,p}}" />
            <p className="text-ocre-700 mt-2">
              On part de la dose voulue et on remonte à ce que la machine doit
              délivrer, en défaisant chaque facteur.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Build-up</h4>
            <p className="text-gold-700">
              Les photons ne déposent pas eux-mêmes la dose : ils mettent des
              électrons en mouvement, et ceux-ci parcourent une certaine
              distance. La dose monte donc jusqu&apos;à d_max avant de décroître
              — c&apos;est ce qui épargne la peau, et d&apos;autant plus que
              l&apos;énergie est élevée.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Rendement en profondeur</h4>
            <BlockMath math="\text{PDD}(d) = 100\frac{D(d)}{D(d_{max})}" />
            <p className="text-brun-700 mt-2">
              Trois effets combinés : le build-up, l&apos;atténuation
              exponentielle, et la loi inverse du carré. Plus le champ est grand,
              plus la diffusion remonte le PDD en profondeur.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Pénombre</h4>
            <p className="text-ardoise-700">
              Le bord du champ n&apos;est jamais net : taille finie de la source,
              transmission des mâchoires et diffusion latérale l&apos;étalent. La
              pénombre s&apos;élargit encore avec la profondeur.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Pourquoi plusieurs faisceaux</h4>
            <p className="text-olive-700">
              Un faisceau seul dépose bien plus en entrée qu&apos;en profondeur.
              Deux faisceaux opposés compensent leurs gradients ; quatre
              concentrent la dose au centre et diluent l&apos;entrée sur quatre
              zones de peau. Essayez de passer de l&apos;un à l&apos;autre en
              regardant l&apos;isodose 100 %.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Facteur de Mayneord</h4>
            <BlockMath math="F = \left(\frac{f_2+d_m}{f_1+d_m}\right)^2\left(\frac{f_1+d}{f_2+d}\right)^2" />
            <p className="text-prune-700 mt-2">
              Corrige le PDD quand on change de DSP. Purement géométrique : il ne
              tient pas compte du changement de diffusion, ce qui le rend
              approximatif pour les grands champs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EBRTDoseSimulator;
