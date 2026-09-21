'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import {
  MATERIALS,
  PHOTON_SOURCES,
  attenuateAlpha,
  attenuateBeta,
  attenuateNeutrons,
  attenuatePhotons,
  equivalentThickness,
  materialById,
} from '@/lib/shielding';
import type { BeamKind } from '@/lib/shielding';

// ---------------------------------------------------------------------------
// Blindage des rayonnements.
//
// Le modèle — coefficients, parcours, sections efficaces — vit dans
// src/lib/shielding.ts, séparé du rendu pour rester vérifiable seul. Ce
// fichier ne fait que le mettre en scène.
//
// L'écran est toujours dessiné à la même largeur, quelle que soit son
// épaisseur réelle. C'est délibéré : entre les 20 µm de plomb qui arrêtent
// l'iode 125 et le mètre de béton d'une salle de traitement, il y a cinq
// ordres de grandeur, qu'aucune échelle linéaire ne peut montrer ensemble. Ce
// qui est à l'échelle, c'est la profondeur à laquelle chaque particule
// s'arrête dans l'écran.
// ---------------------------------------------------------------------------

/**
 * Géométrie de la scène, en pixels du canevas. Définie ici parce que le dessin
 * et l'animation doivent s'accorder exactement : c'est la même frontière qui
 * décide où une particule est représentée et où elle est absorbée.
 */
const SCENE = { w: 900, h: 300, srcX: 58, slabX: 330, slabW: 250, detX: 834 };
const SPAN = SCENE.detX - SCENE.srcX;
/** Bornes de l'écran, en fraction du trajet source → détecteur */
const SLAB_START = (SCENE.slabX - SCENE.srcX) / SPAN;
const SLAB_SPAN = SCENE.slabW / SPAN;

const C = {
  ink: '#463f36',
  muted: '#8a8179',
  alpha: '#b1522f',
  beta: '#5f6f2a',
  photon: '#b08128',
  neutron: '#6b7f8d',
  brems: '#8d5570',
};

interface Beam {
  id: string;
  kind: BeamKind;
  label: string;
  /** MeV — énergie de la particule, ou énergie maximale pour un spectre β */
  energy: number;
  detail: string;
}

const BEAMS: Beam[] = [
  { id: 'am241', kind: 'alpha', label: 'Américium 241', energy: 5.49, detail: 'α de 5,49 MeV — détecteurs de fumée' },
  { id: 'po210', kind: 'alpha', label: 'Polonium 210', energy: 5.3, detail: 'α de 5,3 MeV' },

  { id: 'c14', kind: 'beta', label: 'Carbone 14', energy: 0.156, detail: 'β mous, 156 keV au maximum' },
  { id: 'tl204', kind: 'beta', label: 'Thallium 204', energy: 0.764, detail: 'β de 764 keV au maximum' },
  { id: 'p32', kind: 'beta', label: 'Phosphore 32', energy: 1.71, detail: 'β de 1,71 MeV — marquage en biologie' },
  { id: 'y90', kind: 'beta', label: 'Strontium 90 / Yttrium 90', energy: 2.28, detail: 'β de 2,28 MeV — radiothérapie interne' },

  ...PHOTON_SOURCES.map((s) => ({
    id: s.id,
    kind: 'photon' as BeamKind,
    label: s.label,
    energy: s.energy,
    detail: s.detail,
  })),

  { id: 'fission', kind: 'neutron', label: 'Neutrons de fission', energy: 2.0, detail: 'spectre de fission — environ 2 MeV en moyenne' },
  { id: 'ambe', kind: 'neutron', label: 'Source Am-Be', energy: 4.5, detail: 'neutrons rapides, environ 4,5 MeV' },
];

const KIND_LABEL: Record<BeamKind, string> = {
  alpha: 'Alpha',
  beta: 'Bêta',
  photon: 'Gamma / X',
  neutron: 'Neutrons',
};

const KIND_COLOR: Record<BeamKind, string> = {
  alpha: C.alpha,
  beta: C.beta,
  photon: C.photon,
  neutron: C.neutron,
};

/** Épaisseurs proposées, en centimètres — réglage logarithmique */
const MIN_LOG = -3; // 10 µm
const MAX_LOG = 2.3; // 2 m

function formatThickness(cm: number): string {
  if (cm < 0.1) return `${(cm * 1e4).toFixed(0)} µm`;
  if (cm < 1) return `${(cm * 10).toFixed(2)} mm`;
  if (cm < 100) return `${cm.toFixed(cm < 10 ? 2 : 1)} cm`;
  return `${(cm / 100).toFixed(2)} m`;
}

