'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

export function SpeakerInterferenceSimulator() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  // Source parameters
  const [frequency, setFrequency] = useState(200);
  const [speakerDistance, setSpeakerDistance] = useState(2);
  const [amplitude, setAmplitude] = useState(1);
  const [soundSpeed, setSoundSpeed] = useState(343);

  // Phase difference
  const [phaseDiff, setPhaseDiff] = useState(0);

  // Observer position
  const [observerX, setObserverX] = useState(3);
  const [observerY, setObserverY] = useState(0);

  // Display options
  const [showWaveFronts, setShowWaveFronts] = useState(true);
  const [showInterferencePattern, setShowInterferencePattern] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Calculate wavelength
  const wavelength = soundSpeed / frequency;

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

  // Calculate path difference and interference
  const getInterference = useCallback((x: number, y: number) => {
    const speaker1Y = speakerDistance / 2;
    const speaker2Y = -speakerDistance / 2;

    const r1 = Math.sqrt(x * x + (y - speaker1Y) * (y - speaker1Y));
    const r2 = Math.sqrt(x * x + (y - speaker2Y) * (y - speaker2Y));

    const pathDiff = r2 - r1;
    const phaseDiffTotal = (2 * Math.PI * pathDiff / wavelength) + phaseDiff;

    // Amplitude at this point (superposition)
    const resultantAmplitude = 2 * amplitude * Math.abs(Math.cos(phaseDiffTotal / 2));

    return {
      r1,
      r2,
      pathDiff,
      phaseDiffTotal,
      resultantAmplitude,
      isConstructive: Math.abs(Math.cos(phaseDiffTotal / 2)) > 0.7,
      isDestructive: Math.abs(Math.cos(phaseDiffTotal / 2)) < 0.3
    };
  }, [speakerDistance, wavelength, amplitude, phaseDiff]);

  // Draw main canvas with wave fronts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = 100;
    const centerY = height / 2;
    const scale = 60; // pixels per meter

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Speaker positions
    const speaker1Y = centerY - (speakerDistance / 2) * scale;
    const speaker2Y = centerY + (speakerDistance / 2) * scale;

    // Draw interference pattern (background)
    if (showInterferencePattern) {
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let px = 0; px < width; px++) {
        for (let py = 0; py < height; py++) {
          const x = (px - centerX) / scale;
          const y = (centerY - py) / scale;

          if (x > 0) {
            const interference = getInterference(x, y);
            const intensity = interference.resultantAmplitude / (2 * amplitude);

            const idx = (py * width + px) * 4;

            if (interference.isConstructive) {
              // Green for constructive
              data[idx] = 34;
              data[idx + 1] = Math.floor(197 * intensity);
              data[idx + 2] = 94;
              data[idx + 3] = Math.floor(100 * intensity);
            } else if (interference.isDestructive) {
              // Red for destructive
              data[idx] = Math.floor(239 * (1 - intensity));
              data[idx + 1] = 68;
              data[idx + 2] = 68;
              data[idx + 3] = Math.floor(100 * (1 - intensity));
            } else {
              // Blue gradient for intermediate
              data[idx] = 59;
              data[idx + 1] = 130;
              data[idx + 2] = 246;
              data[idx + 3] = Math.floor(60 * intensity);
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Draw wave fronts
    if (showWaveFronts) {
      const numWaves = 15;
      const omega = 2 * Math.PI * frequency;

      for (let i = 0; i < numWaves; i++) {
        const baseRadius = (i * wavelength + (time * soundSpeed) % wavelength) * scale;

        if (baseRadius > 0 && baseRadius < 600) {
          const alpha = Math.max(0, 0.4 - baseRadius / 1500);

          // Speaker 1 waves
          ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, speaker1Y, baseRadius, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();

          // Speaker 2 waves (with phase difference)
          const phaseOffset = (phaseDiff / (2 * Math.PI)) * wavelength * scale;
          const radius2 = baseRadius - phaseOffset;
          if (radius2 > 0) {
            ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.beginPath();
            ctx.arc(centerX, speaker2Y, radius2, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
          }
        }
      }
    }

    // Draw speakers
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(centerX - 25, speaker1Y - 20, 30, 40);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(centerX - 25, speaker2Y - 20, 30, 40);

    // Speaker cones
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(centerX - 10, speaker1Y, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX - 10, speaker2Y, 12, 0, 2 * Math.PI);
    ctx.fill();

    // Speaker labels
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('S₁', centerX - 10, speaker1Y - 30);
    ctx.fillText('S₂', centerX - 10, speaker2Y + 40);

    // Draw distance annotation
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - 40, speaker1Y);
    ctx.lineTo(centerX - 40, speaker2Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`d = ${speakerDistance.toFixed(1)} m`, centerX - 45, centerY);

    // Draw observer
    const obsX = centerX + observerX * scale;
    const obsY = centerY - observerY * scale;

    // Path lines to observer
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerX, speaker1Y);
    ctx.lineTo(obsX, obsY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.beginPath();
    ctx.moveTo(centerX, speaker2Y);
    ctx.lineTo(obsX, obsY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Observer point
    const interference = getInterference(observerX, observerY);
    const obsColor = interference.isConstructive ? '#22c55e' :
                     interference.isDestructive ? '#ef4444' : '#8b5cf6';

    ctx.fillStyle = obsColor;
    ctx.beginPath();
    ctx.arc(obsX, obsY, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('P', obsX, obsY + 4);

    // Path lengths display
    ctx.fillStyle = '#93c5fd';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`r₁ = ${interference.r1.toFixed(2)} m`, obsX + 20, obsY - 15);
    ctx.fillStyle = '#fcd34d';
    ctx.fillText(`r₂ = ${interference.r2.toFixed(2)} m`, obsX + 20, obsY);
    ctx.fillStyle = 'white';
    ctx.fillText(`Δr = ${interference.pathDiff.toFixed(3)} m`, obsX + 20, obsY + 15);

    // Legend
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(width - 150, 20, 15, 15);
    ctx.fillStyle = 'white';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Constructive', width - 130, 32);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 40, 15, 15);
    ctx.fillStyle = 'white';
    ctx.fillText('Destructive', width - 130, 52);

    // Wavelength info
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.fillText(`λ = ${wavelength.toFixed(2)} m`, width - 150, 75);

  }, [time, frequency, speakerDistance, amplitude, soundSpeed, wavelength,
      phaseDiff, observerX, observerY, showWaveFronts, showInterferencePattern,
      getInterference]);

  // Draw amplitude graph
  useEffect(() => {
    const canvas = patternCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('y (m)', width / 2, height - 5);
    ctx.fillText('A', 20, 15);

    // Draw amplitude vs y position (at observer's x)
    const x = observerX;
    const yRange = 5; // meters

    // Speaker 1 wave
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let py = 0; py < width - 40; py++) {
      const y = ((py / (width - 40)) - 0.5) * 2 * yRange;
      const r1 = Math.sqrt(x * x + (y - speakerDistance / 2) * (y - speakerDistance / 2));
      const phase1 = 2 * Math.PI * frequency * time - 2 * Math.PI * r1 / wavelength;
      const y1 = amplitude * Math.sin(phase1);
      const canvasY = centerY - y1 * (height / 4);
      if (py === 0) ctx.moveTo(40 + py, canvasY);
      else ctx.lineTo(40 + py, canvasY);
    }
    ctx.stroke();

    // Speaker 2 wave
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    for (let py = 0; py < width - 40; py++) {
      const y = ((py / (width - 40)) - 0.5) * 2 * yRange;
      const r2 = Math.sqrt(x * x + (y + speakerDistance / 2) * (y + speakerDistance / 2));
      const phase2 = 2 * Math.PI * frequency * time - 2 * Math.PI * r2 / wavelength + phaseDiff;
      const y2 = amplitude * Math.sin(phase2);
      const canvasY = centerY - y2 * (height / 4);
      if (py === 0) ctx.moveTo(40 + py, canvasY);
      else ctx.lineTo(40 + py, canvasY);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Resultant wave
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let py = 0; py < width - 40; py++) {
      const y = ((py / (width - 40)) - 0.5) * 2 * yRange;
      const r1 = Math.sqrt(x * x + (y - speakerDistance / 2) * (y - speakerDistance / 2));
      const r2 = Math.sqrt(x * x + (y + speakerDistance / 2) * (y + speakerDistance / 2));
      const phase1 = 2 * Math.PI * frequency * time - 2 * Math.PI * r1 / wavelength;
      const phase2 = 2 * Math.PI * frequency * time - 2 * Math.PI * r2 / wavelength + phaseDiff;
      const yTotal = amplitude * Math.sin(phase1) + amplitude * Math.sin(phase2);
      const canvasY = centerY - yTotal * (height / 4) * 0.5;
      if (py === 0) ctx.moveTo(40 + py, canvasY);
      else ctx.lineTo(40 + py, canvasY);
    }
    ctx.stroke();

    // Mark observer position
    const obsPixelY = 40 + ((observerY / yRange + 1) / 2) * (width - 40);
    if (obsPixelY > 40 && obsPixelY < width) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(obsPixelY, 0);
      ctx.lineTo(obsPixelY, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22c55e';
      ctx.font = '10px Inter';
      ctx.fillText('P', obsPixelY, 12);
    }

    // Legend
    ctx.font = '10px Inter';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('S₁', 50, 15);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('S₂', 70, 15);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText('Σ', 90, 15);

  }, [time, frequency, speakerDistance, amplitude, wavelength, phaseDiff, observerX, observerY]);

  const handleReset = () => {
    setTime(0);
    lastTimeRef.current = 0;
  };

  const interference = getInterference(observerX, observerY);
  const pathDiffInWavelengths = interference.pathDiff / wavelength;
  const interferenceType = interference.isConstructive ? 'Constructive' :
                          interference.isDestructive ? 'Destructive' : 'Partielle';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Interférence de deux haut-parleurs
        </h2>
        <p className="text-gray-600">
          Visualisez les zones d'interférence constructive et destructive
        </p>
      </div>

      {/* Mathematical Equation */}
      <div className="bg-violet-50 rounded-lg p-4 text-center">
        <p className="text-sm text-violet-600 mb-2 font-medium">Condition d'interférence</p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-green-100 rounded p-3">
            <p className="text-green-700 font-medium mb-1">Constructive (max)</p>
            <BlockMath math={`\\Delta r = n\\lambda \\quad (n = 0, \\pm1, \\pm2, ...)`} />
          </div>
          <div className="bg-red-100 rounded p-3">
            <p className="text-red-700 font-medium mb-1">Destructive (min)</p>
            <BlockMath math={`\\Delta r = \\left(n + \\frac{1}{2}\\right)\\lambda`} />
          </div>
        </div>
        <div className="mt-3 p-3 bg-white rounded">
          <p className="text-gray-600 mb-1">Au point P:</p>
          <BlockMath math={`\\Delta r = ${interference.pathDiff.toFixed(3)} \\text{ m} = ${pathDiffInWavelengths.toFixed(2)}\\lambda`} />
          <p className={`font-bold mt-2 ${
            interference.isConstructive ? 'text-green-600' :
            interference.isDestructive ? 'text-red-600' : 'text-violet-600'
          }`}>
            Interférence {interferenceType}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Fréquence</span>
            <span className="text-violet-600 font-mono">{frequency} Hz</span>
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-gray-500">λ = {wavelength.toFixed(2)} m</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Distance entre sources</span>
            <span className="text-violet-600 font-mono">{speakerDistance.toFixed(1)} m</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speakerDistance}
            onChange={(e) => setSpeakerDistance(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Déphasage initial</span>
            <span className="text-violet-600 font-mono">{(phaseDiff / Math.PI).toFixed(2)}π</span>
          </label>
          <input
            type="range"
            min="0"
            max={2 * Math.PI}
            step="0.1"
            value={phaseDiff}
            onChange={(e) => setPhaseDiff(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Position X observateur</span>
            <span className="text-violet-600 font-mono">{observerX.toFixed(1)} m</span>
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="0.1"
            value={observerX}
            onChange={(e) => setObserverX(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Position Y observateur</span>
            <span className="text-violet-600 font-mono">{observerY.toFixed(1)} m</span>
          </label>
          <input
            type="range"
            min="-4"
            max="4"
            step="0.1"
            value={observerY}
            onChange={(e) => setObserverY(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        <div className="space-y-2">
          <label className="font-medium text-gray-700">Affichage</label>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showWaveFronts}
                onChange={(e) => setShowWaveFronts(e.target.checked)}
                className="rounded text-violet-600"
              />
              <span>Fronts d'onde</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInterferencePattern}
                onChange={(e) => setShowInterferencePattern(e.target.checked)}
                className="rounded text-violet-600"
              />
              <span>Patron d'interférence</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800">Vue de dessus</h3>
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full rounded-lg"
        />
      </div>

      {/* Amplitude graph */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800">Amplitude le long de l'axe Y (à x = {observerX.toFixed(1)} m)</h3>
        <canvas
          ref={patternCanvasRef}
          width={700}
          height={150}
          className="w-full rounded-lg"
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

      {/* Results panel */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Mesures au point P</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Distance r₁</p>
            <p className="font-mono text-lg text-blue-600">{interference.r1.toFixed(2)} m</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Distance r₂</p>
            <p className="font-mono text-lg text-amber-600">{interference.r2.toFixed(2)} m</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Différence de marche</p>
            <p className="font-mono text-lg text-gray-900">{interference.pathDiff.toFixed(3)} m</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Amplitude relative</p>
            <p className={`font-mono text-lg ${
              interference.isConstructive ? 'text-green-600' :
              interference.isDestructive ? 'text-red-600' : 'text-violet-600'
            }`}>
              {(interference.resultantAmplitude / (2 * amplitude) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Educational Notes */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Concepts clés</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Interférence constructive</h4>
            <p className="text-green-700">
              Se produit quand Δr = nλ. Les ondes arrivent en phase et s'additionnent.
              L'amplitude résultante est maximale (2A).
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Interférence destructive</h4>
            <p className="text-red-700">
              Se produit quand Δr = (n+½)λ. Les ondes arrivent en opposition de phase
              et s'annulent. L'amplitude résultante est nulle.
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Différence de marche</h4>
            <p className="text-blue-700">
              Δr = r₂ - r₁ est la différence des distances parcourues.
              Elle détermine le déphasage entre les deux ondes au point d'observation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpeakerInterferenceSimulator;
