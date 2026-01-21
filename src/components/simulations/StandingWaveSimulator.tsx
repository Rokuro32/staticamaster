'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type ReflectionType = 'fixed' | 'free';
type SimulationMode = 'standing' | 'beats' | 'modes';

export function StandingWaveSimulator() {
  const [mode, setMode] = useState<SimulationMode>('standing');
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  // Standing wave parameters
  const [frequency1, setFrequency1] = useState(2);
  const [frequency2, setFrequency2] = useState(2.5);
  const [amplitude, setAmplitude] = useState(1);
  const [wavelength, setWavelength] = useState(2);
  const [reflectionType, setReflectionType] = useState<ReflectionType>('fixed');

  // Modes parameters
  const [harmonicMode, setHarmonicMode] = useState(1);
  const [stringLength, setStringLength] = useState(4);

  // Animation
  const [showIncident, setShowIncident] = useState(true);
  const [showReflected, setShowReflected] = useState(true);
  const [showResultant, setShowResultant] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

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

  // Wave functions
  const getIncidentWave = useCallback((x: number, t: number) => {
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * frequency1;
    return amplitude * Math.sin(k * x - omega * t);
  }, [amplitude, wavelength, frequency1]);

  const getReflectedWave = useCallback((x: number, t: number, L: number) => {
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * frequency1;
    const phaseShift = reflectionType === 'fixed' ? Math.PI : 0;
    return amplitude * Math.sin(k * (2 * L - x) - omega * t + phaseShift);
  }, [amplitude, wavelength, frequency1, reflectionType]);

  const getStandingWave = useCallback((x: number, t: number, L: number) => {
    const incident = getIncidentWave(x, t);
    const reflected = getReflectedWave(x, t, L);
    return incident + reflected;
  }, [getIncidentWave, getReflectedWave]);

  const getBeatWave = useCallback((x: number, t: number) => {
    const k1 = (2 * Math.PI) / wavelength;
    const k2 = (2 * Math.PI) / (wavelength * frequency1 / frequency2);
    const omega1 = 2 * Math.PI * frequency1;
    const omega2 = 2 * Math.PI * frequency2;
    const y1 = amplitude * Math.sin(k1 * x - omega1 * t);
    const y2 = amplitude * Math.sin(k2 * x - omega2 * t);
    return y1 + y2;
  }, [amplitude, wavelength, frequency1, frequency2]);

  const getModeWave = useCallback((x: number, t: number, n: number, L: number) => {
    const k = (n * Math.PI) / L;
    const omega = 2 * Math.PI * frequency1 * n;
    return amplitude * Math.sin(k * x) * Math.cos(omega * t);
  }, [amplitude, frequency1]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const scale = 60;
    const L = mode === 'modes' ? stringLength : 4;

    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
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
    ctx.beginPath();
    ctx.moveTo(40, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Draw wall/boundary
    const wallX = width - 40;
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(wallX, 20, 15, height - 40);

    // Hatching for wall
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i < (height - 40) / 10; i++) {
      ctx.beginPath();
      ctx.moveTo(wallX + 15, 20 + i * 10);
      ctx.lineTo(wallX, 30 + i * 10);
      ctx.stroke();
    }

    // Draw boundary condition indicator
    ctx.fillStyle = reflectionType === 'fixed' ? '#ef4444' : '#22c55e';
    ctx.beginPath();
    ctx.arc(wallX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(reflectionType === 'fixed' ? 'Fixe' : 'Libre', wallX, height - 10);

    // Labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x', width - 30, centerY - 10);
    ctx.fillText('y', 45, 20);

    const xScale = (wallX - 50) / L;

    // Draw waves based on mode
    if (mode === 'standing') {
      // Incident wave
      if (showIncident) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let px = 50; px < wallX; px++) {
          const x = (px - 50) / xScale;
          const y = getIncidentWave(x, time);
          const canvasY = centerY - y * scale;
          if (px === 50) ctx.moveTo(px, canvasY);
          else ctx.lineTo(px, canvasY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Reflected wave
      if (showReflected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let px = 50; px < wallX; px++) {
          const x = (px - 50) / xScale;
          const y = getReflectedWave(x, time, L);
          const canvasY = centerY - y * scale;
          if (px === 50) ctx.moveTo(px, canvasY);
          else ctx.lineTo(px, canvasY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Resultant standing wave
      if (showResultant) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 50; px < wallX; px++) {
          const x = (px - 50) / xScale;
          const y = getStandingWave(x, time, L);
          const canvasY = centerY - y * scale;
          if (px === 50) ctx.moveTo(px, canvasY);
          else ctx.lineTo(px, canvasY);
        }
        ctx.stroke();
      }

      // Draw nodes and antinodes
      const numNodes = Math.floor(L / (wavelength / 2)) + 1;
      for (let i = 0; i < numNodes; i++) {
        const nodeX = reflectionType === 'fixed'
          ? L - i * (wavelength / 2)
          : L - (wavelength / 4) - i * (wavelength / 2);

        if (nodeX >= 0 && nodeX <= L) {
          const px = 50 + nodeX * xScale;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(px, centerY, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

    } else if (mode === 'beats') {
      const beatFreq = Math.abs(frequency2 - frequency1);
      const avgFreq = (frequency1 + frequency2) / 2;
      const deltaFreq = Math.abs(frequency2 - frequency1) / 2;

      // Draw filled envelope area first (behind the wave)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.beginPath();
      ctx.moveTo(50, centerY);

      // Upper envelope path
      for (let px = 50; px < wallX; px++) {
        const t = (px - 50) / (wallX - 50) * 4; // Time spread across canvas
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY - envelope * scale * 0.5;
        ctx.lineTo(px, canvasY);
      }

      // Lower envelope path (reverse)
      for (let px = wallX - 1; px >= 50; px--) {
        const t = (px - 50) / (wallX - 50) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY + envelope * scale * 0.5;
        ctx.lineTo(px, canvasY);
      }
      ctx.closePath();
      ctx.fill();

      // Beat pattern wave
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 50; px < wallX; px++) {
        const t = (px - 50) / (wallX - 50) * 4;
        const carrier = Math.sin(2 * Math.PI * avgFreq * (time + t));
        const modulation = Math.cos(2 * Math.PI * deltaFreq * (time + t));
        const y = 2 * amplitude * modulation * carrier;
        const canvasY = centerY - y * scale * 0.5;
        if (px === 50) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Upper envelope line
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let px = 50; px < wallX; px++) {
        const t = (px - 50) / (wallX - 50) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY - envelope * scale * 0.5;
        if (px === 50) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Lower envelope line
      ctx.beginPath();
      for (let px = 50; px < wallX; px++) {
        const t = (px - 50) / (wallX - 50) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY + envelope * scale * 0.5;
        if (px === 50) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Mark beat nodes (where envelope = 0)
      const beatPeriod = 1 / beatFreq;
      for (let i = 0; i < 10; i++) {
        const nodeTime = (i + 0.5) * beatPeriod / 2;
        const adjustedTime = (time % (beatPeriod)) ;
        const px = 50 + ((nodeTime - adjustedTime + beatPeriod) % beatPeriod) / 4 * (wallX - 50);
        if (px > 50 && px < wallX) {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(px, centerY, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('0', px, centerY + 3);
        }
      }

    } else if (mode === 'modes') {
      // Harmonic mode
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let px = 50; px < wallX; px++) {
        const x = (px - 50) / xScale;
        const y = getModeWave(x, time, harmonicMode, stringLength);
        const canvasY = centerY - y * scale;
        if (px === 50) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Draw fixed endpoints
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(50, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw nodes
      for (let i = 1; i < harmonicMode; i++) {
        const nodeX = (i * stringLength) / harmonicMode;
        const px = 50 + nodeX * xScale;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw antinodes
      for (let i = 0; i < harmonicMode; i++) {
        const antinodeX = ((i + 0.5) * stringLength) / harmonicMode;
        const px = 50 + antinodeX * xScale;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Legend
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';

    if (mode === 'standing') {
      let legendY = 25;
      if (showIncident) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('--- Onde incidente', 60, legendY);
        legendY += 15;
      }
      if (showReflected) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('--- Onde réfléchie', 60, legendY);
        legendY += 15;
      }
      if (showResultant) {
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText('— Onde stationnaire', 60, legendY);
      }
    } else if (mode === 'modes') {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('● Noeuds', 60, 25);
      ctx.fillStyle = '#22c55e';
      ctx.fillText('● Ventres', 60, 40);
    }

  }, [time, mode, frequency1, frequency2, amplitude, wavelength, reflectionType,
      harmonicMode, stringLength, showIncident, showReflected, showResultant,
      getIncidentWave, getReflectedWave, getStandingWave, getBeatWave, getModeWave]);

  const handleReset = () => {
    setTime(0);
    lastTimeRef.current = 0;
  };

  const beatFrequency = Math.abs(frequency2 - frequency1);
  const modeFrequency = (harmonicMode * frequency1).toFixed(2);
  const modeWavelength = ((2 * stringLength) / harmonicMode).toFixed(2);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ondes stationnaires sur une corde
        </h2>
        <p className="text-gray-600">
          Visualisez la superposition d'ondes et les modes de vibration
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setMode('standing')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'standing'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Réflexion
        </button>
        <button
          onClick={() => setMode('modes')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'modes'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Modes propres
        </button>
        <button
          onClick={() => setMode('beats')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'beats'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Battements
        </button>
      </div>

      {/* Mathematical Equation */}
      <div className="bg-violet-50 rounded-lg p-4 text-center">
        {mode === 'standing' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Superposition des ondes</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`y = y_1 + y_2 = A\\sin(kx - \\omega t) ${reflectionType === 'fixed' ? '-' : '+'} A\\sin(kx + \\omega t)`} />
            </div>
            <div className="mt-2 text-sm">
              <BlockMath math={reflectionType === 'fixed'
                ? `y = 2A\\sin(kx)\\cos(\\omega t)`
                : `y = 2A\\cos(kx)\\sin(\\omega t)`} />
            </div>
          </>
        )}
        {mode === 'beats' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Battements</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`y = A\\sin(2\\pi f_1 t) + A\\sin(2\\pi f_2 t)`} />
            </div>
            <div className="mt-2 text-sm">
              <BlockMath math={`f_{battement} = |f_2 - f_1| = ${beatFrequency.toFixed(2)} \\text{ Hz}`} />
            </div>
          </>
        )}
        {mode === 'modes' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Mode propre n = {harmonicMode}</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`y_n = A\\sin\\left(\\frac{n\\pi x}{L}\\right)\\cos(\\omega_n t)`} />
            </div>
            <div className="mt-2 text-sm">
              <BlockMath math={`\\lambda_n = \\frac{2L}{n} = ${modeWavelength} \\text{ m}, \\quad f_n = n \\cdot f_1 = ${modeFrequency} \\text{ Hz}`} />
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mode === 'standing' && (
          <>
            {/* Reflection Type */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Type de réflexion</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReflectionType('fixed')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    reflectionType === 'fixed'
                      ? 'bg-red-100 text-red-700 border-2 border-red-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  Extrémité fixe
                </button>
                <button
                  onClick={() => setReflectionType('free')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    reflectionType === 'free'
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  Extrémité libre
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {reflectionType === 'fixed'
                  ? 'Inversion de phase (noeud à l\'extrémité)'
                  : 'Pas d\'inversion (ventre à l\'extrémité)'}
              </p>
            </div>

            {/* Wave visibility toggles */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Affichage</label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showIncident}
                    onChange={(e) => setShowIncident(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-blue-600">Onde incidente</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showReflected}
                    onChange={(e) => setShowReflected(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span className="text-amber-600">Onde réfléchie</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showResultant}
                    onChange={(e) => setShowResultant(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  <span className="text-violet-600">Onde stationnaire</span>
                </label>
              </div>
            </div>

            {/* Wavelength */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Longueur d'onde <InlineMath math="\lambda" />
                </span>
                <span className="text-violet-600 font-mono">{wavelength.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={wavelength}
                onChange={(e) => setWavelength(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </>
        )}

        {mode === 'beats' && (
          <>
            {/* Frequency 1 */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Fréquence 1 <InlineMath math="f_1" />
                </span>
                <span className="text-violet-600 font-mono">{frequency1.toFixed(1)} Hz</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={frequency1}
                onChange={(e) => setFrequency1(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            {/* Frequency 2 */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Fréquence 2 <InlineMath math="f_2" />
                </span>
                <span className="text-violet-600 font-mono">{frequency2.toFixed(1)} Hz</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={frequency2}
                onChange={(e) => setFrequency2(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            {/* Beat frequency display */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Fréquence de battement</label>
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <span className="text-2xl font-mono text-violet-600">{beatFrequency.toFixed(2)} Hz</span>
              </div>
              <p className="text-xs text-gray-500">
                <InlineMath math="f_{bat} = |f_2 - f_1|" />
              </p>
            </div>
          </>
        )}

        {mode === 'modes' && (
          <>
            {/* Harmonic mode */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Mode harmonique <InlineMath math="n" />
                </span>
                <span className="text-violet-600 font-mono">n = {harmonicMode}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={harmonicMode}
                onChange={(e) => setHarmonicMode(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">
                {harmonicMode === 1 ? 'Fondamental' : `${harmonicMode}${harmonicMode === 2 ? 'nd' : 'ème'} harmonique`}
              </p>
            </div>

            {/* String length */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Longueur de corde <InlineMath math="L" />
                </span>
                <span className="text-violet-600 font-mono">{stringLength.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={stringLength}
                onChange={(e) => setStringLength(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            {/* Mode info */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Propriétés du mode</label>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Noeuds:</span>
                  <span className="font-mono">{harmonicMode + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventres:</span>
                  <span className="font-mono">{harmonicMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600"><InlineMath math="\lambda_n" />:</span>
                  <span className="font-mono">{modeWavelength} m</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Amplitude (common to all modes) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Amplitude <InlineMath math="A" />
            </span>
            <span className="text-violet-600 font-mono">{amplitude.toFixed(1)} m</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.1"
            value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        {/* Frequency (for standing and modes) */}
        {(mode === 'standing' || mode === 'modes') && (
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                Fréquence {mode === 'modes' ? 'fondamentale' : ''} <InlineMath math="f" />
              </span>
              <span className="text-violet-600 font-mono">{frequency1.toFixed(1)} Hz</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={frequency1}
              onChange={(e) => setFrequency1(parseFloat(e.target.value))}
              className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          width={700}
          height={280}
          className="w-full border border-gray-200 rounded-lg"
        />
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
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Réflexion fixe (dure)</h4>
            <p className="text-red-700">
              L'onde subit une inversion de phase (déphasage de π).
              Un noeud se forme à l'extrémité fixe.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Réflexion libre (molle)</h4>
            <p className="text-green-700">
              L'onde se réfléchit sans inversion de phase.
              Un ventre se forme à l'extrémité libre.
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Modes propres</h4>
            <p className="text-blue-700">
              Seules certaines longueurs d'onde permettent la formation
              d'ondes stationnaires stables: <InlineMath math="\lambda_n = 2L/n" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StandingWaveSimulator;
