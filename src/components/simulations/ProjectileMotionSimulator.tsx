'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

type MotionMode = 'projectile' | 'circular' | 'custom2d';

interface MotionConfig {
  id: MotionMode;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

const MOTION_MODES: MotionConfig[] = [
  { id: 'projectile', name: 'Projectile', description: 'Mouvement balistique: MRU horizontal + MRUA vertical (chute libre)', emoji: '🎯', color: 'emerald' },
  { id: 'circular', name: 'Circulaire', description: 'Mouvement circulaire uniforme: vitesse tangentielle constante', emoji: '🔄', color: 'blue' },
  { id: 'custom2d', name: 'Combiné 2D', description: 'Définissez vos propres accélérations ax et ay', emoji: '🎮', color: 'purple' },
];

export function ProjectileMotionSimulator() {
  const [mode, setMode] = useState<MotionMode>('projectile');

  // Projectile parameters
  const [v0, setV0] = useState(20); // Initial velocity (m/s)
  const [angle, setAngle] = useState(45); // Launch angle (degrees)
  const [y0, setY0] = useState(0); // Initial height (m)
  const [g, setG] = useState(9.81); // Gravity (m/s²)

  // Circular motion parameters
  const [radius, setRadius] = useState(5); // Radius (m)
  const [omega, setOmega] = useState(1); // Angular velocity (rad/s)
  const [showCentripetal, setShowCentripetal] = useState(true);

  // Custom 2D parameters
  const [customVx0, setCustomVx0] = useState(5);
  const [customVy0, setCustomVy0] = useState(10);
  const [customAx, setCustomAx] = useState(0);
  const [customAy, setCustomAy] = useState(-9.81);

  // Display options
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showAccelerationVector, setShowAccelerationVector] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Animation
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(5);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const trajectoryCanvasRef = useRef<HTMLCanvasElement>(null);
  const xGraphCanvasRef = useRef<HTMLCanvasElement>(null);
  const yGraphCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas dimensions
  const trajCanvasWidth = 500;
  const trajCanvasHeight = 350;
  const graphCanvasWidth = 240;
  const graphCanvasHeight = 120;

  // Calculate kinematics based on mode
  const getKinematics = useCallback((t: number) => {
    switch (mode) {
      case 'projectile': {
        const angleRad = angle * Math.PI / 180;
        const vx0 = v0 * Math.cos(angleRad);
        const vy0 = v0 * Math.sin(angleRad);

        const x = vx0 * t;
        const y = y0 + vy0 * t - 0.5 * g * t * t;
        const vx = vx0;
        const vy = vy0 - g * t;
        const ax = 0;
        const ay = -g;

        return { x, y, vx, vy, ax, ay };
      }
      case 'circular': {
        const x = radius * Math.cos(omega * t);
        const y = radius * Math.sin(omega * t);
        const vx = -radius * omega * Math.sin(omega * t);
        const vy = radius * omega * Math.cos(omega * t);
        const ax = -radius * omega * omega * Math.cos(omega * t);
        const ay = -radius * omega * omega * Math.sin(omega * t);

        return { x, y, vx, vy, ax, ay };
      }
      case 'custom2d': {
        const x = customVx0 * t + 0.5 * customAx * t * t;
        const y = customVy0 * t + 0.5 * customAy * t * t;
        const vx = customVx0 + customAx * t;
        const vy = customVy0 + customAy * t;

        return { x, y, vx, vy, ax: customAx, ay: customAy };
      }
      default:
        return { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    }
  }, [mode, v0, angle, y0, g, radius, omega, customVx0, customVy0, customAx, customAy]);

  // Calculate flight time for projectile
  const getFlightTime = useCallback(() => {
    if (mode !== 'projectile') return maxTime;
    const angleRad = angle * Math.PI / 180;
    const vy0 = v0 * Math.sin(angleRad);
    const discriminant = vy0 * vy0 + 2 * g * y0;
    if (discriminant < 0) return maxTime;
    return (vy0 + Math.sqrt(discriminant)) / g;
  }, [mode, v0, angle, y0, g, maxTime]);

  // Get effective max time
  const getEffectiveMaxTime = useCallback(() => {
    if (mode === 'projectile') {
      return Math.min(maxTime, getFlightTime() + 0.2);
    }
    if (mode === 'custom2d') {
      // Check if it goes below ground
      for (let t = 0; t <= maxTime; t += 0.01) {
        const { y } = getKinematics(t);
        if (y < -5) return t;
      }
    }
    return maxTime;
  }, [mode, maxTime, getFlightTime, getKinematics]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        setCurrentTime(prev => {
          const effectiveMax = getEffectiveMaxTime();
          const newTime = prev + dt;
          if (newTime >= effectiveMax) {
            setIsPlaying(false);
            return effectiveMax;
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
  }, [isPlaying, getEffectiveMaxTime]);

  // Draw trajectory canvas
  const drawTrajectory = useCallback(() => {
    const canvas = trajectoryCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const effectiveMax = getEffectiveMaxTime();

    // Calculate bounds
    let minX = 0, maxX = 10, minY = -1, maxY = 10;
    for (let t = 0; t <= effectiveMax; t += 0.02) {
      const { x, y } = getKinematics(t);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    // Add padding
    const xPad = (maxX - minX) * 0.1 || 2;
    const yPad = (maxY - minY) * 0.1 || 2;
    minX -= xPad; maxX += xPad;
    minY -= yPad; maxY += yPad;

    // For circular, center the view
    if (mode === 'circular') {
      const r = radius * 1.5;
      minX = -r; maxX = r; minY = -r; maxY = r;
    }

    const padding = { left: 50, right: 20, top: 20, bottom: 40 };
    const plotWidth = trajCanvasWidth - padding.left - padding.right;
    const plotHeight = trajCanvasHeight - padding.top - padding.bottom;

    const toCanvasX = (x: number) => padding.left + ((x - minX) / (maxX - minX)) * plotWidth;
    const toCanvasY = (y: number) => trajCanvasHeight - padding.bottom - ((y - minY) / (maxY - minY)) * plotHeight;

    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, trajCanvasHeight);
    gradient.addColorStop(0, '#f0efee');
    gradient.addColorStop(0.7, '#f8f8f7');
    gradient.addColorStop(1, '#edeceb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, trajCanvasWidth, trajCanvasHeight);

    // Ground line
    if (minY <= 0 && maxY >= 0) {
      const groundY = toCanvasY(0);
      ctx.fillStyle = '#becc83';
      ctx.fillRect(0, groundY, trajCanvasWidth, trajCanvasHeight - groundY);
      ctx.strokeStyle = '#4d5724';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(trajCanvasWidth, groundY);
      ctx.stroke();
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(171, 166, 161, 0.3)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      const xStep = (maxX - minX) / 8;
      for (let x = Math.ceil(minX / xStep) * xStep; x <= maxX; x += xStep) {
        const cx = toCanvasX(x);
        ctx.beginPath();
        ctx.moveTo(cx, padding.top);
        ctx.lineTo(cx, trajCanvasHeight - padding.bottom);
        ctx.stroke();

        ctx.fillStyle = '#7e7871';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(x.toFixed(1), cx, trajCanvasHeight - padding.bottom + 15);
      }

      // Horizontal grid lines
      const yStep = (maxY - minY) / 6;
      for (let y = Math.ceil(minY / yStep) * yStep; y <= maxY; y += yStep) {
        const cy = toCanvasY(y);
        ctx.beginPath();
        ctx.moveTo(padding.left, cy);
        ctx.lineTo(trajCanvasWidth - padding.right, cy);
        ctx.stroke();

        ctx.fillStyle = '#7e7871';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(y.toFixed(1), padding.left - 5, cy + 4);
      }
    }

    // Trajectory path
    if (showTrajectory) {
      ctx.strokeStyle = mode === 'circular' ? '#c29851' : '#b57b98';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();

      for (let t = 0; t <= effectiveMax; t += 0.02) {
        const { x, y } = getKinematics(t);
        const cx = toCanvasX(x);
        const cy = toCanvasY(y);
        if (t === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Current position
    const current = getKinematics(currentTime);
    const objX = toCanvasX(current.x);
    const objY = toCanvasY(current.y);

    // Velocity components (dashed lines)
    if (showComponents) {
      // X component
      ctx.strokeStyle = '#91a443';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX + current.vx * 3, objY);
      ctx.stroke();

      // Y component
      ctx.strokeStyle = '#ca684a';
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX, objY - current.vy * 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Velocity vector
    if (showVelocityVector) {
      const vMag = Math.sqrt(current.vx * current.vx + current.vy * current.vy);
      const vScale = 3;
      const vEndX = objX + current.vx * vScale;
      const vEndY = objY - current.vy * vScale;

      ctx.strokeStyle = '#c1974f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(vEndX, vEndY);
      ctx.stroke();

      // Arrow head
      if (vMag > 0.5) {
        const vAngle = Math.atan2(-current.vy, current.vx);
        ctx.fillStyle = '#c1974f';
        ctx.beginPath();
        ctx.moveTo(vEndX, vEndY);
        ctx.lineTo(vEndX - 10 * Math.cos(vAngle - 0.3), vEndY - 10 * Math.sin(vAngle - 0.3));
        ctx.lineTo(vEndX - 10 * Math.cos(vAngle + 0.3), vEndY - 10 * Math.sin(vAngle + 0.3));
        ctx.closePath();
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#c1974f';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('v⃗', vEndX + 5, vEndY - 5);
    }

    // Acceleration vector
    if (showAccelerationVector) {
      const aMag = Math.sqrt(current.ax * current.ax + current.ay * current.ay);
      const aScale = mode === 'circular' ? 3 : 2;
      const aEndX = objX + current.ax * aScale;
      const aEndY = objY - current.ay * aScale;

      ctx.strokeStyle = '#c65c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(aEndX, aEndY);
      ctx.stroke();

      // Arrow head
      if (aMag > 0.5) {
        const aAngle = Math.atan2(-current.ay, current.ax);
        ctx.fillStyle = '#c65c3c';
        ctx.beginPath();
        ctx.moveTo(aEndX, aEndY);
        ctx.lineTo(aEndX - 8 * Math.cos(aAngle - 0.3), aEndY - 8 * Math.sin(aAngle - 0.3));
        ctx.lineTo(aEndX - 8 * Math.cos(aAngle + 0.3), aEndY - 8 * Math.sin(aAngle + 0.3));
        ctx.closePath();
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#c65c3c';
      ctx.font = 'bold 11px system-ui';
      const labelText = mode === 'circular' && showCentripetal ? 'a⃗c' : 'a⃗';
      ctx.fillText(labelText, aEndX + 5, aEndY + 5);
    }

    // Object (ball)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    const ballGradient = ctx.createRadialGradient(objX - 3, objY - 3, 0, objX, objY, 12);
    ballGradient.addColorStop(0, '#e8c61a');
    ballGradient.addColorStop(0.7, '#e8c518');
    ballGradient.addColorStop(1, '#be7021');

    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(objX, objY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(objX - 4, objY - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Axis labels
    ctx.fillStyle = '#484440';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('x (m)', trajCanvasWidth / 2, trajCanvasHeight - 5);

    ctx.save();
    ctx.translate(15, trajCanvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('y (m)', 0, 0);
    ctx.restore();

    // Info panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(trajCanvasWidth - 140, 10, 130, 95);
    ctx.strokeStyle = '#d8d6d4';
    ctx.lineWidth = 1;
    ctx.strokeRect(trajCanvasWidth - 140, 10, 130, 95);

    ctx.fillStyle = '#484440';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)} s`, trajCanvasWidth - 130, 28);
    ctx.fillText(`x = ${current.x.toFixed(2)} m`, trajCanvasWidth - 130, 45);
    ctx.fillText(`y = ${current.y.toFixed(2)} m`, trajCanvasWidth - 130, 62);

    const vMag = Math.sqrt(current.vx * current.vx + current.vy * current.vy);
    ctx.fillStyle = '#c1974f';
    ctx.fillText(`|v| = ${vMag.toFixed(2)} m/s`, trajCanvasWidth - 130, 79);

    const aMag = Math.sqrt(current.ax * current.ax + current.ay * current.ay);
    ctx.fillStyle = '#c65c3c';
    ctx.fillText(`|a| = ${aMag.toFixed(2)} m/s²`, trajCanvasWidth - 130, 96);

  }, [mode, currentTime, getKinematics, getEffectiveMaxTime, showVelocityVector, showAccelerationVector,
      showComponents, showTrajectory, showGrid, showCentripetal, radius, trajCanvasWidth, trajCanvasHeight]);

  // Draw x or y component graph
  const drawComponentGraph = useCallback((
    canvas: HTMLCanvasElement | null,
    getValueX: (t: number) => number,
    getValueV: (t: number) => number,
    label: string,
    colorX: string,
    colorV: string
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const effectiveMax = getEffectiveMaxTime();
    const padding = { left: 35, right: 10, top: 20, bottom: 25 };
    const plotWidth = graphCanvasWidth - padding.left - padding.right;
    const plotHeight = graphCanvasHeight - padding.top - padding.bottom;

    // Calculate bounds
    let minVal = 0, maxVal = 0;
    for (let t = 0; t <= effectiveMax; t += 0.02) {
      const x = getValueX(t);
      const v = getValueV(t);
      minVal = Math.min(minVal, x, v);
      maxVal = Math.max(maxVal, x, v);
    }
    const pad = (maxVal - minVal) * 0.1 || 1;
    minVal -= pad; maxVal += pad;

    const toCanvasX = (t: number) => padding.left + (t / effectiveMax) * plotWidth;
    const toCanvasY = (y: number) => padding.top + plotHeight - ((y - minVal) / (maxVal - minVal)) * plotHeight;

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, graphCanvasWidth, graphCanvasHeight);

    // Grid
    ctx.strokeStyle = '#e9e8e7';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const t = (i / 4) * effectiveMax;
      const cx = toCanvasX(t);
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, graphCanvasHeight - padding.bottom);
      ctx.stroke();
    }

    // Zero line
    if (minVal < 0 && maxVal > 0) {
      ctx.strokeStyle = '#aaa6a1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, toCanvasY(0));
      ctx.lineTo(graphCanvasWidth - padding.right, toCanvasY(0));
      ctx.stroke();
    }

    // Position curve
    ctx.strokeStyle = colorX;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let t = 0; t <= effectiveMax; t += 0.02) {
      const val = getValueX(t);
      const cx = toCanvasX(t);
      const cy = toCanvasY(val);
      if (t === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Velocity curve
    ctx.strokeStyle = colorV;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let t = 0; t <= effectiveMax; t += 0.02) {
      const val = getValueV(t);
      const cx = toCanvasX(t);
      const cy = toCanvasY(val);
      if (t === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Current time marker
    const markerX = toCanvasX(currentTime);
    ctx.strokeStyle = '#484440';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(markerX, padding.top);
    ctx.lineTo(markerX, graphCanvasHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current points
    const currX = getValueX(currentTime);
    const currV = getValueV(currentTime);

    ctx.fillStyle = colorX;
    ctx.beginPath();
    ctx.arc(markerX, toCanvasY(currX), 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colorV;
    ctx.beginPath();
    ctx.arc(markerX, toCanvasY(currV), 4, 0, Math.PI * 2);
    ctx.fill();

    // Title and legend
    ctx.fillStyle = '#484440';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(label, 5, 14);

    ctx.fillStyle = colorX;
    ctx.fillRect(graphCanvasWidth - 70, 5, 10, 10);
    ctx.fillStyle = '#484440';
    ctx.font = '9px system-ui';
    ctx.fillText(`${label.toLowerCase()}(t)`, graphCanvasWidth - 57, 13);

    ctx.fillStyle = colorV;
    ctx.fillRect(graphCanvasWidth - 70, 18, 10, 2);
    ctx.fillText(`v${label.toLowerCase()}(t)`, graphCanvasWidth - 57, 23);

    // Axis labels
    ctx.fillStyle = '#7c766f';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', graphCanvasWidth / 2, graphCanvasHeight - 3);

  }, [currentTime, getEffectiveMaxTime, graphCanvasWidth, graphCanvasHeight]);

  // Draw all canvases
  useEffect(() => {
    drawTrajectory();
    drawComponentGraph(
      xGraphCanvasRef.current,
      (t) => getKinematics(t).x,
      (t) => getKinematics(t).vx,
      'X',
      '#91a443',
      '#748336'
    );
    drawComponentGraph(
      yGraphCanvasRef.current,
      (t) => getKinematics(t).y,
      (t) => getKinematics(t).vy,
      'Y',
      '#ca684a',
      '#c65c3c'
    );
  }, [drawTrajectory, drawComponentGraph, getKinematics]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleModeChange = (newMode: MotionMode) => {
    setMode(newMode);
    handleReset();
  };

  const current = getKinematics(currentTime);
  const currentConfig = MOTION_MODES.find(m => m.id === mode);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with mode selector */}
      <div className="border-b border-stone-200 bg-gradient-to-r from-olive-50 via-gold-50 to-prune-50 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {MOTION_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                mode === m.id
                  ? "text-white shadow-md"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-300"
              )}
              style={mode === m.id ? {
                backgroundColor: m.color === 'emerald' ? '#616e2d' :
                                 m.color === 'blue' ? '#c1974f' : '#a45d80'
              } : {}}
            >
              <span>{m.emoji}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-600">{currentConfig?.description}</p>
      </div>

      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Trajectory canvas */}
          <div className="flex-1">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <canvas
                ref={trajectoryCanvasRef}
                width={trajCanvasWidth}
                height={trajCanvasHeight}
                className="w-full"
              />
            </div>

            {/* Time controls */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                  isPlaying ? "bg-ocre-500 text-white" : "bg-olive-500 text-white"
                )}
              >
                {isPlaying ? '⏸ Pause' : '▶ Lecture'}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-stone-200 text-stone-700 hover:bg-stone-300"
              >
                ↺ Reset
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={getEffectiveMaxTime()}
                  step="0.01"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full accent-olive-600"
                />
              </div>
              <span className="text-sm font-mono text-stone-600 w-16">
                {currentTime.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Right: Component graphs and controls */}
          <div className="lg:w-64 space-y-3">
            {/* X component graph */}
            <div className="border border-olive-200 rounded-lg overflow-hidden bg-olive-50">
              <div className="px-2 py-1 bg-olive-100 text-xs font-bold text-olive-800 flex justify-between">
                <span>Composante X (MRU)</span>
                <span className="font-mono">{current.x.toFixed(2)} m</span>
              </div>
              <canvas ref={xGraphCanvasRef} width={graphCanvasWidth} height={graphCanvasHeight} className="w-full" />
            </div>

            {/* Y component graph */}
            <div className="border border-brun-200 rounded-lg overflow-hidden bg-brun-50">
              <div className="px-2 py-1 bg-brun-100 text-xs font-bold text-brun-800 flex justify-between">
                <span>Composante Y (MRUA)</span>
                <span className="font-mono">{current.y.toFixed(2)} m</span>
              </div>
              <canvas ref={yGraphCanvasRef} width={graphCanvasWidth} height={graphCanvasHeight} className="w-full" />
            </div>

            {/* Display options */}
            <div className="bg-stone-50 rounded-lg p-2 border border-stone-200">
              <p className="text-xs font-semibold text-stone-700 mb-2">Affichage</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={showVelocityVector} onChange={(e) => setShowVelocityVector(e.target.checked)} className="w-3 h-3" />
                  <span className="text-gold-600">v⃗</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={showAccelerationVector} onChange={(e) => setShowAccelerationVector(e.target.checked)} className="w-3 h-3" />
                  <span className="text-brun-600">a⃗</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={showComponents} onChange={(e) => setShowComponents(e.target.checked)} className="w-3 h-3" />
                  <span>Composantes</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={showTrajectory} onChange={(e) => setShowTrajectory(e.target.checked)} className="w-3 h-3" />
                  <span>Trajectoire</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Parameters panel */}
        <div className="mt-4 bg-stone-50 rounded-lg p-4 border border-stone-200">
          <h4 className="text-sm font-bold text-stone-700 mb-3">Paramètres</h4>

          {mode === 'projectile' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  v₀ = {v0} m/s
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={v0}
                  onChange={(e) => { setV0(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-gold-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  θ = {angle}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={angle}
                  onChange={(e) => { setAngle(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-terre-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  y₀ = {y0} m
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={y0}
                  onChange={(e) => { setY0(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-olive-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  g = {g} m/s²
                </label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.5"
                  value={g}
                  onChange={(e) => { setG(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-brun-600"
                />
              </div>
            </div>
          )}

          {mode === 'circular' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  R = {radius} m
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={radius}
                  onChange={(e) => { setRadius(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-gold-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  ω = {omega} rad/s
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.25"
                  value={omega}
                  onChange={(e) => { setOmega(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-prune-600"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer">
                  <input type="checkbox" checked={showCentripetal} onChange={(e) => setShowCentripetal(e.target.checked)} />
                  Montrer acc. centripète
                </label>
              </div>
            </div>
          )}

          {mode === 'custom2d' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">
                  vx₀ = {customVx0} m/s
                </label>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={customVx0}
                  onChange={(e) => { setCustomVx0(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-olive-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brun-700 mb-1">
                  vy₀ = {customVy0} m/s
                </label>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={customVy0}
                  onChange={(e) => { setCustomVy0(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-brun-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">
                  ax = {customAx} m/s²
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={customAx}
                  onChange={(e) => { setCustomAx(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-olive-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brun-700 mb-1">
                  ay = {customAy} m/s²
                </label>
                <input
                  type="range"
                  min="-15"
                  max="5"
                  step="0.5"
                  value={customAy}
                  onChange={(e) => { setCustomAy(parseFloat(e.target.value)); handleReset(); }}
                  className="w-full accent-brun-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Formulas */}
        <div className="mt-4 bg-gradient-to-r from-olive-50 to-gold-50 rounded-lg p-4 border border-olive-200">
          <h4 className="text-sm font-bold text-stone-700 mb-3">Équations du mouvement</h4>

          {mode === 'projectile' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-olive-700 mb-2">Composante X (MRU)</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="v_{x0} = v_0 \cos\theta" />
                  <BlockMath math="x(t) = v_{x0} \cdot t" />
                  <BlockMath math="v_x(t) = v_{x0} = \text{constante}" />
                  <BlockMath math="a_x = 0" />
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-brun-700 mb-2">Composante Y (MRUA)</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="v_{y0} = v_0 \sin\theta" />
                  <BlockMath math="y(t) = y_0 + v_{y0}t - \frac{1}{2}gt^2" />
                  <BlockMath math="v_y(t) = v_{y0} - gt" />
                  <BlockMath math="a_y = -g" />
                </div>
              </div>
            </div>
          )}

          {mode === 'circular' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-gold-700 mb-2">Position et vitesse</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="x(t) = R\cos(\omega t)" />
                  <BlockMath math="y(t) = R\sin(\omega t)" />
                  <BlockMath math="v = R\omega = \text{constante}" />
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-brun-700 mb-2">Accélération centripète</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="a_c = \frac{v^2}{R} = R\omega^2" />
                  <BlockMath math="\vec{a}_c \text{ pointe vers le centre}" />
                  <BlockMath math="T = \frac{2\pi}{\omega}" />
                </div>
              </div>
            </div>
          )}

          {mode === 'custom2d' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-olive-700 mb-2">Composante X</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="x(t) = v_{x0}t + \frac{1}{2}a_x t^2" />
                  <BlockMath math="v_x(t) = v_{x0} + a_x t" />
                </div>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <p className="text-xs font-semibold text-brun-700 mb-2">Composante Y</p>
                <div className="text-sm space-y-1">
                  <BlockMath math="y(t) = v_{y0}t + \frac{1}{2}a_y t^2" />
                  <BlockMath math="v_y(t) = v_{y0} + a_y t" />
                </div>
              </div>
            </div>
          )}

          {/* Current values */}
          <div className="mt-3 p-2 bg-white/60 rounded-lg">
            <p className="text-xs font-semibold text-stone-600 mb-1">Valeurs actuelles (t = {currentTime.toFixed(2)}s)</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-2 py-1 bg-olive-100 rounded">
                <InlineMath math={`v_x = ${current.vx.toFixed(2)} \\text{ m/s}`} />
              </span>
              <span className="px-2 py-1 bg-brun-100 rounded">
                <InlineMath math={`v_y = ${current.vy.toFixed(2)} \\text{ m/s}`} />
              </span>
              <span className="px-2 py-1 bg-gold-100 rounded">
                <InlineMath math={`|v| = ${Math.sqrt(current.vx**2 + current.vy**2).toFixed(2)} \\text{ m/s}`} />
              </span>
              {mode === 'projectile' && (
                <span className="px-2 py-1 bg-ocre-100 rounded">
                  <InlineMath math={`\\theta_v = ${(Math.atan2(current.vy, current.vx) * 180 / Math.PI).toFixed(1)}°`} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectileMotionSimulator;
