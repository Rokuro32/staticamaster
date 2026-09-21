'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Comment un rayonnement casse l'ADN.
//
// Deux voies : l'effet direct, où l'électron secondaire ionise la molécule
// elle-même, et l'effet indirect, où il ionise l'eau et produit un radical
// •OH qui diffuse quelques nanomètres avant d'atteindre l'ADN. Pour un
// rayonnement de bas TEL, l'indirect domine — environ deux tiers des lésions.
//
// Le point central de la simulation : la cassure double brin n'est pas un
// événement à part. C'est une coïncidence — deux cassures simple brin sur des
// brins opposés, assez proches l'une de l'autre. Le rapport CDB/CSB n'est donc
// pas un paramètre qu'on entre, il émerge de la structure de trace.
// ---------------------------------------------------------------------------

/** Deux cassures sur brins opposés à moins de 10 paires de bases font une CDB */
const DSB_WINDOW = 10;
const SEGMENT_BP = 160;      // fenêtre montrée à l'écran
// Les lésions sont comptées sur un brin bien plus long que celui qu'on affiche.
// Sur 160 pb seulement, les traces successives finiraient par se recouvrir et
// les coïncidences n'auraient plus rien à voir avec la structure de trace.
const VIRTUAL_BP = 1400;
const BP_NM = 0.34;          // pas de l'hélice, nm par paire de bases
// Une trace est une droite : elle passe à une distance d'impact donnée de
// l'hélice, et ne vacille autour que de quelques nanomètres. C'est ce qui fait
// qu'une trace dense frappe surtout le brin le plus proche, au lieu de couper
// les deux au hasard.
const TRACK_JITTER = 2;      // nm

interface Quality {
  id: string;
  label: string;
  let: string;
  /** Événements d'ionisation par trace, dans la région montrée */
  eventsPerTrack: [number, number];
  /**
   * Dispersion des événements le long de la trace, en paires de bases.
   * Réglée pour que le rendement CSB/CDB par trace tombe sur les valeurs
   * mesurées : ≈ 22 à bas TEL, ≈ 8 pour des protons, ≈ 5 pour des α.
   */
  clustering: number;
  /** Rapport CSB/CDB attendu pour cette qualité, tel que mesuré en cellule */
  refRatio: string;
  note: string;
}

const QUALITIES: Quality[] = [
  {
    id: 'gamma', label: 'Photons γ / X', let: '≈ 0,3 keV/µm',
    eventsPerTrack: [1, 3], clustering: 42, refRatio: 'attendu ≈ 20 à 25 à bas TEL',
    note: 'Bas TEL. Les ionisations sont rares et dispersées : la plupart des cassures restent isolées sur un seul brin.',
  },
  {
    id: 'proton', label: 'Protons', let: '≈ 10 keV/µm',
    eventsPerTrack: [3, 7], clustering: 26, refRatio: 'attendu ≈ 8 — les lésions se regroupent',
    note: 'TEL intermédiaire. Les événements commencent à se regrouper, et les coïncidences sur brins opposés deviennent plus fréquentes.',
  },
  {
    id: 'alpha', label: 'Particules α / ions lourds', let: '≈ 120 keV/µm',
    eventsPerTrack: [8, 16], clustering: 7, refRatio: 'attendu ≈ 5 — dommage groupé, peu réparable',
    note: 'Haut TEL. Les ionisations sont serrées le long de la trace : les lésions deviennent groupées, bien plus difficiles à réparer.',
  },
];

interface Break {
  strand: 0 | 1;
  bp: number;
  indirect: boolean;
  trackId: number;
}

interface Radical {
  x: number;   // en paires de bases
  y: number;   // distance à l'axe, en nm
  bornAt: number;
}

