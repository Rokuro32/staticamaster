'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Bac à sable électrostatique. On pose des charges ponctuelles, on appuie sur
// play, et la loi de Coulomb fait le reste.
//
// Une précaution numérique : la force en 1/r² diverge quand deux charges se
// superposent. On adoucit donc le dénominateur avec un rayon ε, ce qui borne
// la force au contact. L'énergie potentielle est calculée avec le même ε,
// sinon elle ne se conserverait plus.
// ---------------------------------------------------------------------------

const K = 8.99e9;        // constante de Coulomb, N·m²/C²
const EPSILON = 0.025;   // rayon d'adoucissement, m
const BOX_W = 1.6;       // largeur de la boîte, m
const BOX_H = 1.0;       // hauteur, m
const WALL_RESTITUTION = 0.88;

const C_POSITIVE = '#c96445'; // brun chaud
const C_NEGATIVE = '#556884'; // ardoise froide

interface Charge {
  id: number;
  q: number;      // µC
  m: number;      // g
  x: number;      // m
  y: number;      // m
  vx: number;
  vy: number;
  fixed: boolean;
  trail: [number, number][];
}

interface Preset {
  id: string;
  label: string;
  note: string;
  build: () => Omit<Charge, 'id' | 'trail'>[];
}

const c = (q: number, m: number, x: number, y: number, fixed = false) =>
  ({ q, m, x, y, vx: 0, vy: 0, fixed });

const PRESETS: Preset[] = [
  {
    id: 'dipole',
    label: 'Dipôle',
    note: 'Deux charges opposées fixes, et une charge d’essai libre. Elle suit une ligne de champ : c’est exactement ce que trace le champ électrique.',
    build: () => [
      c(2, 20, 0.45, 0.5, true),
      c(-2, 20, 1.15, 0.5, true),
      c(0.4, 5, 0.8, 0.78),
    ],
  },
  {
    id: 'repulsion',
    label: 'Répulsion',
    note: 'Deux charges de même signe, libres. Elles se repoussent d’autant plus fort qu’elles sont proches — et rebondissent sur les parois.',
    build: () => [c(2, 20, 0.7, 0.5), c(2, 20, 0.9, 0.5)],
  },
  {
    id: 'orbite',
    label: 'Orbite',
    note: 'Un noyau lourd et fixe, une charge légère lancée de côté. Comme la gravitation, la loi en 1/r² donne des orbites — le modèle de Rutherford tient dans cette image.',
    build: () => [
      c(4, 100, 0.8, 0.5, true),
      { ...c(-0.6, 3, 0.8, 0.22), vx: 1.35 },
    ],
  },
  {
    id: 'piege',
    label: 'Piège',
    note: 'Quatre charges positives fixes aux coins, une négative au milieu. Toute charge négative lâchée à l’intérieur oscille autour du centre.',
    build: () => [
      c(3, 20, 0.45, 0.25, true),
      c(3, 20, 1.15, 0.25, true),
      c(3, 20, 0.45, 0.75, true),
      c(3, 20, 1.15, 0.75, true),
      c(-1, 8, 0.72, 0.42),
    ],
  },
  {
    id: 'anneau',
    label: 'Charges libres',
    note: 'Six charges identiques dans une boîte, avec un peu d’amortissement : elles s’écartent le plus possible les unes des autres et se figent en configuration d’équilibre.',
    build: () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (2 * Math.PI * i) / 6;
        return c(1.5, 15, 0.8 + 0.12 * Math.cos(a), 0.5 + 0.1 * Math.sin(a));
      }),
  },
];

let nextId = 1;
const withIds = (list: Omit<Charge, 'id' | 'trail'>[]): Charge[] =>
  list.map((x) => ({ ...x, id: nextId++, trail: [] }));

