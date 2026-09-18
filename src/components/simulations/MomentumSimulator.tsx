'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Conservation de la quantité de mouvement — choc frontal entre deux chariots.
//
// Avec un coefficient de restitution e, les vitesses après le choc valent
//   v1' = ((m1 - e*m2) v1 + (1 + e) m2 v2) / (m1 + m2)
//   v2' = ((m2 - e*m1) v2 + (1 + e) m1 v1) / (m1 + m2)
// e = 1 : choc élastique (énergie conservée)
// e = 0 : choc parfaitement mou (les chariots repartent ensemble)
// ---------------------------------------------------------------------------

type Phase = 'before' | 'after';

interface CartState {
  x1: number;
  x2: number;
  v1: number;
  v2: number;
  phase: Phase;
}

interface Snapshot {
  v1: number;
  v2: number;
  p1: number;
  p2: number;
  pTotal: number;
  ke1: number;
  ke2: number;
  keTotal: number;
}

const TRACK_MIN = -5; // m
const TRACK_MAX = 5; // m
const CART_COLOR_1 = '#c1974f';
const CART_COLOR_2 = '#c65c3c';
const COM_COLOR = '#d98028';

interface Preset {
  id: string;
  label: string;
  note: string;
  m1: number;
  m2: number;
  v1: number;
  v2: number;
  e: number;
}

const PRESETS: Preset[] = [
  {
    id: 'elastique-egal',
    label: 'Choc élastique, masses égales',
    note: 'Masses égales et choc élastique : les chariots échangent tout simplement leurs vitesses.',
    m1: 2, m2: 2, v1: 3, v2: -1, e: 1,
  },
  {
    id: 'mou',
    label: 'Choc parfaitement mou',
    note: 'Les chariots restent collés et repartent à la vitesse du centre de masse. C’est le cas où l’on perd le plus d’énergie.',
    m1: 3, m2: 1, v1: 2, v2: 0, e: 0,
  },
  {
    id: 'mur',
    label: 'Petit contre gros',
    note: 'Un chariot léger rebondit presque à sa vitesse d’arrivée sur un chariot très lourd : c’est la limite du rebond sur un mur.',
    m1: 0.5, m2: 8, v1: 4, v2: 0, e: 1,
  },
  {
    id: 'frontal',
    label: 'Choc frontal, p total nul',
    note: 'Les deux quantités de mouvement s’annulent : p total = 0 avant comme après, quel que soit le type de choc.',
    m1: 2, m2: 4, v1: 4, v2: -2, e: 0.6,
  },
];

function snapshot(m1: number, m2: number, v1: number, v2: number): Snapshot {
  const p1 = m1 * v1;
  const p2 = m2 * v2;
  const ke1 = 0.5 * m1 * v1 * v1;
  const ke2 = 0.5 * m2 * v2 * v2;
  return { v1, v2, p1, p2, pTotal: p1 + p2, ke1, ke2, keTotal: ke1 + ke2 };
}

/** Demi-largeur d'un chariot, en mètres : proportionnelle à la racine de la masse */
function halfWidth(mass: number): number {
  return 0.18 + 0.22 * Math.sqrt(mass);
}