interface Track {
  id: number;
  /** Position d'entrée le long du segment, en paires de bases */
  entry: number;
  /** Distance d'impact à l'axe de l'hélice, en nm */
  impact: number;
  angle: number;
  events: { bp: number; offset: number; indirect: boolean }[];
}

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/**
 * Cassures double brin : appariement glouton de deux cassures sur brins
 * opposés distantes de moins de DSB_WINDOW.
 *
 * On sépare les paires issues d'une même trace de celles qui viennent de deux
 * traces différentes. Les premières sont le dommage « en un coup », celui qui
 * dépend de la structure de trace. Les secondes n'existent qu'à dose
 * accumulée — c'est la même distinction que les termes α et β du modèle
 * linéaire-quadratique.
 */
function countDSB(breaks: Break[]): {
  dsb: number; intra: number; inter: number; dsbSites: number[];
} {
  const s0 = breaks.filter((b) => b.strand === 0).sort((a, b) => a.bp - b.bp);
  const s1 = breaks.filter((b) => b.strand === 1).sort((a, b) => a.bp - b.bp);
  const used = new Array(s1.length).fill(false);
  const sites: number[] = [];
  let intra = 0;

  for (const a of s0) {
    let best = -1;
    let bestD = DSB_WINDOW + 1;
    // on privilégie une partenaire issue de la même trace, à distance égale
    for (let j = 0; j < s1.length; j++) {
      if (used[j]) continue;
      const d = Math.abs(s1[j].bp - a.bp);
      if (d > DSB_WINDOW) continue;
      const sameTrack = s1[j].trackId === a.trackId;
      const score = d - (sameTrack ? DSB_WINDOW : 0);
      if (score < bestD) { bestD = score; best = j; }
    }
    if (best >= 0) {
      used[best] = true;
      sites.push((a.bp + s1[best].bp) / 2);
      if (s1[best].trackId === a.trackId) intra++;
    }
  }
  return { dsb: sites.length, intra, inter: sites.length - intra, dsbSites: sites };
}

