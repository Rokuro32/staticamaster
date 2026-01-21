'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface WaveSimulatorProps {
  showMassSpring?: boolean;
}

export function WaveSimulator({ showMassSpring = true }: WaveSimulatorProps) {
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(1);
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const springCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Calculate current displacement
  const getDisplacement = useCallback((t: number) => {
    return amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
  }, [amplitude, frequency, phase]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      setTime(prev => prev + deltaTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Draw wave graph
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const maxAmplitude = 2;
    const scale = (height / 2 - 20) / maxAmplitude;

    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let i = 0; i <= 8; i++) {
      const x = (width / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, height);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('t (s)', width - 30, centerY - 10);
    ctx.fillText('y (m)', 45, 15);
    ctx.fillText(`+${maxAmplitude}`, 5, 25);
    ctx.fillText(`-${maxAmplitude}`, 5, height - 10);
    ctx.fillText('0', 25, centerY - 5);

    // Draw wave
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const duration = 4; // Show 4 seconds of wave
    for (let px = 40; px < width; px++) {
      const t = ((px - 40) / (width - 40)) * duration;
      const y = getDisplacement(t);
      const canvasY = centerY - y * scale;

      if (px === 40) {
        ctx.moveTo(px, canvasY);
      } else {
        ctx.lineTo(px, canvasY);
      }
    }
    ctx.stroke();

    // Draw current position marker
    const currentT = time % duration;
    const markerX = 40 + (currentT / duration) * (width - 40);
    const markerY = centerY - getDisplacement(currentT) * scale;

    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Dashed line from marker to axis
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(markerX, markerY);
    ctx.lineTo(markerX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [time, amplitude, frequency, phase, getDisplacement]);

  // Draw mass-spring system
  useEffect(() => {
    if (!showMassSpring) return;

    const canvas = springCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const equilibriumY = height / 2;
    const maxAmplitude = 2;
    const scale = 60; // pixels per meter

    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Current displacement
    const displacement = getDisplacement(time);
    const massY = equilibriumY + displacement * scale;

    // Draw ceiling
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(centerX - 60, 0, 120, 15);

    // Hatching for ceiling
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX - 55 + i * 10, 15);
      ctx.lineTo(centerX - 65 + i * 10, 0);
      ctx.stroke();
    }

    // Draw spring
    const springTop = 15;
    const springBottom = massY - 30;
    const coils = 10;
    const coilWidth = 20;

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, springTop);

    const coilHeight = (springBottom - springTop) / coils;
    for (let i = 0; i < coils; i++) {
      const y1 = springTop + i * coilHeight + coilHeight * 0.25;
      const y2 = springTop + i * coilHeight + coilHeight * 0.75;
      ctx.lineTo(centerX + coilWidth, y1);
      ctx.lineTo(centerX - coilWidth, y2);
    }
    ctx.lineTo(centerX, springBottom);
    ctx.stroke();

    // Draw mass
    const massSize = 50;
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);

    // Mass border
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);

    // Mass label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('m', centerX, massY + 5);

    // Draw equilibrium line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY);
    ctx.lineTo(width, equilibriumY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Equilibrium label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Position d\'équilibre', 10, equilibriumY - 5);

    // Draw displacement arrow if significant
    if (Math.abs(displacement) > 0.1) {
      const arrowStartY = equilibriumY;
      const arrowEndY = massY;
      const arrowX = centerX + 50;

      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Arrow line
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowStartY);
      ctx.lineTo(arrowX, arrowEndY);
      ctx.stroke();

      // Arrow head
      const headSize = 8;
      const direction = displacement > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowEndY);
      ctx.lineTo(arrowX - headSize, arrowEndY - direction * headSize);
      ctx.lineTo(arrowX + headSize, arrowEndY - direction * headSize);
      ctx.closePath();
      ctx.fill();

      // Displacement label
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`y = ${displacement.toFixed(2)} m`, arrowX + 10, (arrowStartY + arrowEndY) / 2);
    }

    // Draw amplitude markers
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Max amplitude
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY - amplitude * scale);
    ctx.lineTo(width, equilibriumY - amplitude * scale);
    ctx.stroke();

    // Min amplitude
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY + amplitude * scale);
    ctx.lineTo(width, equilibriumY + amplitude * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Amplitude labels
    ctx.fillStyle = '#8b5cf6';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+A = +${amplitude.toFixed(1)} m`, width - 10, equilibriumY - amplitude * scale - 5);
    ctx.fillText(`-A = -${amplitude.toFixed(1)} m`, width - 10, equilibriumY + amplitude * scale + 15);

  }, [time, amplitude, frequency, phase, showMassSpring, getDisplacement]);

  const handleReset = () => {
    setTime(0);
    lastTimeRef.current = 0;
  };

  const period = frequency > 0 ? (1 / frequency).toFixed(3) : '∞';
  const angularFrequency = (2 * Math.PI * frequency).toFixed(3);
  const currentY = getDisplacement(time).toFixed(3);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Simulateur d'ondes sinusoïdales
        </h2>
        <p className="text-gray-600">
          Explorez la relation entre les paramètres d'une onde et son comportement
        </p>
      </div>

      {/* Mathematical Equation */}
      <div className="bg-violet-50 rounded-lg p-4 text-center">
        <p className="text-sm text-violet-600 mb-2 font-medium">Équation du mouvement</p>
        <div className="text-xl">
          <BlockMath math={`y(t) = A \\sin(2\\pi f t + \\phi) = ${amplitude.toFixed(1)} \\sin(${angularFrequency} t + ${phase.toFixed(2)})`} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          <span>
            <InlineMath math="A" /> = Amplitude
          </span>
          <span>
            <InlineMath math="f" /> = Fréquence
          </span>
          <span>
            <InlineMath math="\phi" /> = Phase initiale
          </span>
          <span>
            <InlineMath math="\omega = 2\pi f" /> = Pulsation
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Amplitude */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Amplitude <InlineMath math="A" />
            </span>
            <span className="text-violet-600 font-mono">{amplitude.toFixed(1)} m</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-gray-500">
            Déplacement maximal par rapport à l'équilibre
          </p>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Fréquence <InlineMath math="f" />
            </span>
            <span className="text-violet-600 font-mono">{frequency.toFixed(1)} Hz</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-gray-500">
            Nombre d'oscillations par seconde (T = {period} s)
          </p>
        </div>

        {/* Phase */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Phase <InlineMath math="\phi" />
            </span>
            <span className="text-violet-600 font-mono">{phase.toFixed(2)} rad</span>
          </label>
          <input
            type="range"
            min="0"
            max={2 * Math.PI}
            step="0.1"
            value={phase}
            onChange={(e) => setPhase(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-gray-500">
            Décalage initial de l'onde ({(phase / Math.PI).toFixed(2)}π rad)
          </p>
        </div>
      </div>

      {/* Visualization */}
      <div className={`grid ${showMassSpring ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Wave Graph */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-800">Graphique y(t)</h3>
          <canvas
            ref={waveCanvasRef}
            width={500}
            height={250}
            className="w-full border border-gray-200 rounded-lg"
          />
        </div>

        {/* Mass-Spring System */}
        {showMassSpring && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Système masse-ressort</h3>
            <canvas
              ref={springCanvasRef}
              width={300}
              height={250}
              className="w-full border border-gray-200 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Current Values */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Valeurs instantanées</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Temps</p>
            <p className="font-mono text-lg text-gray-900">{time.toFixed(2)} s</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Position y</p>
            <p className="font-mono text-lg text-violet-600">{currentY} m</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Période T</p>
            <p className="font-mono text-lg text-gray-900">{period} s</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Pulsation ω</p>
            <p className="font-mono text-lg text-gray-900">{angularFrequency} rad/s</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isPlaying
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          ↺ Réinitialiser
        </button>
      </div>

      {/* Educational Notes */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Concepts clés</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Amplitude (A)</h4>
            <p className="text-blue-700">
              L'amplitude représente le déplacement maximal par rapport à la position d'équilibre.
              Elle détermine l'énergie de l'oscillation.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Fréquence (f)</h4>
            <p className="text-green-700">
              La fréquence indique le nombre de cycles complets par seconde.
              La période T = 1/f est le temps pour un cycle complet.
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Phase (φ)</h4>
            <p className="text-orange-700">
              La phase initiale détermine la position de départ de l'oscillation.
              Un déphasage de π/2 transforme un sinus en cosinus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaveSimulator;
