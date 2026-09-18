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
const CART_COLOR_1 = '#2563eb';
const CART_COLOR_2 = '#dc2626';
const COM_COLOR = '#cf8a4e';

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

export function MomentumSimulator() {
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

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const pad = 30;
    const scale = (W - 2 * pad) / (TRACK_MAX - TRACK_MIN);
    const toPx = (x: number) => pad + (x - TRACK_MIN) * scale;
    const trackY = H - 74;

    // --- Piste
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad - 12, trackY);
    ctx.lineTo(W - pad + 12, trackY);
    ctx.stroke();

    // Graduations
    ctx.strokeStyle = '#cbd5e1';
    ctx.fillStyle = '#94a3b8';
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
      ctx.fillStyle = '#475569';
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
      ctx.fillStyle = '#334155';
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
    ctx.fillStyle = phase === 'before' ? '#475569' : '#7a4a18';
    ctx.fillText(phase === 'before' ? 'Avant le choc' : 'Après le choc', 12, H - 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
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
        <h3 className="text-lg font-semibold text-gray-800">
          Conservation de la quantité de mouvement
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Deux chariots sur une piste sans frottement. Quoi qu&apos;il arrive au
          choc, la quantité de mouvement totale reste la même — l&apos;énergie
          cinétique, non.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-amber-900 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 space-y-3">
            <h4 className="font-semibold text-blue-800 text-sm">Chariot 1</h4>
            <div>
              <label className="flex justify-between text-sm text-blue-900 mb-1">
                <span>Masse m₁</span>
                <span className="font-mono">{m1} kg</span>
              </label>
              <input
                type="range" min={0.5} max={10} step={0.5} value={m1}
                onChange={(e) => { setM1(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm text-blue-900 mb-1">
                <span>Vitesse v₁</span>
                <span className="font-mono">{v1Init.toFixed(1)} m/s</span>
              </label>
              <input
                type="range" min={-6} max={6} step={0.5} value={v1Init}
                onChange={(e) => { setV1Init(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 space-y-3">
            <h4 className="font-semibold text-red-800 text-sm">Chariot 2</h4>
            <div>
              <label className="flex justify-between text-sm text-red-900 mb-1">
                <span>Masse m₂</span>
                <span className="font-mono">{m2} kg</span>
              </label>
              <input
                type="range" min={0.5} max={10} step={0.5} value={m2}
                onChange={(e) => { setM2(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-red-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-sm text-red-900 mb-1">
                <span>Vitesse v₂</span>
                <span className="font-mono">{v2Init.toFixed(1)} m/s</span>
              </label>
              <input
                type="range" min={-6} max={6} step={0.5} value={v2Init}
                onChange={(e) => { setV2Init(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-red-600"
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Coefficient de restitution e</span>
              <span className="font-mono text-gray-900">{restitution.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05} value={restitution}
              onChange={(e) => { setRestitution(Number(e.target.value)); setActivePreset(null); }}
              className="w-full accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">{collisionLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button
              onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              ↺ Rejouer
            </button>
          </div>
        </div>

        {/* Scène et bilans */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={720} height={340} className="w-full" />
          </div>

          {/* Bilan avant / après */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 font-medium">Grandeur</th>
                  <th className="py-2 font-medium text-right">Avant</th>
                  <th className="py-2 font-medium text-right">Après</th>
                  <th className="py-2 font-medium text-right">Variation</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-sans text-blue-700">v₁</td>
                  <td className="py-2 text-right">{before.v1.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.v1.toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-400">
                    {(after.v1 - before.v1).toFixed(2)} m/s
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-sans text-red-700">v₂</td>
                  <td className="py-2 text-right">{before.v2.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.v2.toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-400">
                    {(after.v2 - before.v2).toFixed(2)} m/s
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-sans text-blue-700">p₁ = m₁v₁</td>
                  <td className="py-2 text-right">{before.p1.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.p1.toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-400">
                    {(after.p1 - before.p1).toFixed(2)} kg·m/s
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-sans text-red-700">p₂ = m₂v₂</td>
                  <td className="py-2 text-right">{before.p2.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.p2.toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-400">
                    {(after.p2 - before.p2).toFixed(2)} kg·m/s
                  </td>
                </tr>
                <tr className="border-b-2 border-amber-300 bg-amber-50">
                  <td className="py-2 font-sans font-semibold text-amber-900">
                    p total
                  </td>
                  <td className="py-2 text-right font-semibold text-amber-900">
                    {before.pTotal.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-semibold text-amber-900">
                    {after.pTotal.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-semibold text-green-700">
                    {Math.abs(after.pTotal - before.pTotal) < 1e-9
                      ? '0 — conservée'
                      : `${(after.pTotal - before.pTotal).toFixed(2)} kg·m/s`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-sans font-semibold text-gray-700">
                    Énergie cinétique
                  </td>
                  <td className="py-2 text-right">{before.keTotal.toFixed(2)}</td>
                  <td className="py-2 text-right">{after.keTotal.toFixed(2)}</td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      energyLost > 1e-6 ? 'text-red-600' : 'text-green-700'
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
            <div className="bg-amber-50 rounded-lg p-3">
              <span className="text-amber-700 block text-xs">Vitesse du centre de masse</span>
              <strong className="text-amber-900 font-mono">{vCom.toFixed(2)} m/s</strong>
              <p className="text-xs text-amber-700 mt-1">Identique avant et après.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs">Impulsion sur le chariot 1</span>
              <strong className="text-gray-900 font-mono">
                {(after.p1 - before.p1).toFixed(2)} N·s
              </strong>
              <p className="text-xs text-gray-500 mt-1">Opposée à celle sur le 2.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs">Vitesse relative</span>
              <strong className="text-gray-900 font-mono">
                {Math.abs(after.v2 - after.v1).toFixed(2)} m/s
              </strong>
              <p className="text-xs text-gray-500 mt-1">
                = e × {Math.abs(before.v1 - before.v2).toFixed(2)} m/s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          Théorie — Quantité de mouvement
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">Conservation</h4>
            <BlockMath math="m_1v_1 + m_2v_2 = m_1v_1' + m_2v_2'" />
            <p className="text-amber-700 mt-2">
              Sans force extérieure, la quantité de mouvement totale d&apos;un
              système ne change jamais — quel que soit le type de choc.
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Impulsion</h4>
            <BlockMath math="\vec{J} = \int \vec{F}\,dt = \Delta \vec{p}" />
            <p className="text-blue-700 mt-2">
              Par la 3ᵉ loi de Newton, les deux chariots reçoivent des impulsions
              égales et opposées : les variations de <InlineMath math="p" /> se
              compensent exactement.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Choc élastique</h4>
            <BlockMath math="e = 1 \quad\Rightarrow\quad \sum \tfrac{1}{2}mv^2 = \text{cte}" />
            <p className="text-green-700 mt-2">
              Seul cas où l&apos;énergie cinétique est aussi conservée. À masses
              égales, les vitesses s&apos;échangent.
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Choc mou</h4>
            <BlockMath math="e = 0 \quad\Rightarrow\quad v_1' = v_2' = v_{cm}" />
            <p className="text-red-700 mt-2">
              Les corps repartent ensemble. L&apos;énergie perdue part en
              déformation, chaleur et son.
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">Coefficient de restitution</h4>
            <BlockMath math="e = \frac{|v_2' - v_1'|}{|v_1 - v_2|}" />
            <p className="text-purple-700 mt-2">
              Le rapport des vitesses de séparation et d&apos;approche. Entre 0
              et 1 dans la réalité.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Énergie perdue</h4>
            <BlockMath math="\Delta E = \tfrac{1}{2}\mu\,(1 - e^2)(v_1 - v_2)^2" />
            <p className="text-gray-700 mt-2">
              Avec <InlineMath math="\mu = \frac{m_1 m_2}{m_1 + m_2}" />, la masse
              réduite. Nulle si <InlineMath math="e = 1" />.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MomentumSimulator;