export function ElectrostaticsSandbox() {
  const [charges, setCharges] = useState<Charge[]>(() => withIds(PRESETS[0].build()));
  const [initial, setInitial] = useState<Charge[]>(() => []);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>('dipole');

  // outil de placement
  const [toolSign, setToolSign] = useState<1 | -1>(1);
  const [toolQ, setToolQ] = useState(1.5);
  const [toolM, setToolM] = useState(20);
  const [toolFixed, setToolFixed] = useState(false);

  const [damping, setDamping] = useState(0);
  const [timeScale, setTimeScale] = useState(0.3);
  const [showField, setShowField] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [showPairs, setShowPairs] = useState(false);
  const [showTrails, setShowTrails] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>();
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const selected = charges.find((ch) => ch.id === selectedId) ?? null;

  // mémorise la configuration de départ dès qu'on la modifie à l'arrêt
  useEffect(() => {
    if (!running) setInitial(charges.map((ch) => ({ ...ch, trail: [] })));
    // on ne veut pas réagir à `charges` pendant la simulation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ------------------------------------------------------------- physique
  /** Force de Coulomb sur `i`, en newtons, et détail par paire */
  const forceOn = useCallback((list: Charge[], i: number) => {
    const a = list[i];
    let fx = 0;
    let fy = 0;
    const pairs: { id: number; fx: number; fy: number }[] = [];

    for (let j = 0; j < list.length; j++) {
      if (j === i) continue;
      const b = list[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const r2 = dx * dx + dy * dy + EPSILON * EPSILON;
      const inv = 1 / (r2 * Math.sqrt(r2));
      const scale = K * (a.q * 1e-6) * (b.q * 1e-6) * inv;
      const px = scale * dx;
      const py = scale * dy;
      fx += px;
      fy += py;
      pairs.push({ id: b.id, fx: px, fy: py });
    }
    return { fx, fy, pairs };
  }, []);

  const energies = (() => {
    let ke = 0;
    let pe = 0;
    charges.forEach((ch, i) => {
      ke += 0.5 * (ch.m * 1e-3) * (ch.vx * ch.vx + ch.vy * ch.vy);
      for (let j = i + 1; j < charges.length; j++) {
        const o = charges[j];
        const r = Math.sqrt((ch.x - o.x) ** 2 + (ch.y - o.y) ** 2 + EPSILON * EPSILON);
        pe += (K * (ch.q * 1e-6) * (o.q * 1e-6)) / r;
      }
    });
    return { ke, pe, total: ke + pe };
  })();

  // -------------------------------------------------------------- animation
  useEffect(() => {
    if (!running) { lastRef.current = undefined; return; }

    const tick = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;

      if (last !== undefined) {
        const frame = Math.min((now - last) / 1000, 0.04) * timeScale;
        const SUB = 6;                 // sous-pas : la force en 1/r² est raide
        const dt = frame / SUB;

        setCharges((prev) => {
          let list = prev.map((ch) => ({ ...ch }));

          for (let s = 0; s < SUB; s++) {
            const forces = list.map((_, i) => forceOn(list, i));
            list = list.map((ch, i) => {
              if (ch.fixed) return ch;
              const kg = ch.m * 1e-3;
              let vx = ch.vx + (forces[i].fx / kg) * dt;
              let vy = ch.vy + (forces[i].fy / kg) * dt;
              if (damping > 0) {
                const f = Math.exp(-damping * dt);
                vx *= f;
                vy *= f;
              }
              let x = ch.x + vx * dt;
              let y = ch.y + vy * dt;

              // rebond sur les parois de la boîte
              if (x < 0) { x = 0; vx = -vx * WALL_RESTITUTION; }
              if (x > BOX_W) { x = BOX_W; vx = -vx * WALL_RESTITUTION; }
              if (y < 0) { y = 0; vy = -vy * WALL_RESTITUTION; }
              if (y > BOX_H) { y = BOX_H; vy = -vy * WALL_RESTITUTION; }

              return { ...ch, x, y, vx, vy };
            });
          }

          return list.map((ch) => ({
            ...ch,
            trail: ch.fixed ? [] : [...ch.trail, [ch.x, ch.y] as [number, number]].slice(-150),
          }));
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, timeScale, damping, forceOn]);

  // ------------------------------------------------------------------ dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scale = W / BOX_W;
    const toX = (x: number) => x * scale;
    const toY = (y: number) => y * scale;

    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    // --- champ électrique, sur une grille
    if (showField && charges.length > 0) {
      const step = 34;
      for (let px = step / 2; px < W; px += step) {
        for (let py = step / 2; py < H; py += step) {
          const x = px / scale;
          const y = py / scale;
          let ex = 0;
          let ey = 0;
          let tooClose = false;
          for (const ch of charges) {
            const dx = x - ch.x;
            const dy = y - ch.y;
            const r2 = dx * dx + dy * dy;
            if (r2 < 0.0016) { tooClose = true; break; }
            const soft = r2 + EPSILON * EPSILON;
            const s = (K * ch.q * 1e-6) / (soft * Math.sqrt(soft));
            ex += s * dx;
            ey += s * dy;
          }
          if (tooClose) continue;

          const mag = Math.hypot(ex, ey);
          if (mag < 1) continue;
          const t = Math.min(1, Math.log10(1 + mag) / 5.5);
          const len = 7 + t * 12;
          const ux = (ex / mag) * len;
          const uy = (ey / mag) * len;

          ctx.strokeStyle = `rgba(124, 103, 58, ${0.18 + t * 0.5})`;
          ctx.lineWidth = 1 + t;
          ctx.beginPath();
          ctx.moveTo(px - ux / 2, py - uy / 2);
          ctx.lineTo(px + ux / 2, py + uy / 2);
          ctx.stroke();
          // pointe
          const a = Math.atan2(uy, ux);
          ctx.beginPath();
          ctx.moveTo(px + ux / 2, py + uy / 2);
          ctx.lineTo(px + ux / 2 - 4 * Math.cos(a - 0.5), py + uy / 2 - 4 * Math.sin(a - 0.5));
          ctx.lineTo(px + ux / 2 - 4 * Math.cos(a + 0.5), py + uy / 2 - 4 * Math.sin(a + 0.5));
          ctx.closePath();
          ctx.fillStyle = `rgba(124, 103, 58, ${0.18 + t * 0.5})`;
          ctx.fill();
        }
      }
    }

    // --- traces
    if (showTrails) {
      charges.forEach((ch) => {
        if (ch.trail.length < 2) return;
        ctx.strokeStyle = ch.q >= 0 ? 'rgba(201,100,69,.35)' : 'rgba(85,104,132,.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ch.trail.forEach(([tx, ty], i) => {
          if (i === 0) ctx.moveTo(toX(tx), toY(ty));
          else ctx.lineTo(toX(tx), toY(ty));
        });
        ctx.stroke();
      });
    }

    const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, w: number) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const hs = 4 + w * 2;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hs * Math.cos(a - Math.PI / 6), y2 - hs * Math.sin(a - Math.PI / 6));
      ctx.lineTo(x2 - hs * Math.cos(a + Math.PI / 6), y2 - hs * Math.sin(a + Math.PI / 6));
      ctx.closePath(); ctx.fill();
    };

    // --- forces
    if (showForces) {
      charges.forEach((ch, i) => {
        const { fx, fy, pairs } = forceOn(charges, i);
        const mag = Math.hypot(fx, fy);
        if (mag < 1e-4) return;
        const len = Math.min(24 + Math.log10(1 + mag * 1000) * 26, 110);

        if (showPairs && ch.id === selectedId) {
          pairs.forEach((p) => {
            const pm = Math.hypot(p.fx, p.fy);
            if (pm < 1e-5) return;
            const pl = Math.min(18 + Math.log10(1 + pm * 1000) * 22, 95);
            arrow(toX(ch.x), toY(ch.y),
              toX(ch.x) + (p.fx / pm) * pl, toY(ch.y) + (p.fy / pm) * pl,
              'rgba(142, 82, 112, .75)', 1.5);
          });
        }

        arrow(toX(ch.x), toY(ch.y),
          toX(ch.x) + (fx / mag) * len, toY(ch.y) + (fy / mag) * len,
          ch.id === selectedId ? '#1c1917' : '#9c8349', ch.id === selectedId ? 3 : 2.2);
      });
    }

    // --- charges
    charges.forEach((ch) => {
      const r = 9 + Math.sqrt(Math.abs(ch.q)) * 5;
      const px = toX(ch.x);
      const py = toY(ch.y);

      if (ch.id === selectedId) {
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(px, py, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = ch.q >= 0 ? C_POSITIVE : C_NEGATIVE;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();

      if (ch.fixed) {
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, r + 2.5, 0, Math.PI * 2); ctx.stroke();
      }

      // signe
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px - r * 0.45, py); ctx.lineTo(px + r * 0.45, py);
      if (ch.q >= 0) { ctx.moveTo(px, py - r * 0.45); ctx.lineTo(px, py + r * 0.45); }
      ctx.stroke();
    });

    // --- bandeau
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(
      charges.length === 0
        ? 'cliquez dans la boîte pour poser une charge'
        : `${charges.length} charge${charges.length > 1 ? 's' : ''} · cliquez pour ajouter, glissez pour déplacer`,
      12, H - 12
    );
    ctx.textAlign = 'right';
    ctx.fillText(`${BOX_W} m × ${BOX_H} m`, W - 12, H - 12);
  }, [charges, selectedId, showField, showForces, showPairs, showTrails, forceOn]);

  // --------------------------------------------------------------- souris
  const toWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / BOX_W;
    return {
      x: ((e.clientX - rect.left) * (canvas.width / rect.width)) / scale,
      y: ((e.clientY - rect.top) * (canvas.height / rect.height)) / scale,
    };
  };

  const hitTest = (x: number, y: number) => {
    const scale = (canvasRef.current?.width ?? 1) / BOX_W;
    for (const ch of charges) {
      const r = (9 + Math.sqrt(Math.abs(ch.q)) * 5) / scale;
      if (Math.hypot(ch.x - x, ch.y - y) < r + 0.012) return ch;
    }
    return null;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorld(e);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit.id);
      dragRef.current = { id: hit.id, dx: hit.x - x, dy: hit.y - y };
      return;
    }
    const added: Charge = {
      id: nextId++,
      q: toolSign * toolQ,
      m: toolM,
      x, y, vx: 0, vy: 0,
      fixed: toolFixed,
      trail: [],
    };
    setCharges((prev) => [...prev, added]);
    setSelectedId(added.id);
    setActivePreset(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toWorld(e);
    setCharges((prev) =>
      prev.map((ch) =>
        ch.id === drag.id
          ? { ...ch, x: Math.max(0, Math.min(BOX_W, x + drag.dx)),
              y: Math.max(0, Math.min(BOX_H, y + drag.dy)), vx: 0, vy: 0, trail: [] }
          : ch
      )
    );
    setActivePreset(null);
  };

  const endDrag = () => { dragRef.current = null; };

  // --------------------------------------------------------------- actions
  const loadPreset = (p: Preset) => {
    const list = withIds(p.build());
    setCharges(list);
    setInitial(list.map((ch) => ({ ...ch, trail: [] })));
    setActivePreset(p.id);
    setSelectedId(null);
    setRunning(false);
    if (p.id === 'anneau') setDamping(1.2);
  };

  const replay = () => {
    setCharges(initial.map((ch) => ({ ...ch, trail: [] })));
    setRunning(false);
  };

  const removeSelected = () => {
    if (selectedId === null) return;
    setCharges((prev) => prev.filter((ch) => ch.id !== selectedId));
    setSelectedId(null);
    setActivePreset(null);
  };

  const clearAll = () => {
    setCharges([]);
    setSelectedId(null);
    setRunning(false);
    setActivePreset(null);
  };

  const patchSelected = (patch: Partial<Charge>) => {
    if (selectedId === null) return;
    setCharges((prev) => prev.map((ch) => (ch.id === selectedId ? { ...ch, ...patch } : ch)));
    setActivePreset(null);
  };

  const selForce = selected
    ? forceOn(charges, charges.findIndex((ch) => ch.id === selected.id))
    : null;
  const selForceMag = selForce ? Math.hypot(selForce.fx, selForce.fy) : 0;
  const preset = PRESETS.find((p) => p.id === activePreset);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Bac à sable électrostatique
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Posez des charges, appuyez sur play, et regardez la loi de Coulomb
          faire le reste. Cliquez dans la boîte pour ajouter, cliquez une charge
          pour la régler, glissez-la pour la déplacer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => loadPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-stone-700 bg-stone-50 border-l-4 border-stone-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="col-span-2 py-2 px-3 rounded-lg font-medium bg-ocre-600 text-white hover:bg-ocre-700 transition-colors"
            >
              {running ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={replay}
              title="Revenir à la configuration de départ"
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              ↺
            </button>
          </div>

          {/* Outil de placement */}
          <div className="rounded-lg border border-stone-200 p-3 space-y-3">
            <h4 className="font-semibold text-stone-700 text-sm">
              Charge à poser
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setToolSign(1)}
                className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  toolSign === 1 ? 'text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
                style={toolSign === 1 ? { background: C_POSITIVE } : undefined}
              >
                + positive
              </button>
              <button
                onClick={() => setToolSign(-1)}
                className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  toolSign === -1 ? 'text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
                style={toolSign === -1 ? { background: C_NEGATIVE } : undefined}
              >
                − négative
              </button>
            </div>
            <div>
              <label className="flex justify-between text-sm text-stone-600 mb-1">
                <span>Charge |q|</span>
                <span className="font-mono text-stone-900">{toolQ.toFixed(1)} µC</span>
              </label>
              <input type="range" min={0.2} max={5} step={0.1} value={toolQ}
                onChange={(e) => setToolQ(Number(e.target.value))}
                className="w-full accent-ocre-600" />
            </div>
            <div>
              <label className="flex justify-between text-sm text-stone-600 mb-1">
                <span>Masse</span>
                <span className="font-mono text-stone-900">{toolM} g</span>
              </label>
              <input type="range" min={1} max={100} step={1} value={toolM}
                onChange={(e) => setToolM(Number(e.target.value))}
                className="w-full accent-gold-600" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={toolFixed}
                onChange={(e) => setToolFixed(e.target.checked)}
                className="w-4 h-4 accent-stone-700" />
              <span className="text-sm text-stone-700">Fixe (ne bouge pas)</span>
            </label>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Amortissement</span>
              <span className="font-mono text-stone-900">{damping.toFixed(1)}</span>
            </label>
            <input type="range" min={0} max={4} step={0.1} value={damping}
              onChange={(e) => setDamping(Number(e.target.value))}
              className="w-full accent-brun-600" />
            <p className="text-xs text-stone-500 mt-1">
              À zéro, l&apos;énergie se conserve. Au-delà, les charges finissent
              par se figer dans leur configuration d&apos;équilibre.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Vitesse d&apos;affichage</span>
              <span className="font-mono text-stone-900">{timeScale.toFixed(2)}×</span>
            </label>
            <input type="range" min={0.05} max={1} step={0.05} value={timeScale}
              onChange={(e) => setTimeScale(Number(e.target.value))}
              className="w-full accent-stone-600" />
          </div>

          <div className="space-y-1.5">
            {[
              ['Champ électrique', showField, setShowField],
              ['Force résultante', showForces, setShowForces],
              ['Forces une à une', showPairs, setShowPairs],
              ['Traces', showTrails, setShowTrails],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="w-4 h-4 accent-ocre-600"
                />
                <span className="text-sm text-stone-700">{label as string}</span>
              </label>
            ))}
          </div>

          <button
            onClick={clearAll}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Vider la boîte
          </button>
        </div>

        {/* Scène */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={720}
              height={450}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              className="w-full cursor-crosshair"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Charge sélectionnée */}
            <div>
              <div className="text-xs text-stone-500 mb-1">
                {selected ? 'Charge sélectionnée' : 'Aucune charge sélectionnée'}
              </div>
              {selected ? (
                <div className="border border-stone-200 rounded-lg p-3 space-y-3">
                  <div className="space-y-1 text-sm">
                    {[
                      ['Charge q', `${selected.q > 0 ? '+' : ''}${selected.q.toFixed(1)} µC`],
                      ['Masse', `${selected.m} g`],
                      ['Force résultante', `${(selForceMag * 1000).toFixed(2)} mN`],
                      ['Vitesse', `${Math.hypot(selected.vx, selected.vy).toFixed(2)} m/s`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-stone-500">{k}</span>
                        <span className="font-mono text-stone-900">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>Modifier q</span>
                      <span className="font-mono">{selected.q.toFixed(1)} µC</span>
                    </label>
                    <input type="range" min={-5} max={5} step={0.1} value={selected.q}
                      onChange={(e) => patchSelected({ q: Number(e.target.value) })}
                      className="w-full accent-ocre-600" />
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                      <input type="checkbox" checked={selected.fixed}
                        onChange={(e) => patchSelected({ fixed: e.target.checked })}
                        className="w-4 h-4 accent-stone-700" />
                      Fixe
                    </label>
                    <button onClick={removeSelected}
                      className="ml-auto px-3 py-1 rounded-lg text-sm bg-brun-50 text-brun-700 hover:bg-brun-100 transition-colors">
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-stone-300 rounded-lg p-4 text-sm text-stone-500">
                  Cliquez une charge pour lire la force qu&apos;elle subit et
                  pour la modifier. Cochez « Forces une à une » pour voir de qui
                  vient chaque contribution.
                </div>
              )}
            </div>

            {/* Bilan énergétique */}
            <div className="space-y-2 text-sm">
              <div className="text-xs text-stone-500 mb-1">Bilan du système</div>
              {[
                ['Énergie cinétique', `${(energies.ke * 1000).toFixed(2)} mJ`],
                ['Énergie potentielle', `${(energies.pe * 1000).toFixed(2)} mJ`],
                ['Total', `${(energies.total * 1000).toFixed(2)} mJ`],
              ].map(([k, v], i) => (
                <div key={k}
                  className={`flex justify-between gap-2 ${i === 2 ? 'pt-2 border-t border-stone-200 font-semibold' : ''}`}>
                  <span className="text-stone-500">{k}</span>
                  <span className="font-mono text-stone-900">{v}</span>
                </div>
              ))}
              <p className="text-xs text-stone-500 pt-1">
                Sans amortissement et loin des parois, le total ne bouge pas :
                l&apos;énergie passe simplement de potentielle à cinétique et
                inversement. L&apos;énergie potentielle est négative quand les
                charges qui s&apos;attirent dominent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Électrostatique des charges ponctuelles
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-ocre-50 rounded-lg p-4">
            <h4 className="font-medium text-ocre-800 mb-2">Loi de Coulomb</h4>
            <BlockMath math="\vec{F}_{12} = k\frac{q_1q_2}{r^2}\,\hat{r}_{12}" />
            <p className="text-ocre-700 mt-2">
              Avec <InlineMath math="k = 8{,}99 \times 10^9" /> N·m²/C². Même
              signe : répulsion. Signes opposés : attraction. La force décroît
              comme le carré de la distance, exactement comme la gravitation.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Superposition</h4>
            <BlockMath math="\vec{F}_i = \sum_{j \neq i} \vec{F}_{ij}" />
            <p className="text-gold-700 mt-2">
              Chaque paire agit comme si les autres n&apos;existaient pas, et on
              additionne vectoriellement. C&apos;est ce que montre l&apos;option
              « forces une à une ».
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Champ électrique</h4>
            <BlockMath math="\vec{E} = \frac{\vec{F}}{q_0} \qquad \vec{F} = q\vec{E}" />
            <p className="text-brun-700 mt-2">
              Le champ est ce que ferait subir la configuration à une charge
              d&apos;essai positive. Les flèches pointent loin des charges
              positives et vers les négatives.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Énergie potentielle</h4>
            <BlockMath math="U = k\frac{q_1q_2}{r}" />
            <p className="text-ardoise-700 mt-2">
              Positive pour deux charges de même signe — il a fallu du travail
              pour les rapprocher. Négative pour deux charges opposées : elles
              sont liées.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Pourquoi ça orbite</h4>
            <p className="text-olive-700">
              En <InlineMath math="1/r^2" />, comme la gravitation : une charge
              légère lancée de côté autour d&apos;une charge lourde et opposée
              décrit une ellipse. C&apos;est l&apos;image que Rutherford avait
              de l&apos;atome — et son échec explique justement pourquoi il a
              fallu la mécanique quantique.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Équilibre</h4>
            <p className="text-prune-700">
              Avec de l&apos;amortissement, des charges identiques enfermées
              s&apos;écartent au maximum et se figent. Le théorème
              d&apos;Earnshaw interdit d&apos;ailleurs tout équilibre stable
              obtenu uniquement avec des charges fixes : il faut toujours une
              contrainte extérieure, ici les parois.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Numériquement, la force en 1/r² est adoucie par un rayon ε = {EPSILON} m :
          sans cela, deux charges qui se superposent produiraient une force
          infinie. L&apos;énergie potentielle utilise le même ε, pour qu&apos;elle
          reste cohérente avec la force intégrée.
        </p>
      </div>
    </div>
  );
}

export default ElectrostaticsSandbox;