export function DNADamageSimulator() {
  const [qualityId, setQualityId] = useState('gamma');
  const [indirectShare, setIndirectShare] = useState(0.65);
  const [scavenger, setScavenger] = useState(0);     // 0 → 1, supprime l'indirect
  const [oxygen, setOxygen] = useState(1);           // 0 → 1, fixation des lésions
  const [running, setRunning] = useState(false);

  const [breaks, setBreaks] = useState<Break[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [radicals, setRadicals] = useState<Radical[]>([]);
  const [nTracks, setNTracks] = useState(0);
  const [ionisations, setIonisations] = useState(0);
  // Rendement cumulé, compté trace par trace. Le segment affiché finit par
  // saturer : son état instantané ne mesure plus la structure de trace, alors
  // que la somme des lésions créées par chaque trace, elle, reste valide.
  const [yieldBreaks, setYieldBreaks] = useState(0);
  const [yieldDsb, setYieldDsb] = useState(0);
  const [restituted, setRestituted] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const clockRef = useRef(0);
  const trackIdRef = useRef(0);

  const q = QUALITIES.find((x) => x.id === qualityId)!;

  const reset = useCallback(() => {
    setBreaks([]); setTracks([]); setRadicals([]);
    setNTracks(0); setIonisations(0); setRestituted(0);
    setYieldBreaks(0); setYieldDsb(0);
    trackIdRef.current = 0;
    clockRef.current = 0;
  }, []);

  useEffect(() => { reset(); }, [reset, qualityId]);

  /** Envoie une trace et récolte les lésions qu'elle produit */
  const fireTrack = useCallback(() => {
    const id = trackIdRef.current++;
    const entry = randRange(0, VIRTUAL_BP);
    const impact = randRange(-6, 6);
    const angle = randRange(-0.5, 0.5);
    const n = Math.round(randRange(q.eventsPerTrack[0], q.eventsPerTrack[1]));

    const events: Track['events'] = [];
    const newBreaks: Break[] = [];
    const newRadicals: Radical[] = [];
    let ions = 0;
    let lost = 0;

    for (let i = 0; i < n; i++) {
      // les événements se répartissent le long de la trace, d'autant plus
      // serrés que le TEL est élevé
      const bp = entry + (Math.random() - 0.5) * q.clustering;
      // l'événement reste sur la trace : il ne s'écarte de la distance
      // d'impact que de quelques nm
      const offset = impact + randRange(-TRACK_JITTER, TRACK_JITTER);
      ions++;

      // indirect si l'ionisation a lieu dans l'eau autour, direct si sur l'ADN
      const isIndirect = Math.random() < indirectShare;
      events.push({ bp, offset, indirect: isIndirect });

      if (isIndirect) {
        // le radical doit survivre aux capteurs puis atteindre l'ADN
        if (Math.random() < scavenger) { lost++; continue; }
        newRadicals.push({ x: bp, y: offset, bornAt: clockRef.current });
        // portée utile du •OH : quelques nanomètres
        if (Math.abs(offset) > 4) { lost++; continue; }
      } else {
        // l'effet direct n'atteint que ce qui est très près de la molécule
        if (Math.abs(offset) > 1.2) { lost++; continue; }
      }

      // fixation de la lésion : sans oxygène, une part est chimiquement restaurée
      if (Math.random() > 0.35 + 0.65 * oxygen) { lost++; continue; }

      const bpInt = Math.round(bp);
      if (bpInt < 0 || bpInt > VIRTUAL_BP) continue;
      newBreaks.push({
        strand: (offset >= 0 ? 0 : 1) as 0 | 1,
        bp: bpInt,
        indirect: isIndirect,
        trackId: id,
      });
    }

    // CDB produites par cette trace à elle seule
    const ownDsb = countDSB(newBreaks).dsb;
    setYieldBreaks((prev) => prev + newBreaks.length);
    setYieldDsb((prev) => prev + ownDsb);

    setTracks((prev) => [...prev.slice(-14), { id, entry, impact, angle, events }]);
    setBreaks((prev) => [...prev, ...newBreaks]);
    setRadicals((prev) => [...prev.slice(-60), ...newRadicals]);
    setIonisations((prev) => prev + ions);
    setRestituted((prev) => prev + lost);
    setNTracks((prev) => prev + 1);
  }, [q, indirectShare, scavenger, oxygen]);

  // ---------------------------------------------------------------- animation
  useEffect(() => {
    if (!running) return;
    let acc = 0;
    let last = performance.now();
    const tick = (now: number) => {
      acc += now - last;
      last = now;
      clockRef.current = now;
      while (acc > 380) { fireTrack(); acc -= 380; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, fireTrack]);

  const { dsb, intra, inter, dsbSites } = useMemo(() => countDSB(breaks), [breaks]);
  const ssbTotal = breaks.length;
  const ssbIsolated = ssbTotal - dsb * 2;
  const indirectCount = breaks.filter((b) => b.indirect).length;
  // Le rapport se mesure sur le rendement cumulé, pas sur l'état du segment :
  // à dose accumulée, les recouvrements entre traces feraient chuter un rapport
  // lu sur le segment, alors que le rendement par trace, lui, converge.
  const ratio = yieldDsb > 0 ? (yieldBreaks - 2 * yieldDsb) / yieldDsb : Infinity;

  // ------------------------------------------------------------------ dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const axis = H / 2;
    const toX = (bp: number) => 30 + (bp / SEGMENT_BP) * (W - 60);
    const amp = 34;                        // amplitude de l'hélice, px
    const nmToPx = 6;

    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    // eau autour
    ctx.fillStyle = 'rgba(102,141,169,.06)';
    ctx.fillRect(0, 0, W, H);

    // --- traces des électrons secondaires
    const visible = (bp: number) => bp >= -20 && bp <= SEGMENT_BP + 20;

    tracks.forEach((tr, i) => {
      if (!visible(tr.entry)) return;
      const age = (tracks.length - i) / tracks.length;
      ctx.strokeStyle = `rgba(120, 113, 108, ${0.06 + age * 0.22})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(toX(tr.entry) - Math.tan(tr.angle) * H, 0);
      ctx.lineTo(toX(tr.entry) + Math.tan(tr.angle) * H, H);
      ctx.stroke();

      tr.events.forEach((e) => {
        ctx.fillStyle = e.indirect ? 'rgba(102,141,169,.5)' : 'rgba(201,100,69,.55)';
        ctx.beginPath();
        ctx.arc(toX(e.bp), axis + e.offset * nmToPx, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // --- radicaux •OH encore visibles
    radicals.forEach((r) => {
      if (!visible(r.x)) return;
      ctx.strokeStyle = 'rgba(102,141,169,.7)';
      ctx.lineWidth = 1.2;
      const px = toX(r.x);
      const py = axis + r.y * nmToPx;
      ctx.beginPath();
      ctx.arc(px, py, 3.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 1.6, py); ctx.lineTo(px + 1.6, py);
      ctx.stroke();
    });

    // --- la double hélice
    const strandPath = (phase: number) => {
      ctx.beginPath();
      for (let bp = 0; bp <= SEGMENT_BP; bp += 0.5) {
        const x = toX(bp);
        const y = axis + Math.sin((bp / 10.5) * 2 * Math.PI + phase) * amp;
        if (bp === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    };

    // paires de bases
    ctx.strokeStyle = 'rgba(168,162,158,.55)';
    ctx.lineWidth = 1;
    for (let bp = 0; bp <= SEGMENT_BP; bp += 2) {
      const x = toX(bp);
      const y0 = axis + Math.sin((bp / 10.5) * 2 * Math.PI) * amp;
      const y1 = axis + Math.sin((bp / 10.5) * 2 * Math.PI + Math.PI) * amp;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }

    ctx.strokeStyle = '#7c673a'; ctx.lineWidth = 3;
    strandPath(0); ctx.stroke();
    ctx.strokeStyle = '#8c4f2e'; ctx.lineWidth = 3;
    strandPath(Math.PI); ctx.stroke();

    // --- cassures
    breaks.forEach((b) => {
      if (!visible(b.bp)) return;
      const x = toX(b.bp);
      const phase = b.strand === 0 ? 0 : Math.PI;
      const y = axis + Math.sin((b.bp / 10.5) * 2 * Math.PI + phase) * amp;
      const inDsb = dsbSites.some((s) => Math.abs(s - b.bp) <= DSB_WINDOW / 2 + 1);

      ctx.strokeStyle = inDsb ? '#84422e' : (b.indirect ? '#556884' : '#c96445');
      ctx.lineWidth = inDsb ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x - 5, y + 5); ctx.lineTo(x + 5, y - 5);
      ctx.stroke();
    });

    // halos sur les cassures double brin
    dsbSites.forEach((s) => {
      if (!visible(s)) return;
      ctx.strokeStyle = 'rgba(132, 66, 46, .75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(toX(s), axis, (DSB_WINDOW / SEGMENT_BP) * (W - 60) * 0.9, amp + 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.fillStyle = '#78716c';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${SEGMENT_BP} paires de bases (${(SEGMENT_BP * BP_NM).toFixed(0)} nm)`, 10, 16);
    ctx.textAlign = 'right';
    ctx.fillText(`${nTracks} trace${nTracks > 1 ? 's' : ''}`, W - 10, 16);
  }, [breaks, tracks, radicals, dsbSites, nTracks]);

  const counters: [string, string, string][] = [
    ['Ionisations', String(ionisations), 'événements déposés dans la région'],
    ['Cassures simple brin isolées', String(Math.max(0, ssbIsolated)), 'réparables en quelques minutes'],
    ['Cassures double brin', String(dsb), 'deux brins coupés à moins de 10 pb'],
    ['Rapport CSB / CDB par trace', Number.isFinite(ratio) ? ratio.toFixed(1) : '—', q.refRatio],
    ['dont CDB en une seule trace', String(intra), 'dépend de la structure de trace — terme α'],
    ['dont CDB par recouvrement', String(inter), 'deux traces distinctes — terme β, apparaît à dose accumulée'],
    ['Part indirecte', ssbTotal > 0 ? `${((indirectCount / ssbTotal) * 100).toFixed(0)} %` : '—', 'via les radicaux •OH'],
    ['Lésions non fixées', String(restituted), 'captées ou restaurées chimiquement'],
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Rayonnement et ADN — cassures simple et double brin
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Envoyez des traces et regardez les lésions s&apos;accumuler. La
          cassure double brin n&apos;est pas un événement à part : c&apos;est une
          coïncidence entre deux cassures simple brin sur des brins opposés.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">
              Qualité du rayonnement
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {QUALITIES.map((x) => (
                <button key={x.id} onClick={() => setQualityId(x.id)}
                  className={`py-1.5 px-3 rounded-lg text-sm font-medium text-left transition-colors ${
                    qualityId === x.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>
                  {x.label}
                  <span className={`ml-2 text-xs ${qualityId === x.id ? 'text-stone-300' : 'text-stone-500'}`}>
                    {x.let}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-1.5">{q.note}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-ocre-600 text-white hover:bg-ocre-700 transition-colors">
              {running ? '⏸ Pause' : '▶ Irradier'}
            </button>
            <button onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
              ↺ Réparer tout
            </button>
          </div>
          <button onClick={fireTrack}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            Une trace à la fois
          </button>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Part de l&apos;effet indirect</span>
              <span className="font-mono text-stone-900">{(indirectShare * 100).toFixed(0)} %</span>
            </label>
            <input type="range" min={0} max={1} step={0.05} value={indirectShare}
              onChange={(e) => setIndirectShare(Number(e.target.value))}
              className="w-full accent-ardoise-600" />
            <p className="text-xs text-stone-500 mt-1">
              En cellule et à bas TEL, on l&apos;estime autour de deux tiers.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Capteurs de radicaux</span>
              <span className="font-mono text-stone-900">{(scavenger * 100).toFixed(0)} %</span>
            </label>
            <input type="range" min={0} max={0.95} step={0.05} value={scavenger}
              onChange={(e) => setScavenger(Number(e.target.value))}
              className="w-full accent-olive-600" />
            <p className="text-xs text-stone-500 mt-1">
              Le DMSO ou le glutathion interceptent le •OH avant l&apos;ADN. Ils
              ne touchent pas à l&apos;effet direct — c&apos;est justement comme
              ça qu&apos;on sépare les deux voies en laboratoire.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Oxygénation</span>
              <span className="font-mono text-stone-900">{(oxygen * 100).toFixed(0)} %</span>
            </label>
            <input type="range" min={0} max={1} step={0.05} value={oxygen}
              onChange={(e) => setOxygen(Number(e.target.value))}
              className="w-full accent-brun-600" />
            <p className="text-xs text-stone-500 mt-1">
              L&apos;oxygène fixe la lésion de façon permanente. Sans lui, une
              part est restaurée chimiquement : c&apos;est l&apos;effet oxygène,
              et c&apos;est pourquoi les zones hypoxiques d&apos;une tumeur
              résistent.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={720} height={300} className="w-full" />
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {[
              ['Ionisation directe', '#c96445'],
              ['Radical •OH', '#556884'],
              ['Cassure simple brin', '#c96445'],
              ['Cassure double brin', '#84422e'],
            ].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1.5 text-stone-600">
                <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>

          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {counters.map(([k, v, note], i) => (
                  <tr key={k} className={i % 2 ? 'bg-stone-50/60' : ''}>
                    <td className="px-4 py-1.5 text-stone-700">{k}</td>
                    <td className="px-4 py-1.5 font-mono text-stone-900 text-right whitespace-nowrap">{v}</td>
                    <td className="px-4 py-1.5 text-xs text-stone-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-stone-500">
            Les lésions sont comptées sur {VIRTUAL_BP} paires de bases ; la vue
            n&apos;en montre que les {SEGMENT_BP} premières, avec une densité
            d&apos;événements exagérée pour rester visible. Dans une cellule
            réelle, un gray produit de l&apos;ordre de 1000 cassures simple brin
            et 40 cassures double brin, réparties sur six milliards de paires de
            bases — les coïncidences entre traces y sont donc bien plus rares
            qu&apos;ici. C&apos;est pourquoi le rapport CSB/CDB est mesuré sur le
            rendement de chaque trace prise seule : lu sur le segment, il
            s&apos;effondrerait à mesure que celui-ci se remplit.
          </p>
        </div>
      </div>

      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Lésions radio-induites de l&apos;ADN
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Effet direct</h4>
            <p className="text-brun-700">
              L&apos;électron secondaire ionise directement la molécule d&apos;ADN
              et rompt une liaison du squelette sucre-phosphate. Il faut pour
              cela que l&apos;ionisation ait lieu à un nanomètre près : c&apos;est
              rare, mais imparable.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Effet indirect</h4>
            <BlockMath math="\text{H}_2\text{O} \xrightarrow{\ \gamma\ } \text{H}_2\text{O}^+ + e^- \rightarrow {}^{\bullet}\text{OH}" />
            <p className="text-ardoise-700 mt-2">
              La cellule est faite d&apos;eau à 70 %. L&apos;ionisation la plus
              probable a donc lieu dans l&apos;eau, et c&apos;est le radical
              hydroxyle qui va faire le travail — à condition d&apos;atteindre
              l&apos;ADN avant de réagir avec autre chose, soit quelques
              nanomètres.
            </p>
          </div>
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">CSB et CDB</h4>
            <p className="text-ocre-700">
              Une cassure simple brin se répare facilement : le brin
              complémentaire sert de matrice. Une cassure double brin supprime
              cette matrice — c&apos;est la lésion qui tue la cellule, et c&apos;est
              celle que vise la radiothérapie.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Structure de trace et TEL</h4>
            <p className="text-prune-700">
              À bas TEL, les ionisations sont dispersées et les cassures restent
              isolées. À haut TEL, elles se serrent le long de la trace : les
              coïncidences se multiplient, les lésions deviennent groupées. C&apos;est
              toute l&apos;origine de l&apos;efficacité biologique relative.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Effet oxygène</h4>
            <p className="text-olive-700">
              L&apos;oxygène se fixe sur le radical de l&apos;ADN et rend la
              lésion permanente. En son absence, un donneur d&apos;hydrogène peut
              restaurer la molécule. D&apos;où un rapport d&apos;efficacité de
              l&apos;ordre de 2,5 à 3 entre tissu bien oxygéné et tissu hypoxique
              — à bas TEL surtout.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Une trace, ou deux</h4>
            <BlockMath math="S = e^{-(\alpha D + \beta D^2)}" />
            <p className="text-stone-700 mt-2">
              Une cassure double brin faite par une seule trace est
              proportionnelle à la dose : c&apos;est le terme α. Une cassure faite
              par le recouvrement de deux traces indépendantes demande deux
              événements, donc varie comme le carré de la dose : c&apos;est le
              terme β. Les deux compteurs séparent exactement cela.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Ordres de grandeur</h4>
            <p className="text-gold-700">
              Un gray dans une cellule : environ 1000 cassures simple brin,
              40 cassures double brin, et près de 2000 dommages de bases. La
              quasi-totalité est réparée ; ce sont les quelques cassures doubles
              mal réparées qui décident du sort de la cellule.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Ordres de grandeur d&apos;après Hall E. J. et Giaccia A. J.,{' '}
          <em>Radiobiology for the Radiologist</em>, Wolters Kluwer. Les
          proportions simulées sont illustratives et non prédictives.
        </p>
      </div>
    </div>
  );
}

export default DNADamageSimulator;
