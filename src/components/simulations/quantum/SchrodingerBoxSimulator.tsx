'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { hbar, me, eV, CONSTANTS_INFO } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Energy of level n for an infinite potential well of width L (SI, in Joules) */
function energyLevel(n: number, L: number): number {
  return (n * n * Math.PI * Math.PI * hbar * hbar) / (2 * me * L * L);
}

/** Wave function ψ_n(x) = √(2/L) · sin(nπx/L) */
function psi(n: number, L: number, x: number): number {
  return Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L);
}

/** Probability density |ψ_n(x)|² = (2/L) · sin²(nπx/L) */
function psiSquared(n: number, L: number, x: number): number {
  const s = Math.sin((n * Math.PI * x) / L);
  return (2 / L) * s * s;
}

/** Format energy in eV with appropriate precision */
function formatEV(joules: number): string {
  const val = joules / eV;
  if (val < 0.01) return val.toExponential(2);
  if (val < 10) return val.toFixed(3);
  if (val < 1000) return val.toFixed(1);
  return val.toExponential(2);
}

// ---------------------------------------------------------------------------
// Collapsible panel (matches project style)
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

function ConstantTooltip({ symbol }: { symbol: string }) {
  const info = CONSTANTS_INFO[symbol];
  if (!info) return <InlineMath math={symbol} />;
  return (
    <span className="relative group inline-block cursor-help border-b border-dashed border-gray-500">
      <InlineMath math={symbol} />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg z-50">
        {info.name}: {info.value} {info.unit}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SchrodingerBoxSimulator() {
  const [n, setN] = useState(1);
  const [L_nm, setL_nm] = useState(1.0); // well width in nm
  const [showClassical, setShowClassical] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const L = L_nm * 1e-9; // convert to meters

  // Current energy values
  const En = energyLevel(n, L);
  const E1 = energyLevel(1, L);

  // ------ Canvas drawing ---------------------------------------------------

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Layout
    const ml = 60;  // left margin
    const mr = 20;  // right margin
    const mt = 20;  // top margin
    const mb = 30;  // bottom margin
    const splitY = Math.floor(H * 0.55); // top section ends here

    const plotW = W - ml - mr;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // ===================================================================
    // TOP SECTION: Potential well + wave function + probability density
    // ===================================================================

    const topPlotH = splitY - mt - 10;
    const wellLeft = ml + 40;
    const wellRight = ml + plotW - 40;
    const wellW = wellRight - wellLeft;
    const wellBottom = splitY - 20;
    const wellTop = mt + 20;
    const wellH = wellBottom - wellTop;

    // --- Draw potential walls ---
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    // Left wall
    ctx.beginPath();
    ctx.moveTo(wellLeft, wellTop - 10);
    ctx.lineTo(wellLeft, wellBottom);
    ctx.stroke();
    // Right wall
    ctx.beginPath();
    ctx.moveTo(wellRight, wellTop - 10);
    ctx.lineTo(wellRight, wellBottom);
    ctx.stroke();
    // Bottom of well (V=0 region)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wellLeft, wellBottom);
    ctx.lineTo(wellRight, wellBottom);
    ctx.stroke();

    // V=∞ labels
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V=\u221E', wellLeft - 20, wellTop + wellH / 2);
    ctx.fillText('V=\u221E', wellRight + 22, wellTop + wellH / 2);

    // V=0 label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('V=0', (wellLeft + wellRight) / 2, wellBottom + 14);

    // x=0, x=L labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x=0', wellLeft, wellBottom + 14);
    ctx.fillText('x=L', wellRight, wellBottom + 14);

    // Hatching outside well to indicate forbidden region
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    for (let y = wellTop - 10; y < wellBottom; y += 6) {
      // left side
      ctx.beginPath();
      ctx.moveTo(wellLeft - 15, y);
      ctx.lineTo(wellLeft, y + 8);
      ctx.stroke();
      // right side
      ctx.beginPath();
      ctx.moveTo(wellRight, y);
      ctx.lineTo(wellRight + 15, y + 8);
      ctx.stroke();
    }

    // --- Compute wave function and probability density ---
    const Nsamp = 300;
    const psiVals: number[] = [];
    const psiSqVals: number[] = [];
    let maxPsi = 0;
    let maxPsiSq = 0;

    for (let i = 0; i <= Nsamp; i++) {
      const x = (i / Nsamp) * L;
      const p = psi(n, L, x);
      const psq = psiSquared(n, L, x);
      psiVals.push(p);
      psiSqVals.push(psq);
      if (Math.abs(p) > maxPsi) maxPsi = Math.abs(p);
      if (psq > maxPsiSq) maxPsiSq = psq;
    }

    const drawH = wellH * 0.85; // vertical space for curves
    const baseline = wellBottom;

    // --- Draw |ψ|² filled area (green/teal) ---
    ctx.beginPath();
    ctx.moveTo(wellLeft, baseline);
    for (let i = 0; i <= Nsamp; i++) {
      const px = wellLeft + (i / Nsamp) * wellW;
      const py = baseline - (psiSqVals[i] / maxPsiSq) * drawH;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(wellRight, baseline);
    ctx.closePath();
    ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
    ctx.fill();

    // |ψ|² outline
    ctx.beginPath();
    for (let i = 0; i <= Nsamp; i++) {
      const px = wellLeft + (i / Nsamp) * wellW;
      const py = baseline - (psiSqVals[i] / maxPsiSq) * drawH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Draw ψ(x) (blue curve) ---
    ctx.beginPath();
    for (let i = 0; i <= Nsamp; i++) {
      const px = wellLeft + (i / Nsamp) * wellW;
      const py = baseline - (psiVals[i] / maxPsi) * drawH * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // --- Classical comparison ---
    if (showClassical) {
      const classicalProb = 1 / L; // uniform probability = 1/L
      const classicalY = baseline - (classicalProb / maxPsiSq) * drawH;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(wellLeft, classicalY);
      ctx.lineTo(wellRight, classicalY);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Classique: probabilit\u00E9 uniforme', wellLeft + 5, classicalY - 6);
    }

    // --- Mark nodes ---
    const numNodes = n - 1;
    for (let k = 1; k <= numNodes; k++) {
      const xNode = (k / n); // fractional position
      const px = wellLeft + xNode * wellW;
      ctx.beginPath();
      ctx.arc(px, baseline, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#f87171';
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (numNodes > 0) {
      ctx.fillStyle = '#f87171';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${numNodes} noeud${numNodes > 1 ? 's' : ''}`, wellRight - 5, wellTop + 12);
    }

    // --- Legend ---
    const legX = ml + 8;
    const legY = mt + 8;
    ctx.font = '12px sans-serif';
    // psi
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legX, legY, 16, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText('\u03C8\u2099(x)', legX + 22, legY + 5);
    // |psi|^2
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(legX, legY + 16, 16, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('|\u03C8\u2099(x)|\u00B2', legX + 22, legY + 21);

    // ===================================================================
    // BOTTOM SECTION: Energy level diagram
    // ===================================================================

    const eDiagTop = splitY + 10;
    const eDiagBottom = H - mb;
    const eDiagH = eDiagBottom - eDiagTop;
    const eDiagLeft = ml + 40;
    const eDiagRight = ml + plotW - 80;
    const eDiagW = eDiagRight - eDiagLeft;

    // Separator line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ml, splitY);
    ctx.lineTo(W - mr, splitY);
    ctx.stroke();

    // Compute energies for n=1..6
    const energies: number[] = [];
    for (let level = 1; level <= 6; level++) {
      energies.push(energyLevel(level, L));
    }
    const maxE = energies[5]; // E_6

    // Vertical axis
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(eDiagLeft - 10, eDiagTop);
    ctx.lineTo(eDiagLeft - 10, eDiagBottom);
    ctx.stroke();

    // Arrow at top
    ctx.beginPath();
    ctx.moveTo(eDiagLeft - 10, eDiagTop - 2);
    ctx.lineTo(eDiagLeft - 14, eDiagTop + 8);
    ctx.lineTo(eDiagLeft - 6, eDiagTop + 8);
    ctx.closePath();
    ctx.fillStyle = '#64748b';
    ctx.fill();

    // "E" label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', eDiagLeft - 10, eDiagTop - 8);

    // Draw energy levels
    for (let level = 1; level <= 6; level++) {
      const eFrac = energies[level - 1] / maxE;
      const y = eDiagBottom - eFrac * (eDiagH - 15);
      const isSelected = level === n;

      // Horizontal line
      ctx.strokeStyle = isSelected ? '#facc15' : '#475569';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(eDiagLeft, y);
      ctx.lineTo(eDiagRight, y);
      ctx.stroke();

      // Highlight glow for selected level
      if (isSelected) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(eDiagLeft, y);
        ctx.lineTo(eDiagRight, y);
        ctx.stroke();
      }

      // n label on the left
      ctx.fillStyle = isSelected ? '#facc15' : '#94a3b8';
      ctx.font = isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`n=${level}`, eDiagLeft - 15, y + 4);

      // Energy value on the right
      ctx.fillStyle = isSelected ? '#facc15' : '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${formatEV(energies[level - 1])} eV`, eDiagRight + 8, y + 4);
    }

    // Show spacing indicator between n and n+1 if n < 6
    if (n < 6) {
      const y1 = eDiagBottom - (energies[n - 1] / maxE) * (eDiagH - 15);
      const y2 = eDiagBottom - (energies[n] / maxE) * (eDiagH - 15);
      const xArr = eDiagRight + 65;

      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(xArr, y1);
      ctx.lineTo(xArr, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow heads
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.moveTo(xArr, y1);
      ctx.lineTo(xArr - 3, y1 - 5);
      ctx.lineTo(xArr + 3, y1 - 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(xArr, y2);
      ctx.lineTo(xArr - 3, y2 + 5);
      ctx.lineTo(xArr + 3, y2 + 5);
      ctx.closePath();
      ctx.fill();

      // Delta E label
      const deltaE = energies[n] - energies[n - 1];
      ctx.fillStyle = '#818cf8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`\u0394E = ${formatEV(deltaE)} eV`, xArr + 6, (y1 + y2) / 2 + 3);
    }
  }, [n, L, showClassical]);

  // Redraw on parameter change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const w = Math.min(container.clientWidth, 700);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = w * ratio;
      canvas.height = 400 * ratio;
      canvas.style.width = `${w}px`;
      canvas.style.height = '400px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(ratio, ratio);
      // Restore logical dimensions for drawing
      canvas.width = w;
      canvas.height = 400;
      drawCanvas();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawCanvas]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          Particule dans un puits de potentiel infini
        </h2>
        <p className="text-gray-400 text-sm">
          Schr&ouml;dinger, 1926 &mdash; M&eacute;canique ondulatoire
        </p>
      </div>

      {/* Canvas */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg"
          style={{ maxWidth: 700, height: 400 }}
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quantum number slider */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <label className="flex items-center justify-between text-sm text-gray-300 mb-2">
            <span>Nombre quantique <InlineMath math="n" /></span>
            <span className="font-mono text-blue-400 font-bold text-lg">{n}</span>
          </label>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
          </div>
        </div>

        {/* Well width slider */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <label className="flex items-center justify-between text-sm text-gray-300 mb-2">
            <span>Largeur du puits <InlineMath math="L" /></span>
            <span className="font-mono text-teal-400 font-bold text-lg">{L_nm.toFixed(1)} nm</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.1}
            value={L_nm}
            onChange={(e) => setL_nm(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.1 nm</span>
            <span>1.0 nm</span>
            <span>2.0 nm</span>
          </div>
        </div>
      </div>

      {/* Classical comparison toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowClassical(!showClassical)}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all border ${
            showClassical
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-slate-800 border-slate-600 text-gray-400 hover:border-amber-500/50 hover:text-amber-400'
          }`}
        >
          {showClassical ? '\u2713 ' : ''}Comparaison classique
        </button>
      </div>

      {/* Energy display */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h3 className="text-lg font-semibold text-white">
          &Eacute;nergie du niveau <InlineMath math={`n = ${n}`} />
        </h3>

        <div className="bg-slate-900 rounded-lg p-4">
          <BlockMath math={`E_n = \\frac{n^2 \\pi^2 \\hbar^2}{2 m_e L^2}`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              <InlineMath math={`E_{${n}}`} />
            </p>
            <p className="text-xl font-bold text-yellow-400">
              {formatEV(En)} eV
            </p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              <InlineMath math="E_1" /> (fondamental)
            </p>
            <p className="text-xl font-bold text-green-400">
              {formatEV(E1)} eV
            </p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              <InlineMath math={`E_{${n}} / E_1`} />
            </p>
            <p className="text-xl font-bold text-purple-400">
              {n * n}
            </p>
            <p className="text-xs text-gray-500">
              <InlineMath math={`= n^2 = ${n}^2`} />
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 justify-center">
          <span>Constantes : <ConstantTooltip symbol="hbar" />,{' '}
            <ConstantTooltip symbol="me" />,{' '}
            <ConstantTooltip symbol="eV" />
          </span>
          <span>
            <InlineMath math={`L = ${L_nm.toFixed(1)} \\text{ nm} = ${(L * 1e9).toFixed(1)} \\times 10^{-9} \\text{ m}`} />
          </span>
        </div>
      </div>

      {/* Collapsible panels */}
      <div className="space-y-2">
        {/* 1. Quantification de l'energie */}
        <CollapsiblePanel
          title="Quantification de l'&eacute;nergie"
          borderColor="border-green-500"
          bgColor="bg-green-900/20"
          textColor="text-green-300"
          defaultOpen
        >
          <p>
            Dans un puits de potentiel infini, seules des <strong className="text-green-300">&eacute;nergies discr&egrave;tes</strong> sont
            permises. Le spectre d&rsquo;&eacute;nergie est quantifi&eacute; :
          </p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="E_n = \frac{n^2 \pi^2 \hbar^2}{2 m L^2}, \quad n = 1, 2, 3, \ldots" />
          </div>
          <p>
            La particule <strong className="text-green-300">ne peut pas avoir une &eacute;nergie nulle</strong>.
            Le niveau fondamental <InlineMath math="E_1 > 0" /> est appel&eacute;{' '}
            <em>&eacute;nergie de point z&eacute;ro</em> (zero-point energy). C&rsquo;est une
            cons&eacute;quence directe du principe d&rsquo;incertitude de Heisenberg.
          </p>
          <p>
            Cette quantification d&eacute;coule des <strong className="text-green-300">conditions aux limites</strong> :
          </p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="\psi(0) = \psi(L) = 0" />
          </div>
          <p>
            La fonction d&rsquo;onde doit s&rsquo;annuler aux bords du puits, ce qui impose
            que seuls des multiples entiers de demi-longueurs d&rsquo;onde s&rsquo;ajustent dans le puits.
          </p>
        </CollapsiblePanel>

        {/* 2. Equation de Schrodinger */}
        <CollapsiblePanel
          title="&Eacute;quation de Schr&ouml;dinger"
          borderColor="border-blue-500"
          bgColor="bg-blue-900/20"
          textColor="text-blue-300"
        >
          <p>
            L&rsquo;&eacute;quation de Schr&ouml;dinger <strong className="text-blue-300">d&eacute;pendante du temps</strong> :
          </p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="i\hbar \frac{\partial \Psi}{\partial t} = \hat{H} \Psi" />
          </div>
          <p className="text-gray-400 text-xs">
            <InlineMath math="i\hbar \partial\Psi/\partial t" /> : &eacute;volution temporelle &bull;{' '}
            <InlineMath math="\hat{H}" /> : op&eacute;rateur hamiltonien (&eacute;nergie totale)
          </p>

          <p>
            Pour les <strong className="text-blue-300">&eacute;tats stationnaires</strong>,
            on s&eacute;pare les variables et on obtient l&rsquo;&eacute;quation{' '}
            <strong>ind&eacute;pendante du temps</strong> :
          </p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="\hat{H}\psi = E\psi" />
          </div>

          <p>L&rsquo;op&eacute;rateur hamiltonien s&rsquo;&eacute;crit :</p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="\hat{H} = \underbrace{-\frac{\hbar^2}{2m}\frac{d^2}{dx^2}}_{\text{énergie cinétique}} + \underbrace{V(x)}_{\text{énergie potentielle}}" />
          </div>
          <p className="text-gray-400 text-xs">
            Le premier terme repr&eacute;sente l&rsquo;&eacute;nergie cin&eacute;tique quantique
            (li&eacute;e &agrave; la courbure de <InlineMath math="\psi" />).
            Le second est le potentiel dans lequel se trouve la particule
            (<InlineMath math="V=0" /> &agrave; l&rsquo;int&eacute;rieur du puits,{' '}
            <InlineMath math="V=\infty" /> &agrave; l&rsquo;ext&eacute;rieur).
          </p>
        </CollapsiblePanel>

        {/* 3. Noeuds et probabilite */}
        <CollapsiblePanel
          title="Noeuds et probabilit&eacute;"
          borderColor="border-purple-500"
          bgColor="bg-purple-900/20"
          textColor="text-purple-300"
        >
          <p>
            Le nombre de <strong className="text-purple-300">noeuds</strong> (z&eacute;ros
            int&eacute;rieurs) de la fonction d&rsquo;onde est :
          </p>
          <div className="bg-slate-900 rounded p-3">
            <BlockMath math="\text{nombre de noeuds} = n - 1" />
          </div>
          <p>
            Pour <InlineMath math={`n = ${n}`} />, il y a{' '}
            <strong className="text-purple-300">{n - 1} noeud{n - 1 !== 1 ? 's' : ''}</strong>.
          </p>
          <p>
            &Agrave; chaque noeud, <InlineMath math="|\psi(x)|^2 = 0" /> : la particule a une{' '}
            <strong className="text-purple-300">probabilit&eacute; nulle</strong> d&rsquo;&ecirc;tre
            trouv&eacute;e &agrave; cette position. C&rsquo;est un ph&eacute;nom&egrave;ne purement quantique
            qui <em>n&rsquo;a aucun analogue classique</em>.
          </p>
          <p>
            Une particule classique rebondissant entre les murs passerait par chaque point
            avec une probabilit&eacute; uniforme <InlineMath math="P(x) = 1/L" />. La
            distribution quantique montre au contraire des maxima et des z&eacute;ros.
          </p>
        </CollapsiblePanel>

        {/* 4. Contexte historique */}
        <CollapsiblePanel
          title="Contexte historique"
          borderColor="border-gray-500"
          bgColor="bg-gray-800/40"
          textColor="text-gray-300"
        >
          <p>
            En <strong className="text-gray-200">1926</strong>, Erwin{' '}
            <strong className="text-gray-200">Schr&ouml;dinger</strong> publie une s&eacute;rie
            d&rsquo;articles fondateurs introduisant la <em>m&eacute;canique ondulatoire</em>.
            Il propose que les particules soient d&eacute;crites par une fonction d&rsquo;onde{' '}
            <InlineMath math="\Psi" /> ob&eacute;issant &agrave; une &eacute;quation aux
            d&eacute;riv&eacute;es partielles.
          </p>
          <p>
            Ind&eacute;pendamment, Werner <strong className="text-gray-200">Heisenberg</strong> avait
            d&eacute;velopp&eacute; en 1925 la <em>m&eacute;canique matricielle</em>, une
            formulation &eacute;quivalente mais math&eacute;matiquement tr&egrave;s diff&eacute;rente.
            Schr&ouml;dinger d&eacute;montra lui-m&ecirc;me l&rsquo;
            <strong className="text-gray-200">&eacute;quivalence</strong> des deux approches.
          </p>
          <p>
            Le mod&egrave;le de la particule dans une bo&icirc;te, bien que simplifi&eacute;,
            illustre les caract&eacute;ristiques essentielles de la m&eacute;canique quantique :
            quantification de l&rsquo;&eacute;nergie, fonctions d&rsquo;onde, probabilit&eacute;s
            et principe d&rsquo;incertitude.
          </p>
        </CollapsiblePanel>
      </div>
    </div>
  );
}
