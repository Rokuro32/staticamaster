'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from '@/components/ui/LaTeX';
import { hbar, CONSTANTS_INFO } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Collapsible panel (same pattern as other simulators)
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
      <InlineMath math={info.latex} />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg z-50">
        {info.name}: {info.value} {info.unit}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function gaussian(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  w: number,
  h: number,
  xLabel: string,
  yLabel: string,
  color: string,
) {
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox, oy - h);
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + w, oy);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(xLabel, ox + w / 2, oy + 18);
  ctx.save();
  ctx.translate(ox - 18, oy - h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawGaussianCurve(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  w: number,
  h: number,
  sigma: number,
  range: number,
  color: string,
  fillAlpha: number,
) {
  const steps = 300;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const val = -range + 2 * range * t;
    const y = gaussian(val, sigma);
    const px = ox + t * w;
    const py = oy - y * (h - 10);
    if (i === 0) ctx.lineTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(ox + w, oy);
  ctx.closePath();

  // Fill
  ctx.globalAlpha = fillAlpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Stroke
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const val = -range + 2 * range * t;
    const y = gaussian(val, sigma);
    const px = ox + t * w;
    const py = oy - y * (h - 10);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UncertaintyPrincipleSimulator() {
  const [deltaX, setDeltaX] = useState(1.5);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Derived
  // We work in "natural" units where ℏ = 1.055e-34, but for the visualisation
  // we use arbitrary units and set ℏ_vis = 1 so that Δx·Δp = 0.5.
  const hbarVis = 1; // ℏ in visualisation units
  const deltaP = hbarVis / (2 * deltaX);
  const product = deltaX * deltaP; // always ℏ/2 = 0.5

  // ---- Draw the two gaussian graphs ----
  const drawMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 700;
    const H = 350;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, W, H);

    const margin = 50;
    const gapY = 30;
    const graphW = W - margin * 2;
    const graphH = (H - margin - gapY - 30) / 2;

    // Top graph: position space
    const ox1 = margin;
    const oy1 = margin + graphH;
    drawAxes(ctx, ox1, oy1, graphW, graphH, 'Position x', '|ψ(x)|²', '#60a5fa');
    drawGaussianCurve(ctx, ox1, oy1, graphW, graphH, deltaX, 8, '#3b82f6', 0.25);

    // Sigma indicator on top graph
    const centerX1 = ox1 + graphW / 2;
    const sigmaPixels1 = (deltaX / 8) * (graphW / 2);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX1 - sigmaPixels1, oy1 - graphH + 5);
    ctx.lineTo(centerX1 - sigmaPixels1, oy1);
    ctx.moveTo(centerX1 + sigmaPixels1, oy1 - graphH + 5);
    ctx.lineTo(centerX1 + sigmaPixels1, oy1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Δx = ${deltaX.toFixed(2)}`, centerX1, oy1 - graphH + 14);

    // Bottom graph: momentum space
    const ox2 = margin;
    const oy2 = oy1 + gapY + graphH;
    drawAxes(ctx, ox2, oy2, graphW, graphH, 'Momentum p', '|φ(p)|²', '#fb923c');
    drawGaussianCurve(ctx, ox2, oy2, graphW, graphH, deltaP, 8, '#f97316', 0.25);

    // Sigma indicator on bottom graph
    const centerX2 = ox2 + graphW / 2;
    const sigmaPixels2 = (deltaP / 8) * (graphW / 2);
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX2 - sigmaPixels2, oy2 - graphH + 5);
    ctx.lineTo(centerX2 - sigmaPixels2, oy2);
    ctx.moveTo(centerX2 + sigmaPixels2, oy2 - graphH + 5);
    ctx.lineTo(centerX2 + sigmaPixels2, oy2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fdba74';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Δp = ${deltaP.toFixed(2)}`, centerX2, oy2 - graphH + 14);
  }, [deltaX, deltaP]);

  // ---- Draw wave packet ----
  const drawWaveCanvas = useCallback(
    (time: number) => {
      const canvas = waveCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const W = 700;
      const H = 200;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, W, H);

      const margin = 50;
      const graphW = W - margin * 2;
      const graphH = H - 50;
      const ox = margin;
      const oy = margin + graphH / 2; // center line

      // Axes
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + graphW, oy);
      ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x', ox + graphW / 2, H - 5);
      ctx.save();
      ctx.translate(ox - 16, oy);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#a78bfa';
      ctx.fillText('ψ(x)', 0, 0);
      ctx.restore();

      // Build wave packet: ψ(x) = Σ_i cos(k_i x + ω_i t) × envelope
      const k0 = 4; // central wave number
      const numK = 40;
      const dk = deltaP * 3; // spread in k proportional to Δp
      const xRange = 12;

      const steps = 500;
      const amplitude = graphH / 2 - 10;

      // Compute envelope normalisation
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -xRange + 2 * xRange * t;

        // Sum of cosines with Gaussian-weighted k
        let psi = 0;
        for (let j = 0; j < numK; j++) {
          const kj = k0 + (j - numK / 2) * (2 * dk / numK);
          const weight = gaussian(kj - k0, dk === 0 ? 0.001 : dk);
          psi += weight * Math.cos(kj * x + 0.3 * time * kj);
        }
        // Normalise: max possible is sum of all weights
        let maxW = 0;
        for (let j = 0; j < numK; j++) {
          const kj = k0 + (j - numK / 2) * (2 * dk / numK);
          maxW += gaussian(kj - k0, dk === 0 ? 0.001 : dk);
        }
        psi /= maxW || 1;

        const px = ox + t * graphW;
        const py = oy - psi * amplitude;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw the Gaussian envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -xRange + 2 * xRange * t;
        const env = gaussian(x, deltaX);
        const px = ox + t * graphW;
        const py = oy - env * amplitude;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mirror envelope
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -xRange + 2 * xRange * t;
        const env = gaussian(x, deltaX);
        const px = ox + t * graphW;
        const py = oy + env * amplitude;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Paquet d\'onde ψ(x)', ox + 5, margin - 8);
    },
    [deltaX, deltaP],
  );

  // Animation loop for wave packet
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      timeRef.current += 0.04;
      drawWaveCanvas(timeRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    drawMainCanvas();
    animate();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawMainCanvas, drawWaveCanvas]);

  // ---- Product bar width (always at minimum) ----
  const barFraction = Math.min(1, (hbarVis / 2) / product); // always 1

  return (
    <section className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Principe d&apos;incertitude de Heisenberg
        </h2>
        <p className="text-gray-600 text-sm">
          Heisenberg, 1927 &mdash; Une propriété fondamentale de la nature quantique
        </p>
      </div>

      {/* Main equation */}
      <div className="flex justify-center">
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-8 py-4">
          <BlockMath math={String.raw`\Delta x \cdot \Delta p \;\geq\; \frac{\hbar}{2}`} />
        </div>
      </div>

      {/* Slider */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 font-medium">
            Incertitude en position{' '}
            <InlineMath math={String.raw`\Delta x`} />
          </label>
          <span className="font-mono text-gray-900 text-sm">
            {deltaX.toFixed(2)} (u.a.)
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={5.0}
          step={0.01}
          value={deltaX}
          onChange={(e) => setDeltaX(parseFloat(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.1 — très localisé</span>
          <span>5.0 — très étalé</span>
        </div>
      </div>

      {/* Product display */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-lg text-gray-900">
            <InlineMath math={String.raw`\Delta x \cdot \Delta p`} />{' '}
            <span className="font-mono text-green-600 text-xl font-bold">
              = {product.toFixed(3)}
            </span>{' '}
            <span className="text-gray-600">
              <InlineMath math={String.raw`\geq \;\tfrac{\hbar}{2} = 0.500`} />
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Le produit reste toujours au minimum (état gaussien = état d&apos;incertitude minimale)
          </p>
        </div>

        {/* Bar indicator */}
        <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-150"
            style={{ width: `${barFraction * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-gray-900">
            {product.toFixed(3)} &ge; 0.500 (= <ConstantTooltip symbol="hbar" />/2)
          </div>
        </div>

        {/* Individual values */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700 mb-1">
              <InlineMath math={String.raw`\Delta x`} />
            </p>
            <p className="font-mono text-blue-600 text-lg">{deltaX.toFixed(3)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <p className="text-xs text-orange-700 mb-1">
              <InlineMath math={String.raw`\Delta p = \hbar / (2\Delta x)`} />
            </p>
            <p className="font-mono text-orange-600 text-lg">{deltaP.toFixed(3)}</p>
          </div>
        </div>
      </div>

      {/* Main Canvas — Two linked Gaussians */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Distributions de probabilité liées
        </h3>
        <div className="flex justify-center overflow-x-auto">
          <canvas
            ref={mainCanvasRef}
            className="rounded-lg"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {/* Wave packet Canvas */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Paquet d&apos;onde dans l&apos;espace réel
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {deltaX < 1
            ? 'Δx petit → paquet étroit, beaucoup de fréquences (oscillations rapides à l\'extérieur)'
            : deltaX > 3
              ? 'Δx grand → paquet large, presque monochromatique (onde sinusoïdale propre)'
              : 'Régime intermédiaire — ajustez Δx pour voir les deux extrêmes'}
        </p>
        <div className="flex justify-center overflow-x-auto">
          <canvas
            ref={waveCanvasRef}
            className="rounded-lg"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {/* Collapsible panels */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="⚠ Ce n'est PAS une limite instrumentale"
          borderColor="border-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-900"
          defaultOpen
        >
          <p>
            Le principe d&apos;incertitude n&apos;est <strong className="text-purple-700">pas</strong> une
            limitation de nos instruments de mesure. C&apos;est une{' '}
            <strong className="text-purple-700">propriété fondamentale de la nature</strong>.
          </p>
          <p>
            Une particule quantique ne possède tout simplement pas une position définie et une
            quantité de mouvement définie <em>simultanément</em>. Ce n&apos;est pas que nous ne
            pouvons pas les mesurer — c&apos;est qu&apos;elles n&apos;existent pas en même temps
            comme valeurs précises.
          </p>
          <p>
            Même avec un appareil de mesure parfait, la relation{' '}
            <InlineMath math={String.raw`\Delta x \cdot \Delta p \geq \hbar/2`} /> reste
            inviolable.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Lien avec la transformée de Fourier"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-900"
        >
          <p>
            Un paquet d&apos;onde localisé dans l&apos;espace des positions nécessite de
            nombreuses composantes fréquentielles (ondes planes). C&apos;est un résultat
            purement mathématique de l&apos;analyse de Fourier :
          </p>
          <div className="my-2">
            <BlockMath math={String.raw`\Delta x \cdot \Delta k \;\geq\; \frac{1}{2}`} />
          </div>
          <p>
            La physique quantique introduit la relation de de Broglie{' '}
            <InlineMath math={String.raw`p = \hbar k`} />, qui transforme cette identité
            mathématique en une loi physique :
          </p>
          <div className="my-2">
            <BlockMath
              math={String.raw`\Delta x \cdot \Delta p = \Delta x \cdot \hbar\,\Delta k \;\geq\; \frac{\hbar}{2}`}
            />
          </div>
          <p>
            Le paquet d&apos;onde ci-dessus illustre cela : quand <InlineMath math={String.raw`\Delta x`} />{' '}
            est petit, il faut superposer beaucoup d&apos;ondes de nombres d&apos;onde différents
            (large <InlineMath math={String.raw`\Delta k`} />), et vice versa.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Contexte historique"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p>
            En <strong>1927</strong>, Werner Heisenberg formula le principe d&apos;incertitude
            dans le cadre de la mécanique matricielle qu&apos;il avait développée deux ans
            plus tôt.
          </p>
          <p>
            Il montra que les observables position et quantité de mouvement ne commutent pas :{' '}
            <InlineMath math={String.raw`[\hat{x}, \hat{p}] = i\hbar`} />, ce qui implique
            mathématiquement l&apos;impossibilité de les déterminer simultanément avec une
            précision arbitraire.
          </p>
          <p>
            Ce résultat provoqua un intense débat philosophique, notamment avec Einstein
            (débats Bohr-Einstein), et reste l&apos;un des piliers de la mécanique quantique.
          </p>
        </CollapsiblePanel>
      </div>

      {/* Footer with real ℏ value */}
      <div className="text-center text-xs text-gray-600 pt-4 border-t border-gray-200">
        <p>
          Simulation en unités arbitraires (<InlineMath math={String.raw`\hbar_{\text{vis}} = 1`} />).
          En unités SI :{' '}
          <InlineMath math={String.raw`\hbar = 1.055 \times 10^{-34}\;\text{J·s}`} />
        </p>
      </div>
    </section>
  );
}
