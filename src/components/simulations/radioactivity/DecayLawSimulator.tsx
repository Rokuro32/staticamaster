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
// Isotopes prédéfinis
// ---------------------------------------------------------------------------

interface Isotope {
  label: string;
  halfLife: number;   // en secondes (pour le calcul)
  halfLifeStr: string; // lisible
  decayType: string;
}

const ISOTOPES: Isotope[] = [
  { label: '¹⁴C (Carbone-14)',   halfLife: 5730 * 365.25 * 86400, halfLifeStr: '5 730 ans',   decayType: 'β⁻' },
  { label: '¹³¹I (Iode-131)',    halfLife: 8.02 * 86400,          halfLifeStr: '8,02 jours',  decayType: 'β⁻' },
  { label: '⁶⁰Co (Cobalt-60)',   halfLife: 5.27 * 365.25 * 86400, halfLifeStr: '5,27 ans',   decayType: 'β⁻ + γ' },
  { label: '²³⁸U (Uranium-238)', halfLife: 4.47e9 * 365.25 * 86400, halfLifeStr: '4,47 × 10⁹ ans', decayType: 'α' },
  { label: '²²⁶Ra (Radium-226)', halfLife: 1600 * 365.25 * 86400, halfLifeStr: '1 600 ans',  decayType: 'α' },
];

// ---------------------------------------------------------------------------
// Main component — Décroissance radioactive
// ---------------------------------------------------------------------------

