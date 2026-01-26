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
  const [x0, setX0] = useState(0); // Initial position (m)
  const [v0, setV0] = useState(2); // Initial velocity (m/s)
  const [a0, setA0] = useState(1); // Acceleration (m/s²)
  const [omega, setOmega] = useState(2); // Angular frequency for sinusoidal (rad/s)
  const [amplitude, setAmplitude] = useState(3); // Amplitude for sinusoidal (m)

  // Time settings
  const [maxTime, setMaxTime] = useState(5); // seconds
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Animation
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const positionCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const accelerationCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasWidth = 380;
  const canvasHeight = 180;
  const animCanvasWidth = 380;
  const animCanvasHeight = 120;

  // Calculate position, velocity, acceleration at time t
  const getKinematics = useCallback((t: number) => {
    switch (motionType) {
      case 'uniform':
        return {
          x: x0 + v0 * t,
          v: v0,
          a: 0,
        };
      case 'uniformAccel':
        return {
          x: x0 + v0 * t + 0.5 * a0 * t * t,
          v: v0 + a0 * t,
          a: a0,
        };
      case 'sinusoidal':
        return {
          x: amplitude * Math.sin(omega * t),
          v: amplitude * omega * Math.cos(omega * t),
          a: -amplitude * omega * omega * Math.sin(omega * t),
        };
      case 'custom':
        return {
          x: x0 + v0 * t + 0.5 * a0 * t * t,
          v: v0 + a0 * t,
          a: a0,
        };
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, maxTime]);

  // Draw a single graph
  const drawGraph = useCallback((
    canvas: HTMLCanvasElement | null,
    getValue: (t: number) => number,
    color: string,
    label: string,
    unit: string,
    yRange?: { min: number; max: number }
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 50, right: 20, top: 25, bottom: 35 };
    const graphWidth = canvasWidth - padding.left - padding.right;
    const graphHeight = canvasHeight - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate y range if not provided
    let minY = Infinity;
    let maxY = -Infinity;
    const numPoints = 200;
    const values: number[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * maxTime;
      const val = getValue(t);
      values.push(val);
      minY = Math.min(minY, val);
      maxY = Math.max(maxY, val);
    }

    if (yRange) {
      minY = yRange.min;
      maxY = yRange.max;
    }

    // Add padding to y range
    const yPadding = (maxY - minY) * 0.1 || 1;
    minY -= yPadding;
    maxY += yPadding;

    // Coordinate transforms
    const toCanvasX = (t: number) => padding.left + (t / maxTime) * graphWidth;
    const toCanvasY = (y: number) => padding.top + graphHeight - ((y - minY) / (maxY - minY)) * graphHeight;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const numYLines = 5;
    for (let i = 0; i <= numYLines; i++) {
      const y = minY + (i / numYLines) * (maxY - minY);
      const canvasY = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left, canvasY);
      ctx.lineTo(canvasWidth - padding.right, canvasY);
      ctx.stroke();

      // Y axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(y.toFixed(1), padding.left - 5, canvasY + 3);
    }

    // Vertical grid lines
    const numXLines = 5;
    for (let i = 0; i <= numXLines; i++) {
      const t = (i / numXLines) * maxTime;
      const canvasX = toCanvasX(t);
      ctx.beginPath();
      ctx.moveTo(canvasX, padding.top);
      ctx.lineTo(canvasX, canvasHeight - padding.bottom);
      ctx.stroke();

      // X axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t.toFixed(1) + 's', canvasX, canvasHeight - padding.bottom + 15);
    }

    // Zero line if in range
    if (minY < 0 && maxY > 0) {
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, toCanvasY(0));
      ctx.lineTo(canvasWidth - padding.right, toCanvasY(0));
      ctx.stroke();
    }

    // Draw curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * maxTime;
      const x = toCanvasX(t);
      const y = toCanvasY(values[i]);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw current time marker
    const currentVal = getValue(currentTime);
    const markerX = toCanvasX(currentTime);
    const markerY = toCanvasY(currentVal);

    // Vertical line at current time
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(markerX, padding.top);
    ctx.lineTo(markerX, canvasHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point marker
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current value display
    ctx.fillStyle = color;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${currentVal.toFixed(2)} ${unit}`, markerX + 10, markerY - 8);

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}(t)`, 10, 18);

    // Axes labels
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', canvasWidth / 2, canvasHeight - 5);

    ctx.save();
    ctx.translate(12, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${label} (${unit})`, 0, 0);
    ctx.restore();
  }, [maxTime, currentTime]);

  // Draw animation canvas (moving object)
  const drawAnimation = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x } = getKinematics(currentTime);

    // Clear
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(0, 0, animCanvasWidth, animCanvasHeight);

    // Calculate visible range based on motion
    let minX = 0;
    let maxX = 10;

    // Sample positions to find range
    for (let t = 0; t <= maxTime; t += 0.1) {
      const { x: pos } = getKinematics(t);
      minX = Math.min(minX, pos);
      maxX = Math.max(maxX, pos);
    }

    // Add padding
    const xPadding = (maxX - minX) * 0.1 || 2;
    minX -= xPadding;
    maxX += xPadding;

    const padding = 40;
    const trackWidth = animCanvasWidth - 2 * padding;

    const toCanvasX = (pos: number) => padding + ((pos - minX) / (maxX - minX)) * trackWidth;

    // Draw track
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(padding, animCanvasHeight / 2 - 3, trackWidth, 6);

    // Draw scale marks
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';

    const numMarks = 5;
    for (let i = 0; i <= numMarks; i++) {
      const pos = minX + (i / numMarks) * (maxX - minX);
      const cx = toCanvasX(pos);
      ctx.fillRect(cx - 1, animCanvasHeight / 2 - 8, 2, 16);
      ctx.fillText(pos.toFixed(1) + 'm', cx, animCanvasHeight / 2 + 25);
    }

    // Draw zero mark if in range
    if (minX < 0 && maxX > 0) {
      const zeroX = toCanvasX(0);
      ctx.fillStyle = '#374151';
      ctx.fillRect(zeroX - 2, animCanvasHeight / 2 - 12, 4, 24);
      ctx.fillText('0', zeroX, animCanvasHeight / 2 + 35);
    }

    // Draw object
    const objX = toCanvasX(x);
    const objY = animCanvasHeight / 2 - 20;

    // Velocity arrow
    const { v } = getKinematics(currentTime);
    const arrowScale = 15;
    const arrowLength = Math.min(Math.abs(v) * arrowScale, 60);

    if (Math.abs(v) > 0.1) {
      const arrowDir = v > 0 ? 1 : -1;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX + arrowDir * arrowLength, objY);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(objX + arrowDir * arrowLength, objY);
      ctx.lineTo(objX + arrowDir * (arrowLength - 10), objY - 6);
      ctx.lineTo(objX + arrowDir * (arrowLength - 10), objY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.font = '10px system-ui';
      ctx.fillText('v', objX + arrowDir * arrowLength / 2, objY - 12);
    }

    // Object (circle)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(objX, objY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Position label
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`x = ${x.toFixed(2)} m`, objX, objY - 30);

    // Time display
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)} s`, 10, 20);
  }, [currentTime, getKinematics, maxTime]);

  // Draw all graphs
  useEffect(() => {
    const { a } = getKinematics(0);

    // Calculate ranges
    let xMin = Infinity, xMax = -Infinity;
    let vMin = Infinity, vMax = -Infinity;
    let aMin = Infinity, aMax = -Infinity;

    for (let t = 0; t <= maxTime; t += 0.05) {
      const k = getKinematics(t);
      xMin = Math.min(xMin, k.x); xMax = Math.max(xMax, k.x);
      vMin = Math.min(vMin, k.v); vMax = Math.max(vMax, k.v);
      aMin = Math.min(aMin, k.a); aMax = Math.max(aMax, k.a);
    }

    drawGraph(
      positionCanvasRef.current,
      (t) => getKinematics(t).x,
      '#16a34a',
      'x',
      'm',
      { min: xMin - 0.5, max: xMax + 0.5 }
    );

    drawGraph(
      velocityCanvasRef.current,
      (t) => getKinematics(t).v,
      '#2563eb',
      'v',
      'm/s',
      { min: vMin - 0.5, max: vMax + 0.5 }
    );

    drawGraph(
      accelerationCanvasRef.current,
      (t) => getKinematics(t).a,
      '#dc2626',
      'a',
      'm/s²',
      { min: aMin - 0.5, max: aMax + 0.5 }
    );

    drawAnimation();
  }, [drawGraph, drawAnimation, getKinematics, maxTime]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const currentKinematics = getKinematics(currentTime);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header - Motion type selector */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {MOTION_TYPES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMotionType(m.id);
                handleReset();
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                motionType === m.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {MOTION_TYPES.find(m => m.id === motionType)?.description}
        </p>
      </div>

      <div className="p-6">
        {/* Animation and Controls */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 mb-6">
          {/* Animation */}
          <div className="space-y-4">
            <div className="border-2 border-emerald-200 rounded-lg overflow-hidden">
              <canvas
                ref={animationCanvasRef}
                width={animCanvasWidth}
                height={animCanvasHeight}
                className="w-full"
              />
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "px-6 py-2 rounded-lg font-semibold transition-colors",
                  isPlaying
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                )}
              >
                {isPlaying ? 'Pause' : 'Lecture'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Reset
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={maxTime}
                  step="0.01"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <span className="text-sm font-mono text-gray-600 w-16">
                {currentTime.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            {(motionType === 'uniform' || motionType === 'uniformAccel' || motionType === 'custom') && (
              <>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Position initiale x₀: {x0} m
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={x0}
                    onChange={(e) => { setX0(parseFloat(e.target.value)); handleReset(); }}
                    className="w-full accent-green-600"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Vitesse initiale v₀: {v0} m/s
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={v0}
                    onChange={(e) => { setV0(parseFloat(e.target.value)); handleReset(); }}
                    className="w-full accent-blue-600"
                  />
                </div>
              </>
            )}

            {(motionType === 'uniformAccel' || motionType === 'custom') && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Accélération a: {a0} m/s²
                </label>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.25"
                  value={a0}
                  onChange={(e) => { setA0(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-red-600"
                />
              </div>
            )}

            {motionType === 'sinusoidal' && (
              <>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <label className="block text-sm font-medium text-purple-700 mb-1">
                    Amplitude A: {amplitude} m
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={amplitude}
                    onChange={(e) => { setAmplitude(parseFloat(e.target.value)); handleReset(); }}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="block text-sm font-medium text-orange-700 mb-1">
                    Fréquence angulaire ω: {omega} rad/s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={omega}
                    onChange={(e) => { setOmega(parseFloat(e.target.value)); handleReset(); }}
                    className="w-full accent-orange-600"
                  />
                </div>
              </>
            )}

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée totale: {maxTime} s
              </label>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={maxTime}
                onChange={(e) => { setMaxTime(parseFloat(e.target.value)); handleReset(); }}
                className="w-full accent-gray-600"
              />
            </div>

            {/* Current values */}
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
              <h4 className="font-semibold text-slate-700 mb-2 text-sm">Valeurs actuelles</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-100 rounded">
                  <p className="text-xs text-green-600">Position</p>
                  <p className="font-mono font-bold text-green-700">{currentKinematics.x.toFixed(2)}</p>
                  <p className="text-xs text-green-600">m</p>
                </div>
                <div className="p-2 bg-blue-100 rounded">
                  <p className="text-xs text-blue-600">Vitesse</p>
                  <p className="font-mono font-bold text-blue-700">{currentKinematics.v.toFixed(2)}</p>
                  <p className="text-xs text-blue-600">m/s</p>
                </div>
                <div className="p-2 bg-red-100 rounded">
                  <p className="text-xs text-red-600">Accélération</p>
                  <p className="font-mono font-bold text-red-700">{currentKinematics.a.toFixed(2)}</p>
                  <p className="text-xs text-red-600">m/s²</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphs */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="border-2 border-green-200 rounded-lg overflow-hidden">
            <canvas
              ref={positionCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full"
            />
          </div>
          <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
            <canvas
              ref={velocityCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full"
            />
          </div>
          <div className="border-2 border-red-200 rounded-lg overflow-hidden">
            <canvas
              ref={accelerationCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full"
            />
          </div>
        </div>

        {/* Relations */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Relations mathématiques</h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Derivatives */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <span className="text-lg">↓</span> Dérivation (pente du graphique)
              </h4>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600 mb-1">Vitesse = dérivée de la position:</p>
                <BlockMath math="v(t) = \frac{dx}{dt}" />
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600 mb-1">Accélération = dérivée de la vitesse:</p>
                <BlockMath math="a(t) = \frac{dv}{dt} = \frac{d^2x}{dt^2}" />
              </div>
            </div>

            {/* Integrals */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <span className="text-lg">↑</span> Intégration (aire sous la courbe)
              </h4>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600 mb-1">Vitesse = intégrale de l'accélération:</p>
                <BlockMath math="v(t) = v_0 + \int_0^t a(\tau) d\tau" />
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600 mb-1">Position = intégrale de la vitesse:</p>
                <BlockMath math="x(t) = x_0 + \int_0^t v(\tau) d\tau" />
              </div>
            </div>
          </div>

          {/* Motion-specific equations */}
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="font-semibold text-emerald-800 mb-3">
              Équations pour: {MOTION_TYPES.find(m => m.id === motionType)?.name}
            </h4>

            {motionType === 'uniform' && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Position</p>
                  <BlockMath math="x(t) = x_0 + vt" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Vitesse</p>
                  <BlockMath math="v(t) = v_0 = \text{const}" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Accélération</p>
                  <BlockMath math="a(t) = 0" />
                </div>
              </div>
            )}

            {(motionType === 'uniformAccel' || motionType === 'custom') && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Position</p>
                  <BlockMath math="x(t) = x_0 + v_0 t + \frac{1}{2}at^2" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Vitesse</p>
                  <BlockMath math="v(t) = v_0 + at" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Accélération</p>
                  <BlockMath math="a(t) = a = \text{const}" />
                </div>
              </div>
            )}

            {motionType === 'sinusoidal' && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Position</p>
                  <BlockMath math="x(t) = A\sin(\omega t)" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Vitesse</p>
                  <BlockMath math="v(t) = A\omega\cos(\omega t)" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 mb-1">Accélération</p>
                  <BlockMath math="a(t) = -A\omega^2\sin(\omega t)" />
                </div>
              </div>
            )}
          </div>

          {/* Graphical interpretation */}
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">Graphique x(t)</p>
              <p className="text-xs text-green-600 mt-1">
                La <strong>pente</strong> à chaque instant donne la vitesse v(t)
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Graphique v(t)</p>
              <p className="text-xs text-blue-600 mt-1">
                La <strong>pente</strong> donne a(t), l'<strong>aire</strong> donne Δx
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">Graphique a(t)</p>
              <p className="text-xs text-red-600 mt-1">
                L'<strong>aire</strong> sous la courbe donne Δv
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KinematicsGraphSimulator;
