'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

type MotionType = 'uniform' | 'uniformAccel' | 'sinusoidal' | 'freeFall' | 'custom';

interface MotionConfig {
  id: MotionType;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

const MOTION_TYPES: MotionConfig[] = [
  { id: 'uniform', name: 'MRU', description: 'Mouvement Rectiligne Uniforme (v = constante)', emoji: '➡️', color: 'emerald' },
  { id: 'uniformAccel', name: 'MRUA', description: 'Mouvement Rectiligne Uniformément Accéléré (a = constante)', emoji: '🚀', color: 'blue' },
  { id: 'freeFall', name: 'Chute libre', description: 'Chute libre sous l\'effet de la gravité (a = -g)', emoji: '⬇️', color: 'orange' },
  { id: 'sinusoidal', name: 'Harmonique', description: 'Mouvement Harmonique Simple (oscillation)', emoji: '〰️', color: 'purple' },
  { id: 'custom', name: 'Personnalisé', description: 'Définissez vos propres conditions initiales', emoji: '⚙️', color: 'gray' },
];

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
  { id: 'custom', name: 'Custom', value: 9.81, emoji: '⚙️' },
];

export function KinematicsGraphSimulator() {
  const [motionType, setMotionType] = useState<MotionType>('uniformAccel');

  // Common parameters
  const [x0, setX0] = useState(0);
  const [v0, setV0] = useState(2);
  const [a0, setA0] = useState(1);

  // Sinusoidal parameters
  const [omega, setOmega] = useState(2);
  const [amplitude, setAmplitude] = useState(3);

  // Free fall parameters
  const [y0, setY0] = useState(50);
  const [v0Fall, setV0Fall] = useState(0);
  const [gravityPreset, setGravityPreset] = useState('earth');
  const [customGravity, setCustomGravity] = useState(9.81);

  // Time settings
  const [maxTime, setMaxTime] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);

  // Animation
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const positionCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const accelerationCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas sizes
  const canvasWidth = 380;
  const canvasHeight = 130;
  const animCanvasWidth = motionType === 'freeFall' ? 180 : 600;
  const animCanvasHeight = motionType === 'freeFall' ? 350 : 80;

  // Get current gravity value
  const g = gravityPreset === 'custom'
    ? customGravity
    : GRAVITY_PRESETS.find(p => p.id === gravityPreset)?.value || 9.81;

  // Calculate time when object hits ground (y = 0) for free fall
  const getGroundTime = useCallback(() => {
    if (motionType !== 'freeFall') return maxTime;
    const discriminant = v0Fall * v0Fall + 2 * g * y0;
    if (discriminant < 0) return maxTime;
    return (v0Fall + Math.sqrt(discriminant)) / g;
  }, [motionType, v0Fall, y0, g, maxTime]);

  // Get effective max time (considering ground impact for free fall)
  const getEffectiveMaxTime = useCallback(() => {
    if (motionType === 'freeFall') {
      return Math.min(maxTime, getGroundTime() + 0.3);
    }
    return maxTime;
  }, [motionType, maxTime, getGroundTime]);

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
      case 'freeFall': {
        const groundTime = getGroundTime();
        const effectiveTime = Math.min(t, groundTime);
        const y = y0 + v0Fall * effectiveTime - 0.5 * g * effectiveTime * effectiveTime;
        const v = v0Fall - g * effectiveTime;
        const a = -g;
        return {
          x: Math.max(0, y),
          v: t >= groundTime ? 0 : v,
          a: t >= groundTime ? 0 : a
        };
      }
      case 'custom':
        return { x: x0 + v0 * t + 0.5 * a0 * t * t, v: v0 + a0 * t, a: a0 };
      default:
        return { x: 0, v: 0, a: 0 };
    }
  }, [motionType, x0, v0, a0, omega, amplitude, y0, v0Fall, g, getGroundTime]);

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

    const effectiveMaxTime = getEffectiveMaxTime();
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

    // Ground impact line for free fall
    if (motionType === 'freeFall') {
      const groundTime = getGroundTime();
      if (groundTime < effectiveMaxTime) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(toCanvasX(groundTime), padding.top);
        ctx.lineTo(toCanvasX(groundTime), canvasHeight - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Area under curve (for integral visualization)
    if (integralLabel && motionType !== 'freeFall') {
      ctx.fillStyle = color + '20';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(0), toCanvasY(0));
      for (let i = 0; i <= Math.floor((currentTime / effectiveMaxTime) * numPoints); i++) {
        const t = (i / numPoints) * effectiveMaxTime;
        ctx.lineTo(toCanvasX(t), toCanvasY(values[i]));
      }
      ctx.lineTo(toCanvasX(currentTime), toCanvasY(0));
      ctx.closePath();
      ctx.fill();
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
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tangent line (derivative visualization) - not for free fall
    if (derivativeLabel && motionType !== 'freeFall') {
      const dt = 0.01;
      const nextVal = getValue(currentTime + dt);
      const slope = (nextVal - currentVal) / dt;
      const tangentLength = 50;

      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      const dx = tangentLength / Math.sqrt(1 + slope * slope * (canvasHeight / graphHeight) * (canvasHeight / graphHeight));
      const dy = slope * dx * (graphHeight / (maxY - minY)) * (canvasHeight / graphHeight);

      ctx.moveTo(markerX - dx, markerY + dy * (effectiveMaxTime / graphWidth));
      ctx.lineTo(markerX + dx, markerY - dy * (effectiveMaxTime / graphWidth));
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

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 13px system-ui';
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

    // Derivative/Integral indicators (not for free fall)
    if (derivativeLabel && motionType !== 'freeFall') {
      ctx.fillStyle = '#9333ea';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`pente → ${derivativeLabel}`, canvasWidth - 8, 14);
    }
    if (integralLabel && motionType !== 'freeFall') {
      ctx.fillStyle = color;
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`aire → Δ${integralLabel}`, canvasWidth - 8, 24);
    }
  }, [maxTime, currentTime, canvasWidth, canvasHeight, motionType, getGroundTime, getEffectiveMaxTime]);

  // Draw horizontal animation (for MRU, MRUA, Harmonic, Custom)
  const drawHorizontalAnimation = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas || !showAnimation || motionType === 'freeFall') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, v } = getKinematics(currentTime);
    const effectiveMaxTime = getEffectiveMaxTime();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, animCanvasWidth, animCanvasHeight);

    // Calculate range
    let minX = 0, maxX = 10;
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
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

    // Trajectory trail
    if (motionType === 'sinusoidal') {
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t <= currentTime; t += 0.05) {
        const { x: trailX } = getKinematics(t);
        const cx = toCanvasX(trailX);
        if (t === 0) ctx.moveTo(cx, animCanvasHeight / 2 - 15);
        else ctx.lineTo(cx, animCanvasHeight / 2 - 15);
      }
      ctx.stroke();
    }

    // Object
    const objX = toCanvasX(x);
    const objY = animCanvasHeight / 2 - 15;

    // Velocity arrow
    if (Math.abs(v) > 0.1) {
      const arrowLen = Math.min(Math.abs(v) * 8, 40) * Math.sign(v);
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

    // Ball with color based on motion type
    const ballColor = motionType === 'sinusoidal' ? '#9333ea' : '#16a34a';
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(objX, objY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)}s   x = ${x.toFixed(2)}m   v = ${v.toFixed(2)}m/s`, 10, 15);
  }, [currentTime, getKinematics, showAnimation, motionType, animCanvasWidth, animCanvasHeight, getEffectiveMaxTime]);

  // Draw vertical animation (for Free Fall)
  const drawVerticalAnimation = useCallback(() => {
    const canvas = animationCanvasRef.current;
    if (!canvas || !showAnimation || motionType !== 'freeFall') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x: y, v } = getKinematics(currentTime);
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
    ctx.fillRect(0, animCanvasHeight - 25, animCanvasWidth, 25);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, animCanvasHeight - 30, animCanvasWidth, 8);

    // Calculate scale
    const maxHeight = Math.max(y0, y0 + v0Fall * v0Fall / (2 * g) + 5);
    const padding = 40;
    const drawHeight = animCanvasHeight - padding - 30;
    const scale = drawHeight / maxHeight;

    // Height ruler
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    const rulerX = 22;
    ctx.beginPath();
    ctx.moveTo(rulerX, padding);
    ctx.lineTo(rulerX, animCanvasHeight - 30);
    ctx.stroke();

    // Ruler marks
    ctx.fillStyle = '#666';
    ctx.font = '8px system-ui';
    ctx.textAlign = 'right';
    const numMarks = 5;
    for (let i = 0; i <= numMarks; i++) {
      const h = (i / numMarks) * maxHeight;
      const yPos = animCanvasHeight - 30 - h * scale;
      ctx.beginPath();
      ctx.moveTo(rulerX - 4, yPos);
      ctx.lineTo(rulerX, yPos);
      ctx.stroke();
      ctx.fillText(`${h.toFixed(0)}`, rulerX - 6, yPos + 3);
    }

    // Initial height marker
    const y0Pos = animCanvasHeight - 30 - y0 * scale;
    ctx.strokeStyle = '#16a34a';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rulerX, y0Pos);
    ctx.lineTo(animCanvasWidth - 15, y0Pos);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#16a34a';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('y₀', animCanvasWidth - 14, y0Pos + 3);

    // Trajectory trail
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const numTrailPoints = 30;
    for (let i = 0; i <= numTrailPoints; i++) {
      const t = (i / numTrailPoints) * currentTime;
      const { x: trailY } = getKinematics(t);
      const trailYPos = animCanvasHeight - 30 - trailY * scale;
      const trailXPos = animCanvasWidth / 2;
      if (i === 0) ctx.moveTo(trailXPos, trailYPos);
      else ctx.lineTo(trailXPos, trailYPos);
    }
    ctx.stroke();

    // Current object position
    const objX = animCanvasWidth / 2;
    const objY = animCanvasHeight - 30 - y * scale;
    const ballRadius = 12;

    // Velocity arrow
    if (Math.abs(v) > 0.5 && currentTime < groundTime) {
      const arrowScale = 1.5;
      const arrowLen = Math.min(Math.abs(v) * arrowScale, 50);
      const arrowDir = v > 0 ? -1 : 1;

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(objX, objY);
      ctx.lineTo(objX, objY + arrowLen * arrowDir);
      ctx.stroke();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      const headY = objY + arrowLen * arrowDir;
      ctx.moveTo(objX, headY);
      ctx.lineTo(objX - 5, headY - 7 * arrowDir);
      ctx.lineTo(objX + 5, headY - 7 * arrowDir);
      ctx.closePath();
      ctx.fill();
    }

    // Ball with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    const ballGradient = ctx.createRadialGradient(
      objX - 4, objY - 4, 0,
      objX, objY, ballRadius
    );
    ballGradient.addColorStop(0, '#ef4444');
    ballGradient.addColorStop(0.7, '#dc2626');
    ballGradient.addColorStop(1, '#991b1b');

    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(objX, objY, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(objX - 4, objY - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Info box
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(5, 5, 90, 50);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, 90, 50);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toFixed(2)} s`, 10, 20);
    ctx.fillStyle = '#16a34a';
    ctx.fillText(`y = ${y.toFixed(1)} m`, 10, 34);
    ctx.fillStyle = '#2563eb';
    ctx.fillText(`v = ${v.toFixed(1)} m/s`, 10, 48);

    // Impact message
    if (currentTime >= groundTime) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('IMPACT!', animCanvasWidth / 2, animCanvasHeight - 42);
    }
  }, [currentTime, getKinematics, y0, v0Fall, g, showAnimation, motionType, animCanvasWidth, animCanvasHeight, getGroundTime]);

  // Draw all
  useEffect(() => {
    const posLabel = motionType === 'freeFall' ? 'y' : 'x';
    drawGraph(positionCanvasRef.current, (t) => getKinematics(t).x, '#16a34a', '#f0fdf4', posLabel, 'm', 'v(t)', undefined);
    drawGraph(velocityCanvasRef.current, (t) => getKinematics(t).v, '#2563eb', '#eff6ff', 'v', 'm/s', 'a(t)', posLabel);
    drawGraph(accelerationCanvasRef.current, (t) => getKinematics(t).a, '#dc2626', '#fef2f2', 'a', 'm/s²', undefined, 'v');

    if (motionType === 'freeFall') {
      drawVerticalAnimation();
    } else {
      drawHorizontalAnimation();
    }
  }, [drawGraph, drawHorizontalAnimation, drawVerticalAnimation, getKinematics, motionType]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMotionChange = (type: MotionType) => {
    setMotionType(type);
    handleReset();
    if (type === 'freeFall') {
      setMaxTime(5);
    }
  };

  const currentKinematics = getKinematics(currentTime);
  const currentMotion = MOTION_TYPES.find(m => m.id === motionType);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with motion type selector */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-emerald-50 via-blue-50 to-orange-50 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {MOTION_TYPES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleMotionChange(m.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                motionType === m.id
                  ? `bg-${m.color}-600 text-white shadow-md`
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              )}
              style={motionType === m.id ? {
                backgroundColor: m.color === 'emerald' ? '#059669' :
                                 m.color === 'blue' ? '#2563eb' :
                                 m.color === 'orange' ? '#ea580c' :
                                 m.color === 'purple' ? '#9333ea' : '#6b7280'
              } : {}}
            >
              <span>{m.emoji}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600">
          {currentMotion?.description}
        </p>
      </div>

      <div className="p-4">
        {/* Main layout */}
        <div className={cn(
          "flex gap-4",
          motionType === 'freeFall' ? 'flex-row' : 'flex-col'
        )}>
          {/* Animation (left for free fall, top for others) */}
          {showAnimation && (
            <div className={cn(
              "flex-shrink-0",
              motionType === 'freeFall' ? '' : 'w-full'
            )}>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <canvas
                  ref={animationCanvasRef}
                  width={animCanvasWidth}
                  height={animCanvasHeight}
                  className={motionType === 'freeFall' ? '' : 'w-full'}
                />
              </div>
            </div>
          )}

          {/* Graphs and controls */}
          <div className="flex-1 space-y-3">
            {/* Graphs grid */}
            <div className={cn(
              "grid gap-2",
              motionType === 'freeFall' ? 'grid-cols-1' : 'grid-cols-3'
            )}>
              {/* Position graph */}
              <div className="border border-green-300 rounded-lg overflow-hidden bg-gradient-to-b from-green-50 to-white">
                <div className="px-2 py-1 bg-green-100 border-b border-green-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-green-800">
                    {motionType === 'freeFall' ? 'Hauteur y(t)' : 'Position x(t)'}
                  </span>
                  <span className="text-sm font-mono font-bold text-green-700">{currentKinematics.x.toFixed(2)} m</span>
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
                        {motionType === 'freeFall' && getGroundTime() < maxTime && (
                          <span className="text-red-500 ml-1">(impact: {getGroundTime().toFixed(2)}s)</span>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={getEffectiveMaxTime()}
                      step="0.01"
                      value={currentTime}
                      onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 h-5"
                    />
                  </div>

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
                      {[2, 3, 5, 8, 10, 15].map(t => (
                        <option key={t} value={t}>{t}s</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAnimation}
                        onChange={(e) => setShowAnimation(e.target.checked)}
                        className="w-3 h-3 accent-emerald-600"
                      />
                      Anim
                    </label>
                  </div>
                </div>

                {/* Right: Parameters */}
                <div className="space-y-2 border-l border-gray-200 pl-4">
                  {/* Free fall specific parameters */}
                  {motionType === 'freeFall' && (
                    <>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {GRAVITY_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => { setGravityPreset(preset.id); handleReset(); }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                              gravityPreset === preset.id
                                ? "bg-orange-500 text-white"
                                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {preset.emoji} {preset.name}
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-green-700 mb-0.5">
                          y₀ = {y0} m
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={y0}
                          onChange={(e) => { setY0(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-green-600 h-4"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-blue-700 mb-0.5">
                          v₀ = {v0Fall} m/s <span className="text-gray-500">(+ = haut)</span>
                        </label>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          step="1"
                          value={v0Fall}
                          onChange={(e) => { setV0Fall(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-blue-600 h-4"
                        />
                      </div>
                      {gravityPreset === 'custom' && (
                        <div>
                          <label className="block text-[10px] font-medium text-red-700 mb-0.5">
                            g = {customGravity} m/s²
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
                    </>
                  )}

                  {/* MRU/MRUA/Custom parameters */}
                  {(motionType === 'uniform' || motionType === 'uniformAccel' || motionType === 'custom') && (
                    <>
                      <div>
                        <label className="block text-[10px] font-medium text-green-700 mb-0.5">x₀ = {x0} m</label>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.5"
                          value={x0}
                          onChange={(e) => { setX0(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-green-600 h-4"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-blue-700 mb-0.5">v₀ = {v0} m/s</label>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.5"
                          value={v0}
                          onChange={(e) => { setV0(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-blue-600 h-4"
                        />
                      </div>
                      {(motionType === 'uniformAccel' || motionType === 'custom') && (
                        <div>
                          <label className="block text-[10px] font-medium text-red-700 mb-0.5">a = {a0} m/s²</label>
                          <input
                            type="range"
                            min="-3"
                            max="3"
                            step="0.25"
                            value={a0}
                            onChange={(e) => { setA0(parseFloat(e.target.value)); handleReset(); }}
                            className="w-full accent-red-600 h-4"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Sinusoidal parameters */}
                  {motionType === 'sinusoidal' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-medium text-purple-700 mb-0.5">A = {amplitude} m</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.5"
                          value={amplitude}
                          onChange={(e) => { setAmplitude(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-purple-600 h-4"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-orange-700 mb-0.5">ω = {omega} rad/s</label>
                        <input
                          type="range"
                          min="0.5"
                          max="5"
                          step="0.5"
                          value={omega}
                          onChange={(e) => { setOmega(parseFloat(e.target.value)); handleReset(); }}
                          className="w-full accent-orange-600 h-4"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mathematical relations */}
        <div className="mt-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Derivative/Integral chain */}
            <div className="flex items-center gap-2">
              <div className="text-center px-2 py-1 bg-green-100 rounded">
                <p className="text-[10px] text-green-600">Position</p>
                <p className="text-sm font-bold text-green-700">{motionType === 'freeFall' ? 'y(t)' : 'x(t)'}</p>
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
            <div className="flex flex-wrap gap-2 text-xs">
              {motionType === 'uniform' && (
                <>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="x = x_0 + v_0 t" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="v = v_0" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="a = 0" /></div>
                </>
              )}
              {(motionType === 'uniformAccel' || motionType === 'custom') && (
                <>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="x = x_0 + v_0 t + \frac{1}{2}at^2" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="v = v_0 + at" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="a = \text{cst}" /></div>
                </>
              )}
              {motionType === 'freeFall' && (
                <>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math={`y = y_0 + v_0 t - \\frac{1}{2}gt^2`} /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="v = v_0 - gt" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math={`a = -g = -${g.toFixed(2)}`} /></div>
                </>
              )}
              {motionType === 'sinusoidal' && (
                <>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="x = A\sin(\omega t)" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="v = A\omega\cos(\omega t)" /></div>
                  <div className="bg-white px-2 py-1 rounded border shadow-sm"><InlineMath math="a = -A\omega^2\sin(\omega t)" /></div>
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
