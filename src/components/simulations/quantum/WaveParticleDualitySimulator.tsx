'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { h, me, eV } from '@/lib/physics-constants';

// Crystal lattice spacing for nickel (meters)
const D_NICKEL = 0.215e-9;

// ---------- helpers ----------

function deBroglieWavelength(Ek_eV: number): number {
  const Ek_J = Ek_eV * eV;
  return h / Math.sqrt(2 * me * Ek_J);
}

function momentum(Ek_eV: number): number {
  const Ek_J = Ek_eV * eV;
  return Math.sqrt(2 * me * Ek_J);
}

/** Bragg angles (radians) for orders n = 1..nMax that satisfy sin(theta) <= 1. */
function braggAngles(lambda: number, d: number, nMax: number = 5): number[] {
  const angles: number[] = [];
  for (let n = 1; n <= nMax; n++) {
    const sinTheta = (n * lambda) / (2 * d);
    if (sinTheta > 1) break;
    angles.push(Math.asin(sinTheta));
  }
  return angles;
}

/** Intensity profile as a function of angle using sinc-squared envelope with Bragg peaks. */
function intensityAtAngle(
  angle: number,
  lambda: number,
  d: number,
  nRows: number = 8
): number {
  // Phase difference for a row of scatterers
  const delta = (2 * Math.PI * d * Math.sin(angle)) / lambda;
  const Nd = nRows * delta;
  if (Math.abs(Math.sin(delta / 2)) < 1e-12) return 1;
  const val = Math.sin(Nd / 2) / (nRows * Math.sin(delta / 2));
  return val * val;
}

// ---------- collapsible section ----------

function CollapsibleSection({
  title,
  color,
  children,
}: {
  title: string;
  color: 'green' | 'blue' | 'gray';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const colorMap = {
    green: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      header: 'bg-green-100 hover:bg-green-200 text-green-900',
    },
    blue: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      header: 'bg-blue-100 hover:bg-blue-200 text-blue-900',
    },
    gray: {
      border: 'border-gray-400',
      bg: 'bg-gray-50',
      header: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    },
  };
  const c = colorMap[color];

  return (
    <div className={`border ${c.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 text-left font-semibold flex justify-between items-center ${c.header} transition-colors`}
      >
        {title}
        <span className="text-lg">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className={`px-4 py-3 ${c.bg} text-sm leading-relaxed`}>{children}</div>}
    </div>
  );
}

// =====================================================================
// Main component
// =====================================================================

