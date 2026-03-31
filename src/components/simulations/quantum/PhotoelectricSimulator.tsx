'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { h, eV, c, me } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface Metal {
  name: string;
  phi: number; // work function in eV
}

const METALS: Metal[] = [
  { name: 'Cesium (Cs)', phi: 2.1 },
  { name: 'Sodium (Na)', phi: 2.3 },
  { name: 'Zinc (Zn)', phi: 4.3 },
  { name: 'Platine (Pt)', phi: 6.4 },
];

const F_MIN = 0.3e15; // Hz
const F_MAX = 2.0e15; // Hz

interface Photon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

interface Electron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map frequency to a visible-light RGB color, extending into UV as violet. */
function frequencyToColor(f: number): string {
  const lambda = c / f; // wavelength in metres
  const nm = lambda * 1e9;

  let r = 0, g = 0, b = 0;

  if (nm >= 700) {
    // deep red
    r = 255; g = 0; b = 0;
  } else if (nm >= 620) {
    // red -> orange
    r = 255; g = Math.round(255 * (700 - nm) / 80); b = 0;
  } else if (nm >= 580) {
    // orange -> yellow
    r = 255; g = 255; b = 0;
  } else if (nm >= 530) {
    // yellow -> green
    r = Math.round(255 * (nm - 530) / 50); g = 255; b = 0;
  } else if (nm >= 470) {
    // green -> blue
    r = 0; g = Math.round(255 * (nm - 470) / 60); b = Math.round(255 * (530 - nm) / 60);
  } else if (nm >= 380) {
    // blue -> violet
    r = Math.round(100 * (470 - nm) / 90); g = 0; b = 255;
  } else {
    // UV — show as deep violet
    r = 120; g = 0; b = 255;
  }

  return `rgb(${r},${g},${b})`;
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
// Hoverable annotation span
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
// Main component
// ---------------------------------------------------------------------------

export function PhotoelectricSimulator() {
  // --- State ---
  const [freq, setFreq] = useState(1.0e15);
  const [intensity, setIntensity] = useState(5);
  const [metalIdx, setMetalIdx] = useState(0);

  const metal = METALS[metalIdx];
  const phiJ = metal.phi * eV; // work function in joules
  const fSeuil = phiJ / h; // threshold frequency
  const photonEnergyJ = h * freq;
  const photonEnergyEv = photonEnergyJ / eV;
  const aboveThreshold = freq >= fSeuil;
  const ekJ = aboveThreshold ? photonEnergyJ - phiJ : 0;
  const ekEv = ekJ / eV;

  // --- Refs for main simulation canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photonsRef = useRef<Photon[]>([]);
  const electronsRef = useRef<Electron[]>([]);
  const animIdRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  // --- Refs for graph canvas ---
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);

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

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);

    // --- Metal block ---
    const metalX = 40;
    const metalW = 100;
    const metalY = 60;
    const metalH = H - 120;
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(metalX, metalY, metalW, metalH);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.strokeRect(metalX, metalY, metalW, metalH);

    // Metal label
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(metal.name, metalX + metalW / 2, metalY + metalH + 20);
    ctx.fillText(`\u03C6 = ${metal.phi} eV`, metalX + metalW / 2, metalY + metalH + 36);

    // --- Light beam (decorative cone from upper right toward metal) ---
    const beamColor = frequencyToColor(freq);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = beamColor;
    ctx.beginPath();
    ctx.moveTo(W - 40, 20);
    ctx.lineTo(metalX + metalW, metalY + 40);
    ctx.lineTo(metalX + metalW, metalY + metalH - 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- Spawn photons ---
    const now = performance.now();
    const spawnInterval = Math.max(60, 300 - intensity * 25);
    if (now - lastSpawnRef.current > spawnInterval) {
      lastSpawnRef.current = now;
      const count = Math.ceil(intensity / 3);
      for (let i = 0; i < count; i++) {
        const startX = W - 20 + Math.random() * 10;
        const startY = 20 + Math.random() * 30;
        const targetY = metalY + 30 + Math.random() * (metalH - 60);
        const targetX = metalX + metalW;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 3.5;
        photonsRef.current.push({
          x: startX,
          y: startY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          alive: true,
        });
      }
    }

    // --- Update & draw photons ---
    const photons = photonsRef.current;
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      if (!p.alive) { photons.splice(i, 1); continue; }

      p.x += p.vx;
      p.y += p.vy;

      // Hit metal surface?
      if (p.x <= metalX + metalW + 4) {
        p.alive = false;

        // Possibly eject electron
        if (aboveThreshold) {
          const electronSpeed = Math.sqrt(2 * ekJ / me); // m/s (physical)
          const speedPx = Math.min(1.5 + (electronSpeed / 1e6) * 0.8, 5); // pixels/frame
          const angle = (Math.random() - 0.5) * Math.PI * 0.6; // spread
          electronsRef.current.push({
            x: metalX + metalW + 4,
            y: p.y,
            vx: Math.cos(angle) * speedPx,
            vy: Math.sin(angle) * speedPx,
            alive: true,
          });
        }
        photons.splice(i, 1);
        continue;
      }

      // Draw photon
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = beamColor;
      ctx.fill();
    }

    // --- Update & draw electrons ---
    const electrons = electronsRef.current;
    for (let i = electrons.length - 1; i >= 0; i--) {
      const e = electrons[i];
      if (!e.alive) { electrons.splice(i, 1); continue; }

      e.x += e.vx;
      e.y += e.vy;

      // Off-screen?
      if (e.x > W + 10 || e.x < -10 || e.y > H + 10 || e.y < -10) {
        electrons.splice(i, 1);
        continue;
      }

      // Draw electron
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#60A5FA';
      ctx.fill();

      // small glow
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96,165,250,0.25)';
      ctx.fill();
    }

    // --- Vibrating electrons on surface when below threshold ---
    if (!aboveThreshold) {
      ctx.fillStyle = '#FCA5A5';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aucun électron éjecté', W / 2 + 60, H / 2);

      // Draw a few "vibrating" electrons stuck on the surface
      const vibAmp = 3;
      for (let j = 0; j < 5; j++) {
        const ey = metalY + 40 + j * ((metalH - 80) / 4);
        const vibX = metalX + metalW + 2 + Math.sin(now * 0.02 + j * 2) * vibAmp;
        ctx.beginPath();
        ctx.arc(vibX, ey, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#93C5FD';
        ctx.fill();
      }
    }

    // --- HUD info ---
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`f = ${freq.toExponential(2)} Hz`, W - 220, H - 40);
    ctx.fillText(`E_photon = ${photonEnergyEv.toFixed(2)} eV`, W - 220, H - 24);
    ctx.fillText(`f_seuil = ${fSeuil.toExponential(2)} Hz`, W - 220, H - 8);

    if (aboveThreshold) {
      ctx.fillStyle = '#86EFAC';
      ctx.fillText(`E_k = ${ekEv.toFixed(2)} eV`, W - 440, H - 8);
    }

    // Next frame
    animIdRef.current = requestAnimationFrame(drawSimulation);
  }, [freq, intensity, metal, phiJ, fSeuil, photonEnergyEv, aboveThreshold, ekJ, ekEv]);

  // Start / restart animation
  useEffect(() => {
    // Clear particles when parameters change
    photonsRef.current = [];
    electronsRef.current = [];
    lastSpawnRef.current = 0;

    animIdRef.current = requestAnimationFrame(drawSimulation);
    return () => cancelAnimationFrame(animIdRef.current);
  }, [drawSimulation]);

  // -----------------------------------------------------------------------
  // Ek vs f graph
  // -----------------------------------------------------------------------

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 55 };

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
    const fMin = 0;
    const fMax = 2.2e15;
    const ekMax = 6; // eV

    const toX = (f: number) => pad.left + (f / fMax) * plotW;
    const toY = (ek: number) => pad.top + plotH - (ek / ekMax) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(156,163,175,0.2)';
    ctx.setLineDash([4, 4]);
    for (let ek = 1; ek <= 5; ek++) {
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(ek));
      ctx.lineTo(pad.left + plotW, toY(ek));
      ctx.stroke();
    }
    for (let f = 0.5e15; f <= 2e15; f += 0.5e15) {
      ctx.beginPath();
      ctx.moveTo(toX(f), pad.top);
      ctx.lineTo(toX(f), pad.top + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Ek = hf - phi line (only for f >= fSeuil)
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let f = fSeuil; f <= fMax; f += 1e13) {
      const ek = (h * f - phiJ) / eV;
      if (ek < 0) continue;
      const x = toX(f);
      const y = toY(ek);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mark f_seuil
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(fSeuil), pad.top);
    ctx.lineTo(toX(fSeuil), pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F87171';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('f_seuil', toX(fSeuil), pad.top + plotH + 14);

    // Mark -phi on y axis (show phi value)
    ctx.fillStyle = '#FBBF24';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`\u03C6=${metal.phi}eV`, pad.left - 4, toY(0) - 6);

    // Current operating point
    if (aboveThreshold) {
      const cx = toX(freq);
      const cy = toY(ekEv);
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fill();
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#FDE68A';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`(${(freq / 1e15).toFixed(2)} PHz, ${ekEv.toFixed(2)} eV)`, cx + 10, cy - 4);
    } else {
      // Show point on x-axis
      const cx = toX(freq);
      const cy = toY(0);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.fillStyle = '#FCA5A5';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('E_k = 0', cx + 8, cy + 4);
    }

    // Axis labels
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fréquence f (Hz)', pad.left + plotW / 2, H - 4);

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('E_k (eV)', 0, 0);
    ctx.restore();

    // X-axis tick labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let f = 0.5e15; f <= 2e15; f += 0.5e15) {
      ctx.fillText(`${(f / 1e15).toFixed(1)}`, toX(f), pad.top + plotH + 14);
    }

    // Y-axis tick labels
    ctx.textAlign = 'right';
    for (let ek = 0; ek <= 5; ek += 1) {
      ctx.fillText(`${ek}`, pad.left - 6, toY(ek) + 4);
    }
  }, [freq, fSeuil, phiJ, metal, aboveThreshold, ekEv]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">
          Effet photoélectrique
        </h2>
        <p className="text-gray-600 text-sm">
          Simulation de l&apos;effet photoélectrique d&apos;Einstein (1905)
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frequency slider */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Fréquence <InlineMath math="f" />
          </label>
          <input
            type="range"
            min={F_MIN}
            max={F_MAX}
            step={1e13}
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>
              <InlineMath math={`f = ${(freq / 1e15).toFixed(2)} \\times 10^{15}\\,\\text{Hz}`} />
            </p>
            <p>
              <InlineMath math={`E_{\\gamma} = ${photonEnergyEv.toFixed(2)}\\,\\text{eV}`} />
            </p>
          </div>
        </div>

        {/* Intensity slider */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Intensité <InlineMath math="I" />
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <p className="text-xs text-gray-600">
            Nombre de photons/électrons : <strong className="text-gray-900">{intensity}</strong>
          </p>
        </div>

        {/* Metal selector */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Métal (travail de sortie <InlineMath math="\phi" />)
          </label>
          <select
            value={metalIdx}
            onChange={(e) => setMetalIdx(Number(e.target.value))}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {METALS.map((m, i) => (
              <option key={m.name} value={i}>
                {m.name} &mdash; \u03C6 = {m.phi} eV
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600">
            <InlineMath math={`f_{\\text{seuil}} = ${(fSeuil / 1e15).toFixed(2)} \\times 10^{15}\\,\\text{Hz}`} />
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div
        className={`rounded-lg px-4 py-3 text-center font-semibold text-sm ${
          aboveThreshold
            ? 'bg-green-50 text-green-900 border border-green-300'
            : 'bg-red-50 text-red-900 border border-red-300'
        }`}
      >
        {aboveThreshold ? (
          <>
            Électrons éjectés &mdash;{' '}
            <InlineMath math={`E_k = ${ekEv.toFixed(3)}\\,\\text{eV}`} />
          </>
        ) : (
          <>
            Aucun électron éjecté &mdash;{' '}
            <InlineMath
              math={`f < f_{\\text{seuil}} = ${(fSeuil / 1e15).toFixed(2)} \\times 10^{15}\\,\\text{Hz}`}
            />
          </>
        )}
      </div>

      {/* Panels */}

      {/* 1. Classical prediction */}
      <CollapsiblePanel
        title="Prédiction classique"
        borderColor="border-orange-500"
        bgColor="bg-orange-50"
        textColor="text-orange-900"
        defaultOpen={false}
      >
        <p>
          Selon la théorie ondulatoire classique de Maxwell, l&apos;énergie de la lumière
          dépend de l&apos;<strong>intensité</strong> (amplitude de l&apos;onde).
          On s&apos;attendrait donc à ce que :
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            L&apos;énergie cinétique des électrons augmente avec l&apos;intensité lumineuse.
          </li>
          <li>
            Il n&apos;existe pas de fréquence seuil : même la lumière rouge (basse fréquence)
            devrait éjecter des électrons si l&apos;on attend assez longtemps.
          </li>
          <li>
            Un <em>«&nbsp;temps d&apos;accumulation&nbsp;»</em> serait nécessaire pour que
            l&apos;énergie s&apos;accumule dans l&apos;électron.
          </li>
        </ul>
        <div className="mt-2 bg-orange-100 border border-orange-300 rounded p-3 text-center">
          <p className="text-orange-800 font-mono text-xs">
            Temps d&apos;accumulation classique : &infin; (l&apos;électron ne reçoit jamais assez
            d&apos;énergie d&apos;un seul coup)
          </p>
          <p className="text-orange-700 mt-1 font-semibold text-xs">
            &rarr; En contradiction avec l&apos;expérience !
          </p>
        </div>
      </CollapsiblePanel>

      {/* 2. Quantum result */}
      <CollapsiblePanel
        title="Résultat quantique (Einstein)"
        borderColor="border-green-500"
        bgColor="bg-green-50"
        textColor="text-green-900"
        defaultOpen={true}
      >
        <p>
          Einstein propose en 1905 que la lumière est composée de <strong>quanta</strong>{' '}
          (photons), chacun portant une énergie <InlineMath math="E = hf" />.
          L&apos;équation photoélectrique s&apos;écrit :
        </p>
        <div className="my-3 text-center">
          <BlockMath math="E_k = hf - \phi" />
        </div>
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          <HoverTerm tooltip="Énergie cinétique maximale de l'électron éjecté">
            <InlineMath math="E_k" /> = énergie cinétique
          </HoverTerm>
          <HoverTerm tooltip="Énergie d'un photon incident (h = constante de Planck, f = fréquence)">
            <InlineMath math="hf" /> = énergie du photon
          </HoverTerm>
          <HoverTerm tooltip="Travail de sortie : énergie minimale pour arracher un électron du métal">
            <InlineMath math="\phi" /> = travail de sortie
          </HoverTerm>
        </div>
        <div className="mt-3 bg-green-100 border border-green-300 rounded p-3 text-xs space-y-1">
          <p>
            <strong>Conséquences :</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Seule la <em>fréquence</em> (pas l&apos;intensité) détermine si les électrons
              sont éjectés.
            </li>
            <li>
              L&apos;intensité contrôle le <em>nombre</em> d&apos;électrons, pas leur
              énergie.
            </li>
            <li>
              L&apos;effet est <em>instantané</em> : pas de temps d&apos;accumulation.
            </li>
          </ul>
        </div>
      </CollapsiblePanel>

      {/* 3. Graph Ek vs f */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">
          Graphique{' '}
          <InlineMath math="E_k" /> vs <InlineMath math="f" />
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
          Droite de pente <InlineMath math="h" />, débutant à{' '}
          <InlineMath math={`f_{\\text{seuil}} = ${(fSeuil / 1e15).toFixed(2)} \\times 10^{15}\\,\\text{Hz}`} />.
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
          L&apos;effet photoélectrique a été observé expérimentalement par{' '}
          <strong>Heinrich Hertz</strong> en 1887, puis étudié en détail par{' '}
          <strong>Philipp Lenard</strong> en 1902.
        </p>
        <p>
          En <strong>1905</strong>, <strong>Albert Einstein</strong> publie son article
          révolutionnaire{' '}
          <em>«&nbsp;Sur un point de vue heuristique concernant la production et la
          transformation de la lumière&nbsp;»</em>, dans lequel il propose
          l&apos;hypothèse des quanta de lumière pour expliquer l&apos;effet
          photoélectrique.
        </p>
        <p>
          Cette contribution lui vaudra le{' '}
          <strong>prix Nobel de physique en 1921</strong>.
          L&apos;explication quantique a été confirmée expérimentalement par{' '}
          <strong>Robert Millikan</strong> en 1916, qui a mesuré la valeur de la
          constante de Planck <InlineMath math="h" /> avec précision.
        </p>
      </CollapsiblePanel>
    </div>
  );
}