export function DecayLawSimulator() {
  const [isotopeIdx, setIsotopeIdx] = useState(0);
  const [N0, setN0] = useState(1000);           // nombre initial de noyaux (UI)
  const [nHalfLives, setNHalfLives] = useState(5); // nombre de demi-vies affichées

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isotope = ISOTOPES[isotopeIdx];
  const lambda = Math.LN2 / isotope.halfLife;

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Marges
    const ml = 70, mr = 30, mt = 30, mb = 60;
    const plotW = W - ml - mr;
    const plotH = H - mt - mb;

    // Fond
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + plotH);
    ctx.lineTo(ml + plotW, mt + plotH);
    ctx.stroke();

    // Grille
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const nGridX = nHalfLives;
    const nGridY = 5;
    for (let i = 0; i <= nGridX; i++) {
      const x = ml + (i / nGridX) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, mt);
      ctx.lineTo(x, mt + plotH);
      ctx.stroke();
    }
    for (let i = 0; i <= nGridY; i++) {
      const y = mt + (i / nGridY) * plotH;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + plotW, y);
      ctx.stroke();
    }

    // Temps max = nHalfLives * t½
    const tMax = nHalfLives * isotope.halfLife;
    const toX = (t: number) => ml + (t / tMax) * plotW;
    const toY = (n: number) => mt + plotH - (n / N0) * plotH;

    // Courbe N(t) = N0 * exp(-λt)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * tMax;
      const n = N0 * Math.exp(-lambda * t);
      const x = toX(t);
      const y = toY(n);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Courbe activité A(t) = λN(t) — échelle normalisée
    const A0 = lambda * N0;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * tMax;
      const a = A0 * Math.exp(-lambda * t);
      const x = toX(t);
      const y = mt + plotH - (a / A0) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Marqueurs demi-vie
    for (let k = 1; k <= nHalfLives; k++) {
      const t = k * isotope.halfLife;
      const n = N0 * Math.exp(-lambda * t);
      const x = toX(t);
      const y = toY(n);

      ctx.strokeStyle = '#475569';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, mt + plotH);
      ctx.lineTo(x, y);
      ctx.lineTo(ml, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label demi-vie
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${k}t½`, x, mt + plotH + 15);

      // Label N
      ctx.textAlign = 'right';
      ctx.fillText(`N₀/${Math.pow(2, k)}`, ml - 5, y + 3);
    }

    // Labels axes
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Temps (en demi-vies)', ml + plotW / 2, mt + plotH + 42);

    ctx.save();
    ctx.translate(16, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('N(t) / A(t)', 0, 0);
    ctx.restore();

    // Label N0
    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.fillText('N₀', ml - 5, toY(N0) + 3);

    // Légende
    const lx = ml + plotW - 180;
    const ly = mt + 14;
    ctx.font = '12px sans-serif';

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 24, ly);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText('N(t) noyaux restants', lx + 30, ly + 4);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(lx, ly + 20);
    ctx.lineTo(lx + 24, ly + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('A(t) activité', lx + 30, ly + 24);

    // Titre
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${isotope.label}  —  t½ = ${isotope.halfLifeStr}`, ml + 8, mt + 18);
  }, [isotopeIdx, N0, nHalfLives, isotope, lambda]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Loi de décroissance radioactive
        </h2>
        <p className="text-gray-600">
          Loi exponentielle, demi-vie et activité &mdash; Rutherford &amp; Soddy, 1903
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Choix isotope */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Isotope :</span>
            <div className="flex gap-1 flex-wrap">
              {ISOTOPES.map((iso, i) => (
                <button
                  key={i}
                  onClick={() => setIsotopeIdx(i)}
                  className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                    isotopeIdx === i
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {iso.label}
                </button>
              ))}
            </div>
          </div>

          {/* N0 */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              <InlineMath math="N_0" /> initial
            </label>
            <input
              type="range" min={100} max={5000} step={100}
              value={N0}
              onChange={(e) => setN0(Number(e.target.value))}
              className="flex-1 accent-green-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{N0}</span>
          </div>

          {/* Nombre de demi-vies */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Demi-vies affichées
            </label>
            <input
              type="range" min={1} max={10} step={1}
              value={nHalfLives}
              onChange={(e) => setNHalfLives(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{nHalfLives}</span>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. La loi de décroissance"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un noyau radioactif a une probabilité constante <InlineMath math="\lambda" /> de
            se désintégrer par unité de temps. Pour un échantillon de{' '}
            <InlineMath math="N" /> noyaux identiques :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\frac{dN}{dt} = -\\lambda\\,N \\quad \\Longrightarrow \\quad N(t) = N_0\\,e^{-\\lambda t}`} />
          </div>
          <p className="text-gray-700">
            C&apos;est une loi <strong>statistique</strong> : on ne peut prédire quand un
            noyau donné se désintègre, mais le comportement collectif est parfaitement
            déterministe.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Demi-vie et constante de désintégration"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            La <strong>demi-vie</strong> <InlineMath math="t_{1/2}" /> est le temps au bout
            duquel la moitié des noyaux se sont désintégrés :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`t_{1/2} = \\frac{\\ln 2}{\\lambda} \\approx \\frac{0{,}693}{\\lambda}`} />
          </div>
          <p className="text-gray-700">
            Après <InlineMath math="n" /> demi-vies, il reste{' '}
            <InlineMath math={`N_0 / 2^n`} /> noyaux. La durée de vie moyenne est{' '}
            <InlineMath math={`\\tau = 1/\\lambda = t_{1/2}/\\ln 2 \\approx 1{,}443\\,t_{1/2}`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Activité"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
        >
          <p className="text-gray-700">
            L&apos;<strong>activité</strong> <InlineMath math="A(t)" /> mesure le nombre de
            désintégrations par seconde (unité SI : <strong>becquerel</strong>, 1 Bq = 1
            désintégration/s) :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`A(t) = \\lambda\\,N(t) = A_0\\,e^{-\\lambda t}`} />
          </div>
          <p className="text-gray-700">
            L&apos;ancienne unité est le <strong>curie</strong> :{' '}
            <InlineMath math={`1\\,\\text{Ci} = 3{,}7 \\times 10^{10}\\,\\text{Bq}`} />,
            correspondant à l&apos;activité d&apos;un gramme de radium-226.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            La décroissance radioactive est utilisée en <strong>datation</strong> (carbone-14
            pour l&apos;archéologie, uranium-plomb pour la géologie), en{' '}
            <strong>médecine nucléaire</strong> (iode-131 pour la thyroïde, cobalt-60 pour
            la radiothérapie), et en <strong>production d&apos;énergie</strong> (fission de
            l&apos;uranium-235 dans les centrales nucléaires).
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