export function WaveParticleDualitySimulator() {
  // Main canvas
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  // Comparison canvases
  const electronPatternRef = useRef<HTMLCanvasElement>(null);
  const xrayPatternRef = useRef<HTMLCanvasElement>(null);

  const [energy, setEnergy] = useState(54); // eV — classic Davisson-Germer value

  // Derived quantities
  const lambda = deBroglieWavelength(energy);
  const p = momentum(energy);
  const angles = braggAngles(lambda, D_NICKEL);
  const thetaDeg = angles.length > 0 ? (angles[0] * 180) / Math.PI : NaN;

  // ---------- main canvas drawing ----------

  const drawMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // ---- Left side: Crystal lattice + beam ----

    const crystalCenterX = 220;
    const crystalCenterY = H / 2;
    const atomSpacing = 28;
    const atomRadius = 5;
    const rows = 6;
    const cols = 5;

    // Draw incoming electron beam
    const beamY = crystalCenterY;
    ctx.save();
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, beamY);
    ctx.lineTo(crystalCenterX - cols * atomSpacing * 0.5 - 10, beamY);
    ctx.stroke();

    // Arrow head
    const arrowX = crystalCenterX - cols * atomSpacing * 0.5 - 10;
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.moveTo(arrowX + 10, beamY);
    ctx.lineTo(arrowX - 2, beamY - 6);
    ctx.lineTo(arrowX - 2, beamY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw electron label
    ctx.fillStyle = '#00ccff';
    ctx.font = '13px sans-serif';
    ctx.fillText('Faisceau e\u207B', 10, beamY - 14);

    // Draw crystal lattice
    for (let r = 0; r < rows; r++) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const x = crystalCenterX + (cIdx - (cols - 1) / 2) * atomSpacing;
        const y = crystalCenterY + (r - (rows - 1) / 2) * atomSpacing;

        ctx.beginPath();
        ctx.arc(x, y, atomRadius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(x - 1, y - 1, 1, x, y, atomRadius);
        grad.addColorStop(0, '#c0c0ff');
        grad.addColorStop(1, '#4040aa');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#6060cc';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Label crystal
    ctx.fillStyle = '#aaaacc';
    ctx.font = '12px sans-serif';
    ctx.fillText('Cristal Ni', crystalCenterX - 25, crystalCenterY + rows * atomSpacing * 0.5 + 20);
    ctx.fillText(`d = 0.215 nm`, crystalCenterX - 30, crystalCenterY + rows * atomSpacing * 0.5 + 36);

    // ---- Scattered beams at Bragg angles ----

    const scatterOriginX = crystalCenterX;
    const scatterOriginY = crystalCenterY;

    ctx.save();
    ctx.lineWidth = 2;
    const beamLength = 220;

    if (angles.length > 0) {
      angles.forEach((theta, idx) => {
        const alpha = Math.PI / 2 - theta; // angle from horizontal
        const intensity = 1 / (idx + 1);

        // Upper scattered beam
        ctx.strokeStyle = `rgba(0, 255, 120, ${intensity * 0.8})`;
        ctx.shadowColor = '#00ff78';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(scatterOriginX, scatterOriginY);
        ctx.lineTo(
          scatterOriginX + beamLength * Math.cos(alpha),
          scatterOriginY - beamLength * Math.sin(alpha)
        );
        ctx.stroke();

        // Lower scattered beam (mirror)
        ctx.beginPath();
        ctx.moveTo(scatterOriginX, scatterOriginY);
        ctx.lineTo(
          scatterOriginX + beamLength * Math.cos(alpha),
          scatterOriginY + beamLength * Math.sin(alpha)
        );
        ctx.stroke();

        // Label angle
        if (idx === 0) {
          const labelX = scatterOriginX + 80 * Math.cos(alpha);
          const labelY = scatterOriginY - 80 * Math.sin(alpha) - 10;
          ctx.fillStyle = '#00ff78';
          ctx.font = '12px sans-serif';
          ctx.fillText(
            `\u03B8 = ${((theta * 180) / Math.PI).toFixed(1)}\u00B0`,
            labelX,
            labelY
          );
        }
      });

      // Forward transmitted beam
      ctx.strokeStyle = 'rgba(0, 204, 255, 0.3)';
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(scatterOriginX, scatterOriginY);
      ctx.lineTo(scatterOriginX + beamLength, scatterOriginY);
      ctx.stroke();
    } else {
      // No valid Bragg angle — all forward
      ctx.strokeStyle = 'rgba(0, 204, 255, 0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00ccff';
      ctx.beginPath();
      ctx.moveTo(scatterOriginX, scatterOriginY);
      ctx.lineTo(scatterOriginX + beamLength, scatterOriginY);
      ctx.stroke();

      ctx.fillStyle = '#ff8888';
      ctx.font = '12px sans-serif';
      ctx.fillText('Pas de pic de Bragg', scatterOriginX + 60, scatterOriginY - 20);
    }
    ctx.restore();

    // ---- Right side: Curved detector / intensity plot ----

    const detectorCenterX = 540;
    const detectorCenterY = H / 2;
    const detectorRadius = 160;

    // Draw curved detector screen
    ctx.strokeStyle = '#555588';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(detectorCenterX - 80, detectorCenterY, detectorRadius, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Intensity pattern on detector
    const nPoints = 200;
    const maxAngle = Math.PI / 2;
    let maxIntensity = 0;
    const intensities: number[] = [];

    for (let i = 0; i < nPoints; i++) {
      const a = (i / (nPoints - 1)) * maxAngle;
      const val = intensityAtAngle(a, lambda, D_NICKEL, 8);
      intensities.push(val);
      if (val > maxIntensity) maxIntensity = val;
    }

    // Plot intensity curve mapped on detector arc
    ctx.save();
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let i = 0; i < nPoints; i++) {
      const a = (i / (nPoints - 1)) * maxAngle;
      const norm = maxIntensity > 0 ? intensities[i] / maxIntensity : 0;
      const barLen = norm * 80;
      const screenAngle = a - Math.PI / 2; // map to arc position
      const baseX = detectorCenterX - 80 + detectorRadius * Math.cos(screenAngle);
      const baseY = detectorCenterY + detectorRadius * Math.sin(screenAngle);
      const plotX = baseX - barLen * Math.cos(screenAngle);
      const plotY = baseY - barLen * Math.sin(screenAngle);

      if (i === 0) ctx.moveTo(plotX, plotY);
      else ctx.lineTo(plotX, plotY);
    }
    ctx.stroke();
    ctx.restore();

    // Label detector
    ctx.fillStyle = '#888899';
    ctx.font = '12px sans-serif';
    ctx.fillText('Détecteur', detectorCenterX + 60, detectorCenterY + detectorRadius + 20);
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('Intensité(\u03B8)', detectorCenterX - 40, 25);

    // Draw angle arc legend
    if (angles.length > 0) {
      const firstAngle = angles[0];
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(scatterOriginX, scatterOriginY, 50, -firstAngle, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [energy, lambda, angles]);

  // ---------- comparison canvases ----------

  const drawComparisonCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, label: string, lambdaVal: number, color: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d0d20';
      ctx.fillRect(0, 0, W, H);

      // Draw diffraction pattern as ring-like dots
      const centerX = W / 2;
      const centerY = H / 2;
      const bAngles = braggAngles(lambdaVal, D_NICKEL, 3);

      // Central spot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();

      // Diffraction rings
      bAngles.forEach((theta, idx) => {
        const ringRadius = 30 + theta * 200;
        const opacity = 1 / (idx + 1);
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity * 0.8;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Bright spots on ring
        const nSpots = 12;
        for (let s = 0; s < nSpots; s++) {
          const a = (s / nSpots) * Math.PI * 2;
          const sx = centerX + ringRadius * Math.cos(a);
          const sy = centerY + ringRadius * Math.sin(a);
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#cccccc';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, centerX, H - 10);
      ctx.textAlign = 'start';

      // Wavelength label
      ctx.fillStyle = color;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`\u03BB = ${(lambdaVal * 1e9).toFixed(3)} nm`, centerX, 18);
      ctx.textAlign = 'start';
    },
    []
  );

  // ---------- effects ----------

  useEffect(() => {
    drawMainCanvas();
  }, [drawMainCanvas]);

  useEffect(() => {
    drawComparisonCanvas(electronPatternRef.current, 'Diffraction électronique', lambda, '#00ccff');
    drawComparisonCanvas(xrayPatternRef.current, 'Diffraction rayons X', lambda, '#ff6644');
  }, [lambda, drawComparisonCanvas]);

  // ---------- formatted values ----------

  const lambdaNm = (lambda * 1e9).toFixed(3);
  const lambdaPm = (lambda * 1e12).toFixed(1);
  const pStr = p.toExponential(3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dualité onde-corpuscule
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Hypothèse de De Broglie et expérience de Davisson-Germer
        </p>
      </div>

      {/* Main simulation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex justify-center">
          <canvas
            ref={mainCanvasRef}
            width={700}
            height={400}
            className="rounded-lg border border-gray-300 dark:border-gray-600 max-w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Slider */}
        <div className="flex flex-col sm:flex-row items-center gap-4 px-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Énergie cinétique <InlineMath math="E_k" />
          </label>
          <input
            type="range"
            min={10}
            max={500}
            step={1}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="flex-1 w-full accent-cyan-500"
          />
          <span className="text-sm font-mono font-semibold text-cyan-600 dark:text-cyan-400 min-w-[80px] text-right">
            {energy} eV
          </span>
        </div>
      </div>

      {/* Info display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Longueur d\'onde de De Broglie',
            value: `${lambdaNm} nm`,
            sub: `(${lambdaPm} pm)`,
            color: 'text-cyan-600 dark:text-cyan-400',
          },
          {
            label: 'Quantité de mouvement p',
            value: pStr,
            sub: 'kg\u00B7m/s',
            color: 'text-purple-600 dark:text-purple-400',
          },
          {
            label: 'Angle de Bragg (n=1)',
            value: !isNaN(thetaDeg) ? `${thetaDeg.toFixed(1)}\u00B0` : '--',
            sub: '',
            color: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Espacement cristallin d',
            value: '0.215 nm',
            sub: '(nickel)',
            color: 'text-amber-600 dark:text-amber-400',
          },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
            <div className={`text-lg font-bold font-mono ${item.color}`}>{item.value}</div>
            {item.sub && (
              <div className="text-xs text-gray-400 dark:text-gray-500">{item.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Side-by-side comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center">
          Comparaison : électrons vs rayons X
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <canvas
            ref={electronPatternRef}
            width={300}
            height={200}
            className="rounded-lg border border-cyan-400/30"
          />
          <canvas
            ref={xrayPatternRef}
            width={300}
            height={200}
            className="rounded-lg border border-orange-400/30"
          />
        </div>
        <p className="text-center text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          Les figures sont identiques ! Les électrons se comportent comme des ondes.
        </p>
      </div>

      {/* Equations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Équations fondamentales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Longueur d&apos;onde de De Broglie
            </p>
            <BlockMath math="\lambda = \frac{h}{p} = \frac{h}{\sqrt{2 m_e E_k}}" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Condition de Bragg
            </p>
            <BlockMath math="2d \sin\theta = n\lambda" />
          </div>
        </div>
      </div>

      {/* Collapsible panels */}
      <div className="space-y-3">
        <CollapsibleSection title="Hypothèse de De Broglie" color="green">
          <div className="space-y-2">
            <p>
              En 1924, Louis de Broglie propose dans sa thèse que{' '}
              <strong>toute particule matérielle possède une longueur d&apos;onde associée</strong>{' '}
              donnée par <InlineMath math="\lambda = h/p" />.
            </p>
            <p>
              Plus la particule est rapide (grande quantité de mouvement{' '}
              <InlineMath math="p" />
              ), plus sa longueur d&apos;onde est courte. Inversement, une particule lente a une
              longueur d&apos;onde plus grande et ses propriétés ondulatoires deviennent plus
              facilement observables.
            </p>
            <p>
              Pour un électron accéléré à <InlineMath math="E_k = 54\,\text{eV}" />, on
              obtient{' '}
              <InlineMath math="\lambda \approx 0.167\,\text{nm}" />, comparable aux distances
              interatomiques dans un cristal.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Expérience de Davisson-Germer" color="blue">
          <div className="space-y-2">
            <p>
              En <strong>1927</strong>, Clinton Davisson et Lester Germer bombardent un cristal
              de nickel avec un faisceau d&apos;électrons. Ils observent un{' '}
              <strong>pic d&apos;intensité</strong> à un angle précis qui correspond exactement à
              la condition de Bragg pour la longueur d&apos;onde prédite par de Broglie.
            </p>
            <p>
              Le pic principal apparaît pour une énergie de{' '}
              <InlineMath math="54\,\text{eV}" /> à un angle de diffusion de{' '}
              <InlineMath math="50°" /> par rapport au faisceau incident, en parfait accord avec{' '}
              <InlineMath math="\lambda = 0.167\,\text{nm}" /> et l&apos;espacement cristallin du
              nickel <InlineMath math="d = 0.215\,\text{nm}" />.
            </p>
            <p>
              Cette expérience constitue la première <strong>confirmation expérimentale</strong>{' '}
              directe de la nature ondulatoire des électrons.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Contexte historique" color="gray">
          <div className="space-y-2">
            <p>
              <strong>1924</strong> : Louis de Broglie soutient sa thèse «&nbsp;Recherches sur
              la théorie des quanta&nbsp;» à la Sorbonne, proposant l&apos;hypothèse de la
              dualité onde-corpuscule pour la matière.
            </p>
            <p>
              <strong>1927</strong> : Davisson et Germer (Bell Labs) observent la diffraction
              d&apos;électrons sur un cristal de nickel. La même année, G.P. Thomson réalise
              indépendamment une expérience similaire avec des électrons traversant une feuille
              mince.
            </p>
            <p>
              <strong>1929</strong> : De Broglie reçoit le prix Nobel de physique pour sa
              découverte de la nature ondulatoire des électrons.{' '}
              <strong>1937</strong> : Davisson et Thomson partagent le prix Nobel pour la
              confirmation expérimentale.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