function Collision1D() {
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(3);
  const [v1Init, setV1Init] = useState(3);
  const [v2Init, setV2Init] = useState(-1);
  const [restitution, setRestitution] = useState(1);
  const [running, setRunning] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // État courant des chariots, regroupé : positions, vitesses et phase avancent
  // ensemble à chaque image, et la collision les modifie d'un seul coup.
  const [carts, setCarts] = useState<CartState>({
    x1: -3,
    x2: 2,
    v1: 3,
    v2: -1,
    phase: 'before',
  });
  const { x1, x2, v1, v2, phase } = carts;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const before = snapshot(m1, m2, v1Init, v2Init);
  const after = (() => {
    const total = m1 + m2;
    const e = restitution;
    return snapshot(
      m1,
      m2,
      ((m1 - e * m2) * v1Init + (1 + e) * m2 * v2Init) / total,
      ((m2 - e * m1) * v2Init + (1 + e) * m1 * v1Init) / total
    );
  })();

  const vCom = (m1 * v1Init + m2 * v2Init) / (m1 + m2);
  const energyLost = before.keTotal - after.keTotal;
  const energyLostPct = before.keTotal > 1e-9 ? (energyLost / before.keTotal) * 100 : 0;

  const reset = useCallback(() => {
    // On place les chariots de part et d'autre du centre de la piste
    setCarts({ x1: -3, x2: 2, v1: v1Init, v2: v2Init, phase: 'before' });
    lastTimeRef.current = undefined;
  }, [v1Init, v2Init]);

  // Tout changement de paramètre relance la scène
  useEffect(() => {
    reset();
  }, [reset, m1, m2, restitution]);

  const applyPreset = useCallback((p: Preset) => {
    setM1(p.m1);
    setM2(p.m2);
    setV1Init(p.v1);
    setV2Init(p.v2);
    setRestitution(p.e);
    setActivePreset(p.id);
  }, []);

  // ---------------------------------------------------------------- Animation
  useEffect(() => {
    if (!running) {
      lastTimeRef.current = undefined;
      return;
    }

    const tick = (now: number) => {
      const last = lastTimeRef.current;
      lastTimeRef.current = now;

      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.05) * 0.6; // ralenti d'affichage

        setCarts((prev) => {
          const h1 = halfWidth(m1);
          const h2 = halfWidth(m2);
          const nextX1 = prev.x1 + prev.v1 * dt;
          const nextX2 = prev.x2 + prev.v2 * dt;

          // Collision : les chariots se touchent et se rapprochent encore
          if (prev.phase === 'before' && nextX1 + h1 >= nextX2 - h2 && prev.v1 > prev.v2) {
            // On les pose exactement au contact pour éviter l'interpénétration
            const contact = (nextX1 + h1 + nextX2 - h2) / 2;
            return {
              x1: contact - h1,
              x2: contact + h2,
              v1: after.v1,
              v2: after.v2,
              phase: 'after',
            };
          }

          // Relance quand les deux chariots sont sortis du cadre
          const bothPast =
            (nextX1 - h1 > TRACK_MAX + 1.5 && nextX2 - h2 > TRACK_MAX + 1.5) ||
            (nextX1 + h1 < TRACK_MIN - 1.5 && nextX2 + h2 < TRACK_MIN - 1.5);
          if (bothPast) {
            return { x1: -3, x2: 2, v1: v1Init, v2: v2Init, phase: 'before' };
          }

          return { ...prev, x1: nextX1, x2: nextX2 };
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, m1, m2, after.v1, after.v2, v1Init, v2Init]);

  // ------------------------------------------------------------------ Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, W, H);

    const pad = 30;
    const scale = (W - 2 * pad) / (TRACK_MAX - TRACK_MIN);
    const toPx = (x: number) => pad + (x - TRACK_MIN) * scale;
    const trackY = H - 74;

    // --- Piste
    ctx.strokeStyle = '#aba6a1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad - 12, trackY);
    ctx.lineTo(W - pad + 12, trackY);
    ctx.stroke();

    // Graduations
    ctx.strokeStyle = '#d8d6d4';
    ctx.fillStyle = '#aba6a1';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;
    for (let x = TRACK_MIN; x <= TRACK_MAX; x += 1) {
      const px = toPx(x);
      ctx.beginPath();
      ctx.moveTo(px, trackY);
      ctx.lineTo(px, trackY + 7);
      ctx.stroke();
      if (x % 2 === 0) ctx.fillText(`${x}`, px, trackY + 21);
    }

    // --- Chariot
    const drawCart = (
      x: number,
      mass: number,
      velocity: number,
      color: string,
      name: string
    ) => {
      const h = halfWidth(mass) * scale;
      const bodyH = 26 + 5 * Math.sqrt(mass) * 3;
      const left = toPx(x) - h;
      const top = trackY - 10 - bodyH;

      // Corps
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(left, top, h * 2, bodyH, 6);
      ctx.fill();

      // Roues
      ctx.fillStyle = '#5d5853';
      [left + h * 0.5, left + h * 1.5].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, trackY - 5, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Étiquette de masse
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${mass} kg`, toPx(x), top + bodyH / 2 + 5);
      ctx.fillStyle = '#484440';
      ctx.font = '12px system-ui';
      ctx.fillText(name, toPx(x), top - 28);

      // Vecteur vitesse
      if (Math.abs(velocity) > 0.01) {
        const len = Math.min(Math.abs(velocity) * 16, 90) * Math.sign(velocity);
        const ay = top - 14;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(toPx(x), ay);
        ctx.lineTo(toPx(x) + len, ay);
        ctx.stroke();
        const dir = Math.sign(len);
        ctx.beginPath();
        ctx.moveTo(toPx(x) + len, ay);
        ctx.lineTo(toPx(x) + len - dir * 9, ay - 5);
        ctx.lineTo(toPx(x) + len - dir * 9, ay + 5);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = dir > 0 ? 'left' : 'right';
        ctx.fillText(`${velocity.toFixed(2)} m/s`, toPx(x) + len + dir * 6, ay + 4);
      }
    };

    drawCart(x1, m1, v1, CART_COLOR_1, 'Chariot 1');
    drawCart(x2, m2, v2, CART_COLOR_2, 'Chariot 2');

    // --- Centre de masse : il traverse la collision sans changer de vitesse
    const xCom = (m1 * x1 + m2 * x2) / (m1 + m2);
    const comPx = toPx(xCom);
    ctx.strokeStyle = COM_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(comPx, 34);
    ctx.lineTo(comPx, trackY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COM_COLOR;
    ctx.beginPath();
    ctx.moveTo(comPx, 30);
    ctx.lineTo(comPx - 6, 20);
    ctx.lineTo(comPx + 6, 20);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`centre de masse · ${vCom.toFixed(2)} m/s`, comPx, 14);

    // --- Bandeau de phase
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui';
    ctx.fillStyle = phase === 'before' ? '#5d5853' : '#7c4916';
    ctx.fillText(phase === 'before' ? 'Avant le choc' : 'Après le choc', 12, H - 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aba6a1';
    ctx.fillText('position (m)', W - 12, H - 12);
  }, [x1, x2, v1, v2, m1, m2, phase, vCom]);

  const preset = PRESETS.find((p) => p.id === activePreset);

  const collisionLabel =
    restitution >= 0.999
      ? 'Choc élastique'
      : restitution <= 0.001
      ? 'Choc parfaitement mou'
      : 'Choc partiellement élastique';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Choc frontal — deux chariots
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Tout se passe sur une droite. Quoi qu&apos;il arrive au choc, la
          quantité de mouvement totale reste la même — l&apos;énergie cinétique,
          non.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-ocre-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-ocre-900 bg-ocre-50 border-l-4 border-ocre-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div className="rounded-lg border-l-4 border-gold-500 bg-gold-50 p-3 space-y-3">
            <h4 className="font-semibold text-gold-800 text-sm">Chariot 1</h4>
            <div>
              <label className="flex justify-between text-sm text-gold-900 mb-1">
                <span>Masse m₁</span>
                <span className="font-mono">{m1} kg</span>
              </label>
              <input
                type="range" min={0.5} max={10} step={0.5} value={m1}
                onChange={(e) => { setM1(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-gold-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm text-gold-900 mb-1">
                <span>Vitesse v₁</span>
                <span className="font-mono">{v1Init.toFixed(1)} m/s</span>
              </label>
              <input
                type="range" min={-6} max={6} step={0.5} value={v1Init}
                onChange={(e) => { setV1Init(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-gold-600"
              />
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-brun-500 bg-brun-50 p-3 space-y-3">
            <h4 className="font-semibold text-brun-800 text-sm">Chariot 2</h4>
            <div>
              <label className="flex justify-between text-sm text-brun-900 mb-1">
                <span>Masse m₂</span>
                <span className="font-mono">{m2} kg</span>
              </label>
              <input
                type="range" min={0.5} max={10} step={0.5} value={m2}
                onChange={(e) => { setM2(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-brun-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm text-brun-900 mb-1">
                <span>Vitesse v₂</span>
                <span className="font-mono">{v2Init.toFixed(1)} m/s</span>
              </label>
              <input
                type="range" min={-6} max={6} step={0.5} value={v2Init}
                onChange={(e) => { setV2Init(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-brun-600"
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Coefficient de restitution e</span>
              <span className="font-mono text-stone-900">{restitution.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05} value={restitution}
              onChange={(e) => { setRestitution(Number(e.target.value)); setActivePreset(null); }}
              className="w-full accent-ocre-600"
            />
            <p className="text-xs text-stone-500 mt-1">{collisionLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-ocre-600 text-white hover:bg-ocre-700 transition-colors"
            >
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button
              onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              ↺ Rejouer
            </button>
          </div>
        </div>

        {/* Scène et bilans */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={720} height={340} className="w-full" />
          </div>

          {/* Bilan avant / après */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-200">
                  <th className="py-2 font-medium">Grandeur</th>
                  <th className="py-2 font-medium text-right">Avant</th>
                  <th className="py-2 font-medium text-right">Après</th>
                  <th className="py-2 font-medium text-right">Variation</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-stone-100">
                  <td className="py-2 font-sans text-gold-700">v₁</td>
                  <td className="py-2 text-right">{before.v1.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.v1.toFixed(2)}</td>
                  <td className="py-2 text-right text-stone-400">
                    {(after.v1 - before.v1).toFixed(2)} m/s
                  </td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 font-sans text-brun-700">v₂</td>
                  <td className="py-2 text-right">{before.v2.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.v2.toFixed(2)}</td>
                  <td className="py-2 text-right text-stone-400">
                    {(after.v2 - before.v2).toFixed(2)} m/s
                  </td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 font-sans text-gold-700">p₁ = m₁v₁</td>
                  <td className="py-2 text-right">{before.p1.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.p1.toFixed(2)}</td>
                  <td className="py-2 text-right text-stone-400">
                    {(after.p1 - before.p1).toFixed(2)} kg·m/s
                  </td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 font-sans text-brun-700">p₂ = m₂v₂</td>
                  <td className="py-2 text-right">{before.p2.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.p2.toFixed(2)}</td>
                  <td className="py-2 text-right text-stone-400">
                    {(after.p2 - before.p2).toFixed(2)} kg·m/s
                  </td>
                </tr>
                <tr className="border-b-2 border-ocre-300 bg-ocre-50">
                  <td className="py-2 font-sans font-semibold text-ocre-900">
                    p total
                  </td>
                  <td className="py-2 text-right font-semibold text-ocre-900">
                    {before.pTotal.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-semibold text-ocre-900">
                    {after.pTotal.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-semibold text-olive-700">
                    {Math.abs(after.pTotal - before.pTotal) < 1e-9
                      ? '0 — conservée'
                      : `${(after.pTotal - before.pTotal).toFixed(2)} kg·m/s`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-semibold text-stone-700">
                    Énergie cinétique
                  </td>
                  <td className="py-2 text-right">{before.keTotal.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.keTotal.toFixed(2)}</td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      energyLost > 1e-6 ? 'text-brun-600' : 'text-olive-700'
                    }`}
                  >
                    {energyLost > 1e-6
                      ? `−${energyLost.toFixed(2)} J (${energyLostPct.toFixed(0)} %)`
                      : '0 — conservée'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-ocre-50 rounded-lg p-3">
              <span className="text-ocre-700 block text-xs">Vitesse du centre de masse</span>
              <strong className="text-ocre-900 font-mono">{vCom.toFixed(2)} m/s</strong>
              <p className="text-xs text-ocre-700 mt-1">Identique avant et après.</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <span className="text-stone-500 block text-xs">Impulsion sur le chariot 1</span>
              <strong className="text-stone-900 font-mono">
                {(after.p1 - before.p1).toFixed(2)} N·s
              </strong>
              <p className="text-xs text-stone-500 mt-1">Opposée à celle sur le 2.</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <span className="text-stone-500 block text-xs">Vitesse relative</span>
              <strong className="text-stone-900 font-mono">
                {Math.abs(after.v2 - after.v1).toFixed(2)} m/s
              </strong>
              <p className="text-xs text-stone-500 mt-1">
                = e × {Math.abs(before.v1 - before.v2).toFixed(2)} m/s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Quantité de mouvement
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">Conservation</h4>
            <BlockMath math="m_1v_1 + m_2v_2 = m_1v_1' + m_2v_2'" />
            <p className="text-ocre-700 mt-2">
              Sans force extérieure, la quantité de mouvement totale d&apos;un
              système ne change jamais — quel que soit le type de choc.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Impulsion</h4>
            <BlockMath math="\vec{J} = \int \vec{F}\,dt = \Delta \vec{p}" />
            <p className="text-gold-700 mt-2">
              Par la 3ᵉ loi de Newton, les deux chariots reçoivent des impulsions
              égales et opposées : les variations de <InlineMath math="p" /> se
              compensent exactement.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Choc élastique</h4>
            <BlockMath math="e = 1 \quad\Rightarrow\quad \sum \tfrac{1}{2}mv^2 = \text{cte}" />
            <p className="text-olive-700 mt-2">
              Seul cas où l&apos;énergie cinétique est aussi conservée. À masses
              égales, les vitesses s&apos;échangent.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Choc mou</h4>
            <BlockMath math="e = 0 \quad\Rightarrow\quad v_1' = v_2' = v_{cm}" />
            <p className="text-brun-700 mt-2">
              Les corps repartent ensemble. L&apos;énergie perdue part en
              déformation, chaleur et son.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Coefficient de restitution</h4>
            <BlockMath math="e = \frac{|v_2' - v_1'|}{|v_1 - v_2|}" />
            <p className="text-prune-700 mt-2">
              Le rapport des vitesses de séparation et d&apos;approche. Entre 0
              et 1 dans la réalité.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Énergie perdue</h4>
            <BlockMath math="\Delta E = \tfrac{1}{2}\mu\,(1 - e^2)(v_1 - v_2)^2" />
            <p className="text-stone-700 mt-2">
              Avec <InlineMath math="\mu = \frac{m_1 m_2}{m_1 + m_2}" />, la masse
              réduite. Nulle si <InlineMath math="e = 1" />.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ===========================================================================
// Choc 2D — pierres de curling vues de haut
//
// Un choc oblique se résout toujours de la même façon : on décompose les
// vitesses sur la ligne des centres (la normale au contact) et sur la
// tangente. La tangente ne change pas — sans frottement, rien ne pousse dans
// cette direction. La normale suit exactement la formule du choc frontal.
// ===========================================================================

interface Vec {
  x: number;
  y: number;
}

interface StoneState {
  r1: Vec;
  r2: Vec;
  v1: Vec;
  v2: Vec;
  phase: Phase;
  trail1: Vec[];
  trail2: Vec[];
}

/** Rayon d'une pierre (m). Une vraie pierre de curling fait 14,5 cm de rayon
 *  pour 19,96 kg ; on laisse le rayon suivre un peu la masse pour que le
 *  dessin reste honnête quand on change les masses. */
function stoneRadius(mass: number): number {
  return 0.145 * Math.cbrt(mass / 19.96);
}

const REAL_STONE_MASS = 19.96; // kg
const START_X = -2.0; // m, d'où part la pierre lancée

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const norm = (a: Vec): number => Math.hypot(a.x, a.y);

interface Preset2D {
  id: string;
  label: string;
  note: string;
  m1: number;
  m2: number;
  v0: number;
  impact: number;
  e: number;
}

const PRESETS_2D: Preset2D[] = [
  {
    id: 'takeout',
    label: 'Sortie franche',
    note: 'Choc presque de plein fouet : la pierre lancée s’arrête net et transmet tout à la pierre immobile. C’est le takeout du curling.',
    m1: REAL_STONE_MASS, m2: REAL_STONE_MASS, v0: 2.4, impact: 0.02, e: 1,
  },
  {
    id: 'oblique',
    label: 'Choc oblique',
    note: 'Deux masses égales, choc élastique : les deux pierres repartent exactement à 90° l’une de l’autre. Ça ne dépend ni de la vitesse ni de l’angle d’attaque.',
    m1: REAL_STONE_MASS, m2: REAL_STONE_MASS, v0: 2.4, impact: 0.17, e: 1,
  },
  {
    id: 'frolement',
    label: 'Frôlement',
    note: 'À paramètre d’impact presque maximal, la ligne des centres est quasi perpendiculaire au mouvement : la pierre lancée est à peine déviée.',
    m1: REAL_STONE_MASS, m2: REAL_STONE_MASS, v0: 2.4, impact: 0.27, e: 1,
  },
  {
    id: 'inegales',
    label: 'Masses inégales',
    note: 'Une pierre lourde contre une légère : la lourde continue presque tout droit, la légère part vite et loin.',
    m1: 32, m2: 12, v0: 2.2, impact: 0.12, e: 1,
  },
];

/** Vue : x de -2.2 à 1.8 m, y de -1.25 à 1.25 m */
const VIEW = { xMin: -2.2, xMax: 1.8, yMin: -1.25, yMax: 1.25 };

function Collision2D() {
  const [m1, setM1] = useState(REAL_STONE_MASS);
  const [m2, setM2] = useState(REAL_STONE_MASS);
  const [v0, setV0] = useState(2.4);
  const [impact, setImpact] = useState(0.17); // paramètre d'impact b (m)
  const [restitution, setRestitution] = useState(1);
  const [running, setRunning] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>('oblique');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const R1 = stoneRadius(m1);
  const R2 = stoneRadius(m2);
  const contactDist = R1 + R2;
  // Le paramètre d'impact ne peut pas dépasser la somme des rayons, sinon les
  // pierres se manquent.
  const bMax = contactDist * 0.985;
  const b = Math.max(-bMax, Math.min(bMax, impact));

  const [stones, setStones] = useState<StoneState>({
    r1: { x: START_X, y: 0.17 },
    r2: { x: 0, y: 0 },
    v1: { x: 2.4, y: 0 },
    v2: { x: 0, y: 0 },
    phase: 'before',
    trail1: [],
    trail2: [],
  });

  // ------------------------------------------------------------- Physique
  // Vitesses après le choc, calculées une fois pour toutes à partir de la
  // géométrie du contact : elle ne dépend que du paramètre d'impact.
  const outcome = (() => {
    const before1: Vec = { x: v0, y: 0 };
    const before2: Vec = { x: 0, y: 0 };

    // Position des centres au moment du contact
    const dx = Math.sqrt(Math.max(contactDist * contactDist - b * b, 0));
    const contact1: Vec = { x: -dx, y: b };
    const contact2: Vec = { x: 0, y: 0 };

    // Normale : de la pierre 1 vers la pierre 2 (la ligne des centres)
    const n = scale(sub(contact2, contact1), 1 / contactDist);
    const t: Vec = { x: -n.y, y: n.x };

    const v1n = dot(before1, n);
    const v1t = dot(before1, t);
    const v2n = dot(before2, n);
    const v2t = dot(before2, t);

    const total = m1 + m2;
    const e = restitution;
    const v1nAfter = ((m1 - e * m2) * v1n + (1 + e) * m2 * v2n) / total;
    const v2nAfter = ((m2 - e * m1) * v2n + (1 + e) * m1 * v1n) / total;

    // On recompose : la tangentielle est inchangée, la normale a été modifiée
    const after1 = add(scale(n, v1nAfter), scale(t, v1t));
    const after2 = add(scale(n, v2nAfter), scale(t, v2t));

    const pBefore = add(scale(before1, m1), scale(before2, m2));
    const pAfter = add(scale(after1, m1), scale(after2, m2));
    const keBefore = 0.5 * m1 * dot(before1, before1) + 0.5 * m2 * dot(before2, before2);
    const keAfter = 0.5 * m1 * dot(after1, after1) + 0.5 * m2 * dot(after2, after2);

    // Angle entre les deux trajectoires sortantes
    let separation = 0;
    if (norm(after1) > 1e-6 && norm(after2) > 1e-6) {
      const c = dot(after1, after2) / (norm(after1) * norm(after2));
      separation = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    }

    const deviation1 = (Math.atan2(after1.y, after1.x) * 180) / Math.PI;
    const deviation2 = (Math.atan2(after2.y, after2.x) * 180) / Math.PI;

    return {
      before1, before2, after1, after2, contact1, n,
      pBefore, pAfter, keBefore, keAfter,
      separation, deviation1, deviation2,
    };
  })();

  const energyLost = outcome.keBefore - outcome.keAfter;
  const energyLostPct = outcome.keBefore > 1e-9 ? (energyLost / outcome.keBefore) * 100 : 0;

  const reset = useCallback(() => {
    setStones({
      r1: { x: START_X, y: b },
      r2: { x: 0, y: 0 },
      v1: { x: v0, y: 0 },
      v2: { x: 0, y: 0 },
      phase: 'before',
      trail1: [],
      trail2: [],
    });
    lastTimeRef.current = undefined;
  }, [b, v0]);

  useEffect(() => {
    reset();
  }, [reset, m1, m2, restitution]);

  const applyPreset = useCallback((p: Preset2D) => {
    setM1(p.m1);
    setM2(p.m2);
    setV0(p.v0);
    setImpact(p.impact);
    setRestitution(p.e);
    setActivePreset(p.id);
  }, []);

  // ------------------------------------------------------------- Animation
  useEffect(() => {
    if (!running) {
      lastTimeRef.current = undefined;
      return;
    }

    const tick = (now: number) => {
      const last = lastTimeRef.current;
      lastTimeRef.current = now;

      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.05) * 0.55; // ralenti

        setStones((prev) => {
          const next1 = add(prev.r1, scale(prev.v1, dt));
          const next2 = add(prev.r2, scale(prev.v2, dt));
          const gap = norm(sub(next2, next1));

          // Contact : on pose les pierres exactement tangentes et on applique
          // le résultat calculé plus haut.
          if (prev.phase === 'before' && gap <= contactDist) {
            return {
              r1: outcome.contact1,
              r2: { x: 0, y: 0 },
              v1: outcome.after1,
              v2: outcome.after2,
              phase: 'after',
              trail1: [...prev.trail1, outcome.contact1].slice(-160),
              trail2: [...prev.trail2, { x: 0, y: 0 }].slice(-160),
            };
          }

          // Relance quand les deux pierres ont quitté la surface
          const out = (r: Vec, radius: number) =>
            r.x - radius > VIEW.xMax || r.x + radius < VIEW.xMin ||
            r.y - radius > VIEW.yMax || r.y + radius < VIEW.yMin;
          if (prev.phase === 'after' && out(next1, R1) && out(next2, R2)) {
            return {
              r1: { x: START_X, y: b },
              r2: { x: 0, y: 0 },
              v1: { x: v0, y: 0 },
              v2: { x: 0, y: 0 },
              phase: 'before',
              trail1: [],
              trail2: [],
            };
          }

          return {
            ...prev,
            r1: next1,
            r2: next2,
            trail1: [...prev.trail1, next1].slice(-160),
            trail2: [...prev.trail2, next2].slice(-160),
          };
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, contactDist, R1, R2, b, v0,
      outcome.contact1, outcome.after1, outcome.after2]);

  // ---------------------------------------------------------------- Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scalePx = W / (VIEW.xMax - VIEW.xMin);
    const toX = (x: number) => (x - VIEW.xMin) * scalePx;
    const toY = (y: number) => H / 2 - y * scalePx;

    // --- La glace
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, W, H);

    // --- La maison, vue de haut : cercles concentriques
    const house: [number, string][] = [
      [1.83, '#e9dfce'], // 12 pieds
      [1.22, '#faf9f7'], // 8 pieds
      [0.61, '#e1b1a3'], // 4 pieds
      [0.15, '#faf9f7'], // le bouton
    ];
    house.forEach(([radius, color]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toX(0), toY(0), radius * scalePx, 0, Math.PI * 2);
      ctx.fill();
    });

    // Lignes de jeu
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(W, toY(0));   // ligne centrale
    ctx.moveTo(toX(0), 0);
    ctx.lineTo(toX(0), H);   // ligne du tee
    ctx.stroke();

    // --- Traces laissées par les pierres
    const drawTrail = (trail: Vec[], color: string) => {
      if (trail.length < 2) return;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(toX(pt.x), toY(pt.y));
        else ctx.lineTo(toX(pt.x), toY(pt.y));
      });
      ctx.stroke();
      ctx.restore();
    };
    drawTrail(stones.trail1, CART_COLOR_1);
    drawTrail(stones.trail2, CART_COLOR_2);

    // --- Une pierre de curling vue de haut
    const drawStone = (
      pos: Vec,
      radius: number,
      mass: number,
      handle: string,
      label: string
    ) => {
      const px = toX(pos.x);
      const py = toY(pos.y);
      const rp = radius * scalePx;

      // Ombre portée sur la glace
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.arc(px + 2, py + 3, rp, 0, Math.PI * 2);
      ctx.fill();

      // Le granit
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(px, py, rp, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.arc(px, py, rp * 0.82, 0, Math.PI * 2);
      ctx.fill();

      // La bande colorée et la poignée
      ctx.strokeStyle = handle;
      ctx.lineWidth = Math.max(rp * 0.16, 2);
      ctx.beginPath();
      ctx.arc(px, py, rp * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = handle;
      ctx.beginPath();
      ctx.arc(px, py, rp * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = handle;
      ctx.fillRect(px - rp * 0.07, py - rp * 0.62, rp * 0.14, rp * 0.62);

      // Étiquette
      ctx.fillStyle = '#44403c';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} · ${mass.toFixed(1)} kg`, px, py - rp - 8);
    };

    // --- Vecteur vitesse
    const drawVelocity = (pos: Vec, v: Vec, color: string) => {
      const speed = norm(v);
      if (speed < 0.02) return;
      const px = toX(pos.x);
      const py = toY(pos.y);
      const len = Math.min(speed * 42, 130);
      const ux = v.x / speed;
      const uy = -v.y / speed; // l'écran a l'axe y vers le bas
      const ex = px + ux * len;
      const ey = py + uy * len;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const ang = Math.atan2(ey - py, ex - px);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 11 * Math.cos(ang - Math.PI / 6), ey - 11 * Math.sin(ang - Math.PI / 6));
      ctx.lineTo(ex - 11 * Math.cos(ang + Math.PI / 6), ey - 11 * Math.sin(ang + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = ux >= 0 ? 'left' : 'right';
      ctx.fillText(`${speed.toFixed(2)} m/s`, ex + ux * 8, ey + uy * 8 + 4);
    };

    // --- Ligne des centres au moment du contact, et angle de séparation
    if (stones.phase === 'after') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const c1 = outcome.contact1;
      ctx.beginPath();
      ctx.moveTo(toX(c1.x - outcome.n.x * 0.5), toY(c1.y - outcome.n.y * 0.5));
      ctx.lineTo(toX(outcome.n.x * 0.5), toY(outcome.n.y * 0.5));
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#57534e';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('ligne des centres', toX(c1.x) + 6, toY(c1.y) - 34);
    }

    drawStone(stones.r2, R2, m2, CART_COLOR_2, 'Pierre 2');
    drawStone(stones.r1, R1, m1, CART_COLOR_1, 'Pierre 1');
    drawVelocity(stones.r1, stones.v1, CART_COLOR_1);
    drawVelocity(stones.r2, stones.v2, CART_COLOR_2);

    // --- Bandeau
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = stones.phase === 'before' ? '#57534e' : '#7a4a18';
    ctx.fillText(
      stones.phase === 'before' ? 'Avant le choc' : 'Après le choc',
      12,
      H - 12
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a8a29e';
    ctx.fillText('vue de haut · surface sans frottement', W - 12, H - 12);
  }, [stones, m1, m2, R1, R2, outcome.contact1, outcome.n]);

  const preset = PRESETS_2D.find((p) => p.id === activePreset);
  const collisionLabel =
    restitution >= 0.999
      ? 'Choc élastique'
      : restitution <= 0.001
      ? 'Choc parfaitement mou'
      : 'Choc partiellement élastique';

  const equalMassesElastic =
    Math.abs(m1 - m2) < 1e-6 && restitution >= 0.999 && Math.abs(b) < bMax * 0.99;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Choc oblique — pierres de curling
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Vue de haut. Une pierre en percute une autre à l&apos;arrêt, plus ou
          moins de plein fouet. La quantité de mouvement se conserve maintenant
          comme un vecteur : en x et en y séparément.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS_2D.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-ocre-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-ocre-900 bg-ocre-50 border-l-4 border-ocre-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div className="rounded-lg border-l-4 border-gold-500 bg-gold-50 p-3 space-y-3">
            <h4 className="font-semibold text-gold-800 text-sm">
              Pierre 1 — la lancée
            </h4>
            <div>
              <label className="flex justify-between text-sm text-gold-900 mb-1">
                <span>Masse m₁</span>
                <span className="font-mono">{m1.toFixed(1)} kg</span>
              </label>
              <input
                type="range" min={5} max={40} step={0.5} value={m1}
                onChange={(e) => { setM1(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-gold-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm text-gold-900 mb-1">
                <span>Vitesse de lancer</span>
                <span className="font-mono">{v0.toFixed(1)} m/s</span>
              </label>
              <input
                type="range" min={0.5} max={5} step={0.1} value={v0}
                onChange={(e) => { setV0(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-gold-600"
              />
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-brun-500 bg-brun-50 p-3 space-y-3">
            <h4 className="font-semibold text-brun-800 text-sm">
              Pierre 2 — à l&apos;arrêt sur le bouton
            </h4>
            <div>
              <label className="flex justify-between text-sm text-brun-900 mb-1">
                <span>Masse m₂</span>
                <span className="font-mono">{m2.toFixed(1)} kg</span>
              </label>
              <input
                type="range" min={5} max={40} step={0.5} value={m2}
                onChange={(e) => { setM2(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-brun-600"
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Paramètre d&apos;impact b</span>
              <span className="font-mono text-stone-900">{b.toFixed(3)} m</span>
            </label>
            <input
              type="range"
              min={-bMax} max={bMax} step={0.005} value={b}
              onChange={(e) => { setImpact(Number(e.target.value)); setActivePreset(null); }}
              className="w-full accent-stone-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Le décalage entre les deux trajectoires. À b = 0, choc de plein
              fouet ; à b = {bMax.toFixed(2)} m, les pierres se frôlent.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Coefficient de restitution e</span>
              <span className="font-mono text-stone-900">{restitution.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05} value={restitution}
              onChange={(e) => { setRestitution(Number(e.target.value)); setActivePreset(null); }}
              className="w-full accent-ocre-600"
            />
            <p className="text-xs text-stone-500 mt-1">{collisionLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-ocre-600 text-white hover:bg-ocre-700 transition-colors"
            >
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button
              onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              ↺ Rejouer
            </button>
          </div>
        </div>

        {/* Scène et bilans */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={720} height={450} className="w-full" />
          </div>

          {equalMassesElastic && (
            <div className="bg-olive-50 border-l-4 border-olive-500 rounded-r-lg px-4 py-3 text-sm text-olive-900">
              <strong>Angle de séparation : {outcome.separation.toFixed(1)}°.</strong>{' '}
              À masses égales et choc élastique, deux pierres repartent toujours
              à 90° l&apos;une de l&apos;autre, quel que soit l&apos;angle
              d&apos;attaque. C&apos;est la conséquence directe des deux
              conservations prises ensemble.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-200">
                  <th className="py-2 font-medium">Grandeur</th>
                  <th className="py-2 font-medium text-right">Avant</th>
                  <th className="py-2 font-medium text-right">Après</th>
                  <th className="py-2 font-medium text-right">Variation</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-stone-100">
                  <td className="py-2 font-sans text-stone-700">p total en x</td>
                  <td className="py-2 text-right">{outcome.pBefore.x.toFixed(2)}</td>
                  <td className="py-2 text-right">{outcome.pAfter.x.toFixed(2)}</td>
                  <td className="py-2 text-right text-olive-700 font-semibold">
                    {Math.abs(outcome.pAfter.x - outcome.pBefore.x) < 1e-6
                      ? '0 — conservée'
                      : (outcome.pAfter.x - outcome.pBefore.x).toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b-2 border-ocre-300 bg-ocre-50">
                  <td className="py-2 font-sans font-semibold text-ocre-900">
                    p total en y
                  </td>
                  <td className="py-2 text-right font-semibold text-ocre-900">
                    {outcome.pBefore.y.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-semibold text-ocre-900">
                    {outcome.pAfter.y.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-olive-700 font-semibold">
                    {Math.abs(outcome.pAfter.y - outcome.pBefore.y) < 1e-6
                      ? '0 — conservée'
                      : (outcome.pAfter.y - outcome.pBefore.y).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-semibold text-stone-700">
                    Énergie cinétique
                  </td>
                  <td className="py-2 text-right">{outcome.keBefore.toFixed(2)}</td>
                  <td className="py-2 text-right">{outcome.keAfter.toFixed(2)}</td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      energyLost > 1e-6 ? 'text-brun-600' : 'text-olive-700'
                    }`}
                  >
                    {energyLost > 1e-6
                      ? `−${energyLost.toFixed(2)} J (${energyLostPct.toFixed(0)} %)`
                      : '0 — conservée'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-gold-50 rounded-lg p-3">
              <span className="text-gold-700 block text-xs">Pierre 1 après</span>
              <strong className="text-gold-900 font-mono">
                {norm(outcome.after1).toFixed(2)} m/s
              </strong>
              <p className="text-xs text-gold-700 mt-1">
                déviée de {Math.abs(outcome.deviation1).toFixed(1)}°
              </p>
            </div>
            <div className="bg-brun-50 rounded-lg p-3">
              <span className="text-brun-700 block text-xs">Pierre 2 après</span>
              <strong className="text-brun-900 font-mono">
                {norm(outcome.after2).toFixed(2)} m/s
              </strong>
              <p className="text-xs text-brun-700 mt-1">
                à {Math.abs(outcome.deviation2).toFixed(1)}° de l&apos;axe
              </p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <span className="text-stone-500 block text-xs">Angle de séparation</span>
              <strong className="text-stone-900 font-mono">
                {outcome.separation.toFixed(1)}°
              </strong>
              <p className="text-xs text-stone-500 mt-1">entre les deux sorties</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <span className="text-stone-500 block text-xs">|p| total</span>
              <strong className="text-stone-900 font-mono">
                {norm(outcome.pAfter).toFixed(2)}
              </strong>
              <p className="text-xs text-stone-500 mt-1">kg·m/s, inchangé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Choc oblique
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">Conservation vectorielle</h4>
            <BlockMath math="\sum m\vec{v} = \text{cte} \;\Leftrightarrow\; \begin{cases} \sum mv_x = \text{cte} \\ \sum mv_y = \text{cte} \end{cases}" />
            <p className="text-ocre-700 mt-2">
              En 2D, une seule équation vectorielle en cache deux : une par axe.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Normale et tangente</h4>
            <BlockMath math="\vec{v} = v_n\,\hat{n} + v_t\,\hat{t}" />
            <p className="text-gold-700 mt-2">
              Sans frottement, le contact ne pousse que le long de la ligne des
              centres. La composante tangentielle traverse le choc intacte, et
              la normale suit la formule du choc frontal.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">La règle des 90°</h4>
            <BlockMath math="m_1 = m_2,\; e = 1 \;\Rightarrow\; \vec{v_1\,}' \cdot \vec{v_2\,}' = 0" />
            <p className="text-olive-700 mt-2">
              Deux masses égales, choc élastique, l&apos;une au repos : les deux
              repartent perpendiculairement. Les joueurs de curling et de billard
              s&apos;en servent sans toujours le savoir.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Paramètre d&apos;impact</h4>
            <BlockMath math="\sin\theta = \frac{b}{R_1 + R_2}" />
            <p className="text-stone-700 mt-2">
              L&apos;angle de la ligne des centres au moment du contact. C&apos;est
              lui, et lui seul, qui décide comment l&apos;énergie se partage.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">La sortie franche</h4>
            <p className="text-brun-700">
              À b = 0 et masses égales, la pierre lancée s&apos;immobilise
              exactement et cède toute sa vitesse. C&apos;est le takeout parfait
              — et la raison pour laquelle toutes les pierres pèsent le même
              poids.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Et la vraie glace ?</h4>
            <p className="text-prune-700">
              Ici la surface est parfaitement lisse. Sur une vraie piste, le
              frottement et l&apos;effet de rotation courbent la trajectoire :
              la conservation ne vaut plus qu&apos;au moment du choc, qui est
              trop bref pour que le frottement compte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Sélecteur entre les deux situations
// ===========================================================================

export function MomentumSimulator() {
  const [mode, setMode] = useState<'1d' | '2d'>('1d');

  const tabs: { id: '1d' | '2d'; label: string; icon: string }[] = [
    { id: '1d', label: 'Choc frontal (1D)', icon: '↔️' },
    { id: '2d', label: 'Choc oblique — curling (2D)', icon: '🥌' },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              mode === tab.id
                ? 'bg-ocre-50 text-ocre-800 border-b-2 border-ocre-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-0">
        {mode === '1d' ? <Collision1D /> : <Collision2D />}
      </div>
    </div>
  );
}

export default MomentumSimulator;
