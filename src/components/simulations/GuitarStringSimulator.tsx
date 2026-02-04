'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

const NUM_MODES = 12; // Number of harmonics to consider
const MODE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
];

export function GuitarStringSimulator() {
  // String parameters
  const [stringLength] = useState(1); // Normalized length
  const [pluckPosition, setPluckPosition] = useState(0.2); // Where we pluck (0-1)
  const [pluckAmplitude, setPluckAmplitude] = useState(0.15); // Initial displacement
  const [damping, setDamping] = useState(0.5); // Damping coefficient
  const [fundamentalFreq, setFundamentalFreq] = useState(110); // A2 note = 110 Hz

  // Visualization settings
  const [showModes, setShowModes] = useState(true);
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [numVisibleModes, setNumVisibleModes] = useState(6);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const stringCanvasRef = useRef<HTMLCanvasElement>(null);
  const fourierCanvasRef = useRef<HTMLCanvasElement>(null);
  const modesCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas dimensions
  const stringCanvasWidth = 700;
  const stringCanvasHeight = 200;
  const fourierCanvasWidth = 350;
  const fourierCanvasHeight = 200;
  const modesCanvasWidth = 350;
  const modesCanvasHeight = 200;

  // Calculate mode amplitudes based on pluck position
  // When plucking at position p, amplitude of mode n is proportional to sin(n*π*p) / n²
  const getModeAmplitudes = useCallback(() => {
    const amplitudes: number[] = [];
    for (let n = 1; n <= NUM_MODES; n++) {
      const amp = Math.sin(n * Math.PI * pluckPosition) / (n * n);
      amplitudes.push(amp * pluckAmplitude * 4); // Scale factor for visibility
    }
    return amplitudes;
  }, [pluckPosition, pluckAmplitude]);

  // Calculate string displacement at position x and time t
  const getStringDisplacement = useCallback((x: number, t: number) => {
    const amplitudes = getModeAmplitudes();
    let y = 0;
    const dampingFactor = Math.exp(-damping * t);

    for (let n = 1; n <= NUM_MODES; n++) {
      const omega = 2 * Math.PI * fundamentalFreq * n;
      const modeShape = Math.sin(n * Math.PI * x / stringLength);
      const timeOscillation = Math.cos(omega * t * 0.01); // Slowed down for visualization
      y += amplitudes[n - 1] * modeShape * timeOscillation * dampingFactor;
    }
    return y;
  }, [getModeAmplitudes, stringLength, fundamentalFreq, damping]);

  // Get displacement for a single mode
  const getSingleModeDisplacement = useCallback((x: number, t: number, n: number) => {
    const amplitudes = getModeAmplitudes();
    const omega = 2 * Math.PI * fundamentalFreq * n;
    const dampingFactor = Math.exp(-damping * t);
    const modeShape = Math.sin(n * Math.PI * x / stringLength);
    const timeOscillation = Math.cos(omega * t * 0.01);
    return amplitudes[n - 1] * modeShape * timeOscillation * dampingFactor;
  }, [getModeAmplitudes, stringLength, fundamentalFreq, damping]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const animate = (currentTime: number) => {
        const dt = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;
        setTime(prev => prev + dt);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Draw string vibration
  const drawString = useCallback(() => {
    const canvas = stringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 40, right: 40, top: 30, bottom: 30 };
    const width = stringCanvasWidth - padding.left - padding.right;
    const height = stringCanvasHeight - padding.top - padding.bottom;
    const centerY = padding.top + height / 2;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, stringCanvasWidth, stringCanvasHeight);

    // Draw guitar body hints
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(padding.left - 10, centerY, 15, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(stringCanvasWidth - padding.right + 10, centerY, 15, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw bridge markers
    ctx.fillStyle = '#78350f';
    ctx.fillRect(padding.left - 5, centerY - 50, 10, 100);
    ctx.fillRect(stringCanvasWidth - padding.right - 5, centerY - 50, 10, 100);

    // Draw equilibrium line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, centerY);
    ctx.lineTo(stringCanvasWidth - padding.right, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw pluck position marker
    const pluckX = padding.left + pluckPosition * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pluckX, padding.top);
    ctx.lineTo(pluckX, stringCanvasHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pluck position label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`Pincement: ${(pluckPosition * 100).toFixed(0)}%`, pluckX, padding.top - 8);

    // Draw individual modes if enabled
    if (showModes && selectedMode === null) {
      const amplitudes = getModeAmplitudes();
      for (let n = numVisibleModes; n >= 1; n--) {
        ctx.strokeStyle = MODE_COLORS[(n - 1) % MODE_COLORS.length] + '40';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const x = i / 200;
          const canvasX = padding.left + x * width;
          const y = getSingleModeDisplacement(x, time, n);
          const canvasY = centerY - y * height * 2;
          if (i === 0) ctx.moveTo(canvasX, canvasY);
          else ctx.lineTo(canvasX, canvasY);
        }
        ctx.stroke();
      }
    }

    // Draw selected mode highlighted
    if (selectedMode !== null) {
      ctx.strokeStyle = MODE_COLORS[(selectedMode - 1) % MODE_COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const canvasX = padding.left + x * width;
        const y = getSingleModeDisplacement(x, time, selectedMode);
        const canvasY = centerY - y * height * 2;
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
    }

    // Draw total string displacement
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = i / 300;
      const canvasX = padding.left + x * width;
      const y = getStringDisplacement(x, time);
      const canvasY = centerY - y * height * 2;
      if (i === 0) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Draw fixed endpoints
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(padding.left, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(stringCanvasWidth - padding.right, centerY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, stringCanvasHeight - 10);
    ctx.fillText('L', stringCanvasWidth - padding.right, stringCanvasHeight - 10);
    ctx.fillText('L/2', padding.left + width / 2, stringCanvasHeight - 10);

    // Title
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Vibration de la corde', 10, 18);

  }, [time, pluckPosition, showModes, selectedMode, numVisibleModes, getStringDisplacement, getSingleModeDisplacement, getModeAmplitudes]);

  // Draw Fourier spectrum
  const drawFourier = useCallback(() => {
    const canvas = fourierCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 45, right: 20, top: 30, bottom: 40 };
    const width = fourierCanvasWidth - padding.left - padding.right;
    const height = fourierCanvasHeight - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, fourierCanvasWidth, fourierCanvasHeight);

    const amplitudes = getModeAmplitudes();
    const maxAmp = Math.max(...amplitudes.map(Math.abs), 0.01);
    const dampingFactor = Math.exp(-damping * time);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(fourierCanvasWidth - padding.right, y);
      ctx.stroke();
    }

    // Draw bars
    const barWidth = width / NUM_MODES - 4;
    for (let n = 1; n <= NUM_MODES; n++) {
      const amp = Math.abs(amplitudes[n - 1]) * dampingFactor;
      const barHeight = (amp / maxAmp) * height * 0.9;
      const x = padding.left + ((n - 1) / NUM_MODES) * width + 2;
      const y = padding.top + height - barHeight;

      // Bar
      const color = MODE_COLORS[(n - 1) % MODE_COLORS.length];
      ctx.fillStyle = selectedMode === n ? color : color + (selectedMode === null ? 'cc' : '40');
      ctx.fillRect(x, y, barWidth, barHeight);

      // Border for selected
      if (selectedMode === n) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
      }

      // Mode number
      ctx.fillStyle = selectedMode === n || selectedMode === null ? '#374151' : '#9ca3af';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${n}`, x + barWidth / 2, fourierCanvasHeight - padding.bottom + 12);

      // Frequency
      ctx.fillStyle = '#6b7280';
      ctx.font = '8px system-ui';
      ctx.fillText(`${(fundamentalFreq * n).toFixed(0)}`, x + barWidth / 2, fourierCanvasHeight - padding.bottom + 24);
    }

    // Y axis label
    ctx.fillStyle = '#374151';
    ctx.font = '10px system-ui';
    ctx.save();
    ctx.translate(12, padding.top + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude |Aₙ|', 0, 0);
    ctx.restore();

    // X axis label
    ctx.fillStyle = '#374151';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Mode n (fréquence Hz)', fourierCanvasWidth / 2, fourierCanvasHeight - 5);

    // Title
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Spectre de Fourier', 10, 18);

  }, [getModeAmplitudes, selectedMode, fundamentalFreq, damping, time]);

  // Draw modes visualization
  const drawModes = useCallback(() => {
    const canvas = modesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 30, right: 20, top: 25, bottom: 20 };
    const width = modesCanvasWidth - padding.left - padding.right;
    const totalHeight = modesCanvasHeight - padding.top - padding.bottom;
    const modeHeight = totalHeight / numVisibleModes;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, modesCanvasWidth, modesCanvasHeight);

    const amplitudes = getModeAmplitudes();

    for (let n = 1; n <= numVisibleModes; n++) {
      const centerY = padding.top + (n - 0.5) * modeHeight;
      const color = MODE_COLORS[(n - 1) % MODE_COLORS.length];

      // Mode label
      ctx.fillStyle = selectedMode === n || selectedMode === null ? color : '#9ca3af';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`n=${n}`, padding.left - 5, centerY + 4);

      // Equilibrium line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, centerY);
      ctx.lineTo(modesCanvasWidth - padding.right, centerY);
      ctx.stroke();

      // Mode shape (standing wave pattern)
      ctx.strokeStyle = selectedMode === n || selectedMode === null ? color : color + '40';
      ctx.lineWidth = selectedMode === n ? 2.5 : 1.5;
      ctx.beginPath();

      const displayAmp = modeHeight * 0.35;
      const phaseAmp = Math.abs(amplitudes[n - 1]) > 0.001 ? Math.cos(2 * Math.PI * fundamentalFreq * n * time * 0.01) : 1;

      for (let i = 0; i <= 100; i++) {
        const x = i / 100;
        const canvasX = padding.left + x * width;
        const y = Math.sin(n * Math.PI * x) * displayAmp * phaseAmp * Math.sign(amplitudes[n - 1] || 1);
        const canvasY = centerY - y;
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();

      // Draw nodes
      ctx.fillStyle = '#374151';
      for (let k = 0; k <= n; k++) {
        const nodeX = padding.left + (k / n) * width;
        ctx.beginPath();
        ctx.arc(nodeX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Amplitude indicator
      const ampPercent = Math.abs(amplitudes[n - 1]) / Math.max(...amplitudes.map(Math.abs), 0.01) * 100;
      ctx.fillStyle = '#6b7280';
      ctx.font = '8px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${ampPercent.toFixed(0)}%`, modesCanvasWidth - padding.right + 3, centerY + 3);
    }

    // Pluck position indicator on each mode
    const pluckX = padding.left + pluckPosition * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(pluckX, padding.top);
    ctx.lineTo(pluckX, modesCanvasHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Title
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Modes propres', 10, 16);

  }, [numVisibleModes, getModeAmplitudes, selectedMode, pluckPosition, fundamentalFreq, time]);

  // Draw all canvases
  useEffect(() => {
    drawString();
    drawFourier();
    drawModes();
  }, [drawString, drawFourier, drawModes]);

  // Pluck the string
  const handlePluck = () => {
    setTime(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTime(0);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎸</span>
          <div>
            <h3 className="font-bold text-gray-800">Vibration d'une corde de guitare</h3>
            <p className="text-xs text-gray-600">
              Observez comment la position du pincement affecte les harmoniques de la corde
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Main string visualization */}
        <div className="mb-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <canvas
              ref={stringCanvasRef}
              width={stringCanvasWidth}
              height={stringCanvasHeight}
              className="w-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const padding = 40 / stringCanvasWidth;
                const normalizedX = (x - padding) / (1 - 2 * padding);
                if (normalizedX >= 0.05 && normalizedX <= 0.95) {
                  setPluckPosition(normalizedX);
                  handlePluck();
                }
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            Cliquez sur la corde pour changer la position du pincement
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Left: Pluck controls */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Contrôles</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-1">
                  Position du pincement: {(pluckPosition * 100).toFixed(0)}% de L
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={pluckPosition}
                  onChange={(e) => { setPluckPosition(parseFloat(e.target.value)); handlePluck(); }}
                  className="w-full accent-amber-500 h-4"
                />
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>Chevalet</span>
                  <span>Milieu</span>
                  <span>Sillet</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-blue-700 mb-1">
                  Fréquence fondamentale: {fundamentalFreq} Hz
                </label>
                <input
                  type="range"
                  min="55"
                  max="440"
                  step="1"
                  value={fundamentalFreq}
                  onChange={(e) => setFundamentalFreq(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-4"
                />
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>A1 (55Hz)</span>
                  <span>A2 (110Hz)</span>
                  <span>A4 (440Hz)</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-purple-700 mb-1">
                  Amortissement: {damping.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-4"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePluck}
                  className="flex-1 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded hover:bg-amber-600 transition-colors"
                >
                  🎵 Pincer la corde
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold rounded transition-colors",
                    isPlaying ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
                  )}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300 transition-colors"
                >
                  ↺
                </button>
              </div>
            </div>
          </div>

          {/* Right: Display options */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Affichage des modes</h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showModes}
                  onChange={(e) => setShowModes(e.target.checked)}
                  className="accent-emerald-500"
                />
                Superposer les modes individuels
              </label>

              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">
                  Nombre de modes affichés: {numVisibleModes}
                </label>
                <input
                  type="range"
                  min="1"
                  max={NUM_MODES}
                  step="1"
                  value={numVisibleModes}
                  onChange={(e) => setNumVisibleModes(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 h-4"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">
                  Isoler un mode:
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedMode(null)}
                    className={cn(
                      "px-2 py-1 text-[10px] rounded transition-colors",
                      selectedMode === null
                        ? "bg-gray-700 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    )}
                  >
                    Tous
                  </button>
                  {Array.from({ length: Math.min(8, NUM_MODES) }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setSelectedMode(selectedMode === n ? null : n)}
                      className={cn(
                        "w-6 h-6 text-[10px] rounded transition-colors font-medium",
                        selectedMode === n
                          ? "text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      )}
                      style={selectedMode === n ? { backgroundColor: MODE_COLORS[(n - 1) % MODE_COLORS.length] } : {}}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMode !== null && (
                <div className="p-2 rounded bg-white border text-xs">
                  <p className="font-medium" style={{ color: MODE_COLORS[(selectedMode - 1) % MODE_COLORS.length] }}>
                    Mode n = {selectedMode}
                  </p>
                  <p className="text-gray-600">
                    Fréquence: {(fundamentalFreq * selectedMode).toFixed(0)} Hz
                  </p>
                  <p className="text-gray-600">
                    {selectedMode} ventres, {selectedMode + 1} nœuds
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fourier and Modes visualization */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-indigo-200 rounded-lg overflow-hidden">
            <canvas
              ref={fourierCanvasRef}
              width={fourierCanvasWidth}
              height={fourierCanvasHeight}
              className="w-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const padding = 45 / fourierCanvasWidth;
                const normalizedX = (x - padding) / (1 - padding - 20 / fourierCanvasWidth);
                const modeIndex = Math.floor(normalizedX * NUM_MODES) + 1;
                if (modeIndex >= 1 && modeIndex <= NUM_MODES) {
                  setSelectedMode(selectedMode === modeIndex ? null : modeIndex);
                }
              }}
            />
          </div>
          <div className="border border-emerald-200 rounded-lg overflow-hidden">
            <canvas
              ref={modesCanvasRef}
              width={modesCanvasWidth}
              height={modesCanvasHeight}
              className="w-full"
            />
          </div>
        </div>

        {/* Physics explanation */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Physique du pincement</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-2">
                Quand on pince une corde à la position <InlineMath math="x_p" />, l'amplitude du mode <InlineMath math="n" /> est:
              </p>
              <div className="bg-white px-3 py-2 rounded border shadow-sm text-center mb-2">
                <InlineMath math="A_n \propto \frac{\sin(n\pi x_p/L)}{n^2}" />
              </div>
              <p className="text-[10px] text-gray-500">
                Les modes dont un nœud coïncide avec le point de pincement ont une amplitude nulle.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-2">
                La forme de la corde est la somme de tous les modes:
              </p>
              <div className="bg-white px-3 py-2 rounded border shadow-sm text-center mb-2">
                <InlineMath math="y(x,t) = \sum_{n=1}^{\infty} A_n \sin\left(\frac{n\pi x}{L}\right) \cos(n\omega_1 t)" />
              </div>
              <p className="text-[10px] text-gray-500">
                où <InlineMath math="\omega_1 = 2\pi f_1" /> est la pulsation fondamentale.
              </p>
            </div>
          </div>

          <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>💡 Astuce:</strong> Pincez au milieu (50%) pour n'exciter que les harmoniques impairs.
              Pincez à 1/3 (33%) pour supprimer le 3ème harmonique et ses multiples.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuitarStringSimulator;
