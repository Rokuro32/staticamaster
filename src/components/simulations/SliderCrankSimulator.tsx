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
// Main component — Deux coulisseaux (translation X + translation Y)
// ---------------------------------------------------------------------------

export function SliderCrankSimulator() {
  const [xA, setXA] = useState(200);           // position coulisseau horizontal A (px)
  const [yB, setYB] = useState(180);           // position coulisseau vertical B (px)
  const [rodLength, setRodLength] = useState(200); // longueur bielle AB (px)
  const [showRefA, setShowRefA] = useState(false);
  const [showRefB, setShowRefB] = useState(false);
  const [showRefO, setShowRefO] = useState(true);
  const [showTraceP, setShowTraceP] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [viewMode, setViewMode] = useState<'global' | 'refA'>('global');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const traceRef = useRef<{ x: number; y: number }[]>([]);

  const W = 700;
  const H = 500;

  // Origine du repère global
  const ox = 100;
  const oy = 380;

  // Coulisseau A : se déplace en x sur la glissière horizontale (y = oy)
  // Coulisseau B : se déplace en y sur la glissière verticale (x = ox)
  // Bielle AB de longueur L relie A et B

  // Point P = milieu de AB (pour illustrer la cinématique d'un point quelconque)

  // Contrainte : distance AB = L
  // A = (ox + xA, oy), B = (ox, oy - yB)
  // |AB|² = xA² + yB² = L²

  // En animation, on paramétrise par un angle θ :
  // xA = L cos θ, yB = L sin θ

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animate) {
      tRef.current += 0.015 * animSpeed;
      const theta = tRef.current;
      // Contrainte : xA² + yB² = L²
      const newXA = Math.abs(rodLength * Math.cos(theta));
      const newYB = Math.abs(rodLength * Math.sin(theta));
      // On ne met pas à jour via setState en animation pour éviter les re-renders
      // On utilise directement les valeurs calculées
      drawFrame(ctx, newXA, newYB);
    } else {
      // Mode manuel : vérifier la contrainte
      drawFrame(ctx, xA, yB);
    }

    animIdRef.current = requestAnimationFrame(draw);
  }, [animate, animSpeed, xA, yB, rodLength, showRefA, showRefB, showRefO, showTraceP, viewMode]);

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, curXA: number, curYB: number) => {
    // Ajuster pour respecter la contrainte de longueur
    const actualDist = Math.sqrt(curXA * curXA + curYB * curYB);
    let aX = curXA;
    let bY = curYB;
    if (actualDist > 0.1) {
      aX = curXA * rodLength / actualDist;
      bY = curYB * rodLength / actualDist;
    }

    // Coordonnées dans le canvas
    const Ax = ox + aX;
    const Ay = oy;
    const Bx = ox;
    const By = oy - bY;

    // Point P (milieu de AB)
    const Px = (Ax + Bx) / 2;
    const Py = (Ay + By) / 2;

    // Trace
    if (showTraceP) {
      traceRef.current.push({ x: Px, y: Py });
      if (traceRef.current.length > 2000) traceRef.current.shift();
    }

    // --- Dessin ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // ---- Transformation de vue ----
    // En mode refA, on translate le canvas pour que A soit au centre
    const isRefA = viewMode === 'refA';
    const viewCx = isRefA ? W / 2 : 0; // centre de la vue
    const viewCy = isRefA ? H / 2 : 0;
    const offsetX = isRefA ? viewCx - Ax : 0;
    const offsetY = isRefA ? viewCy - Ay : 0;

    ctx.save();
    if (isRefA) {
      ctx.translate(offsetX, offsetY);
    }

    // Grille de fond (décalée pour donner un effet de mouvement en mode refA)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const gridOx = isRefA ? (Math.round(offsetX / 40) * 40) - offsetX - 400 : 0;
    const gridOy = isRefA ? (Math.round(offsetY / 40) * 40) - offsetY - 400 : 0;
    for (let gx = gridOx; gx < gridOx + W + 800; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, gridOy); ctx.lineTo(gx, gridOy + H + 800); ctx.stroke();
    }
    for (let gy = gridOy; gy < gridOy + H + 800; gy += 40) {
      ctx.beginPath(); ctx.moveTo(gridOx, gy); ctx.lineTo(gridOx + W + 800, gy); ctx.stroke();
    }

    // ---- Glissières ----
    // Glissière horizontale (A se déplace en x)
    const slideExtend = isRefA ? 800 : 0;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox - 10 - slideExtend, oy);
    ctx.lineTo(W - 30 + slideExtend, oy);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - 10 - slideExtend, oy - 12);
    ctx.lineTo(W - 30 + slideExtend, oy - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox - 10 - slideExtend, oy + 12);
    ctx.lineTo(W - 30 + slideExtend, oy + 12);
    ctx.stroke();

    // Glissière verticale (B se déplace en y)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox, oy + 10 + slideExtend);
    ctx.lineTo(ox, 30 - slideExtend);
    ctx.stroke();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - 12, oy + 10 + slideExtend);
    ctx.lineTo(ox - 12, 30 - slideExtend);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 10 + slideExtend);
    ctx.lineTo(ox + 12, 30 - slideExtend);
    ctx.stroke();

    // ---- Repère global O ----
    if (showRefO) {
      drawFrame2(ctx, ox, oy, 0, '#94a3b8', 'O', 50);
    }

    // ---- Cercle trajectoire de B vu depuis A (en mode refA) ----
    if (isRefA) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(Ax, Ay, rodLength, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Trajectoire de B vue depuis A (cercle r = L)', Ax - rodLength, Ay - rodLength - 8);
    }

    // ---- Bielle AB ----
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Ax, Ay);
    ctx.lineTo(Bx, By);
    ctx.stroke();

    // Cotation longueur L
    const midBx = (Ax + Bx) / 2;
    const midBy = (Ay + By) / 2;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`L = ${rodLength} px`, midBx + 15, midBy - 5);

    // ---- Coulisseau A (horizontal) ----
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(Ax - 16, Ay - 12, 32, 24);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.strokeRect(Ax - 16, Ay - 12, 32, 24);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Ax, Ay, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', Ax, Ay + 30);

    // Repère A (toujours affiché en mode refA)
    if (showRefA || isRefA) {
      drawFrame2(ctx, Ax, Ay, 0, '#3b82f6', 'R_A', 40);
    }

    // ---- Coulisseau B (vertical) ----
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(Bx - 12, By - 16, 24, 32);
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(Bx - 12, By - 16, 24, 32);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Bx, By, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B', Bx - 30, By + 5);

    if (showRefB) {
      drawFrame2(ctx, Bx, By, 0, '#ef4444', 'R_B', 40);
    }

    // ---- Point P (milieu) ----
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(Px, Py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('P', Px + 10, Py - 6);

    // Trace de P
    if (showTraceP && traceRef.current.length > 1) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(traceRef.current[0].x, traceRef.current[0].y);
      for (let i = 1; i < traceRef.current.length; i++) {
        ctx.lineTo(traceRef.current[i].x, traceRef.current[i].y);
      }
      ctx.stroke();
    }

    // ---- Vecteurs vitesse ----
    if (animate) {
      const theta = tRef.current;
      const omegaVis = 30 * animSpeed;

      if (!isRefA) {
        // Vue globale : vA horizontal, vB vertical
        const vAx = -rodLength * Math.sin(theta) * 0.015 * animSpeed * omegaVis;
        if (Math.abs(vAx) > 2) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Ax, Ay - 20);
          ctx.lineTo(Ax + vAx, Ay - 20);
          ctx.stroke();
          const dir = vAx > 0 ? 1 : -1;
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.moveTo(Ax + vAx, Ay - 20);
          ctx.lineTo(Ax + vAx - dir * 8, Ay - 26);
          ctx.lineTo(Ax + vAx - dir * 8, Ay - 14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#93c5fd';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('v_A', Ax + vAx / 2, Ay - 28);
        }

        const vBy = -rodLength * Math.cos(theta) * 0.015 * animSpeed * omegaVis;
        if (Math.abs(vBy) > 2) {
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Bx + 20, By);
          ctx.lineTo(Bx + 20, By + vBy);
          ctx.stroke();
          const dir = vBy > 0 ? 1 : -1;
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.moveTo(Bx + 20, By + vBy);
          ctx.lineTo(Bx + 14, By + vBy - dir * 8);
          ctx.lineTo(Bx + 26, By + vBy - dir * 8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fca5a5';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('v_B', Bx + 30, By + vBy / 2);
        }
      } else {
        // Vue depuis A : v_A = 0, v_{B/A} tangent au cercle
        // v_{B/A} est perpendiculaire à AB, de norme L * dθ/dt
        const dtheta = 0.015 * animSpeed;
        const vBrelNorm = rodLength * dtheta * omegaVis;
        // Direction perpendiculaire à AB (= tangent au cercle)
        const dx = Bx - Ax;
        const dy = By - Ay;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Tangent = perpendiculaire à (dx, dy) dans le sens de rotation
        const tx = dy / dist;
        const ty = -dx / dist;

        const vBrelX = tx * vBrelNorm;
        const vBrelY = ty * vBrelNorm;

        if (vBrelNorm > 2) {
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(Bx, By);
          ctx.lineTo(Bx + vBrelX, By + vBrelY);
          ctx.stroke();
          // Tête de flèche
          const aLen = Math.sqrt(vBrelX * vBrelX + vBrelY * vBrelY);
          const ux = vBrelX / aLen;
          const uy = vBrelY / aLen;
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.moveTo(Bx + vBrelX, By + vBrelY);
          ctx.lineTo(Bx + vBrelX - ux * 10 - uy * 5, By + vBrelY - uy * 10 + ux * 5);
          ctx.lineTo(Bx + vBrelX - ux * 10 + uy * 5, By + vBrelY - uy * 10 - ux * 5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('v_{B/A}', Bx + vBrelX + 6, By + vBrelY - 6);
        }

        // Label v_A = 0
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('v_A = 0', Ax, Ay - 22);
      }
    }

    ctx.restore(); // fin de la transformation de vue

    // ---- Infos (toujours en coordonnées canvas, hors transformation) ----
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';

    const angle = Math.atan2(bY, aX) * 180 / Math.PI;
    ctx.fillText(`x_A = ${aX.toFixed(1)} px`, W - 14, 22);
    ctx.fillText(`y_B = ${bY.toFixed(1)} px`, W - 14, 42);
    ctx.fillText(`θ = ${angle.toFixed(1)}°`, W - 14, 62);
    ctx.fillText(`P = (${(Px - ox).toFixed(0)}, ${(oy - Py).toFixed(0)})`, W - 14, 82);

    // Badge mode de vue
    ctx.fillStyle = isRefA ? '#3b82f6' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isRefA ? '👁 Vue depuis A (R_A)' : '👁 Vue globale (R₀)', 14, 22);
    if (isRefA) {
      ctx.fillStyle = '#93c5fd';
      ctx.font = '10px sans-serif';
      ctx.fillText('A est fixe — les glissières bougent', 14, 38);
    }
  }, [W, H, ox, oy, rodLength, showRefA, showRefB, showRefO, showTraceP, animate, animSpeed, viewMode]);

  // Dessiner un repère local (axes x, y)
  const drawFrame2 = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    angle: number,
    color: string,
    label: string,
    size: number,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Axe x
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(size - 8, -4);
    ctx.lineTo(size - 8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x', size + 4, 4);

    // Axe y (vers le haut = -y canvas)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-4, -size + 8);
    ctx.lineTo(4, -size + 8);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillText('y', 0, -size - 6);

    // Label
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 6, 16);

    ctx.restore();
  };

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [draw]);

  // En mode manuel, ajuster la contrainte
  const handleXA = (val: number) => {
    setXA(val);
    // Contrainte : yB = sqrt(L² - xA²)
    const newYB = Math.sqrt(Math.max(0, rodLength * rodLength - val * val));
    setYB(newYB);
  };
  const handleYB = (val: number) => {
    setYB(val);
    const newXA = Math.sqrt(Math.max(0, rodLength * rodLength - val * val));
    setXA(newXA);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Coulisseaux croisés
        </h2>
        <p className="text-gray-600">
          Deux translations couplées par une bielle &mdash; cinématique du plan
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Longueur bielle */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Bielle <InlineMath math="L" />
            </label>
            <input type="range" min={100} max={300} step={5} value={rodLength}
              onChange={(e) => { setRodLength(Number(e.target.value)); handleXA(xA); }}
              className="flex-1 accent-gray-500" />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{rodLength} px</span>
          </div>

          {!animate && (
            <>
              {/* Position A (x) */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
                  Position <InlineMath math="x_A" />
                </label>
                <input type="range" min={0} max={rodLength} step={1} value={Math.round(xA)}
                  onChange={(e) => handleXA(Number(e.target.value))}
                  className="flex-1 accent-blue-500" />
                <span className="text-sm font-mono text-gray-900 w-20 text-right">{xA.toFixed(0)} px</span>
              </div>

              {/* Position B (y) */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
                  Position <InlineMath math="y_B" />
                </label>
                <input type="range" min={0} max={rodLength} step={1} value={Math.round(yB)}
                  onChange={(e) => handleYB(Number(e.target.value))}
                  className="flex-1 accent-red-500" />
                <span className="text-sm font-mono text-gray-900 w-20 text-right">{yB.toFixed(0)} px</span>
              </div>
            </>
          )}

          {animate && (
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
                Vitesse anim.
              </label>
              <input type="range" min={0.2} max={3} step={0.1} value={animSpeed}
                onChange={(e) => setAnimSpeed(Number(e.target.value))}
                className="flex-1 accent-yellow-500" />
              <span className="text-sm font-mono text-gray-900 w-20 text-right">×{animSpeed.toFixed(1)}</span>
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { setAnimate(a => !a); traceRef.current = []; }}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                animate
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
              }`}
            >
              {animate ? '⏸ Mode manuel' : '▶ Animer'}
            </button>
            <button
              onClick={() => traceRef.current = []}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              Effacer trace
            </button>
          </div>

          {/* Mode de vue */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Point de vue :</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => { setViewMode('global'); traceRef.current = []; }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'global'
                    ? 'bg-gray-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Vue globale (R₀)
              </button>
              <button
                onClick={() => { setViewMode('refA'); traceRef.current = []; }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'refA'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Vue depuis A (R_A)
              </button>
            </div>
          </div>

          {/* Référentiels */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Référentiels :</span>
            {[
              { label: 'R₀ (global)', checked: showRefO, set: setShowRefO, color: 'accent-gray-500' },
              { label: 'R_A (coulisseau A)', checked: showRefA, set: setShowRefA, color: 'accent-blue-500' },
              { label: 'R_B (coulisseau B)', checked: showRefB, set: setShowRefB, color: 'accent-red-500' },
              { label: 'Trace P', checked: showTraceP, set: setShowTraceP, color: 'accent-yellow-500' },
            ].map(r => (
              <label key={r.label} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={r.checked}
                  onChange={(e) => r.set(e.target.checked)}
                  className={`w-4 h-4 ${r.color}`} />
                {r.label}
              </label>
            ))}
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
            Deux <strong>coulisseaux</strong> (glissières) sont disposés perpendiculairement :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong className="text-blue-600">A</strong> : translation horizontale (axe x) sur la glissière horizontale.</li>
            <li><strong className="text-red-600">B</strong> : translation verticale (axe y) sur la glissière verticale.</li>
          </ul>
          <p className="text-gray-700">
            Une <strong>bielle rigide</strong> de longueur <InlineMath math="L" /> relie A et B.
            Le système a <strong>1 degré de liberté</strong> : connaître la position d&apos;un
            coulisseau détermine celle de l&apos;autre.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`x_A^2 + y_B^2 = L^2`} />
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Paramétrage et cinématique"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            En paramétrant par l&apos;angle <InlineMath math="\theta" /> que fait la bielle
            avec l&apos;horizontale :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`x_A = L\\cos\\theta, \\quad y_B = L\\sin\\theta`} />
          </div>
          <p className="text-gray-700">
            Les vitesses des coulisseaux sont :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\dot{x}_A = -L\\sin\\theta\\;\\dot{\\theta}, \\quad \\dot{y}_B = L\\cos\\theta\\;\\dot{\\theta}`} />
          </div>
          <p className="text-gray-700">
            Quand A accélère vers la droite, B ralentit vers le haut (et inversement).
            La relation entre les vitesses est :{' '}
            <InlineMath math={`\\dot{x}_A / \\dot{y}_B = -\\tan\\theta`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Trajectoire du point P"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
        >
          <p className="text-gray-700">
            Le point <strong>P</strong> (milieu de AB) décrit une trajectoire :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`x_P = \\frac{x_A}{2} = \\frac{L}{2}\\cos\\theta, \\quad y_P = \\frac{y_B}{2} = \\frac{L}{2}\\sin\\theta`} />
          </div>
          <p className="text-gray-700">
            Donc <InlineMath math={`x_P^2 + y_P^2 = (L/2)^2`} /> : le point P décrit un{' '}
            <strong>quart de cercle</strong> de rayon <InlineMath math="L/2" />.
            Activez la trace pour le vérifier visuellement.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Référentiels et mouvement relatif"
          borderColor="border-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-800"
        >
          <p className="text-gray-700">
            Trois référentiels sont disponibles :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>R₀</strong> (gris) : référentiel du bâti (fixe). Les deux coulisseaux
              sont en translation rectiligne dans ce repère.
            </li>
            <li>
              <strong>R_A</strong> (bleu) : référentiel lié au coulisseau A. Vue depuis A,
              le point B décrit un mouvement circulaire de rayon L autour de A.
            </li>
            <li>
              <strong>R_B</strong> (rouge) : référentiel lié au coulisseau B. Vue depuis B,
              le point A décrit un mouvement circulaire de rayon L autour de B.
            </li>
          </ul>
          <p className="text-gray-700">
            La <strong>composition des mouvements</strong> donne :{' '}
            <InlineMath math={`\\vec{v}_{P/R_0} = \\vec{v}_{P/R_A} + \\vec{v}_{A/R_0}`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="5. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            Ce mécanisme à coulisseaux croisés se retrouve dans :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong>Mécanisme bielle-manivelle</strong> (variante) : transformation rotation ↔ translation.</li>
            <li><strong>Tables XY</strong> : positionnement 2D par deux axes de translation indépendants.</li>
            <li><strong>Compas elliptique</strong> (trammel d&apos;Archimède) : si P n&apos;est pas au milieu, il trace une ellipse.</li>
            <li><strong>Mécanismes de machines-outils</strong> : étaux, presses, guides linéaires croisés.</li>
          </ul>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
