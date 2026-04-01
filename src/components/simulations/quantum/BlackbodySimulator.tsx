'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { h, k, c, CONSTANTS_INFO } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rayleigh-Jeans spectral energy density u(f) */
function rayleighJeans(f: number, T: number): number {
  return (8 * Math.PI * f * f) / (c * c * c) * k * T;
}

/** Wien approximation u(f) */
function wien(f: number, T: number): number {
  const prefactor = (8 * Math.PI * h * f * f * f) / (c * c * c);
  const exponent = -(h * f) / (k * T);
  return prefactor * Math.exp(exponent);
}

/** Planck distribution u(f) */
function planck(f: number, T: number): number {
  if (f <= 0) return 0;
  const prefactor = (8 * Math.PI * h * f * f * f) / (c * c * c);
  const x = (h * f) / (k * T);
  if (x > 500) return 0; // avoid overflow
  return prefactor / (Math.exp(x) - 1);
}

// ---------------------------------------------------------------------------
// Collapsible panel
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
// Constant tooltip
// ---------------------------------------------------------------------------

function ConstantTooltip({ symbol }: { symbol: 'h' | 'k' | 'c' }) {
  const info = CONSTANTS_INFO[symbol];
  return (
    <span className="relative group inline-block cursor-help border-b border-dashed border-gray-500">
      <InlineMath math={info.latex} />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg z-50">
        {info.name}: {info.value} {info.unit}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BlackbodySimulator() {
  const [temperature, setTemperature] = useState(5000);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ------ Canvas drawing -------------------------------------------------
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const T = temperature;

    // Margins
    const ml = 70; // left
    const mr = 20; // right
    const mt = 30; // top
    const mb = 60; // bottom
    const plotW = W - ml - mr;
    const plotH = H - mt - mb;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Frequency range
    const fMax = 3e15;
    const N = 500; // sample points

    // Compute curves
    const freqs: number[] = [];
    const rjVals: number[] = [];
    const wienVals: number[] = [];
    const planckVals: number[] = [];

    for (let i = 0; i <= N; i++) {
      const f = (i / N) * fMax;
      freqs.push(f);
      rjVals.push(rayleighJeans(f, T));
      wienVals.push(wien(f, T));
      planckVals.push(planck(f, T));
    }

    // Y-axis auto-scale: based on Planck peak, clip RJ
    const planckMax = Math.max(...planckVals);
    const yMax = planckMax * 1.6; // leave headroom
    const rjClip = yMax; // clip Rayleigh-Jeans at this value

    // Helper: data -> pixel
    const toX = (f: number) => ml + (f / fMax) * plotW;
    const toY = (u: number) => mt + plotH - (Math.min(u, rjClip) / yMax) * plotH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const nGridX = 6;
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

    // Draw curve helper
    const drawCurve = (vals: number[], color: string, clip: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const x = toX(freqs[i]);
        const v = Math.min(vals[i], clip);
        const y = toY(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Draw Rayleigh-Jeans (red) -- clipped
    drawCurve(rjVals, '#ef4444', rjClip);

    // Draw Wien (yellow)
    drawCurve(wienVals, '#eab308', yMax * 10);

    // Draw Planck (green)
    drawCurve(planckVals, '#22c55e', yMax * 10);

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + plotH);
    ctx.lineTo(ml + plotW, mt + plotH);
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= nGridX; i++) {
      const f = (i / nGridX) * fMax;
      const label = (f / 1e14).toFixed(1);
      ctx.fillText(label, ml + (i / nGridX) * plotW, mt + plotH + 18);
    }
    ctx.fillText('f (\u00D710\u00B9\u2074 Hz)', ml + plotW / 2, mt + plotH + 42);

    // Y-axis label
    ctx.save();
    ctx.translate(16, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('u(f)  (J\u00B7s/m\u00B3)', 0, 0);
    ctx.restore();

    // Y-axis tick labels
    ctx.textAlign = 'right';
    ctx.font = '10px sans-serif';
    for (let i = 0; i <= nGridY; i++) {
      const val = ((nGridY - i) / nGridY) * yMax;
      const y = mt + (i / nGridY) * plotH;
      // Use scientific notation
      if (val === 0) {
        ctx.fillText('0', ml - 6, y + 3);
      } else {
        const exp = Math.floor(Math.log10(val));
        const mantissa = val / Math.pow(10, exp);
        ctx.fillText(`${mantissa.toFixed(1)}e${exp}`, ml - 6, y + 3);
      }
    }

    // Wien displacement peak marker
    const fPeak = 2.821 * k * T / h; // Wien displacement law in frequency
    if (fPeak < fMax) {
      const peakX = toX(fPeak);
      const peakY = toY(planck(fPeak, T));
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#22c55e80';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(peakX, mt);
      ctx.lineTo(peakX, mt + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Peak label
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`f_peak = ${(fPeak / 1e14).toFixed(1)}\u00D710\u00B9\u2074 Hz`, peakX + 4, peakY - 8);
    }

    // Legend
    const legendX = ml + plotW - 200;
    const legendY = mt + 14;
    const legendItems: [string, string][] = [
      ['#ef4444', 'Rayleigh-Jeans (classique)'],
      ['#eab308', 'Wien (approximation)'],
      ['#22c55e', 'Planck (quantique)'],
    ];
    ctx.font = '12px sans-serif';
    legendItems.forEach(([color, label], idx) => {
      const y = legendY + idx * 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(legendX, y);
      ctx.lineTo(legendX + 24, y);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 30, y + 4);
    });

    // Temperature display
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`T = ${T} K`, ml + 10, mt + 20);
  }, [temperature]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // ------ Render ---------------------------------------------------------
  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Rayonnement du corps noir
        </h2>
        <p className="text-gray-600">
          Naissance de la physique quantique &mdash; Planck, 1900
        </p>
      </div>

      {/* Canvas */}
      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        {/* Temperature slider */}
        <div className="w-full max-w-[700px] flex items-center gap-4">
          <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
            Temperature <InlineMath math={`T`} />
          </label>
          <input
            type="range"
            min={1000}
            max={10000}
            step={100}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-mono text-gray-900 w-20 text-right">
            {temperature} K
          </span>
        </div>

        {/* Constant tooltips */}
        <div className="flex gap-6 text-gray-600 text-sm">
          <span>
            Constantes : <ConstantTooltip symbol="h" />,{' '}
            <ConstantTooltip symbol="k" />,{' '}
            <ConstantTooltip symbol="c" />
          </span>
        </div>
      </div>

      {/* Collapsible panels */}
      <div className="space-y-2">
        {/* 1. Catastrophe ultraviolette */}
        <CollapsiblePanel
          title="1. Catastrophe ultraviolette"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
          defaultOpen
        >
          <p className="text-gray-700">
            La physique classique attribue une énergie moyenne{' '}
            <InlineMath math={`k_B T`} /> à chaque mode de vibration du champ
            électromagnétique (théorème d&apos;équipartition). Le nombre de modes
            par unité de volume dans l&apos;intervalle{' '}
            <InlineMath math={`[f, f+df]`} /> croît comme{' '}
            <InlineMath math={`\\frac{8\\pi f^2}{c^3}`} />, ce qui conduit à la
            loi de <strong>Rayleigh-Jeans</strong> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`u(f) = \\frac{8\\pi f^2}{c^3}\\, k_B T`} />
          </div>
          <p className="text-gray-700">
            Cette formule diverge lorsque{' '}
            <InlineMath math={`f \\to \\infty`} /> : l&apos;énergie totale du
            rayonnement serait <em>infinie</em>. C&apos;est la{' '}
            <strong className="text-red-600">catastrophe ultraviolette</strong>,
            un échec spectaculaire de la physique classique.
          </p>
        </CollapsiblePanel>

        {/* 2. Hypothese de Planck */}
        <CollapsiblePanel
          title="2. Hypothèse de Planck"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            En décembre 1900, <strong>Max Planck</strong> propose que
            l&apos;énergie des oscillateurs de fréquence{' '}
            <InlineMath math={`f`} /> ne peut prendre que des valeurs{' '}
            <em>discrètes</em>, multiples d&apos;un quantum élémentaire :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`E_n = n\\,h\\,f \\qquad (n = 0, 1, 2, \\ldots)`} />
          </div>
          <p className="text-gray-700">
            En calculant la valeur moyenne de l&apos;énergie avec cette
            quantification, Planck obtient la distribution :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`u(f) = \\frac{8\\pi h f^3}{c^3} \\; \\frac{1}{e^{hf/k_BT} - 1}`} />
          </div>
          <p className="text-gray-700">
            Cette loi reproduit parfaitement les données expérimentales à toutes
            les fréquences. Le facteur clé est le dénominateur de Bose-Einstein
            qui « éteint » les hautes fréquences.
          </p>
        </CollapsiblePanel>

        {/* 3. Regimes limites */}
        <CollapsiblePanel
          title="3. Régimes limites"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            La formule de Planck contient les deux approximations classiques
            comme cas limites :
          </p>

          <div className="space-y-4">
            <div>
              <p className="font-semibold text-blue-800 mb-1">
                Basses fréquences (<InlineMath math={`hf \\ll k_BT`} />) :
              </p>
              <p className="text-gray-700 mb-2">
                On développe l&apos;exponentielle{' '}
                <InlineMath math={`e^{hf/k_BT} \\approx 1 + hf/k_BT`} />, d&apos;où :
              </p>
              <div className="bg-gray-100 rounded p-3 overflow-x-auto">
                <BlockMath math={`u(f) \\approx \\frac{8\\pi h f^3}{c^3} \\cdot \\frac{k_BT}{hf} = \\frac{8\\pi f^2}{c^3}\\,k_BT`} />
              </div>
              <p className="text-gray-700">
                On retrouve la loi de <strong>Rayleigh-Jeans</strong> : continuité avec la physique classique.
              </p>
            </div>

            <div>
              <p className="font-semibold text-blue-800 mb-1">
                Hautes fréquences (<InlineMath math={`hf \\gg k_BT`} />) :
              </p>
              <p className="text-gray-700 mb-2">
                L&apos;exponentielle domine :{' '}
                <InlineMath math={`e^{hf/k_BT} - 1 \\approx e^{hf/k_BT}`} />, d&apos;où :
              </p>
              <div className="bg-gray-100 rounded p-3 overflow-x-auto">
                <BlockMath math={`u(f) \\approx \\frac{8\\pi h f^3}{c^3}\\,e^{-hf/k_BT}`} />
              </div>
              <p className="text-gray-700">
                On retrouve la loi de <strong>Wien</strong> : extinction exponentielle
                aux hautes fréquences, pas de catastrophe.
              </p>
            </div>
          </div>
        </CollapsiblePanel>

        {/* 4. Contexte historique */}
        <CollapsiblePanel
          title="4. Contexte historique"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            À la fin du XIX<sup>e</sup> siècle, la physique classique semblait
            presque complète. Lord Kelvin évoquait cependant « deux petits
            nuages » à l&apos;horizon : le résultat négatif de
            l&apos;expérience de Michelson-Morley et le problème du rayonnement
            du corps noir.
          </p>
          <p className="text-gray-700">
            Le 14 décembre 1900, Max Planck présente à la{' '}
            <em>Deutsche Physikalische Gesellschaft</em> sa dérivation de la loi
            du rayonnement, introduisant la constante{' '}
            <InlineMath math={`h = 6{,}626 \\times 10^{-34}`} /> J·s.
            Il considérait lui-même cette quantification comme un « acte
            de désespoir » (<em>Verzweiflungstat</em>).
          </p>
          <p className="text-gray-700">
            Cette hypothèse audacieuse ouvre la voie à Einstein (effet
            photoélectrique, 1905), Bohr (modèle atomique, 1913) et finalement à
            la mécanique quantique complète de Heisenberg et Schrödinger
            (1925-1926).
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
