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
// Helper : dessiner un repère local
// ---------------------------------------------------------------------------

function drawRefFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  color: string, label: string, size: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  // x
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size, 0); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0); ctx.lineTo(size - 8, -4); ctx.lineTo(size - 8, 4);
  ctx.closePath(); ctx.fill();
  ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('x', size + 4, 4);
  // y
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -size); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -size); ctx.lineTo(-4, -size + 8); ctx.lineTo(4, -size + 8);
  ctx.closePath(); ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillText('y', 0, -size - 6);
  // label
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(label, 6, 16);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Helper : dessiner une flèche
// ---------------------------------------------------------------------------

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, lineW: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 3) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 10 - uy * 5, y2 - uy * 10 + ux * 5);
  ctx.lineTo(x2 - ux * 10 + uy * 5, y2 - uy * 10 - ux * 5);
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------------------
// Main component — Système bielle-manivelle
// ---------------------------------------------------------------------------

export function CrankRodSimulator() {
  const [crankR, setCrankR] = useState(80);       // rayon manivelle (px)
  const [rodL, setRodL] = useState(200);           // longueur bielle (px)
  const [omega, setOmega] = useState(1.5);         // vitesse angulaire manivelle (rad/frame×1000)
  const [running, setRunning] = useState(true);
  const [viewMode, setViewMode] = useState<'global' | 'refB'>('global');
  const [showRefO, setShowRefO] = useState(true);
  const [showRefB, setShowRefB] = useState(false);
  const [showTraceB, setShowTraceB] = useState(false);
  const [showTraceP, setShowTraceP] = useState(false);
  const [showVelocities, setShowVelocities] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const traceBRef = useRef<{ x: number; y: number }[]>([]);
  const tracePRef = useRef<{ x: number; y: number }[]>([]);

  const W = 700;
  const H = 480;
  // Centre de rotation de la manivelle (point O fixe)
  const Ox = 250;
  const Oy = 260;

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (running) tRef.current += omega * 0.01;
    const theta = tRef.current; // angle manivelle

    // ---- Cinématique ----
    // A = centre manivelle (fixe) = (Ox, Oy)
    // B = bout de la manivelle (sur le cercle)
    const Bx = Ox + crankR * Math.cos(theta);
    const By = Oy + crankR * Math.sin(theta);

    // C = piston (coulisseau horizontal sur y = Oy)
    // |BC| = rodL, C = (Cx, Oy)
    // (Cx - Bx)² + (Oy - By)² = rodL²
    // Cx = Bx + sqrt(rodL² - (By - Oy)²)
    const dyBC = Oy - By;
    const dxBC = Math.sqrt(Math.max(0, rodL * rodL - dyBC * dyBC));
    const Cx = Bx + dxBC;
    const Cy = Oy;

    // P = milieu de la bielle BC
    const Px = (Bx + Cx) / 2;
    const Py = (By + Cy) / 2;

    // Vitesses (dérivées analytiques)
    // dBx/dt = -R sin θ ω, dBy/dt = R cos θ ω
    const omegaVal = omega * 0.01;
    const vBx = -crankR * Math.sin(theta) * omegaVal;
    const vBy = crankR * Math.cos(theta) * omegaVal;

    // vCx : dérivée de Cx par rapport à t
    // Cx = Bx + sqrt(L² - (Oy-By)²) = Bx + sqrt(L² - R²sin²θ)
    // dCx/dt = dBx/dt + R²sinθ cosθ ω / sqrt(L² - R²sin²θ)
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const denom = Math.sqrt(Math.max(0.01, rodL * rodL - crankR * crankR * sinT * sinT));
    const vCx = vBx + (crankR * crankR * sinT * cosT * omegaVal) / denom;

    // Traces
    if (showTraceB) {
      traceBRef.current.push({ x: Bx, y: By });
      if (traceBRef.current.length > 2000) traceBRef.current.shift();
    }
    if (showTraceP) {
      tracePRef.current.push({ x: Px, y: Py });
      if (tracePRef.current.length > 2000) tracePRef.current.shift();
    }

    // ---- Dessin ----
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const isRefB = viewMode === 'refB';
    const offX = isRefB ? W / 2 - Bx : 0;
    const offY = isRefB ? H / 2 - By : 0;

    ctx.save();
    if (isRefB) ctx.translate(offX, offY);

    // Grille
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const gsx = isRefB ? Math.floor((offX % 40) - 40) - offX - 400 : 0;
    const gsy = isRefB ? Math.floor((offY % 40) - 40) - offY - 400 : 0;
    const gex = gsx + W + 800;
    const gey = gsy + H + 800;
    for (let gx = gsx; gx <= gex; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, gsy); ctx.lineTo(gx, gey); ctx.stroke();
    }
    for (let gy = gsy; gy <= gey; gy += 40) {
      ctx.beginPath(); ctx.moveTo(gsx, gy); ctx.lineTo(gex, gy); ctx.stroke();
    }

    // Glissière horizontale (piston C)
    const ext = isRefB ? 500 : 0;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Ox - 40 - ext, Oy);
    ctx.lineTo(W - 20 + ext, Oy);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox - 40 - ext, Oy - 14); ctx.lineTo(W - 20 + ext, Oy - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Ox - 40 - ext, Oy + 14); ctx.lineTo(W - 20 + ext, Oy + 14); ctx.stroke();

    // Cercle trajectoire de B (manivelle)
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(Ox, Oy, crankR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // En mode refB : cercle trajectoire de C vu depuis B
    if (isRefB) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(Bx, By, rodL, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Trajectoire de C vue depuis B', Bx, By - rodL - 8);
    }

    // Repère global O
    if (showRefO) {
      drawRefFrame(ctx, Ox, Oy, 0, '#94a3b8', 'O', 45);
    }

    // ---- Manivelle OB ----
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(Ox, Oy);
    ctx.lineTo(Bx, By);
    ctx.stroke();

    // ---- Bielle BC ----
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Bx, By);
    ctx.lineTo(Cx, Cy);
    ctx.stroke();

    // ---- Point O (pivot fixe) ----
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(Ox, Oy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('O', Ox, Oy + 24);

    // ---- Point B (bout manivelle / tête de bielle) ----
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(Bx, By, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B', Bx + 12, By - 8);

    // Repère B
    if (showRefB || isRefB) {
      drawRefFrame(ctx, Bx, By, 0, '#3b82f6', 'R_B', 35);
    }

    // ---- Point C (piston / coulisseau) ----
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(Cx - 18, Cy - 14, 36, 28);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(Cx - 18, Cy - 14, 36, 28);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Cx, Cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C', Cx, Cy + 30);

    // ---- Point P (milieu bielle) ----
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(Px, Py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('P', Px + 8, Py - 6);

    // Traces
    const drawTrace = (trace: { x: number; y: number }[], color: string) => {
      if (trace.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(trace[0].x, trace[0].y);
      for (let i = 1; i < trace.length; i++) ctx.lineTo(trace[i].x, trace[i].y);
      ctx.stroke();
    };
    if (showTraceB) drawTrace(traceBRef.current, 'rgba(96, 165, 250, 0.35)');
    if (showTraceP) drawTrace(tracePRef.current, 'rgba(251, 191, 36, 0.35)');

    // ---- Vecteurs vitesse ----
    if (showVelocities && running) {
      const vScale = 250; // facteur visuel

      if (!isRefB) {
        // Vue globale
        // v_B (tangent au cercle)
        drawArrow(ctx, Bx, By, Bx + vBx * vScale, By + vBy * vScale, '#60a5fa', 2);
        ctx.fillStyle = '#93c5fd';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('v_B', Bx + vBx * vScale + 6, By + vBy * vScale - 4);

        // v_C (horizontal)
        if (Math.abs(vCx * vScale) > 3) {
          drawArrow(ctx, Cx, Cy - 22, Cx + vCx * vScale, Cy - 22, '#22c55e', 2);
          ctx.fillStyle = '#86efac';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('v_C', Cx + vCx * vScale / 2, Cy - 34);
        }
      } else {
        // Vue depuis B : v_B = 0
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('v_B = 0', Bx, By - 20);

        // v_{C/B} = v_C - v_B
        const vCBx = (vCx - vBx) * vScale;
        const vCBy = (0 - vBy) * vScale; // vCy = 0 dans global
        if (Math.sqrt(vCBx * vCBx + vCBy * vCBy) > 3) {
          drawArrow(ctx, Cx, Cy, Cx + vCBx, Cy + vCBy, '#22c55e', 2.5);
          ctx.fillStyle = '#86efac';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('v_{C/B}', Cx + vCBx + 6, Cy + vCBy - 4);
        }

        // v_{O/B} = -v_B
        const vOBx = -vBx * vScale;
        const vOBy = -vBy * vScale;
        if (Math.sqrt(vOBx * vOBx + vOBy * vOBy) > 3) {
          drawArrow(ctx, Ox, Oy, Ox + vOBx, Oy + vOBy, '#94a3b8', 2);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('v_{O/B}', Ox + vOBx + 6, Oy + vOBy - 4);
        }
      }
    }

    // Cotations
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const mOBx = (Ox + Bx) / 2;
    const mOBy = (Oy + By) / 2;
    ctx.fillText(`R = ${crankR}`, mOBx - 12, mOBy - 8);
    const mBCx = (Bx + Cx) / 2;
    const mBCy = (By + Cy) / 2;
    ctx.fillText(`L = ${rodL}`, mBCx + 12, mBCy - 8);

    ctx.restore(); // fin transformation de vue

    // ---- Infos (hors transformation) ----
    const thetaDeg = ((theta * 180 / Math.PI) % 360 + 360) % 360;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`θ = ${thetaDeg.toFixed(1)}°`, W - 14, 22);
    ctx.fillText(`x_C = ${(Cx - Ox).toFixed(1)} px`, W - 14, 42);
    ctx.fillText(`|v_C| = ${(Math.abs(vCx) * 1000).toFixed(0)}`, W - 14, 62);

    // Badge vue
    ctx.fillStyle = isRefB ? '#3b82f6' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isRefB ? '👁 Vue depuis B (tête de bielle)' : '👁 Vue globale', 14, 22);
    if (isRefB) {
      ctx.fillStyle = '#93c5fd';
      ctx.font = '10px sans-serif';
      ctx.fillText('B est fixe — manivelle et piston bougent', 14, 38);
    }

    animIdRef.current = requestAnimationFrame(step);
  }, [crankR, rodL, omega, running, viewMode, showRefO, showRefB, showTraceB, showTraceP, showVelocities]);

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [step]);

  // Rapport cinématique instantané
  const theta = tRef.current;
  const sinT = Math.sin(theta);
  const lambda = crankR / rodL;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Système bielle-manivelle
        </h2>
        <p className="text-gray-600">
          Transformation rotation ↔ translation &mdash; cinématique et référentiels
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Rayon manivelle */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Manivelle <InlineMath math="R" />
            </label>
            <input type="range" min={40} max={150} step={5} value={crankR}
              onChange={(e) => setCrankR(Number(e.target.value))}
              className="flex-1 accent-blue-500" />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{crankR} px</span>
          </div>

          {/* Longueur bielle */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Bielle <InlineMath math="L" />
            </label>
            <input type="range" min={100} max={350} step={5} value={rodL}
              onChange={(e) => setRodL(Number(e.target.value))}
              className="flex-1 accent-gray-500" />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{rodL} px</span>
          </div>

          {/* Vitesse angulaire */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Vitesse <InlineMath math="\omega" />
            </label>
            <input type="range" min={0.3} max={4} step={0.1} value={omega}
              onChange={(e) => setOmega(Number(e.target.value))}
              className="flex-1 accent-yellow-500" />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">×{omega.toFixed(1)}</span>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setRunning(r => !r)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button
              onClick={() => { traceBRef.current = []; tracePRef.current = []; }}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              Effacer traces
            </button>
          </div>

          {/* Mode de vue */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Point de vue :</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => { setViewMode('global'); traceBRef.current = []; tracePRef.current = []; }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'global' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Vue globale (R₀)
              </button>
              <button
                onClick={() => { setViewMode('refB'); traceBRef.current = []; tracePRef.current = []; }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'refB' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Vue depuis B (tête de bielle)
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Affichage :</span>
            {[
              { label: 'R₀', checked: showRefO, set: setShowRefO, c: 'accent-gray-500' },
              { label: 'R_B', checked: showRefB, set: setShowRefB, c: 'accent-blue-500' },
              { label: 'Trace B', checked: showTraceB, set: setShowTraceB, c: 'accent-blue-400' },
              { label: 'Trace P', checked: showTraceP, set: setShowTraceP, c: 'accent-yellow-500' },
              { label: 'Vitesses', checked: showVelocities, set: setShowVelocities, c: 'accent-green-500' },
            ].map(r => (
              <label key={r.label} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={r.checked}
                  onChange={(e) => r.set(e.target.checked)}
                  className={`w-4 h-4 ${r.c}`} />
                {r.label}
              </label>
            ))}
          </div>

          {/* Résumé */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm grid grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>R</strong> = {crankR} px (manivelle)</div>
            <div><strong>L</strong> = {rodL} px (bielle)</div>
            <div><strong>λ = R/L</strong> = {lambda.toFixed(3)}</div>
            <div><strong>Course</strong> = 2R = {2 * crankR} px</div>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Description du mécanisme"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Le système <strong>bielle-manivelle</strong> convertit un mouvement de
            rotation continue (manivelle OB) en translation alternative (piston C),
            ou inversement.
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong>O</strong> : pivot fixe (vilebrequin).</li>
            <li><strong>B</strong> : bout de la manivelle, décrit un cercle de rayon <InlineMath math="R" />.</li>
            <li><strong>Bielle BC</strong> : barre rigide de longueur <InlineMath math="L" />, articulée en B et C.</li>
            <li><strong>C</strong> : piston, contraint à se déplacer sur l&apos;axe horizontal (glissière).</li>
          </ul>
          <p className="text-gray-700">
            Le rapport <InlineMath math={`\\lambda = R/L`} /> caractérise la géométrie.
            En pratique, <InlineMath math={`\\lambda \\approx 0{,}25`} /> à <InlineMath math="0{,}35" />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Cinématique du piston"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            La position du piston C en fonction de l&apos;angle manivelle <InlineMath math="\theta" /> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`x_C = R\\cos\\theta + \\sqrt{L^2 - R^2\\sin^2\\theta}`} />
          </div>
          <p className="text-gray-700">
            La vitesse du piston :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\dot{x}_C = -R\\omega\\left(\\sin\\theta + \\frac{\\lambda\\sin 2\\theta}{2\\sqrt{1 - \\lambda^2\\sin^2\\theta}}\\right)`} />
          </div>
          <p className="text-gray-700">
            Le mouvement n&apos;est <strong>pas sinusoïdal pur</strong> : le terme en{' '}
            <InlineMath math="\sin 2\theta" /> crée une asymétrie (le piston va plus vite
            dans un sens que dans l&apos;autre).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Vue depuis B (tête de bielle)"
          borderColor="border-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-800"
        >
          <p className="text-gray-700">
            En se plaçant dans le <strong>référentiel de B</strong> :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>B est <strong>immobile</strong> (v_B = 0).</li>
            <li>Le point O décrit un cercle de rayon R autour de B (rotation inverse de la manivelle).</li>
            <li>Le piston C se déplace sur un cercle de rayon L centré en B, contraint par la glissière qui bouge.</li>
          </ul>
          <p className="text-gray-700">
            On observe la <strong>vitesse relative</strong> :{' '}
            <InlineMath math={`\\vec{v}_{C/B} = \\vec{v}_C - \\vec{v}_B`} />.
            Cette décomposition est essentielle pour analyser les efforts dans la bielle.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            Le système bielle-manivelle est l&apos;un des mécanismes les plus répandus :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong>Moteurs à combustion interne</strong> : piston → bielle → vilebrequin.</li>
            <li><strong>Compresseurs à piston</strong> : vilebrequin → bielle → piston.</li>
            <li><strong>Machines à vapeur</strong> et locomotives.</li>
            <li><strong>Pompes alternatives</strong>, presses mécaniques.</li>
            <li><strong>Essuie-glaces</strong> (variante avec secteur).</li>
          </ul>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
