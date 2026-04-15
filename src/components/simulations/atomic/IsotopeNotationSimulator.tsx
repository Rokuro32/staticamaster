'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// CollapsiblePanel
// ---------------------------------------------------------------------------

function CollapsiblePanel({
  title,
  borderColor,
  bgColor,
  textColor,
  children,
  defaultOpen = false,
}: {
  title: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-l-4 ${borderColor} rounded-lg overflow-hidden mb-4`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left px-4 py-3 font-semibold flex justify-between items-center ${bgColor} ${textColor} hover:brightness-95 transition-all`}
      >
        <span>{title}</span>
        <span className="text-lg">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className={`px-4 py-4 ${bgColor} bg-opacity-30 text-sm leading-relaxed space-y-3`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table des éléments (Z = 1..20) — symbole et nom
// ---------------------------------------------------------------------------

const ELEMENTS: { symbol: string; name: string }[] = [
  { symbol: 'H', name: 'Hydrogène' },      // 1
  { symbol: 'He', name: 'Hélium' },
  { symbol: 'Li', name: 'Lithium' },
  { symbol: 'Be', name: 'Béryllium' },
  { symbol: 'B', name: 'Bore' },
  { symbol: 'C', name: 'Carbone' },
  { symbol: 'N', name: 'Azote' },
  { symbol: 'O', name: 'Oxygène' },
  { symbol: 'F', name: 'Fluor' },
  { symbol: 'Ne', name: 'Néon' },          // 10
  { symbol: 'Na', name: 'Sodium' },
  { symbol: 'Mg', name: 'Magnésium' },
  { symbol: 'Al', name: 'Aluminium' },
  { symbol: 'Si', name: 'Silicium' },
  { symbol: 'P', name: 'Phosphore' },
  { symbol: 'S', name: 'Soufre' },
  { symbol: 'Cl', name: 'Chlore' },
  { symbol: 'Ar', name: 'Argon' },
  { symbol: 'K', name: 'Potassium' },
  { symbol: 'Ca', name: 'Calcium' },       // 20
];

// Nombre de neutrons "stable" typique (isotope le plus abondant) — pour comparaison
const STABLE_N: Record<number, number[]> = {
  1: [0, 1],           // H, D
  2: [1, 2],           // He-3, He-4
  3: [3, 4],
  4: [5],
  5: [5, 6],
  6: [6, 7],           // C-12, C-13
  7: [7, 8],
  8: [8, 9, 10],
  9: [10],
  10: [10, 11, 12],
  11: [12],
  12: [12, 13, 14],
  13: [14],
  14: [14, 15, 16],
  15: [16],
  16: [16, 17, 18, 20],
  17: [18, 20],
  18: [18, 20, 22],
  19: [20, 21, 22],
  20: [20, 22, 23, 24, 26],
};

// Remplissage des couches (2, 8, 8) pour Z ≤ 20 — modèle de Bohr simplifié
function electronShells(Z: number): number[] {
  const caps = [2, 8, 8, 18];
  const shells: number[] = [];
  let remaining = Z;
  for (const c of caps) {
    if (remaining <= 0) break;
    const take = Math.min(c, remaining);
    shells.push(take);
    remaining -= take;
  }
  return shells;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IsotopeNotationSimulator() {
  const [Z, setZ] = useState(6);
  const [N, setN] = useState(6);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const animIdRef = useRef<number | null>(null);

  const A = Z + N;
  const element = ELEMENTS[Z - 1];
  const stable = STABLE_N[Z]?.includes(N) ?? false;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    tRef.current += 0.015;
    const t = tRef.current;

    // Fond
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    // ---- Noyau : protons (rouge) + neutrons (gris)
    const total = Z + N;
    const nucleusR = Math.min(60, 10 + Math.sqrt(total) * 6);
    // Positions pseudo-aléatoires stables (via index)
    const nucleons: { x: number; y: number; proton: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      // Spirale de Fibonacci dans un disque
      const golden = Math.PI * (3 - Math.sqrt(5));
      const r = nucleusR * Math.sqrt(i / Math.max(1, total - 1));
      const theta = i * golden + t * 0.3;
      nucleons.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
        proton: i < Z,
      });
    }
    // Dessiner neutrons d'abord (derrière), puis protons
    for (const n of nucleons) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = n.proton ? '#991b1b' : '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ---- Couches électroniques
    const shells = electronShells(Z);
    const baseR = nucleusR + 35;
    const shellGap = 35;
    for (let i = 0; i < shells.length; i++) {
      const r = baseR + i * shellGap;
      // Orbite
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const nElec = shells[i];
      const speed = 0.6 - i * 0.15;
      for (let k = 0; k < nElec; k++) {
        const angle = (2 * Math.PI * k) / nElec + t * speed;
        const ex = cx + r * Math.cos(angle);
        const ey = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Légende
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const legend: [string, string][] = [
      ['#ef4444', `Protons (Z = ${Z})`],
      ['#94a3b8', `Neutrons (N = ${N})`],
      ['#22d3ee', `Électrons (${Z})`],
    ];
    legend.forEach(([color, label], i) => {
      const y = 24 + i * 20;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(20, y - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, 34, y);
    });

    // Badge stabilité
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = stable ? '#22c55e' : '#f59e0b';
    ctx.fillText(stable ? '✓ Isotope stable connu' : '⚠ Isotope rare ou radioactif', W - 14, 24);

    animIdRef.current = requestAnimationFrame(draw);
  }, [Z, N, stable]);

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [draw]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Notation des isotopes
        </h2>
        <p className="text-gray-600">
          Protons, neutrons et modèle atomique de Bohr
        </p>
      </div>

      {/* Canvas + notation */}
      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        {/* Notation symbolique */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="text-4xl font-serif text-gray-900 leading-none">
              <sup className="text-lg align-top mr-0.5">{A}</sup>
              <sub className="text-lg align-bottom mr-0.5 -ml-3">{Z}</sub>
              <span className="text-5xl font-bold">{element?.symbol ?? '?'}</span>
            </div>
            <div className="mt-2 text-gray-600 text-sm">
              {element?.name ?? '—'}
            </div>
          </div>
          <div className="text-left text-sm text-gray-700 space-y-1 border-l border-gray-200 pl-6">
            <div><strong>A</strong> = {A} (nombre de masse)</div>
            <div><strong>Z</strong> = {Z} (numéro atomique = protons)</div>
            <div><strong>N</strong> = {N} (neutrons) &nbsp; <span className="text-gray-500">= A − Z</span></div>
          </div>
        </div>

        {/* Sliders */}
        <div className="w-full max-w-[700px] space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-28">
              Protons <InlineMath math="Z" />
            </label>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={Z}
              onChange={(e) => setZ(Number(e.target.value))}
              className="flex-1 accent-red-500"
            />
            <span className="text-sm font-mono text-gray-900 w-16 text-right">{Z}</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-28">
              Neutrons <InlineMath math="N" />
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={N}
              onChange={(e) => setN(Number(e.target.value))}
              className="flex-1 accent-gray-500"
            />
            <span className="text-sm font-mono text-gray-900 w-16 text-right">{N}</span>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. La notation AZX"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un noyau atomique est désigné par le symbole de l&apos;élément précédé de
            deux nombres :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`{}^{A}_{Z}\\mathrm{X}`} />
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>Z</strong> (numéro atomique) : nombre de protons. Détermine
              l&apos;élément chimique (et donc le symbole X).
            </li>
            <li>
              <strong>A</strong> (nombre de masse) : nombre total de nucléons
              (<InlineMath math="A = Z + N" />).
            </li>
            <li>
              <strong>N</strong> (nombre de neutrons) :{' '}
              <InlineMath math="N = A - Z" />.
            </li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Isotopes, isobares, isotones"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>Isotopes</strong> : même <InlineMath math="Z" />, différents{' '}
              <InlineMath math="N" /> (donc même élément, masses différentes). Ex :
              <InlineMath math={`\\;{}^{12}_{\\,6}\\mathrm{C},\\; {}^{13}_{\\,6}\\mathrm{C},\\; {}^{14}_{\\,6}\\mathrm{C}`} />.
            </li>
            <li>
              <strong>Isobares</strong> : même <InlineMath math="A" />, différents
              <InlineMath math="\\;Z" /> (éléments différents, même masse). Ex :
              <InlineMath math={`\\;{}^{14}_{\\,6}\\mathrm{C}`} /> et{' '}
              <InlineMath math={`{}^{14}_{\\,7}\\mathrm{N}`} />.
            </li>
            <li>
              <strong>Isotones</strong> : même <InlineMath math="N" />, différents{' '}
              <InlineMath math="Z" />.
            </li>
          </ul>
          <p className="text-gray-700">
            Les propriétés <em>chimiques</em> d&apos;un atome sont déterminées par{' '}
            <InlineMath math="Z" /> (nombre d&apos;électrons), tandis que les
            propriétés <em>nucléaires</em> (masse, stabilité, radioactivité) dépendent
            aussi de <InlineMath math="N" />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Stabilité et vallée des noyaux"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            Pour les noyaux légers (<InlineMath math={`Z \\lesssim 20`} />), les
            isotopes stables satisfont <InlineMath math={`N \\approx Z`} />. Au-delà,
            la répulsion coulombienne entre protons impose un excès de neutrons :
            <InlineMath math={`\\;N/Z \\approx 1{,}5`} /> pour les noyaux lourds.
          </p>
          <p className="text-gray-700">
            Les noyaux trop riches en neutrons décroissent par <InlineMath math={`\\beta^-`} />{' '}
            (neutron → proton), les noyaux trop riches en protons par{' '}
            <InlineMath math={`\\beta^+`} /> ou capture électronique. Les noyaux très
            lourds (<InlineMath math={`Z > 82`} />) décroissent par émission{' '}
            <InlineMath math={`\\alpha`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Le modèle atomique"
          borderColor="border-cyan-500"
          bgColor="bg-cyan-50"
          textColor="text-cyan-800"
        >
          <p className="text-gray-700">
            La représentation ci-dessus suit le <strong>modèle de Bohr</strong> (1913) :
            un noyau compact entouré d&apos;électrons circulant sur des couches
            discrètes. La vraie description quantique (orbitales, Schrödinger 1926)
            remplace ces orbites par des distributions de probabilité, mais le modèle
            de Bohr reste utile pour visualiser <InlineMath math="Z" />,{' '}
            <InlineMath math="N" /> et la structure en couches
            (<InlineMath math="2, 8, 8, 18, \\ldots" />).
          </p>
          <p className="text-gray-700">
            Dans un atome neutre, le nombre d&apos;électrons égale{' '}
            <InlineMath math="Z" />. Un ion a un nombre d&apos;électrons différent de{' '}
            <InlineMath math="Z" />, mais <InlineMath math="Z" /> lui-même (donc
            l&apos;identité de l&apos;élément) ne change pas.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
