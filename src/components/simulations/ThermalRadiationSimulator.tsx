'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type ViewMode = 'spectrum' | 'comparison' | 'wienShift' | 'powerBalance';

// Physical constants
const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)
const WIEN_CONSTANT = 2.898e-3; // m·K
const PLANCK_H = 6.626e-34; // J·s
const BOLTZMANN_K = 1.381e-23; // J/K
const SPEED_OF_LIGHT = 3e8; // m/s

export function ThermalRadiationSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Simulation state
  const [viewMode, setViewMode] = useState<ViewMode>('spectrum');
  const [temperature, setTemperature] = useState(5778); // Sun's surface temperature
  const [temperature2, setTemperature2] = useState(300); // Earth's temperature
  const [emissivity, setEmissivity] = useState(1); // Perfect blackbody
  const [surfaceArea, setSurfaceArea] = useState(1); // m²
  const [showWienPeak, setShowWienPeak] = useState(true);
  const [showTotalPower, setShowTotalPower] = useState(true);
  const [logScale, setLogScale] = useState(false);

  // Preset temperatures
  const presets = [
    { name: 'Soleil', temp: 5778, emoji: '☀️' },
    { name: 'Lave', temp: 1200, emoji: '🌋' },
    { name: 'Métal chauffé', temp: 800, emoji: '🔥' },
    { name: 'Four', temp: 500, emoji: '🔲' },
    { name: 'Corps humain', temp: 310, emoji: '🧍' },
    { name: 'Terre', temp: 288, emoji: '🌍' },
    { name: 'Glace', temp: 273, emoji: '❄️' },
  ];

  // Planck's law: spectral radiance
  const planckRadiance = useCallback((wavelength: number, T: number): number => {
    // wavelength in nm, T in K
    const lambda = wavelength * 1e-9; // convert to m
    const c1 = 2 * PLANCK_H * Math.pow(SPEED_OF_LIGHT, 2);
    const c2 = (PLANCK_H * SPEED_OF_LIGHT) / (BOLTZMANN_K * T);
    const exponent = c2 / lambda;
    if (exponent > 700) return 0; // Avoid overflow
    return c1 / (Math.pow(lambda, 5) * (Math.exp(exponent) - 1));
  }, []);

  // Wien's displacement law
  const wienPeak = useCallback((T: number): number => {
    return (WIEN_CONSTANT / T) * 1e9; // in nm
  }, []);

  // Stefan-Boltzmann total power
  const totalPower = useCallback((T: number, epsilon: number = 1, A: number = 1): number => {
    return epsilon * STEFAN_BOLTZMANN * Math.pow(T, 4) * A;
  }, []);

  // Get color for wavelength
  const wavelengthToColor = useCallback((wavelength: number): string => {
    // wavelength in nm
    let r, g, b;

    if (wavelength < 380) {
      return 'rgb(50, 0, 80)'; // UV - dark purple
    } else if (wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (wavelength < 490) {
      r = 0;
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength < 510) {
      r = 0;
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
      b = 0;
    } else if (wavelength < 780) {
      r = 1;
      g = 0;
      b = 0;
    } else {
      return 'rgb(80, 0, 0)'; // IR - dark red
    }

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }, []);

  // Get blackbody color for temperature
  const temperatureToColor = useCallback((T: number): string => {
    // Simplified color temperature approximation
    const temp = T / 100;
    let r, g, b;

    if (temp <= 66) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
      b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    } else {
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      b = 255;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }, []);

  // Draw spectrum
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Determine wavelength range based on view mode
    let lambdaMin: number, lambdaMax: number;
    if (viewMode === 'spectrum' || viewMode === 'wienShift') {
      // Adjust range based on temperature
      const peak = wienPeak(temperature);
      lambdaMin = Math.max(100, peak * 0.1);
      lambdaMax = Math.min(20000, peak * 10);
    } else {
      lambdaMin = 100;
      lambdaMax = 15000;
    }

    // Draw visible light background
    const visibleStart = (380 - lambdaMin) / (lambdaMax - lambdaMin) * plotWidth + padding.left;
    const visibleEnd = (780 - lambdaMin) / (lambdaMax - lambdaMin) * plotWidth + padding.left;

    if (visibleEnd > padding.left && visibleStart < width - padding.right) {
      for (let x = Math.max(padding.left, visibleStart); x < Math.min(width - padding.right, visibleEnd); x++) {
        const lambda = lambdaMin + (x - padding.left) / plotWidth * (lambdaMax - lambdaMin);
        ctx.fillStyle = wavelengthToColor(lambda) + '30';
        ctx.fillRect(x, padding.top, 1, plotHeight);
      }
    }

    // Calculate max radiance for scaling
    const temps = viewMode === 'comparison' ? [temperature, temperature2] : [temperature];
    let maxRadiance = 0;
    for (const T of temps) {
      const peakLambda = wienPeak(T);
      const peakRadiance = planckRadiance(peakLambda, T);
      maxRadiance = Math.max(maxRadiance, peakRadiance);
    }

    // Draw Planck curves
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
    temps.forEach((T, idx) => {
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = 2;
      ctx.beginPath();

      let firstPoint = true;
      for (let x = padding.left; x <= width - padding.right; x++) {
        const lambda = lambdaMin + (x - padding.left) / plotWidth * (lambdaMax - lambdaMin);
        let radiance = planckRadiance(lambda, T);

        let y: number;
        if (logScale && radiance > 0) {
          const logMax = Math.log10(maxRadiance);
          const logMin = logMax - 10;
          const logRad = Math.log10(radiance);
          y = padding.top + plotHeight * (1 - (logRad - logMin) / (logMax - logMin));
        } else {
          y = padding.top + plotHeight * (1 - radiance / maxRadiance);
        }

        y = Math.max(padding.top, Math.min(padding.top + plotHeight, y));

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw Wien peak marker
      if (showWienPeak) {
        const peakLambda = wienPeak(T);
        const peakX = padding.left + (peakLambda - lambdaMin) / (lambdaMax - lambdaMin) * plotWidth;
        if (peakX > padding.left && peakX < width - padding.right) {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = colors[idx] + '80';
          ctx.beginPath();
          ctx.moveTo(peakX, padding.top);
          ctx.lineTo(peakX, padding.top + plotHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Label
          ctx.fillStyle = colors[idx];
          ctx.font = '12px system-ui';
          ctx.textAlign = 'center';
          const labelText = peakLambda > 1000 ? `${(peakLambda/1000).toFixed(2)} µm` : `${Math.round(peakLambda)} nm`;
          ctx.fillText(`λmax = ${labelText}`, peakX, padding.top - 10);
        }
      }

      // Temperature label
      ctx.fillStyle = colors[idx];
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`T = ${T} K`, padding.left + 10 + idx * 120, padding.top + 25);
    });

    // Draw axes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(width - padding.right, padding.top + plotHeight);
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
      const lambda = lambdaMin + (i / numXTicks) * (lambdaMax - lambdaMin);
      const x = padding.left + (i / numXTicks) * plotWidth;
      const label = lambda > 1000 ? `${(lambda/1000).toFixed(1)}µm` : `${Math.round(lambda)}nm`;
      ctx.fillText(label, x, height - padding.bottom + 20);

      // Tick
      ctx.beginPath();
      ctx.moveTo(x, padding.top + plotHeight);
      ctx.lineTo(x, padding.top + plotHeight + 5);
      ctx.stroke();
    }

    // X-axis title
    ctx.font = '14px system-ui';
    ctx.fillText('Longueur d\'onde λ', width / 2, height - 10);

    // Y-axis title
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Radiance spectrale B(λ,T)', 0, 0);
    ctx.restore();

    // Region labels
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#888';
    if (lambdaMin < 380) {
      const uvX = padding.left + (300 - lambdaMin) / (lambdaMax - lambdaMin) * plotWidth;
      if (uvX > padding.left) ctx.fillText('UV', uvX, padding.top + plotHeight - 10);
    }
    ctx.fillText('Visible', (visibleStart + visibleEnd) / 2, padding.top + plotHeight - 10);
    if (lambdaMax > 780) {
      const irX = padding.left + (2000 - lambdaMin) / (lambdaMax - lambdaMin) * plotWidth;
      if (irX < width - padding.right) ctx.fillText('IR', irX, padding.top + plotHeight - 10);
    }

  }, [temperature, temperature2, viewMode, showWienPeak, logScale, planckRadiance, wienPeak, wavelengthToColor]);

  // Calculate values
  const peak1 = wienPeak(temperature);
  const peak2 = wienPeak(temperature2);
  const power1 = totalPower(temperature, emissivity, surfaceArea);
  const power2 = totalPower(temperature2, emissivity, surfaceArea);

  // Format power with appropriate unit
  const formatPower = (p: number): string => {
    if (p >= 1e9) return `${(p/1e9).toFixed(2)} GW`;
    if (p >= 1e6) return `${(p/1e6).toFixed(2)} MW`;
    if (p >= 1e3) return `${(p/1e3).toFixed(2)} kW`;
    return `${p.toFixed(2)} W`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4">
        <h3 className="text-lg font-semibold text-white">Rayonnement thermique et énergie transportée</h3>
        <p className="text-red-100 text-sm">
          Loi de Planck, loi de Wien et loi de Stefan-Boltzmann
        </p>
      </div>

      <div className="p-6">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'spectrum', label: 'Spectre de corps noir', icon: '📊' },
            { id: 'comparison', label: 'Comparaison', icon: '⚖️' },
            { id: 'wienShift', label: 'Déplacement de Wien', icon: '📏' },
            { id: 'powerBalance', label: 'Bilan de puissance', icon: '⚡' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as ViewMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <canvas
              ref={canvasRef}
              width={700}
              height={400}
              className="w-full rounded-lg"
            />

            {/* Quick options */}
            <div className="flex gap-4 mt-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showWienPeak}
                  onChange={(e) => setShowWienPeak(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Pic de Wien</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={logScale}
                  onChange={(e) => setLogScale(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Échelle log</span>
              </label>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Temperature 1 */}
            <div className="bg-red-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-900 mb-2">
                Température 1
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between items-center mt-2">
                <span
                  className="text-2xl font-bold"
                  style={{ color: temperatureToColor(temperature) }}
                >
                  {temperature} K
                </span>
                <span className="text-sm text-gray-500">
                  ({(temperature - 273).toFixed(0)}°C)
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1 mt-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setTemperature(preset.temp)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      temperature === preset.temp
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-red-100'
                    }`}
                    title={preset.name}
                  >
                    {preset.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature 2 (for comparison mode) */}
            {viewMode === 'comparison' && (
              <div className="bg-teal-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-teal-900 mb-2">
                  Température 2
                </label>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  value={temperature2}
                  onChange={(e) => setTemperature2(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <div className="flex justify-between items-center mt-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: temperatureToColor(temperature2) }}
                  >
                    {temperature2} K
                  </span>
                  <span className="text-sm text-gray-500">
                    ({(temperature2 - 273).toFixed(0)}°C)
                  </span>
                </div>
              </div>
            )}

            {/* Power calculations */}
            {viewMode === 'powerBalance' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Émissivité ε
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={emissivity}
                    onChange={(e) => setEmissivity(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-500">{emissivity.toFixed(2)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surface A (m²)
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="10"
                    step="0.01"
                    value={surfaceArea}
                    onChange={(e) => setSurfaceArea(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-500">{surfaceArea.toFixed(2)} m²</div>
                </div>
              </div>
            )}

            {/* Results */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Résultats</div>

              <div className="p-3 bg-white rounded border">
                <div className="text-xs text-gray-500 mb-1">Loi de Wien (λmax)</div>
                <div className="font-mono text-lg text-red-600">
                  {peak1 > 1000 ? `${(peak1/1000).toFixed(2)} µm` : `${Math.round(peak1)} nm`}
                </div>
                <div className="text-xs text-gray-400">
                  {peak1 < 380 ? 'UV' : peak1 < 780 ? 'Visible' : 'Infrarouge'}
                </div>
              </div>

              <div className="p-3 bg-white rounded border">
                <div className="text-xs text-gray-500 mb-1">Puissance émise (Stefan-Boltzmann)</div>
                <div className="font-mono text-lg text-orange-600">
                  {formatPower(power1)}
                </div>
                <div className="text-xs text-gray-400">
                  par {surfaceArea} m² de surface
                </div>
              </div>

              {viewMode === 'comparison' && (
                <div className="p-3 bg-white rounded border border-teal-200">
                  <div className="text-xs text-gray-500 mb-1">Rapport des puissances</div>
                  <div className="font-mono text-lg text-teal-600">
                    P₁/P₂ = {(power1/power2).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    (T₁/T₂)⁴ = {Math.pow(temperature/temperature2, 4).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulas */}
        <div className="mt-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Lois du rayonnement thermique</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm font-medium text-gray-700 mb-2">Loi de Planck</div>
              <BlockMath math="B(\lambda, T) = \frac{2hc^2}{\lambda^5} \cdot \frac{1}{e^{\frac{hc}{\lambda k_B T}} - 1}" />
              <p className="text-xs text-gray-500 mt-2">
                Distribution spectrale de la radiance d'un corps noir
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm font-medium text-gray-700 mb-2">Loi de Wien</div>
              <BlockMath math="\lambda_{max} = \frac{b}{T}" />
              <p className="text-xs text-gray-500 mt-2">
                où <InlineMath math="b = 2,898 \times 10^{-3}" /> m·K
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm font-medium text-gray-700 mb-2">Loi de Stefan-Boltzmann</div>
              <BlockMath math="P = \varepsilon \sigma A T^4" />
              <p className="text-xs text-gray-500 mt-2">
                où <InlineMath math="\sigma = 5,67 \times 10^{-8}" /> W/(m²·K⁴)
              </p>
            </div>
          </div>
        </div>

        {/* Applications */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <h5 className="font-medium text-yellow-800 mb-2">☀️ Rayonnement solaire</h5>
            <p className="text-sm text-yellow-700">
              Le Soleil (5778 K) émet principalement dans le visible.
              Sa puissance totale est de 3,8×10²⁶ W.
              La constante solaire à la Terre est ~1361 W/m².
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2">🌍 Rayonnement terrestre</h5>
            <p className="text-sm text-blue-700">
              La Terre (~288 K) émet dans l'infrarouge (λmax ≈ 10 µm).
              Ce rayonnement IR est absorbé par les gaz à effet de serre,
              contribuant au réchauffement climatique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
