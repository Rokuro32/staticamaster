'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { h, c, me, eV } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPTON_WAVELENGTH = h / (me * c); // ~2.426e-12 m
const KEV = 1e3 * eV; // keV in joules

const E_MIN = 10;   // keV
const E_MAX = 500;  // keV

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
// Hoverable term
// ---------------------------------------------------------------------------

function HoverTerm({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  return (
    <span className="relative group inline-block cursor-help border-b border-dashed border-gray-500">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg z-50">
        {tooltip}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Particle types for animation
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  age: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ComptonEffectSimulator() {
  // --- State ---
  const [energyKeV, setEnergyKeV] = useState(100); // incident photon energy in keV
  const [angleDeg, setAngleDeg] = useState(90);     // scattering angle in degrees

  // --- Physics calculations ---
  const angleRad = (angleDeg * Math.PI) / 180;
  const lambdaI = (h * c) / (energyKeV * KEV);           // incident wavelength (m)
  const deltaLambda = COMPTON_WAVELENGTH * (1 - Math.cos(angleRad)); // wavelength shift (m)
  const lambdaF = lambdaI + deltaLambda;                  // scattered wavelength (m)
  const energyFKeV = (h * c) / (lambdaF * KEV);           // scattered photon energy (keV)
  const ekElectronKeV = energyKeV - energyFKeV;           // electron recoil kinetic energy (keV)

  // Electron recoil angle (from conservation of momentum)
  const cotPhiOver2 = (1 + energyKeV * KEV / (me * c * c)) * Math.tan(angleRad / 2);
  const electronAngleRad = Math.PI / 2 - Math.atan(cotPhiOver2);

  // --- Canvas refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const photonsInRef = useRef<Particle[]>([]);
  const photonsOutRef = useRef<Particle[]>([]);
  const electronsOutRef = useRef<Particle[]>([]);
  const lastSpawnRef = useRef<number>(0);

  // -----------------------------------------------------------------------
  // Main simulation animation
  // -----------------------------------------------------------------------

  const drawSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const now = performance.now();
    timeRef.current = now;

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);

    // --- Interaction point ---
    const cx = W * 0.4;
    const cy = H * 0.5;

    // Draw electron at rest (target)
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96,165,250,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#60A5FA';
    ctx.fill();
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('e\u207B', cx, cy - 20);

    // --- Draw scattering angle arc ---
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    // Incoming direction line (from left)
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy);
    ctx.lineTo(cx + 100, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arc for angle theta
    if (angleDeg > 0 && angleDeg < 180) {
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, -angleRad, 0);
      ctx.stroke();

      // Label theta
      const labelAngle = -angleRad / 2;
      ctx.fillStyle = '#FBBF24';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('\u03B8', cx + 46 * Math.cos(labelAngle), cy + 46 * Math.sin(labelAngle) + 4);
    }

    // --- Spawn incoming photons ---
    const spawnInterval = 400;
    if (now - lastSpawnRef.current > spawnInterval) {
      lastSpawnRef.current = now;
      const speed = 3;
      photonsInRef.current.push({
        x: 0,
        y: cy + (Math.random() - 0.5) * 4,
        vx: speed,
        vy: 0,
        alive: true,
        age: 0,
      });
    }

    // --- Update & draw incoming photons ---
    const photonsIn = photonsInRef.current;
    for (let i = photonsIn.length - 1; i >= 0; i--) {
      const p = photonsIn[i];
      if (!p.alive) { photonsIn.splice(i, 1); continue; }

      p.x += p.vx;
      p.y += p.vy;
      p.age++;

      // Hit interaction point?
      if (p.x >= cx - 5) {
        p.alive = false;
        photonsIn.splice(i, 1);

        // Spawn scattered photon
        photonsOutRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(-angleRad) * 3,
          vy: Math.sin(-angleRad) * 3,
          alive: true,
          age: 0,
        });

        // Spawn recoiling electron
        const eSpeed = 1.5 + (ekElectronKeV / energyKeV) * 3;
        electronsOutRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(electronAngleRad) * eSpeed,
          vy: Math.sin(electronAngleRad) * eSpeed,
          alive: true,
          age: 0,
        });
        continue;
      }

      // Draw incoming photon (yellow/golden)
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fill();

      // Wavy trail
      ctx.strokeStyle = 'rgba(251,191,36,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let t = 0; t < 20; t++) {
        const tx = p.x - t * 2;
        const ty = p.y + Math.sin((tx + now * 0.05) * 0.3) * 3;
        if (t === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    }

    // --- Update & draw scattered photons ---
    const photonsOut = photonsOutRef.current;
    for (let i = photonsOut.length - 1; i >= 0; i--) {
      const p = photonsOut[i];
      if (!p.alive) { photonsOut.splice(i, 1); continue; }

      p.x += p.vx;
      p.y += p.vy;
      p.age++;

      if (p.x > W + 10 || p.x < -10 || p.y > H + 10 || p.y < -10) {
        photonsOut.splice(i, 1);
        continue;
      }

      // Draw scattered photon (red-orange — lower energy)
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#F87171';
      ctx.fill();

      // Wavy trail
      ctx.strokeStyle = 'rgba(248,113,113,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let t = 0; t < 15; t++) {
        const tx = p.x - p.vx * t * 0.6;
        const ty = p.y - p.vy * t * 0.6 + Math.sin((t + now * 0.04) * 0.4) * 3;
        if (t === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    }

    // --- Update & draw recoiling electrons ---
    const electronsOut = electronsOutRef.current;
    for (let i = electronsOut.length - 1; i >= 0; i--) {
      const e = electronsOut[i];
      if (!e.alive) { electronsOut.splice(i, 1); continue; }

      e.x += e.vx;
      e.y += e.vy;
      e.age++;

      if (e.x > W + 10 || e.x < -10 || e.y > H + 10 || e.y < -10) {
        electronsOut.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#60A5FA';
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96,165,250,0.2)';
      ctx.fill();
    }

    // --- Labels ---
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('\u03B3 incident', 20, cy - 16);

    // Scattered photon label
    const labelScX = cx + 80 * Math.cos(-angleRad);
    const labelScY = cy + 80 * Math.sin(-angleRad);
    ctx.fillStyle = '#F87171';
    ctx.fillText("\u03B3' diffusé", labelScX, labelScY - 10);

    // Electron recoil label
    const labelElX = cx + 70 * Math.cos(electronAngleRad);
    const labelElY = cy + 70 * Math.sin(electronAngleRad);
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('e\u207B recul', labelElX, labelElY + 16);

    // --- HUD ---
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`E_i = ${energyKeV.toFixed(0)} keV`, W - 240, H - 56);
    ctx.fillText(`\u03B8 = ${angleDeg}\u00B0`, W - 240, H - 40);
    ctx.fillText(`E_f = ${energyFKeV.toFixed(1)} keV`, W - 240, H - 24);
    ctx.fillText(`E_k(e\u207B) = ${ekElectronKeV.toFixed(1)} keV`, W - 240, H - 8);

    // Next frame
    animIdRef.current = requestAnimationFrame(drawSimulation);
  }, [energyKeV, energyFKeV, ekElectronKeV, angleDeg, angleRad, electronAngleRad]);

  // Start / restart animation
  useEffect(() => {
    photonsInRef.current = [];
    photonsOutRef.current = [];
    electronsOutRef.current = [];
    lastSpawnRef.current = 0;

    animIdRef.current = requestAnimationFrame(drawSimulation);
    return () => cancelAnimationFrame(animIdRef.current);
  }, [drawSimulation]);

  // -----------------------------------------------------------------------
  // Graph: Δλ vs θ
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 65 };

    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Clear
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Scales
    const thetaMax = Math.PI;
    const dlMax = 2.5 * COMPTON_WAVELENGTH * 1e12; // in pm

    const toX = (theta: number) => pad.left + (theta / thetaMax) * plotW;
    const toY = (dl: number) => pad.top + plotH - (dl / dlMax) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(156,163,175,0.2)';
    ctx.setLineDash([4, 4]);
    for (let dl = 1; dl <= 4; dl++) {
      const y = toY(dl);
      if (y >= pad.top) {
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
        ctx.stroke();
      }
    }
    for (let deg = 30; deg <= 150; deg += 30) {
      const x = toX((deg * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Δλ curve
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let theta = 0; theta <= Math.PI; theta += 0.02) {
      const dl = COMPTON_WAVELENGTH * (1 - Math.cos(theta)) * 1e12; // pm
      const x = toX(theta);
      const y = toY(dl);
      if (theta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Compton wavelength reference line
    const comptonPm = COMPTON_WAVELENGTH * 1e12;
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, toY(comptonPm));
    ctx.lineTo(pad.left + plotW, toY(comptonPm));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F87171';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('\u03BB_C = 2.43 pm', pad.left + plotW - 80, toY(comptonPm) - 5);

    // Current operating point
    const currentDl = deltaLambda * 1e12; // pm
    const ptX = toX(angleRad);
    const ptY = toY(currentDl);
    ctx.beginPath();
    ctx.arc(ptX, ptY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FBBF24';
    ctx.fill();
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#FDE68A';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`(${angleDeg}\u00B0, ${currentDl.toFixed(2)} pm)`, ptX + 10, ptY - 6);

    // Axis labels
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Angle de diffusion \u03B8 (\u00B0)', pad.left + plotW / 2, H - 4);

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('\u0394\u03BB (pm)', 0, 0);
    ctx.restore();

    // X-axis tick labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let deg = 0; deg <= 180; deg += 30) {
      ctx.fillText(`${deg}`, toX((deg * Math.PI) / 180), pad.top + plotH + 14);
    }

    // Y-axis tick labels
    ctx.textAlign = 'right';
    for (let dl = 0; dl <= 4; dl += 1) {
      const y = toY(dl);
      if (y >= pad.top) {
        ctx.fillText(`${dl}`, pad.left - 6, y + 4);
      }
    }
  }, [angleDeg, angleRad, deltaLambda]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">
          Effet Compton
        </h2>
        <p className="text-gray-600 text-sm">
          Simulation de la diffusion Compton (1923)
        </p>
      </div>

      {/* Main simulation canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="rounded-lg border border-gray-300 max-w-full"
          style={{ background: '#111827' }}
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Energy slider */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Énergie du photon incident <InlineMath math={`E_\\gamma`} />
          </label>
          <input
            type="range"
            min={E_MIN}
            max={E_MAX}
            step={5}
            value={energyKeV}
            onChange={(e) => setEnergyKeV(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>
              <InlineMath math={`E_\\gamma = ${energyKeV}\\,\\text{keV}`} />
            </p>
            <p>
              <InlineMath math={`\\lambda_i = ${(lambdaI * 1e12).toFixed(2)}\\,\\text{pm}`} />
            </p>
          </div>
        </div>

        {/* Angle slider */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Angle de diffusion <InlineMath math={`\\theta`} />
          </label>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={angleDeg}
            onChange={(e) => setAngleDeg(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>
              <InlineMath math={`\\theta = ${angleDeg}^\\circ`} />
            </p>
            <p>
              <InlineMath math={`\\Delta\\lambda = ${(deltaLambda * 1e12).toFixed(3)}\\,\\text{pm}`} />
            </p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="rounded-lg px-4 py-3 text-center font-semibold text-sm bg-violet-50 text-violet-900 border border-violet-300">
        <InlineMath math={`E'_\\gamma = ${energyFKeV.toFixed(1)}\\,\\text{keV}`} />
        {' '}&mdash;{' '}
        <InlineMath math={`E_k(e^-) = ${ekElectronKeV.toFixed(1)}\\,\\text{keV}`} />
        {' '}&mdash;{' '}
        <InlineMath math={`\\Delta\\lambda = ${(deltaLambda * 1e12).toFixed(3)}\\,\\text{pm}`} />
      </div>

      {/* Panels */}

      {/* 1. Classical prediction */}
      <CollapsiblePanel
        title="Prédiction classique (Thomson)"
        borderColor="border-orange-500"
        bgColor="bg-orange-50"
        textColor="text-orange-900"
        defaultOpen={false}
      >
        <p>
          Selon la théorie classique (<strong>diffusion Thomson</strong>), un rayonnement
          électromagnétique fait osciller un électron libre à la même fréquence que
          l&apos;onde incidente. L&apos;électron réémet alors un rayonnement de même
          fréquence :
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            La longueur d&apos;onde du rayonnement diffusé devrait être <strong>identique</strong>{' '}
            à celle du rayonnement incident (<InlineMath math={`\\lambda' = \\lambda`} />).
          </li>
          <li>
            Aucun changement de longueur d&apos;onde ne devrait dépendre de l&apos;angle de
            diffusion.
          </li>
          <li>
            L&apos;intensité diffusée dépend de l&apos;angle, mais pas la fréquence.
          </li>
        </ul>
        <div className="mt-2 bg-orange-100 border border-orange-300 rounded p-3 text-center">
          <p className="text-orange-800 font-mono text-xs">
            Prédiction classique : <InlineMath math={`\\Delta\\lambda = 0`} /> pour tout angle
          </p>
          <p className="text-orange-700 mt-1 font-semibold text-xs">
            &rarr; En contradiction avec les mesures de Compton !
          </p>
        </div>
      </CollapsiblePanel>

      {/* 2. Quantum result */}
      <CollapsiblePanel
        title="Résultat quantique (Compton)"
        borderColor="border-green-500"
        bgColor="bg-green-50"
        textColor="text-green-900"
        defaultOpen={true}
      >
        <p>
          En traitant le photon comme une particule de quantité de mouvement{' '}
          <InlineMath math={`p = h/\\lambda`} />, Compton applique la conservation de
          l&apos;énergie et de la quantité de mouvement à la collision photon-électron :
        </p>
        <div className="my-3 text-center">
          <BlockMath math={`\\Delta\\lambda = \\lambda' - \\lambda = \\frac{h}{m_e c}(1 - \\cos\\theta)`} />
        </div>
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          <HoverTerm tooltip="Variation de la longueur d'onde du photon après diffusion">
            <InlineMath math={`\\Delta\\lambda`} /> = décalage en longueur d&apos;onde
          </HoverTerm>
          <HoverTerm tooltip="Longueur d'onde de Compton de l'électron : h/(mₑc) ≈ 2.426 pm">
            <InlineMath math={`\\frac{h}{m_e c}`} /> = longueur d&apos;onde de Compton
          </HoverTerm>
          <HoverTerm tooltip="Angle entre la direction du photon incident et du photon diffusé">
            <InlineMath math={`\\theta`} /> = angle de diffusion
          </HoverTerm>
        </div>
        <div className="mt-3 bg-green-100 border border-green-300 rounded p-3 text-xs space-y-1">
          <p>
            <strong>Conséquences :</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Le décalage <InlineMath math={`\\Delta\\lambda`} /> ne dépend <em>que</em> de
              l&apos;angle <InlineMath math={`\\theta`} />, pas de l&apos;énergie incidente.
            </li>
            <li>
              Le décalage maximal est <InlineMath math={`2\\lambda_C \\approx 4{,}85\\,\\text{pm}`} />{' '}
              pour une rétrodiffusion (<InlineMath math={`\\theta = 180^\\circ`} />).
            </li>
            <li>
              Cela prouve que le photon possède une <em>quantité de mouvement</em>, confirmant
              sa nature corpusculaire.
            </li>
          </ul>
        </div>
      </CollapsiblePanel>

      {/* 3. Graph Δλ vs θ */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          Graphique{' '}
          <InlineMath math={`\\Delta\\lambda`} /> vs <InlineMath math={`\\theta`} />
        </h3>
        <div className="flex justify-center">
          <canvas
            ref={graphCanvasRef}
            width={400}
            height={200}
            className="rounded border border-gray-300 max-w-full"
          />
        </div>
        <p className="text-xs text-gray-600 text-center">
          Courbe <InlineMath math={`\\Delta\\lambda = \\lambda_C(1 - \\cos\\theta)`} />.
          La ligne rouge indique la longueur d&apos;onde de Compton{' '}
          <InlineMath math={`\\lambda_C = 2{,}43\\,\\text{pm}`} />.
          Le point jaune indique le point de fonctionnement actuel.
        </p>
      </div>

      {/* 4. Historical context */}
      <CollapsiblePanel
        title="Contexte historique"
        borderColor="border-gray-500"
        bgColor="bg-gray-50"
        textColor="text-gray-900"
        defaultOpen={false}
      >
        <p>
          En <strong>1923</strong>, <strong>Arthur Holly Compton</strong> réalise des
          expériences de diffusion de rayons X sur des cibles de graphite à
          l&apos;université Washington de Saint-Louis.
        </p>
        <p>
          Il observe que les rayons X diffusés ont une longueur d&apos;onde plus grande
          que les rayons incidents, et que ce décalage dépend de l&apos;angle de
          diffusion — exactement ce que prédit le modèle corpusculaire du photon.
        </p>
        <p>
          Cette découverte fournit la preuve définitive que la lumière possède une{' '}
          <strong>quantité de mouvement</strong> et se comporte comme une particule lors de
          collisions. Compton reçoit le{' '}
          <strong>prix Nobel de physique en 1927</strong> pour cette découverte.
        </p>
        <p>
          L&apos;effet Compton complète l&apos;effet photoélectrique d&apos;Einstein (1905)
          en démontrant non seulement que les photons ont une énergie{' '}
          <InlineMath math={`E = hf`} />, mais aussi une quantité de mouvement{' '}
          <InlineMath math={`p = h/\\lambda`} />.
        </p>
      </CollapsiblePanel>
    </div>
  );
}
