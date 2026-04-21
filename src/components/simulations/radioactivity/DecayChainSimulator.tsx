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
// Chaînes de désintégration
// ---------------------------------------------------------------------------

interface DecayStep {
  symbol: string;
  A: number;
  Z: number;
  name: string;
  halfLife: string;
  decayType: 'α' | 'β⁻' | 'β⁺' | 'stable';
}

interface DecayChain {
  id: string;
  label: string;
  steps: DecayStep[];
}

const CHAINS: DecayChain[] = [
  {
    id: 'uranium',
    label: 'Famille Uranium-238',
    steps: [
      { symbol: '²³⁸U',  A: 238, Z: 92, name: 'Uranium',     halfLife: '4,47 Ga', decayType: 'α' },
      { symbol: '²³⁴Th', A: 234, Z: 90, name: 'Thorium',     halfLife: '24,1 j',  decayType: 'β⁻' },
      { symbol: '²³⁴Pa', A: 234, Z: 91, name: 'Protactinium', halfLife: '1,17 min', decayType: 'β⁻' },
      { symbol: '²³⁴U',  A: 234, Z: 92, name: 'Uranium',     halfLife: '245 ka',  decayType: 'α' },
      { symbol: '²³⁰Th', A: 230, Z: 90, name: 'Thorium',     halfLife: '75,4 ka', decayType: 'α' },
      { symbol: '²²⁶Ra', A: 226, Z: 88, name: 'Radium',      halfLife: '1 600 a', decayType: 'α' },
      { symbol: '²²²Rn', A: 222, Z: 86, name: 'Radon',       halfLife: '3,82 j',  decayType: 'α' },
      { symbol: '²¹⁸Po', A: 218, Z: 84, name: 'Polonium',    halfLife: '3,10 min', decayType: 'α' },
      { symbol: '²¹⁴Pb', A: 214, Z: 82, name: 'Plomb',       halfLife: '26,8 min', decayType: 'β⁻' },
      { symbol: '²¹⁴Bi', A: 214, Z: 83, name: 'Bismuth',     halfLife: '19,9 min', decayType: 'β⁻' },
      { symbol: '²¹⁴Po', A: 214, Z: 84, name: 'Polonium',    halfLife: '164 µs',  decayType: 'α' },
      { symbol: '²¹⁰Pb', A: 210, Z: 82, name: 'Plomb',       halfLife: '22,2 a',  decayType: 'β⁻' },
      { symbol: '²¹⁰Bi', A: 210, Z: 83, name: 'Bismuth',     halfLife: '5,01 j',  decayType: 'β⁻' },
      { symbol: '²¹⁰Po', A: 210, Z: 84, name: 'Polonium',    halfLife: '138 j',   decayType: 'α' },
      { symbol: '²⁰⁶Pb', A: 206, Z: 82, name: 'Plomb',       halfLife: 'stable',  decayType: 'stable' },
    ],
  },
  {
    id: 'thorium',
    label: 'Famille Thorium-232',
    steps: [
      { symbol: '²³²Th', A: 232, Z: 90, name: 'Thorium',  halfLife: '14,0 Ga', decayType: 'α' },
      { symbol: '²²⁸Ra', A: 228, Z: 88, name: 'Radium',   halfLife: '5,75 a',  decayType: 'β⁻' },
      { symbol: '²²⁸Ac', A: 228, Z: 89, name: 'Actinium', halfLife: '6,15 h',  decayType: 'β⁻' },
      { symbol: '²²⁸Th', A: 228, Z: 90, name: 'Thorium',  halfLife: '1,91 a',  decayType: 'α' },
      { symbol: '²²⁴Ra', A: 224, Z: 88, name: 'Radium',   halfLife: '3,63 j',  decayType: 'α' },
      { symbol: '²²⁰Rn', A: 220, Z: 86, name: 'Radon',    halfLife: '55,6 s',  decayType: 'α' },
      { symbol: '²¹⁶Po', A: 216, Z: 84, name: 'Polonium', halfLife: '0,145 s', decayType: 'α' },
      { symbol: '²¹²Pb', A: 212, Z: 82, name: 'Plomb',    halfLife: '10,6 h',  decayType: 'β⁻' },
      { symbol: '²¹²Bi', A: 212, Z: 83, name: 'Bismuth',  halfLife: '60,6 min', decayType: 'α' },
      { symbol: '²⁰⁸Tl', A: 208, Z: 81, name: 'Thallium', halfLife: '3,05 min', decayType: 'β⁻' },
      { symbol: '²⁰⁸Pb', A: 208, Z: 82, name: 'Plomb',    halfLife: 'stable',  decayType: 'stable' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DecayChainSimulator() {
  const [chainIdx, setChainIdx] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chain = CHAINS[chainIdx];

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const steps = chain.steps;
    const n = steps.length;

    // Axes : X = Z (numéro atomique), Y = A (nombre de masse)
    const ml = 60, mr = 30, mt = 30, mb = 50;
    const plotW = W - ml - mr;
    const plotH = H - mt - mb;

    // Plages
    const Zmin = Math.min(...steps.map(s => s.Z)) - 1;
    const Zmax = Math.max(...steps.map(s => s.Z)) + 1;
    const Amin = Math.min(...steps.map(s => s.A)) - 2;
    const Amax = Math.max(...steps.map(s => s.A)) + 2;

    const toX = (z: number) => ml + ((z - Zmin) / (Zmax - Zmin)) * plotW;
    const toY = (a: number) => mt + plotH - ((a - Amin) / (Amax - Amin)) * plotH;

    // Grille
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let z = Zmin; z <= Zmax; z++) {
      const x = toX(z);
      ctx.beginPath();
      ctx.moveTo(x, mt);
      ctx.lineTo(x, mt + plotH);
      ctx.stroke();
    }
    for (let a = Amin; a <= Amax; a += 2) {
      const y = toY(a);
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + plotW, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + plotH);
    ctx.lineTo(ml + plotW, mt + plotH);
    ctx.stroke();

    // Labels axes
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Z (numéro atomique)', ml + plotW / 2, H - 8);
    for (let z = Zmin + 1; z <= Zmax - 1; z += 2) {
      ctx.fillText(`${z}`, toX(z), mt + plotH + 18);
    }

    ctx.save();
    ctx.translate(16, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('A (nombre de masse)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'right';
    for (let a = Amin + 2; a <= Amax; a += 4) {
      ctx.fillText(`${a}`, ml - 6, toY(a) + 4);
    }

    // Flèches de désintégration + noyaux
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const x = toX(s.Z);
      const y = toY(s.A);

      // Flèche vers le suivant
      if (i < n - 1) {
        const next = steps[i + 1];
        const nx = toX(next.Z);
        const ny = toY(next.A);

        ctx.strokeStyle = s.decayType === 'α' ? '#ef4444' : s.decayType === 'β⁻' ? '#3b82f6' : '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        // Tête de flèche
        const angle = Math.atan2(ny - y, nx - x);
        const arrowLen = 8;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(
          nx - arrowLen * Math.cos(angle - Math.PI / 6),
          ny - arrowLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          nx - arrowLen * Math.cos(angle + Math.PI / 6),
          ny - arrowLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();

        // Label type
        const mx = (x + nx) / 2;
        const my = (y + ny) / 2;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.decayType, mx + 12, my - 4);
      }

      // Noyau (cercle)
      const isHighlight = i === highlightIdx;
      const isStable = s.decayType === 'stable';
      ctx.beginPath();
      ctx.arc(x, y, isHighlight ? 16 : 12, 0, Math.PI * 2);
      ctx.fillStyle = isStable
        ? '#22c55e'
        : isHighlight
          ? '#fbbf24'
          : '#334155';
      ctx.fill();
      ctx.strokeStyle = isHighlight ? '#f59e0b' : '#64748b';
      ctx.lineWidth = isHighlight ? 2.5 : 1;
      ctx.stroke();

      // Symbole
      ctx.fillStyle = '#f8fafc';
      ctx.font = `${isHighlight ? 'bold 11px' : '10px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(s.symbol, x, y + 3);
    }

    // Légende
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const lx = ml + plotW - 130;
    const ly = mt + 14;
    ctx.fillStyle = '#0f172a';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(lx - 6, ly - 12, 140, 55);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(lx - 6, ly - 12, 140, 55);

    ctx.fillStyle = '#ef4444';
    ctx.fillText('→ α (Z−2, A−4)', lx, ly);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('→ β⁻ (Z+1, A=)', lx, ly + 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('● stable', lx, ly + 36);
  }, [chain, highlightIdx]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const step = chain.steps[highlightIdx];

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Chaînes de désintégration
        </h2>
        <p className="text-gray-600">
          Filiation radioactive &mdash; de l&apos;uranium ou du thorium au plomb stable
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={420}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Choix famille */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Famille :</span>
            {CHAINS.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => { setChainIdx(i); setHighlightIdx(0); }}
                className={`px-4 py-1.5 text-sm rounded border font-medium transition-colors ${
                  chainIdx === i
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {/* Slider étape */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Étape
            </label>
            <input
              type="range"
              min={0}
              max={chain.steps.length - 1}
              step={1}
              value={highlightIdx}
              onChange={(e) => setHighlightIdx(Number(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-sm font-mono text-gray-900 w-28 text-right">
              {step.symbol} ({step.name})
            </span>
          </div>

          {/* Info étape */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm space-y-1">
            <div className="flex gap-6 flex-wrap">
              <div><strong>Noyau :</strong> {step.symbol} ({step.name})</div>
              <div><strong>Z =</strong> {step.Z}, <strong>A =</strong> {step.A}</div>
              <div><strong>t½ :</strong> {step.halfLife}</div>
              <div>
                <strong>Décroissance :</strong>{' '}
                <span className={
                  step.decayType === 'α' ? 'text-red-600 font-bold' :
                  step.decayType === 'β⁻' ? 'text-blue-600 font-bold' :
                  'text-green-600 font-bold'
                }>
                  {step.decayType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Familles radioactives naturelles"
          borderColor="border-amber-500"
          bgColor="bg-amber-50"
          textColor="text-amber-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Les noyaux lourds naturels (<InlineMath math="Z > 82" />) sont instables. Ils
            se désintègrent en cascade par une succession de décroissances{' '}
            <InlineMath math="\alpha" /> et <InlineMath math="\beta" /> jusqu&apos;à
            atteindre un <strong>noyau stable de plomb</strong>.
          </p>
          <p className="text-gray-700">
            Il existe 4 familles selon le reste de <InlineMath math="A" /> modulo 4 :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>4n</strong> : thorium-232 → plomb-208
            </li>
            <li>
              <strong>4n+2</strong> : uranium-238 → plomb-206
            </li>
            <li>
              <strong>4n+3</strong> : uranium-235 → plomb-207
            </li>
            <li>
              <strong>4n+1</strong> : neptunium-237 → bismuth-209 (artificielle)
            </li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Diagramme (Z, A)"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            Sur le diagramme, chaque flèche correspond à une désintégration :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong className="text-red-600">α</strong> :{' '}
              <InlineMath math="\Delta Z = -2, \; \Delta A = -4" /> — déplacement en
              diagonale vers le bas-gauche.
            </li>
            <li>
              <strong className="text-blue-600">β⁻</strong> :{' '}
              <InlineMath math="\Delta Z = +1, \; \Delta A = 0" /> — déplacement
              horizontal vers la droite.
            </li>
          </ul>
          <p className="text-gray-700">
            On peut ainsi reconstituer visuellement tout le chemin de la filiation.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Équilibre séculaire"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            Lorsque le noyau père a une demi-vie très longue devant celle du fils
            (<InlineMath math="t_{1/2}^{\text{père}} \gg t_{1/2}^{\text{fils}}" />),
            l&apos;activité du fils atteint un <strong>équilibre séculaire</strong> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`A_{\\text{fils}} \\approx A_{\\text{père}} \\quad \\Longleftrightarrow \\quad \\lambda_{\\text{fils}}\\,N_{\\text{fils}} = \\lambda_{\\text{père}}\\,N_{\\text{père}}`} />
          </div>
          <p className="text-gray-700">
            Exemple : dans un minerai d&apos;uranium ancien, tous les descendants ont la
            même activité que l&apos;²³⁸U. C&apos;est ce principe qui permet la{' '}
            <strong>datation uranium-plomb</strong>.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Le radon : un risque sanitaire"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
        >
          <p className="text-gray-700">
            Le <strong>radon-222</strong> (t½ = 3,82 jours) est un gaz noble radioactif
            qui s&apos;échappe du sol et s&apos;accumule dans les bâtiments mal ventilés.
            Ses descendants à courte durée de vie (²¹⁸Po, ²¹⁴Pb, ²¹⁴Bi, ²¹⁴Po) se
            déposent dans les poumons et émettent des particules α très ionisantes.
          </p>
          <p className="text-gray-700">
            Le radon est la <strong>deuxième cause de cancer du poumon</strong> après le
            tabac, et la première source d&apos;exposition aux rayonnements ionisants
            d&apos;origine naturelle.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
