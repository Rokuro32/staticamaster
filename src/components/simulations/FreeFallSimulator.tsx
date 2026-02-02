'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

interface GravityPreset {
  id: string;
  name: string;
  value: number;
  emoji: string;
}

const GRAVITY_PRESETS: GravityPreset[] = [
  { id: 'earth', name: 'Terre', value: 9.81, emoji: '🌍' },
  { id: 'moon', name: 'Lune', value: 1.62, emoji: '🌙' },
  { id: 'mars', name: 'Mars', value: 3.72, emoji: '🔴' },
  { id: 'jupiter', name: 'Jupiter', value: 24.79, emoji: '🟠' },
  { id: 'custom', name: 'Personnalisé', value: 9.81, emoji: '⚙️' },
];

export function FreeFallSimulator() {
  // Initial conditions
  const [y0, setY0] = useState(50); // Initial height in meters
  const [v0, setV0] = useState(0); // Initial velocity (positive = upward)
  const [gravityPreset, setGravityPreset] = useState('earth');
  const [customGravity, setCustomGravity] = useState(9.81);

  // Time settings
  const [maxTime, setMaxTime] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // Animation
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const positionCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const accelerationCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas sizes
  const canvasWidth = 400;
  const canvasHeight = 140;
  const animCanvasWidth = 200;
  const animCanvasHeight = 400;

  // Get current gravity value
  const g = gravityPreset === 'custom'
    ? customGravity
    : GRAVITY_PRESETS.find(p => p.id === gravityPreset)?.value || 9.81;

  // Calculate time when object hits ground (y = 0)
  const getGroundTime = useCallback(() => {
    // y = y0 + v0*t - 0.5*g*t² = 0
    // 0.5*g*t² - v0*t - y0 = 0
    // t = (v0 + sqrt(v0² + 2*g*y0)) / g
    const discriminant = v0 * v0 + 2 * g * y0;
    if (discriminant < 0) return maxTime;
    return (v0 + Math.sqrt(discriminant)) / g;
  }, [v0, y0, g, maxTime]);

  // Calculate position, velocity, acceleration at time t
  const getKinematics = useCallback((t: number) => {
    const groundTime = getGroundTime();
    const effectiveTime = Math.min(t, groundTime);

    // y = y0 + v0*t - 0.5*g*t²
    const y = y0 + v0 * effectiveTime - 0.5 * g * effectiveTime * effectiveTime;
    // v = v0 - g*t
    const v = v0 - g * effectiveTime;
    // a = -g (constant)
    const a = -g;

    return {
      y: Math.max(0, y),
      v: t >= groundTime ? 0 : v,
      a: t >= groundTime ? 0 : a
    };
  }, [y0, v0, g, getGroundTime]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        setCurrentTime(prev => {
          const groundTime = getGroundTime();
          const effectiveMaxTime = Math.min(maxTime, groundTime + 0.5);
          const newTime = prev + dt;
          if (newTime >= effectiveMaxTime) {
            setIsPlaying(false);
            return effectiveMaxTime;
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
  }, [isPlaying, maxTime, getGroundTime]);

  // Draw a graph
  const drawGraph = useCallback((
    canvas: HTMLCanvasElement | null,
    getValue: (t: number) => number,
    color: string,
    bgColor: string,
    label: string,
    unit: string
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 50, right: 20, top: 25, bottom: 30 };
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
    const groundTime = getGroundTime();
    const effectiveMaxTime = Math.min(maxTime, groundTime + 0.5);

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * effectiveMaxTime;
      const val = getValue(t);
      values.push(val);
      minY = Math.min(minY, val);
      maxY = Math.max(maxY, val);
    }

    const yPadding = (maxY - minY) * 0.15 || 1;
    minY -= yPadding;
    maxY += yPadding;

    const toCanvasX = (t: number) => padding.left + (t / effectiveMaxTime) * graphWidth;
    const toCanvasY = (y: number) => padding.top + graphHeight - ((y - minY) / (maxY - minY)) * graphHeight;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    const numYLines = 5;
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

    const numXLines = 8;
    for (let i = 0; i <= numXLines; i++) {
      const t = (i / numXLines) * effectiveMaxTime;
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

    // Ground time vertical line
    if (groundTime < effectiveMaxTime) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(groundTime), padding.top);
      ctx.lineTo(toCanvasX(groundTime), canvasHeight - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('impact', toCanvasX(groundTime), padding.top - 5);
    }

    // Main curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * effectiveMaxTime;
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
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current value box
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const boxWidth = 75;
    const boxHeight = 22;
    const boxX = Math.min(markerX + 10, canvasWidth - padding.right - boxWidth - 5);
    const boxY = Math.max(markerY - 28, padding.top + 3);
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentVal.toFixed(2)} ${unit}`, boxX + boxWidth / 2, boxY + 15);

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}(t)`, 8, 18);

    // Axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', canvasWidth / 2, canvasHeight - 5);

    ctx.save();
    ctx.translate(12, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${label} (${unit})`, 0, 0);
    ctx.restore();
  }, [maxTime, currentTime, canvasWidth, canvasHeight, getGroundTime]);

  // Draw falling object animation
  const drawAnimation = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { y, v } = getKinematics(currentTime);
    const groundTime = getGroundTime();

    // Background gradient (sky)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, animCanvasHeight);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.7, '#B0E0E6');
    skyGradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, animCanvasWidth, animCanvasHeight);

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, animCanvasHeight - 30, animCanvasWidth, 30);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, animCanvasHeight - 35, animCanvasWidth, 8);

    // Calculate scale (max height determines scale)
    const maxHeight = Math.max(y0, y0 + v0 * v0 / (2 * g) + 5);
    const padding = 50;
    const drawHeight = animCanvasHeight - padding - 35;
    const scale = drawHeight / maxHeight;

    // Height ruler
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    const rulerX = 25;
    ctx.beginPath();
    ctx.moveTo(rulerX, padding);
    ctx.lineTo(rulerX, animCanvasHeight - 35);
    ctx.stroke();

    // Ruler marks
    ctx.fillStyle = '#666';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    const numMarks = 5;
    for (let i = 0; i <= numMarks; i++) {
      const h = (i / numMarks) * maxHeight;
      const yPos = animCanvasHeight - 35 - h * scale;
      ctx.beginPath();
      ctx.moveTo(rulerX - 5, yPos);
      ctx.lineTo(rulerX, yPos);
      ctx.stroke();
      ctx.fillText(`${h.toFixed(0)}m`, rulerX - 8, yPos + 3);
    }

    // Initial height marker
    const y0Pos = animCanvasHeight - 35 - y0 * scale;
    ctx.strokeStyle = '#16a34a';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rulerX, y0Pos);
    ctx.lineTo(animCanvasWidth - 20, y0Pos);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#16a34a';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('y₀', animCanvasWidth - 18, y0Pos + 4);

    // Trajectory trail
    if (showTrajectory && currentTime > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const numTrailPoints = 50;
      for (let i = 0; i <= numTrailPoints; i++) {
        const t = (i / numTrailPoints) * currentTime;
        const { y: trailY } = getKinematics(t);
        const trailYPos = animCanvasHeight - 35 - trailY * scale;
        const trailXPos = animCanvasWidth / 2;
        if (i === 0) ctx.moveTo(trailXPos, trailYPos);
        else ctx.lineTo(trailXPos, trailYPos);
      }
      ctx.stroke();
    }

    // Current object position
    const objX = animCanvasWidth / 2;
    const objY = animCanvasHeight - 35 - y * scale;
    const ballRadius = 15;

    // Velocity arrow
    if (Math.abs(v) > 0.5 && currentTime < groundTime) {
      const arrowScale = 2;
      const arrowLen = Math.min(Math.abs(v) * arrowScale, 60);
      const arrowDir = v > 0 ? -1 : 1; // Up is negative in canvas coords

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX, objY + arrowLen * arrowDir);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      const headY = objY + arrowLen * arrowDir;
      ctx.moveTo(objX, headY);
      ctx.lineTo(objX - 6, headY - 8 * arrowDir);
      ctx.lineTo(objX + 6, headY - 8 * arrowDir);
      ctx.closePath();
      ctx.fill();

      // Velocity label
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`v = ${v.toFixed(1)} m/s`, objX + 20, objY + arrowLen * arrowDir / 2);
    }

    // Ball with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const ballGradient = ctx.createRadialGradient(
      objX - 5, objY - 5, 0,
      objX, objY, ballRadius
    );
    ballGradient.addColorStop(0, '#ef4444');
    ballGradient.addColorStop(0.7, '#dc2626');
    ballGradient.addColorStop(1, '#991b1b');

    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(objX, objY, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Highlight on ball
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(objX - 5, objY - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Current height display
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(5, 5, 100, 55);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, 100, 55);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)} s`, 12, 22);
    ctx.fillStyle = '#16a34a';
    ctx.fillText(`y = ${y.toFixed(2)} m`, 12, 38);
    ctx.fillStyle = '#2563eb';
    ctx.fillText(`v = ${v.toFixed(2)} m/s`, 12, 54);

    // Impact message
    if (currentTime >= groundTime) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💥 IMPACT!', animCanvasWidth / 2, animCanvasHeight - 50);
    }
  }, [currentTime, getKinematics, y0, v0, g, showTrajectory, getGroundTime]);

  // Draw all
  useEffect(() => {
    drawGraph(positionCanvasRef.current, (t) => getKinematics(t).y, '#16a34a', '#f0fdf4', 'y', 'm');
    drawGraph(velocityCanvasRef.current, (t) => getKinematics(t).v, '#2563eb', '#eff6ff', 'v', 'm/s');
    drawGraph(accelerationCanvasRef.current, (t) => getKinematics(t).a, '#dc2626', '#fef2f2', 'a', 'm/s²');
    drawAnimation();
  }, [drawGraph, drawAnimation, getKinematics]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const currentKinematics = getKinematics(currentTime);
  const groundTime = getGroundTime();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⬇️</span>
            <h3 className="font-bold text-gray-800">Simulation de Chute Libre</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GRAVITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => { setGravityPreset(preset.id); handleReset(); }}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                  gravityPreset === preset.id
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                )}
              >
                <span>{preset.emoji}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Étudiez la chute libre et observez l'évolution de la position, de la vitesse et de l'accélération.
          <span className="ml-2 font-medium">g = {g.toFixed(2)} m/s²</span>
        </p>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {/* Left side: Animation */}
          <div className="flex-shrink-0">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={animationCanvasRef}
                width={animCanvasWidth}
                height={animCanvasHeight}
              />
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer justify-center">
              <input
                type="checkbox"
                checked={showTrajectory}
                onChange={(e) => setShowTrajectory(e.target.checked)}
                className="w-3.5 h-3.5 accent-orange-500"
              />
              Afficher la trajectoire
            </label>
          </div>

          {/* Right side: Graphs and controls */}
          <div className="flex-1 space-y-3">
            {/* Graphs */}
            <div className="grid grid-cols-1 gap-2">
              {/* Position graph */}
              <div className="border border-green-300 rounded-lg overflow-hidden bg-gradient-to-b from-green-50 to-white">
                <div className="px-2 py-1 bg-green-100 border-b border-green-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-green-800">Hauteur y(t)</span>
                  <span className="text-sm font-mono font-bold text-green-700">{currentKinematics.y.toFixed(2)} m</span>
                </div>
                <canvas ref={positionCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
              </div>

              {/* Velocity graph */}
              <div className="border border-blue-300 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50 to-white">
                <div className="px-2 py-1 bg-blue-100 border-b border-blue-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-800">Vitesse v(t)</span>
                  <span className="text-sm font-mono font-bold text-blue-700">{currentKinematics.v.toFixed(2)} m/s</span>
                </div>
                <canvas ref={velocityCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
              </div>

              {/* Acceleration graph */}
              <div className="border border-red-300 rounded-lg overflow-hidden bg-gradient-to-b from-red-50 to-white">
                <div className="px-2 py-1 bg-red-100 border-b border-red-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-red-800">Accélération a(t)</span>
                  <span className="text-sm font-mono font-bold text-red-700">{currentKinematics.a.toFixed(2)} m/s²</span>
                </div>
                <canvas ref={accelerationCanvasRef} width={canvasWidth} height={canvasHeight} className="w-full" />
              </div>
            </div>

            {/* Controls */}
            <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Time controls */}
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Temps</span>
                      <span className="text-xs font-mono font-bold text-gray-800">
                        {currentTime.toFixed(2)} s
                        {groundTime < maxTime && (
                          <span className="text-red-500 ml-1">(impact: {groundTime.toFixed(2)}s)</span>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.min(maxTime, groundTime + 0.5)}
                      step="0.01"
                      value={currentTime}
                      onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 h-5"
                    />
                  </div>

                  {/* Play controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={cn(
                        "flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                        isPlaying ? "bg-amber-500 text-white" : "bg-orange-500 text-white"
                      )}
                    >
                      {isPlaying ? '⏸ Pause' : '▶ Lecture'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      ↺ Reset
                    </button>
                    <select
                      value={maxTime}
                      onChange={(e) => { setMaxTime(parseFloat(e.target.value)); handleReset(); }}
                      className="px-2 py-1 rounded border border-gray-300 text-xs"
                    >
                      {[3, 5, 8, 10, 15].map(t => (
                        <option key={t} value={t}>{t}s max</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right: Parameters */}
                <div className="space-y-2 border-l border-gray-200 pl-4">
                  <div>
                    <label className="block text-[10px] font-medium text-green-700 mb-0.5">
                      Hauteur initiale y₀ = {y0} m
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={y0}
                      onChange={(e) => { setY0(parseFloat(e.target.value)); handleReset(); }}
                      className="w-full accent-green-600 h-4"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-blue-700 mb-0.5">
                      Vitesse initiale v₀ = {v0} m/s <span className="text-gray-500">(+ = vers le haut)</span>
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={v0}
                      onChange={(e) => { setV0(parseFloat(e.target.value)); handleReset(); }}
                      className="w-full accent-blue-600 h-4"
                    />
                  </div>
                  {gravityPreset === 'custom' && (
                    <div>
                      <label className="block text-[10px] font-medium text-red-700 mb-0.5">
                        Gravité g = {customGravity} m/s²
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.5"
                        value={customGravity}
                        onChange={(e) => { setCustomGravity(parseFloat(e.target.value)); handleReset(); }}
                        className="w-full accent-red-600 h-4"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mathematical formulas */}
        <div className="mt-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Équations de la chute libre</h4>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="bg-white px-3 py-2 rounded border shadow-sm">
              <InlineMath math="y(t) = y_0 + v_0 t - \frac{1}{2}gt^2" />
            </div>
            <div className="bg-white px-3 py-2 rounded border shadow-sm">
              <InlineMath math="v(t) = v_0 - gt" />
            </div>
            <div className="bg-white px-3 py-2 rounded border shadow-sm">
              <InlineMath math="a = -g" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Position y(t) - parabole</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>Vitesse v(t) - droite décroissante</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span>Accélération a - constante (-g)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreeFallSimulator;
