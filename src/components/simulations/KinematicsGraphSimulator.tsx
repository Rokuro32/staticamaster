'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

type MotionType = 'uniform' | 'uniformAccel' | 'sinusoidal' | 'custom';

interface MotionConfig {
  id: MotionType;
  name: string;
  description: string;
}

const MOTION_TYPES: MotionConfig[] = [
  { id: 'uniform', name: 'MRU', description: 'Mouvement Rectiligne Uniforme (v = constante)' },
  { id: 'uniformAccel', name: 'MRUA', description: 'Mouvement Rectiligne Uniformément Accéléré (a = constante)' },
  { id: 'sinusoidal', name: 'Harmonique', description: 'Mouvement Harmonique Simple (oscillation)' },
  { id: 'custom', name: 'Personnalisé', description: 'Définissez vos propres conditions initiales' },
];

export function KinematicsGraphSimulator() {
  const [motionType, setMotionType] = useState<MotionType>('uniformAccel');

  // Initial conditions and parameters
  const [x0, setX0] = useState(0);
  const [v0, setV0] = useState(2);
  const [a0, setA0] = useState(1);
  const [omega, setOmega] = useState(2);
  const [amplitude, setAmplitude] = useState(3);

  // Time settings
  const [maxTime, setMaxTime] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Animation
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs - now larger for emphasis
  const positionCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const accelerationCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Compact canvas sizes for all-in-view display
  const canvasWidth = 480;
  const canvasHeight = 140;
  const animCanvasWidth = 480;
  const animCanvasHeight = 60;

  // Calculate position, velocity, acceleration at time t
  const getKinematics = useCallback((t: number) => {
    switch (motionType) {
      case 'uniform':
        return { x: x0 + v0 * t, v: v0, a: 0 };
      case 'uniformAccel':
        return { x: x0 + v0 * t + 0.5 * a0 * t * t, v: v0 + a0 * t, a: a0 };
      case 'sinusoidal':
        return {
          x: amplitude * Math.sin(omega * t),
          v: amplitude * omega * Math.cos(omega * t),
          a: -amplitude * omega * omega * Math.sin(omega * t),
        };
      case 'custom':
        return { x: x0 + v0 * t + 0.5 * a0 * t * t, v: v0 + a0 * t, a: a0 };
      default:
        return { x: 0, v: 0, a: 0 };
    }
  }, [motionType, x0, v0, a0, omega, amplitude]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        setCurrentTime(prev => {
          const newTime = prev + dt;
          if (newTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return newTime;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, maxTime]);

  // Draw a graph with enhanced styling
  const drawGraph = useCallback((
    canvas: HTMLCanvasElement | null,
    getValue: (t: number) => number,
    color: string,
    bgColor: string,
    label: string,
    unit: string,
    derivativeLabel?: string,
    integralLabel?: string
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 45, right: 20, top: 25, bottom: 30 };
    const graphWidth = canvasWidth - padding.left - padding.right;
    const graphHeight = canvasHeight - padding.top - padding.bottom;

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate y range
    let minY = Infinity, maxY = -Infinity;
    const numPoints = 300;
    const values: number[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * maxTime;
      const val = getValue(t);
      values.push(val);
      minY = Math.min(minY, val);
      maxY = Math.max(maxY, val);
    }

    const yPadding = (maxY - minY) * 0.15 || 1;
    minY -= yPadding;
    maxY += yPadding;

    const toCanvasX = (t: number) => padding.left + (t / maxTime) * graphWidth;
    const toCanvasY = (y: number) => padding.top + graphHeight - ((y - minY) / (maxY - minY)) * graphHeight;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    const numYLines = 6;
    for (let i = 0; i <= numYLines; i++) {
      const y = minY + (i / numYLines) * (maxY - minY);
      const canvasY = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left, canvasY);
      ctx.lineTo(canvasWidth - padding.right, canvasY);
      ctx.stroke();
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(y.toFixed(1), padding.left - 5, canvasY + 3);
    }

    const numXLines = 10;
    for (let i = 0; i <= numXLines; i++) {
      const t = (i / numXLines) * maxTime;
      const canvasX = toCanvasX(t);
      ctx.beginPath();
      ctx.moveTo(canvasX, padding.top);
      ctx.lineTo(canvasX, canvasHeight - padding.bottom);
      ctx.stroke();
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t.toFixed(1), canvasX, canvasHeight - padding.bottom + 12);
    }

    // Zero line
    if (minY < 0 && maxY > 0) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, toCanvasY(0));
      ctx.lineTo(canvasWidth - padding.right, toCanvasY(0));
      ctx.stroke();
    }

    // Area under curve (for integral visualization)
    if (integralLabel) {
      ctx.fillStyle = color + '20';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(0), toCanvasY(0));
      for (let i = 0; i <= Math.floor((currentTime / maxTime) * numPoints); i++) {
        const t = (i / numPoints) * maxTime;
        ctx.lineTo(toCanvasX(t), toCanvasY(values[i]));
      }
      ctx.lineTo(toCanvasX(currentTime), toCanvasY(0));
      ctx.closePath();
      ctx.fill();
    }

    // Main curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * maxTime;
      const x = toCanvasX(t);
      const y = toCanvasY(values[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current time vertical line
    const markerX = toCanvasX(currentTime);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(markerX, padding.top);
    ctx.lineTo(markerX, canvasHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current point
    const currentVal = getValue(currentTime);
    const markerY = toCanvasY(currentVal);

    // Point with glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tangent line (derivative visualization)
    if (derivativeLabel) {
      const dt = 0.01;
      const nextVal = getValue(currentTime + dt);
      const slope = (nextVal - currentVal) / dt;
      const tangentLength = 60;

      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      const dx = tangentLength / Math.sqrt(1 + slope * slope * (canvasHeight / graphHeight) * (canvasHeight / graphHeight));
      const dy = slope * dx * (graphHeight / (maxY - minY)) * (canvasHeight / graphHeight);

      ctx.moveTo(markerX - dx, markerY + dy * (maxTime / graphWidth));
      ctx.lineTo(markerX + dx, markerY - dy * (maxTime / graphWidth));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current value box
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const boxWidth = 70;
    const boxHeight = 20;
    const boxX = Math.min(markerX + 10, canvasWidth - padding.right - boxWidth - 5);
    const boxY = Math.max(markerY - 25, padding.top + 3);
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentVal.toFixed(2)} ${unit}`, boxX + boxWidth / 2, boxY + 14);

    // Title with formula
    ctx.fillStyle = color;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}(t)`, 8, 18);

    // Axis label
    ctx.fillStyle = '#374151';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', canvasWidth / 2, canvasHeight - 5);

    ctx.save();
    ctx.translate(12, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${label} (${unit})`, 0, 0);
    ctx.restore();

    // Derivative/Integral indicators
    if (derivativeLabel) {
      ctx.fillStyle = '#9333ea';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`pente → ${derivativeLabel}`, canvasWidth - 8, 14);
    }
    if (integralLabel) {
      ctx.fillStyle = color;
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`aire → Δ${integralLabel}`, canvasWidth - 8, 24);
    }
  }, [maxTime, currentTime, canvasWidth, canvasHeight]);

  // Draw small animation
  const drawAnimation = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas || !showAnimation) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, v } = getKinematics(currentTime);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, animCanvasWidth, animCanvasHeight);

    // Calculate range
    let minX = 0, maxX = 10;
    for (let t = 0; t <= maxTime; t += 0.1) {
      const { x: pos } = getKinematics(t);
      minX = Math.min(minX, pos);
      maxX = Math.max(maxX, pos);
    }
    const xPadding = (maxX - minX) * 0.1 || 2;
    minX -= xPadding;
    maxX += xPadding;

    const padding = 30;
    const trackWidth = animCanvasWidth - 2 * padding;
    const toCanvasX = (pos: number) => padding + ((pos - minX) / (maxX - minX)) * trackWidth;

    // Track
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(padding, animCanvasHeight / 2 - 2, trackWidth, 4);

    // Scale marks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const pos = minX + (i / 5) * (maxX - minX);
      const cx = toCanvasX(pos);
      ctx.fillRect(cx - 1, animCanvasHeight / 2 - 6, 2, 12);
      ctx.fillText(pos.toFixed(1), cx, animCanvasHeight / 2 + 18);
    }

    // Object
    const objX = toCanvasX(x);
    const objY = animCanvasHeight / 2 - 15;

    // Velocity arrow
    if (Math.abs(v) > 0.1) {
      const arrowLen = Math.min(Math.abs(v) * 10, 40) * Math.sign(v);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX + arrowLen, objY);
      ctx.stroke();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(objX + arrowLen, objY);
      ctx.lineTo(objX + arrowLen - 6 * Math.sign(v), objY - 4);
      ctx.lineTo(objX + arrowLen - 6 * Math.sign(v), objY + 4);
      ctx.closePath();
      ctx.fill();
    }

    // Ball
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(objX, objY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)}s   x = ${x.toFixed(2)}m   v = ${v.toFixed(2)}m/s`, 10, 15);
  }, [currentTime, getKinematics, maxTime, showAnimation]);

  // Draw all
  useEffect(() => {
    drawGraph(positionCanvasRef.current, (t) => getKinematics(t).x, '#16a34a', '#f0fdf4', 'x', 'm', 'v(t)', undefined);
    drawGraph(velocityCanvasRef.current, (t) => getKinematics(t).v, '#2563eb', '#eff6ff', 'v', 'm/s', 'a(t)', 'x');
    drawGraph(accelerationCanvasRef.current, (t) => getKinematics(t).a, '#dc2626', '#fef2f2', 'a', 'm/s²', undefined, 'v');
    drawAnimation();
  }, [drawGraph, drawAnimation, getKinematics]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const currentKinematics = getKinematics(currentTime);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {MOTION_TYPES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMotionType(m.id); handleReset(); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  motionType === m.id
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAnimation}
              onChange={(e) => setShowAnimation(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-600"
            />
            Animation
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {MOTION_TYPES.find(m => m.id === motionType)?.description}
        </p>
      </div>

      <div className="p-4">
        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Position graph - Top Left */}
          <div className="border border-green-300 rounded-lg overflow-hidden bg-gradient-to-b from-green-50 to-white">
            <div className="px-2 py-1 bg-green-100 border-b border-green-200 flex justify-between items-center">
              <span className="text-xs font-bold text-green-800">Position x(t)</span>
              <span className="text-sm font-mono font-bold text-green-700">{currentKinematics.x.toFixed(2)} m</span>
            </div>
            <canvas ref={positionCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
          </div>

          {/* Velocity graph - Top Right */}
          <div className="border border-blue-300 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50 to-white">
            <div className="px-2 py-1 bg-blue-100 border-b border-blue-200 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-800">Vitesse v(t)</span>
              <span className="text-sm font-mono font-bold text-blue-700">{currentKinematics.v.toFixed(2)} m/s</span>
            </div>
            <canvas ref={velocityCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
          </div>

          {/* Acceleration graph - Bottom Left */}
          <div className="border border-red-300 rounded-lg overflow-hidden bg-gradient-to-b from-red-50 to-white">
            <div className="px-2 py-1 bg-red-100 border-b border-red-200 flex justify-between items-center">
              <span className="text-xs font-bold text-red-800">Accélération a(t)</span>
              <span className="text-sm font-mono font-bold text-red-700">{currentKinematics.a.toFixed(2)} m/s²</span>
            </div>
            <canvas ref={accelerationCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
          </div>

          {/* Parameters & Controls - Bottom Right */}
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gradient-to-b from-gray-50 to-white">
            <div className="px-2 py-1 bg-gray-100 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-800">Paramètres</span>
            </div>
            <div className="p-3 space-y-3">
              {/* Time slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Temps</span>
                  <span className="text-xs font-mono font-bold text-gray-800">{currentTime.toFixed(2)} s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxTime}
                  step="0.01"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 h-5"
                />
              </div>

              {/* Play controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                    isPlaying ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                  )}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Lecture'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  ↺
                </button>
                <select
                  value={maxTime}
                  onChange={(e) => { setMaxTime(parseFloat(e.target.value)); handleReset(); }}
                  className="px-2 py-1 rounded border border-gray-300 text-xs"
                >
                  {[2, 3, 5, 8, 10].map(t => (
                    <option key={t} value={t}>{t}s</option>
                  ))}
                </select>
              </div>

              {/* Motion parameters */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                {(motionType !== 'sinusoidal') && (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-green-700 mb-0.5">x₀ = {x0} m</label>
                      <input type="range" min="-5" max="5" step="0.5" value={x0}
                        onChange={(e) => { setX0(parseFloat(e.target.value)); handleReset(); }}
                        className="w-full accent-green-600 h-4" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-blue-700 mb-0.5">v₀ = {v0} m/s</label>
                      <input type="range" min="-5" max="5" step="0.5" value={v0}
                        onChange={(e) => { setV0(parseFloat(e.target.value)); handleReset(); }}
                        className="w-full accent-blue-600 h-4" />
                    </div>
                  </>
                )}
                {(motionType === 'uniformAccel' || motionType === 'custom') && (
                  <div>
                    <label className="block text-[10px] font-medium text-red-700 mb-0.5">a = {a0} m/s²</label>
                    <input type="range" min="-3" max="3" step="0.25" value={a0}
                      onChange={(e) => { setA0(parseFloat(e.target.value)); handleReset(); }}
                      className="w-full accent-red-600 h-4" />
                  </div>
                )}
                {motionType === 'sinusoidal' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-purple-700 mb-0.5">A = {amplitude} m</label>
                      <input type="range" min="1" max="5" step="0.5" value={amplitude}
                        onChange={(e) => { setAmplitude(parseFloat(e.target.value)); handleReset(); }}
                        className="w-full accent-purple-600 h-4" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-orange-700 mb-0.5">ω = {omega} rad/s</label>
                      <input type="range" min="0.5" max="5" step="0.5" value={omega}
                        onChange={(e) => { setOmega(parseFloat(e.target.value)); handleReset(); }}
                        className="w-full accent-orange-600 h-4" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Optional animation */}
        {showAnimation && (
          <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
            <canvas ref={animationCanvasRef} width={animCanvasWidth} height={animCanvasHeight} className="w-full" />
          </div>
        )}

        {/* Mathematical relations - compact display */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Derivative/Integral chain */}
            <div className="flex items-center gap-2">
              <div className="text-center px-2 py-1 bg-green-100 rounded">
                <p className="text-[10px] text-green-600">Position</p>
                <p className="text-sm font-bold text-green-700">x(t)</p>
              </div>
              <div className="text-center text-[9px]">
                <p className="text-purple-600">d/dt →</p>
                <p className="text-amber-600">← ∫dt</p>
              </div>
              <div className="text-center px-2 py-1 bg-blue-100 rounded">
                <p className="text-[10px] text-blue-600">Vitesse</p>
                <p className="text-sm font-bold text-blue-700">v(t)</p>
              </div>
              <div className="text-center text-[9px]">
                <p className="text-purple-600">d/dt →</p>
                <p className="text-amber-600">← ∫dt</p>
              </div>
              <div className="text-center px-2 py-1 bg-red-100 rounded">
                <p className="text-[10px] text-red-600">Accélération</p>
                <p className="text-sm font-bold text-red-700">a(t)</p>
              </div>
            </div>

            {/* Equations */}
            <div className="flex gap-2 text-xs">
              {motionType === 'uniform' && (
                <>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="x = x_0 + v_0 t" /></div>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="v = v_0" /></div>
                </>
              )}
              {(motionType === 'uniformAccel' || motionType === 'custom') && (
                <>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="x = x_0 + v_0 t + \frac{1}{2}at^2" /></div>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="v = v_0 + at" /></div>
                </>
              )}
              {motionType === 'sinusoidal' && (
                <>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="x = A\sin(\omega t)" /></div>
                  <div className="bg-white px-2 py-1 rounded border"><InlineMath math="v = A\omega\cos(\omega t)" /></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KinematicsGraphSimulator;