function formatFactor(t: number): string {
  if (t <= 0) return 'arrêt complet';
  if (t > 0.999) return '× 1';
  const f = 1 / t;
  if (f < 1000) return `÷ ${f.toFixed(f < 10 ? 2 : 0)}`;
  return `÷ 10^${Math.log10(f).toFixed(1)}`;
}

// ─── Une particule en vol ───────────────────────────────────────────────────

interface Particle {
  /** Avancement le long de la scène, de 0 (source) à 1 (détecteur) */
  u: number;
  /** Écart vertical, en pixels */
  y: number;
  speed: number;
  /**
   * Profondeur d'arrêt dans l'écran, en fraction de son épaisseur. Au-delà
   * de 1, la particule traverse.
   */
  stopAt: number;
  /** Photon de freinage, né de l'arrêt d'un β dans un écran lourd */
  brems: boolean;
}

export function ShieldingSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);
  const partsRef = useRef<Particle[]>([]);
  const accRef = useRef(0);
  /**
   * La boucle d'animation ne doit jamais redémarrer quand un rendu change
   * l'identité d'un callback : elle remettrait son horloge à zéro à chaque
   * fois, et le pas de temps resterait proche de zéro — les particules
   * avanceraient au ralenti sans que rien ne paraisse anormal. On passe donc
   * par des références, et la boucle ne dépend plus que de la lecture.
   */
  const drawRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => number>(() => 1);

  const [kind, setKind] = useState<BeamKind>('photon');
  const [beamId, setBeamId] = useState('cs137');
  const [materialId, setMaterialId] = useState('plomb');
  const [logT, setLogT] = useState(-0.3); // ≈ 5 mm
  const [broad, setBroad] = useState(false);
  const [running, setRunning] = useState(true);

  const beam = useMemo(
    () => BEAMS.find((b) => b.id === beamId) ?? BEAMS[0],
    [beamId]
  );
  const material = useMemo(() => materialById(materialId), [materialId]);
  const thickness = useMemo(() => Math.pow(10, logT), [logT]);
  const beamsOfKind = useMemo(() => BEAMS.filter((b) => b.kind === kind), [kind]);

  // Changer de famille change de source : on prend la première de la famille
  useEffect(() => {
    if (!beamsOfKind.some((b) => b.id === beamId)) setBeamId(beamsOfKind[0].id);
  }, [beamsOfKind, beamId]);

  // ── Le calcul, entièrement délégué au modèle
  const result = useMemo(() => {
    if (kind === 'photon') {
      const r = attenuatePhotons(material, beam.id, thickness);
      return {
        transmitted: broad ? r.broad : r.narrow,
        rows: [
          ['Coefficient linéaire μ', `${r.mu.toFixed(r.mu < 1 ? 4 : 2)} cm⁻¹`, 'μ/ρ × masse volumique'],
          ['Épaisseurs de demi-atténuation', `${(thickness / r.hvl).toFixed(2)}`, `une CDA vaut ${formatThickness(r.hvl)}`],
          ['Couche de dixième (CDX)', formatThickness(r.tvl), 'divise le débit par dix'],
          ['Facteur d’accumulation', broad ? `× ${r.buildup.toFixed(2)}` : '—', broad ? 'photons diffusés revenus dans l’axe' : 'faisceau étroit : diffusés ignorés'],
        ] as [string, string, string][],
      };
    }
    if (kind === 'beta') {
      const r = attenuateBeta(material, beam.energy, thickness);
      return {
        transmitted: r.transmitted,
        rows: [
          ['Parcours maximal', formatThickness(r.range), `${r.rangeMassic.toFixed(3)} g/cm² — relation de Katz et Penfold`],
          ['Épaisseur / parcours', `${(thickness / r.range).toFixed(2)}`, r.stopped ? 'écran suffisant : plus aucun β ne sort' : 'les β les plus énergétiques passent encore'],
          ['Rayonnement de freinage', `${(r.brems * 100).toFixed(2)} %`, `de l’énergie β, converti en photons (Z = ${material.z})`],
          ['Masse surfacique', `${(thickness * material.rho * 10).toFixed(1)} kg/m²`, 'ce que pèse l’écran, par mètre carré'],
        ] as [string, string, string][],
      };
    }
    if (kind === 'alpha') {
      const r = attenuateAlpha(material, beam.energy, thickness);
      return {
        transmitted: r.transmitted,
        rows: [
          ['Parcours dans le matériau', formatThickness(r.range), 'règle de Bragg et Kleeman'],
          ['Parcours dans l’air', `${r.rangeAir.toFixed(1)} cm`, 'quelques centimètres, et c’est fini'],
          ['Épaisseur / parcours', `${(thickness / r.range).toFixed(1)}`, r.stopped ? 'arrêt total' : 'l’écran est plus mince que le parcours'],
          ['Danger résiduel', r.stopped ? 'externe : nul' : 'externe : réel', 'le vrai risque des α est la contamination interne'],
        ] as [string, string, string][],
      };
    }
    const r = attenuateNeutrons(material, thickness);
    return {
      transmitted: r.transmitted,
      rows: [
        ['Section efficace de retrait', `${r.sigma.toFixed(3)} cm⁻¹`, 'pour neutrons rapides'],
        ['Couche de dixième (CDX)', formatThickness(r.tvl), `soit ${(r.tvl * material.rho).toFixed(0)} g/cm² de matière`],
        ['Teneur en hydrogène', `${(material.hFraction * 100).toFixed(1)} %`, 'c’est elle qui ralentit réellement les neutrons'],
        ['Pouvoir de ralentissement', r.moderation === 0 ? 'nul' : `${(r.moderation * 100).toFixed(0)} % du polyéthylène`, 'un noyau lourd ne prend presque pas d’énergie au choc'],
      ] as [string, string, string][],
    };
  }, [kind, beam, material, thickness, broad]);

  /** Où s'arrête une particule, en fraction de l'épaisseur de l'écran */
  const drawStop = useCallback((): number => {
    if (kind === 'photon' || kind === 'neutron') {
      const mux =
        kind === 'photon'
          ? attenuatePhotons(material, beam.id, thickness).mux
          : attenuateNeutrons(material, thickness).sigma * thickness;
      if (mux <= 0) return 99;
      // Profondeur d'interaction tirée de la loi exponentielle elle-même
      return -Math.log(1 - Math.random()) / mux;
    }
    if (kind === 'beta') {
      const r = attenuateBeta(material, beam.energy, thickness);
      // Spectre continu : la plupart s'arrêtent bien avant le parcours maximal
      const frac = Math.pow(Math.random(), 0.45);
      return (r.range * frac) / thickness;
    }
    const r = attenuateAlpha(material, beam.energy, thickness);
    // Dispersion de parcours des α : quelques pour cent
    return (r.range * (0.96 + Math.random() * 0.08)) / thickness;
  }, [kind, material, beam, thickness]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fdfaf4';
    ctx.fillRect(0, 0, W, H);

    const axis = H / 2;
    const { srcX, slabX, slabW, detX } = SCENE;


    // ── l'écran
    const shade = Math.min(0.55, 0.1 + material.rho / 40);
    ctx.fillStyle = `rgba(70, 63, 54, ${shade})`;
    ctx.fillRect(slabX, 26, slabW, H - 66);
    ctx.strokeStyle = 'rgba(70,63,54,0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(slabX + 0.5, 26.5, slabW - 1, H - 67);

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(material.label, slabX + slabW / 2, 18);
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(
      `${formatThickness(thickness)}  ·  ${material.rho} g/cm³`,
      slabX + slabW / 2,
      H - 26
    );

    // ── la source
    ctx.fillStyle = KIND_COLOR[kind];
    ctx.beginPath();
    ctx.arc(srcX, axis, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(beam.label, srcX + 24, H - 26);

    // ── le détecteur
    ctx.strokeStyle = 'rgba(70,63,54,0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(detX, 30);
    ctx.lineTo(detX, H - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('détecteur', detX, H - 26);

    // ── les particules
    const toX = (u: number) => srcX + u * SPAN;

    for (const p of partsRef.current) {
      const x = toX(p.u);
      const col = p.brems ? C.brems : KIND_COLOR[kind];

      if (p.brems) {
        // un photon de freinage : trait ondulé court
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const xx = x - 12 + i;
          const yy = axis + p.y + Math.sin(i * 0.9) * 2.4;
          if (i === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        continue;
      }

      ctx.strokeStyle = col;
      ctx.lineWidth = kind === 'alpha' ? 2.4 : 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x - (kind === 'alpha' ? 9 : 14), axis + p.y);
      ctx.lineTo(x, axis + p.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── bilan lisible sur la scène
    const pct = result.transmitted;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.ink;
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillText(
      pct <= 0 ? 'rien ne passe' : `${(pct * 100).toPrecision(3)} %`,
      W - 14,
      44
    );
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('transmis', W - 14, 60);
  }, [material, thickness, kind, beam, result]);

  // Les références suivent chaque rendu, la boucle les lit sans redémarrer
  const stateRef = useRef({ kind, material, beam, thickness });
  const runRef = useRef(running);
  runRef.current = running;
  drawRef.current = draw;
  stopRef.current = drawStop;
  stateRef.current = { kind, material, beam, thickness };

  // ── animation
  //
  // Un seul effet, au montage, et la boucle ne s'arrête plus jamais. Trois
  // choix délibérés, chacun pour un défaut rencontré :
  //
  //  - elle ne dépend d'aucun callback, sinon chaque rendu la redémarrerait et
  //    remettrait son horloge à zéro — les particules avanceraient au ralenti
  //    sans que rien ne paraisse anormal ;
  //  - l'image suivante est demandée avant le travail, pas après, pour qu'une
  //    exception ne puisse pas tuer la chaîne en silence ;
  //  - la pause et « réduire les animations » se lisent dans la boucle, au
  //    lieu de la faire redémarrer.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = 0;
    let alive = true;

    const step = (now: number) => {
      if (!alive) return;
      rafRef.current = requestAnimationFrame(step);

      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (runRef.current && !reduced) {
        const st = stateRef.current;

        accRef.current = Math.min(accRef.current + dt, 0.2);
        while (accRef.current > 0.03 && partsRef.current.length < 80) {
          accRef.current -= 0.03;
          partsRef.current.push({
            u: 0,
            y: (Math.random() - 0.5) * 78,
            speed: 0.85 + Math.random() * 0.3,
            stopAt: stopRef.current(),
            brems: false,
          });
        }

        const next: Particle[] = [];
        for (const p of partsRef.current) {
          p.u += p.speed * dt;

          // entrée dans l'écran : la particule s'arrête à sa profondeur
          const inside = (p.u - SLAB_START) / SLAB_SPAN;
          if (!p.brems && inside > 0 && inside >= p.stopAt) {
            // un β arrêté dans un matériau lourd peut repartir en photon
            if (st.kind === 'beta') {
              const y = attenuateBeta(st.material, st.beam.energy, st.thickness).brems;
              if (Math.random() < y * 4) {
                next.push({
                  u: SLAB_START + Math.min(1, p.stopAt) * SLAB_SPAN,
                  y: p.y,
                  speed: 1.1,
                  stopAt: 99,
                  brems: true,
                });
              }
            }
            continue; // absorbée
          }
          if (p.u < 1.02) next.push(p);
        }
        partsRef.current = next;
      }

      drawRef.current();
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Changer de réglage vide la scène : les particules en vol appartenaient à
  // l'ancien écran
  useEffect(() => {
    partsRef.current = [];
  }, [kind, beamId, materialId, logT]);

  // ── équivalences entre matériaux (photons seulement)
  const equivalents = useMemo(() => {
    if (kind !== 'photon') return null;
    return equivalentThickness(material, thickness, beam.id)
      .slice()
      .sort((a, b) => a.cm - b.cm);
  }, [kind, material, thickness, beam]);

  const advice = useMemo(() => {
    if (kind === 'alpha')
      return "Quelques centimètres d'air suffisent. Le blindage n'est jamais le problème avec les α — l'inhalation ou l'ingestion, si : une fois à l'intérieur, toute leur énergie se dépose dans quelques dizaines de micromètres de tissu.";
    if (kind === 'beta')
      return material.z > 20
        ? `Mauvais choix. ${material.label} arrête bien les β, mais en convertit ${(attenuateBeta(material, beam.energy, thickness).brems * 100).toFixed(1)} % de l'énergie en rayonnement de freinage, contre lequel il faut se protéger à nouveau. On met d'abord du plastique, et du plomb ensuite seulement si nécessaire.`
        : `Bon choix : un matériau léger arrête les β en ne produisant presque pas de rayonnement de freinage — ${(attenuateBeta(material, beam.energy, thickness).brems * 100).toFixed(2)} % de l'énergie ici.`;
    if (kind === 'neutron')
      return material.hFraction > 0.05
        ? `Bon choix : l'hydrogène a la masse d'un neutron, il lui prend donc presque toute son énergie à chaque choc. C'est ce qui ralentit le neutron jusqu'à ce qu'il soit capturé.`
        : `${material.label} retire des neutrons rapides par centimètre à peu près aussi bien que le polyéthylène — mais pour une masse dix fois supérieure, et sans les ralentir : un noyau lourd ne prend presque aucune énergie au choc.`;
    return material.z > 40
      ? `À ${beam.energy < 0.2 ? 'cette énergie, l’effet photoélectrique domine et varie comme Z⁴ : le numéro atomique élevé' : 'plus haute énergie, l’avantage du numéro atomique s’efface et c’est surtout la densité qui'} fait la différence.`
      : `Un matériau léger : il faut en mettre beaucoup plus, mais il est bon marché et on peut en couler des mètres. C'est le calcul de toutes les salles de traitement.`;
  }, [kind, material, beam, thickness]);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <h3 className="text-lg font-semibold text-stone-800">
          Blindage — quel écran pour quel rayonnement
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Il n&apos;y a pas de bon matériau dans l&apos;absolu : il y en a un par
          type de faisceau. Changez de rayonnement sans toucher à l&apos;écran, et
          regardez le verdict s&apos;inverser.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Famille de rayonnement */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as BeamKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                k === kind
                  ? 'bg-ink-900 text-gold-200'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          width={SCENE.w}
          height={SCENE.h}
          className="w-full max-w-[900px] mx-auto rounded-lg border border-stone-200"
        />

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Source
            </label>
            <select
              value={beamId}
              onChange={(e) => setBeamId(e.target.value)}
              className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              {beamsOfKind.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">{beam.detail}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Matériau de l&apos;écran
            </label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              {MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">{material.note}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Épaisseur
            </label>
            <input
              type="range"
              min={MIN_LOG}
              max={MAX_LOG}
              step={0.01}
              value={logT}
              onChange={(e) => setLogT(+e.target.value)}
              className="w-full"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-mono text-stone-700">
                {formatThickness(thickness)}
              </span>
              <span className="text-xs text-stone-500">
                {(thickness * material.rho * 10).toFixed(1)} kg/m²
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => setRunning(!running)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors"
          >
            {running ? '⏸ Pause' : '▶ Lecture'}
          </button>
          {kind === 'photon' && (
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={broad}
                onChange={(e) => setBroad(e.target.checked)}
              />
              Faisceau large (compter les diffusés)
            </label>
          )}
        </div>

        {/* Résultats */}
        <div className="rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-stone-50">
                <td className="px-4 py-2 font-medium text-stone-800">
                  Transmission
                </td>
                <td className="px-4 py-2 font-mono text-stone-900 text-right whitespace-nowrap">
                  {result.transmitted <= 0
                    ? '0'
                    : `${(result.transmitted * 100).toPrecision(3)} %`}
                </td>
                <td className="px-4 py-2 text-xs text-stone-500">
                  {formatFactor(result.transmitted)}
                </td>
              </tr>
              {result.rows.map(([k, v, note], i) => (
                <tr key={k} className={i % 2 ? 'bg-stone-50/60' : ''}>
                  <td className="px-4 py-1.5 text-stone-700">{k}</td>
                  <td className="px-4 py-1.5 font-mono text-stone-900 text-right whitespace-nowrap">
                    {v}
                  </td>
                  <td className="px-4 py-1.5 text-xs text-stone-500">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-lg p-4">
          {advice}
        </p>

        {/* Équivalences */}
        {equivalents && (
          <div>
            <h4 className="text-sm font-semibold text-stone-800 mb-1">
              La même atténuation, avec un autre matériau
            </h4>
            <p className="text-xs text-stone-500 mb-3">
              Ce qu&apos;il faudrait d&apos;épaisseur — et de masse — pour
              remplacer {formatThickness(thickness)} de {material.label.toLowerCase()}.
            </p>
            <div className="space-y-1.5">
              {equivalents.map(({ material: m, cm, kgPerM2 }) => {
                const max = equivalents[equivalents.length - 1].cm;
                return (
                  <div key={m.id} className="flex items-center gap-3 text-xs">
                    <span
                      className={`w-32 shrink-0 ${
                        m.id === material.id
                          ? 'font-semibold text-stone-800'
                          : 'text-stone-600'
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="flex-1 h-3 bg-stone-100 rounded overflow-hidden">
                      <span
                        className="block h-full rounded"
                        style={{
                          width: `${Math.max(1.5, (cm / max) * 100)}%`,
                          background:
                            m.id === material.id ? '#b08128' : 'rgba(70,63,54,0.32)',
                        }}
                      />
                    </span>
                    <span className="w-20 text-right font-mono text-stone-700">
                      {formatThickness(cm)}
                    </span>
                    <span className="w-24 text-right font-mono text-stone-400">
                      {kgPerM2 < 10000 ? `${kgPerM2.toFixed(0)} kg/m²` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-500">
          Valeurs de référence arrondies, suffisantes pour comparer des
          matériaux entre eux. Aucun dimensionnement d&apos;installation ne doit
          en sortir : une enceinte réelle se calcule en faisceau large, avec les
          facteurs d&apos;accumulation tabulés, les fuites, la diffusion et le
          rayonnement de capture. Le facteur d&apos;accumulation employé ici est
          une approximation du premier ordre.
        </p>
      </div>
    </div>
  );
}

export default ShieldingSimulator;
