'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { h, c, eV } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Energy of level n in eV */
function energyLevel(n: number): number {
  return -13.6 / (n * n);
}

/** Photon wavelength (in metres) for transition n_i → n_f (n_i > n_f) */
function transitionWavelength(ni: number, nf: number): number {
  const deltaE = (energyLevel(nf) - energyLevel(ni)) * eV; // joules (positive)
  return (h * c) / Math.abs(deltaE);
}

/** Photon energy in eV for transition */
function transitionEnergy(ni: number, nf: number): number {
  return Math.abs(energyLevel(ni) - energyLevel(nf));
}

/** Convert a wavelength in nm to an approximate RGB string */
function wavelengthToColor(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    r = 0;
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    r = 0;
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
    b = 0;
  } else if (nm >= 645 && nm <= 750) {
    r = 1;
    g = 0;
    b = 0;
  } else if (nm < 380) {
    // UV — render as violet
    r = 0.6; g = 0; b = 1;
  } else {
    // IR — render as dark red
    r = 0.6; g = 0; b = 0;
  }

  // Intensity fall-off at edges of visible spectrum
  let factor = 1.0;
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
  else if (nm >= 700 && nm <= 750) factor = 0.3 + 0.7 * (750 - nm) / (750 - 700);
  else if (nm < 380 || nm > 750) factor = 0.6;

  r = Math.round(255 * Math.pow(r * factor, 0.8));
  g = Math.round(255 * Math.pow(g * factor, 0.8));
  b = Math.round(255 * Math.pow(b * factor, 0.8));

  return `rgb(${r},${g},${b})`;
}

/** Spectral series label */
function seriesLabel(nf: number): string {
  if (nf === 1) return 'Lyman (UV)';
  if (nf === 2) return 'Balmer (visible)';
  if (nf === 3) return 'Paschen (IR)';
  return `n=${nf}`;
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
      {open && <div className="px-4 py-3 bg-white/80">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpectralLine {
  wavelengthNm: number;
  ni: number;
  nf: number;
  color: string;
}

interface PhotonAnim {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BohrModelSimulator() {
  // State
  const [ni, setNi] = useState(3);
  const [nf, setNf] = useState(2);
  const [currentOrbit, setCurrentOrbit] = useState(3);
  const [spectralLines, setSpectralLines] = useState<SpectralLine[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [lastTransition, setLastTransition] = useState<{ ni: number; nf: number } | null>(null);

  // Refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const electronAngle = useRef(0);
  const transitionProgress = useRef(0);
  const photonsRef = useRef<PhotonAnim[]>([]);
  const transitionFromRef = useRef(3);
  const transitionToRef = useRef(2);

  // Canvas dimensions
  const W = 700;
  const H = 500;
  const SPEC_H = 60;

  // Orbit layout (left half of canvas)
  const atomCx = 160;
  const atomCy = H / 2;
  const baseRadius = 22;
  const orbitRadius = (n: number) => baseRadius * n * n * 0.22 + 20;

  // Energy diagram layout (right half)
  const diagLeft = 380;
  const diagRight = 680;
  const diagTop = 40;
  const diagBottom = H - 40;

  const energyToY = useCallback(
    (e: number) => {
      // e ranges from -13.6 to 0
      const frac = (e - (-14)) / (0 - (-14));
      return diagBottom - frac * (diagBottom - diagTop);
    },
    [diagTop, diagBottom]
  );

  // ------- Trigger transition -------
  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    if (ni <= nf) return;

    transitionFromRef.current = ni;
    transitionToRef.current = nf;
    setCurrentOrbit(ni);
    transitionProgress.current = 0;
    setTransitioning(true);
    setLastTransition({ ni, nf });

    const wl = transitionWavelength(ni, nf) * 1e9; // nm
    const color = wavelengthToColor(wl);

    // Add spectral line (avoid duplicates)
    setSpectralLines((prev) => {
      const exists = prev.some((l) => l.ni === ni && l.nf === nf);
      if (exists) return prev;
      return [...prev, { wavelengthNm: wl, ni, nf, color }];
    });
  }, [ni, nf, transitioning]);

  // ------- Trigger full series -------
  const triggerSeries = useCallback(
    (targetNf: number) => {
      const lines: SpectralLine[] = [];
      for (let n = targetNf + 1; n <= 5; n++) {
        const wl = transitionWavelength(n, targetNf) * 1e9;
        const color = wavelengthToColor(wl);
        if (!spectralLines.some((l) => l.ni === n && l.nf === targetNf)) {
          lines.push({ wavelengthNm: wl, ni: n, nf: targetNf, color });
        }
      }
      setSpectralLines((prev) => [...prev, ...lines]);
      setNf(targetNf);
      setNi(targetNf + 1);
      setLastTransition({ ni: targetNf + 1, nf: targetNf });
    },
    [spectralLines]
  );

  // ------- Animation loop -------
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const specCanvas = spectrumCanvasRef.current;
    if (!mainCanvas || !specCanvas) return;
    const ctx = mainCanvas.getContext('2d')!;
    const sctx = specCanvas.getContext('2d')!;

    let running = true;

    const draw = () => {
      if (!running) return;

      // ===== Main canvas =====
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // ---- Left half: atom ----
      // Nucleus
      const nucGrad = ctx.createRadialGradient(atomCx, atomCy, 0, atomCx, atomCy, 8);
      nucGrad.addColorStop(0, '#ff6666');
      nucGrad.addColorStop(1, '#aa0000');
      ctx.beginPath();
      ctx.arc(atomCx, atomCy, 8, 0, Math.PI * 2);
      ctx.fillStyle = nucGrad;
      ctx.fill();

      // Orbits
      for (let n = 1; n <= 5; n++) {
        const r = orbitRadius(n);
        ctx.beginPath();
        ctx.arc(atomCx, atomCy, r, 0, Math.PI * 2);
        ctx.strokeStyle = n === currentOrbit ? 'rgba(100,180,255,0.6)' : 'rgba(100,100,150,0.3)';
        ctx.lineWidth = n === currentOrbit ? 1.5 : 0.8;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(180,180,220,0.7)';
        ctx.font = '11px sans-serif';
        ctx.fillText(`n=${n}`, atomCx + r + 4, atomCy - 4);
      }

      // Electron position
      let electronR: number;
      let eAngle: number;

      if (transitioning) {
        transitionProgress.current += 0.018;
        if (transitionProgress.current >= 1) {
          transitionProgress.current = 1;
          setTransitioning(false);
          setCurrentOrbit(transitionToRef.current);

          // Emit photon
          const wl = transitionWavelength(transitionFromRef.current, transitionToRef.current) * 1e9;
          const color = wavelengthToColor(wl);
          const angle = electronAngle.current;
          const ex = atomCx + orbitRadius(transitionToRef.current) * Math.cos(angle);
          const ey = atomCy + orbitRadius(transitionToRef.current) * Math.sin(angle);
          const speed = 2.5;
          const dir = angle + (Math.random() - 0.5) * 0.5;
          photonsRef.current.push({
            x: ex,
            y: ey,
            vx: Math.cos(dir) * speed,
            vy: Math.sin(dir) * speed,
            color,
            alpha: 1,
          });
        }

        const t = transitionProgress.current;
        const rFrom = orbitRadius(transitionFromRef.current);
        const rTo = orbitRadius(transitionToRef.current);
        // Ease-in-out
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        electronR = rFrom + (rTo - rFrom) * ease;
        eAngle = electronAngle.current;
        // Slow rotation during transition
        electronAngle.current += 0.02;
      } else {
        electronR = orbitRadius(currentOrbit);
        // Orbit speed inversely proportional to n
        electronAngle.current += 0.04 / currentOrbit;
        eAngle = electronAngle.current;
      }

      const ex = atomCx + electronR * Math.cos(electronAngle.current);
      const ey = atomCy + electronR * Math.sin(electronAngle.current);

      // Draw electron glow
      const elGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 12);
      elGrad.addColorStop(0, 'rgba(80,160,255,0.9)');
      elGrad.addColorStop(0.5, 'rgba(80,160,255,0.3)');
      elGrad.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.beginPath();
      ctx.arc(ex, ey, 12, 0, Math.PI * 2);
      ctx.fillStyle = elGrad;
      ctx.fill();

      // Electron core
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#60b0ff';
      ctx.fill();

      // ---- Photons ----
      photonsRef.current = photonsRef.current.filter((p) => p.alpha > 0.01);
      for (const p of photonsRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.008;

        const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
        pGrad.addColorStop(0, p.color);
        pGrad.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ---- Right half: energy level diagram ----
      // Axis
      ctx.strokeStyle = 'rgba(180,180,220,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(diagLeft - 10, diagTop);
      ctx.lineTo(diagLeft - 10, diagBottom);
      ctx.stroke();

      // Axis label
      ctx.save();
      ctx.translate(diagLeft - 30, (diagTop + diagBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#aab';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Energie (eV)', 0, 0);
      ctx.restore();

      // Tick marks for energy
      for (let e = -14; e <= 0; e += 2) {
        const y = energyToY(e);
        ctx.beginPath();
        ctx.moveTo(diagLeft - 15, y);
        ctx.lineTo(diagLeft - 10, y);
        ctx.strokeStyle = 'rgba(180,180,220,0.3)';
        ctx.stroke();
        ctx.fillStyle = 'rgba(180,180,220,0.5)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${e}`, diagLeft - 18, y + 3);
      }

      // 0 eV line (ionization)
      const y0 = energyToY(0);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(diagLeft, y0);
      ctx.lineTo(diagRight, y0);
      ctx.strokeStyle = 'rgba(180,180,220,0.3)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#aab';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ionisation (0 eV)', diagRight + 4, y0 + 3);

      // Energy levels
      for (let n = 1; n <= 5; n++) {
        const en = energyLevel(n);
        const y = energyToY(en);
        ctx.beginPath();
        ctx.moveTo(diagLeft, y);
        ctx.lineTo(diagRight, y);
        ctx.strokeStyle =
          (lastTransition && (n === lastTransition.ni || n === lastTransition.nf))
            ? '#60b0ff'
            : 'rgba(180,180,220,0.6)';
        ctx.lineWidth = (lastTransition && (n === lastTransition.ni || n === lastTransition.nf)) ? 2 : 1;
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#dde';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`n = ${n}`, diagRight + 4, y + 4);
        ctx.textAlign = 'right';
        ctx.fillText(`${en.toFixed(2)} eV`, diagLeft - 18, y + 4);
      }

      // Transition arrow
      if (lastTransition) {
        const yTop = energyToY(energyLevel(lastTransition.ni));
        const yBot = energyToY(energyLevel(lastTransition.nf));
        const arrowX = (diagLeft + diagRight) / 2;

        ctx.beginPath();
        ctx.moveTo(arrowX, yTop);
        ctx.lineTo(arrowX, yBot);
        ctx.strokeStyle = '#ff6644';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrowhead (pointing down = emission)
        ctx.beginPath();
        ctx.moveTo(arrowX, yBot);
        ctx.lineTo(arrowX - 6, yBot - 12);
        ctx.lineTo(arrowX + 6, yBot - 12);
        ctx.closePath();
        ctx.fillStyle = '#ff6644';
        ctx.fill();

        // Photon info
        const wlNm = transitionWavelength(lastTransition.ni, lastTransition.nf) * 1e9;
        const dE = transitionEnergy(lastTransition.ni, lastTransition.nf);
        const photonColor = wavelengthToColor(wlNm);

        ctx.fillStyle = photonColor;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';

        const infoY = (yTop + yBot) / 2;
        ctx.fillText(`\u0394E = ${dE.toFixed(2)} eV`, arrowX + 60, infoY - 8);
        ctx.fillText(`\u03BB = ${wlNm.toFixed(1)} nm`, arrowX + 60, infoY + 8);

        // Wavy photon symbol
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const px = arrowX + 35 + i * 2;
          const py = infoY + 20 + Math.sin(i * 0.8) * 3;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = photonColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Series label
        const series = seriesLabel(lastTransition.nf);
        ctx.fillStyle = '#aab';
        ctx.font = '10px sans-serif';
        ctx.fillText(series, arrowX + 60, infoY + 36);
      }

      // ===== Spectrum canvas =====
      sctx.clearRect(0, 0, W, SPEC_H);

      // Visible spectrum background
      for (let x = 0; x < W; x++) {
        const nm = 380 + (x / W) * (750 - 380);
        sctx.fillStyle = wavelengthToColor(nm);
        sctx.globalAlpha = 0.35;
        sctx.fillRect(x, 0, 1, SPEC_H);
      }
      sctx.globalAlpha = 1;

      // Region labels
      sctx.fillStyle = 'rgba(255,255,255,0.6)';
      sctx.font = '9px sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText('UV', 20, 12);
      sctx.fillText('380 nm', 0, SPEC_H - 4);
      sctx.fillText('750 nm', W - 2, SPEC_H - 4);
      sctx.fillText('IR', W - 20, 12);

      // Spectral lines
      for (const line of spectralLines) {
        if (line.wavelengthNm >= 380 && line.wavelengthNm <= 750) {
          const x = ((line.wavelengthNm - 380) / (750 - 380)) * W;
          sctx.beginPath();
          sctx.moveTo(x, 0);
          sctx.lineTo(x, SPEC_H);
          sctx.strokeStyle = line.color;
          sctx.lineWidth = 2.5;
          sctx.shadowColor = line.color;
          sctx.shadowBlur = 6;
          sctx.stroke();
          sctx.shadowBlur = 0;

          // Label
          sctx.fillStyle = '#fff';
          sctx.font = '8px sans-serif';
          sctx.textAlign = 'center';
          sctx.fillText(`${line.wavelengthNm.toFixed(0)}`, x, SPEC_H - 4);
        }
      }

      // UV / IR markers for non-visible lines
      const uvLines = spectralLines.filter((l) => l.wavelengthNm < 380);
      const irLines = spectralLines.filter((l) => l.wavelengthNm > 750);

      if (uvLines.length > 0) {
        sctx.fillStyle = 'rgba(160,120,255,0.8)';
        sctx.font = '9px sans-serif';
        sctx.textAlign = 'left';
        const uvText = uvLines.map((l) => `${l.ni}\u2192${l.nf}: ${l.wavelengthNm.toFixed(0)}nm`).join(', ');
        sctx.fillText(`UV: ${uvText}`, 4, 26);
      }

      if (irLines.length > 0) {
        sctx.fillStyle = 'rgba(255,120,80,0.8)';
        sctx.font = '9px sans-serif';
        sctx.textAlign = 'right';
        const irText = irLines.map((l) => `${l.ni}\u2192${l.nf}: ${l.wavelengthNm.toFixed(0)}nm`).join(', ');
        sctx.fillText(`IR: ${irText}`, W - 4, 26);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [currentOrbit, transitioning, lastTransition, spectralLines, energyToY]);

  // ------- Render -------
  return (
    <div className="space-y-6">
      {/* Main canvas */}
      <div className="flex justify-center">
        <canvas
          ref={mainCanvasRef}
          width={W}
          height={H}
          className="rounded-lg border border-gray-300 bg-gray-900 max-w-full"
        />
      </div>

      {/* Spectrum bar */}
      <div className="flex justify-center">
        <div className="relative">
          <p className="text-center text-sm text-gray-600 mb-1">
            Spectre d&apos;emission accumule
          </p>
          <canvas
            ref={spectrumCanvasRef}
            width={W}
            height={SPEC_H}
            className="rounded border border-gray-300 bg-gray-900 max-w-full"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
        <h3 className="font-semibold text-lg">Controles</h3>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Niveau initial */}
          <div>
            <label className="block text-sm font-medium mb-1">Niveau initial (n<sub>i</sub>)</label>
            <select
              value={ni}
              onChange={(e) => {
                const val = Number(e.target.value);
                setNi(val);
                if (val <= nf) setNf(val - 1);
              }}
              className="border border-gray-300 rounded px-3 py-1.5 bg-white"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  n = {n}
                </option>
              ))}
            </select>
          </div>

          {/* Niveau final */}
          <div>
            <label className="block text-sm font-medium mb-1">Niveau final (n<sub>f</sub>)</label>
            <select
              value={nf}
              onChange={(e) => setNf(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1.5 bg-white"
            >
              {[1, 2, 3, 4]
                .filter((n) => n < ni)
                .map((n) => (
                  <option key={n} value={n}>
                    n = {n}
                  </option>
                ))}
            </select>
          </div>

          {/* Trigger */}
          <button
            onClick={triggerTransition}
            disabled={transitioning || ni <= nf}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
          >
            Declencher la transition
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              setSpectralLines([]);
              setLastTransition(null);
              photonsRef.current = [];
            }}
            className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors"
          >
            Reinitialiser le spectre
          </button>
        </div>

        {/* Series presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium self-center mr-2">Series :</span>
          <button
            onClick={() => triggerSeries(1)}
            className="px-3 py-1 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors"
          >
            Serie de Lyman (&rarr;n=1)
          </button>
          <button
            onClick={() => triggerSeries(2)}
            className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Serie de Balmer (&rarr;n=2)
          </button>
          <button
            onClick={() => triggerSeries(3)}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Serie de Paschen (&rarr;n=3)
          </button>
        </div>

        {/* Current transition info */}
        {lastTransition && (
          <div className="bg-white border border-gray-200 rounded p-3 text-sm space-y-1">
            <p className="font-medium">
              Transition : n = {lastTransition.ni} &rarr; n = {lastTransition.nf} &nbsp;
              <span className="text-gray-500">({seriesLabel(lastTransition.nf)})</span>
            </p>
            <p>
              <InlineMath math={`\\Delta E = ${transitionEnergy(lastTransition.ni, lastTransition.nf).toFixed(4)} \\text{ eV}`} />
            </p>
            <p>
              <InlineMath
                math={`\\lambda = ${(transitionWavelength(lastTransition.ni, lastTransition.nf) * 1e9).toFixed(1)} \\text{ nm}`}
              />
            </p>
          </div>
        )}
      </div>

      {/* Equations panel */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Equations du modele de Bohr</h3>
        <div className="space-y-3">
          <div>
            <BlockMath math="E_n = -\\frac{13{,}6}{n^2} \\text{ eV}" />
          </div>
          <div>
            <BlockMath math="\\Delta E = E_i - E_f = h\\nu" />
          </div>
          <div>
            <BlockMath math="\\lambda = \\frac{hc}{\\Delta E}" />
          </div>
          <div>
            <BlockMath math="\\frac{1}{\\lambda} = R_H \\left( \\frac{1}{n_f^2} - \\frac{1}{n_i^2} \\right)" />
          </div>
          <p className="text-sm text-gray-600">
            avec <InlineMath math="R_H = 1{,}097 \times 10^7 \text{ m}^{-1}" /> (constante de Rydberg)
          </p>
        </div>
      </div>

      {/* Energy levels table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-300 rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border-b">n</th>
              <th className="px-3 py-2 border-b">
                <InlineMath math="E_n" /> (eV)
              </th>
              <th className="px-3 py-2 border-b">
                <InlineMath math="r_n = n^2 a_0" /> (pm)
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((n) => (
              <tr key={n} className="text-center border-b border-gray-200">
                <td className="px-3 py-1 font-medium">{n}</td>
                <td className="px-3 py-1">{energyLevel(n).toFixed(4)}</td>
                <td className="px-3 py-1">{(n * n * 52.9).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Accumulated spectral lines table */}
      {spectralLines.length > 0 && (
        <div className="overflow-x-auto">
          <h4 className="font-semibold mb-2">Raies observees</h4>
          <table className="min-w-full text-sm border border-gray-300 rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border-b">Transition</th>
                <th className="px-3 py-2 border-b">Serie</th>
                <th className="px-3 py-2 border-b">
                  <InlineMath math="\lambda" /> (nm)
                </th>
                <th className="px-3 py-2 border-b">
                  <InlineMath math="\Delta E" /> (eV)
                </th>
                <th className="px-3 py-2 border-b">Couleur</th>
              </tr>
            </thead>
            <tbody>
              {spectralLines
                .sort((a, b) => a.wavelengthNm - b.wavelengthNm)
                .map((line, i) => (
                  <tr key={i} className="text-center border-b border-gray-200">
                    <td className="px-3 py-1">
                      {line.ni} &rarr; {line.nf}
                    </td>
                    <td className="px-3 py-1">{seriesLabel(line.nf)}</td>
                    <td className="px-3 py-1">{line.wavelengthNm.toFixed(1)}</td>
                    <td className="px-3 py-1">{transitionEnergy(line.ni, line.nf).toFixed(4)}</td>
                    <td className="px-3 py-1">
                      <span
                        className="inline-block w-6 h-4 rounded"
                        style={{ backgroundColor: line.color }}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Historical context */}
      <CollapsiblePanel
        title="Contexte historique"
        borderColor="border-gray-400"
        bgColor="bg-gray-50"
        textColor="text-gray-800"
      >
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            En <strong>1913</strong>, le physicien danois <strong>Niels Bohr</strong> propose un modele
            planetaire de l&apos;atome d&apos;hydrogene qui integre la quantification. Ce modele repose sur
            trois postulats fondamentaux :
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              L&apos;electron se deplace sur des <strong>orbites circulaires stables</strong> (etats stationnaires)
              sans emettre de rayonnement.
            </li>
            <li>
              Le <strong>moment cinetique orbital</strong> est quantifie :
              <InlineMath math="L = n\hbar" /> avec <InlineMath math="n = 1, 2, 3, \ldots" />
            </li>
            <li>
              L&apos;emission ou l&apos;absorption de lumiere se produit lors d&apos;une <strong>transition</strong> entre
              deux niveaux, avec un photon d&apos;energie <InlineMath math="h\nu = |E_i - E_f|" />.
            </li>
          </ol>
          <p>
            Ce modele explique avec succes les series spectrales de l&apos;hydrogene (Lyman, Balmer, Paschen, etc.)
            et la constante de Rydberg. Cependant, il ne s&apos;applique qu&apos;aux atomes hydrogenoides et sera
            remplace par la mecanique quantique ondulatoire de Schrodinger en 1926.
          </p>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
