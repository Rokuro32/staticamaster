'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface Photon {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'solar' | 'infrared';
  absorbed: boolean;
}

interface GasParticle {
  x: number;
  y: number;
  type: 'co2' | 'h2o' | 'ch4' | 'n2o';
}

export function GreenhouseEffectSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const photonsRef = useRef<Photon[]>([]);
  const nextIdRef = useRef(0);

  // Simulation parameters
  const [isPlaying, setIsPlaying] = useState(true);
  const [co2Level, setCo2Level] = useState(400); // ppm (pre-industrial ~280, current ~420)
  const [showLabels, setShowLabels] = useState(true);
  const [emissionRate, setEmissionRate] = useState(0.5);
  const [temperature, setTemperature] = useState(15); // Ground temperature in °C
  const [absorptionCount, setAbsorptionCount] = useState({ solar: 0, ir: 0, escaped: 0, reemitted: 0 });

  // Gas particles based on CO2 level
  const [gasParticles, setGasParticles] = useState<GasParticle[]>([]);

  // Update gas particles when CO2 level changes
  useEffect(() => {
    const numParticles = Math.floor((co2Level - 200) / 10);
    const particles: GasParticle[] = [];
    for (let i = 0; i < Math.max(0, numParticles); i++) {
      particles.push({
        x: 50 + Math.random() * 700,
        y: 100 + Math.random() * 200,
        type: Math.random() < 0.7 ? 'co2' : Math.random() < 0.5 ? 'h2o' : Math.random() < 0.5 ? 'ch4' : 'n2o'
      });
    }
    setGasParticles(particles);
  }, [co2Level]);

  // Calculate equilibrium temperature based on greenhouse effect
  useEffect(() => {
    // Simple model: each 100ppm CO2 adds ~0.5°C
    const baseTemp = 14; // °C without greenhouse effect would be -18°C, with natural is ~15°C
    const additionalWarming = (co2Level - 280) * 0.005;
    setTemperature(Math.round((baseTemp + additionalWarming) * 10) / 10);
  }, [co2Level]);

  const createPhoton = useCallback((type: 'solar' | 'infrared', x?: number, y?: number) => {
    const id = nextIdRef.current++;
    if (type === 'solar') {
      return {
        id,
        x: x ?? 50 + Math.random() * 700,
        y: y ?? 0,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 2 + Math.random(),
        type,
        absorbed: false
      };
    } else {
      return {
        id,
        x: x ?? 50 + Math.random() * 700,
        y: y ?? 450,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random(),
        type,
        absorbed: false
      };
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Atmosphere layer boundaries
    const spaceY = 50;
    const atmosphereTop = 100;
    const atmosphereBottom = 350;
    const groundY = 450;

    let frameCount = 0;

    const animate = () => {
      frameCount++;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw space (dark)
      const spaceGradient = ctx.createLinearGradient(0, 0, 0, spaceY);
      spaceGradient.addColorStop(0, '#0a0a20');
      spaceGradient.addColorStop(1, '#1a1a40');
      ctx.fillStyle = spaceGradient;
      ctx.fillRect(0, 0, width, spaceY);

      // Draw atmosphere layers
      const atmosGradient = ctx.createLinearGradient(0, spaceY, 0, groundY);
      atmosGradient.addColorStop(0, '#87CEEB');
      atmosGradient.addColorStop(0.3, '#add8e6');
      atmosGradient.addColorStop(0.7, '#b0d4e8');
      atmosGradient.addColorStop(1, '#cce7f5');
      ctx.fillStyle = atmosGradient;
      ctx.fillRect(0, spaceY, width, groundY - spaceY);

      // Draw greenhouse gas layer (more opaque with higher CO2)
      const opacity = Math.min(0.4, (co2Level - 200) / 800);
      ctx.fillStyle = `rgba(200, 150, 100, ${opacity})`;
      ctx.fillRect(0, atmosphereTop, width, atmosphereBottom - atmosphereTop);

      // Draw ground
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#228B22');
      groundGradient.addColorStop(0.3, '#1a6b1a');
      groundGradient.addColorStop(1, '#0d3d0d');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);

      // Draw sun
      ctx.beginPath();
      ctx.arc(100, 30, 25, 0, Math.PI * 2);
      const sunGradient = ctx.createRadialGradient(100, 30, 0, 100, 30, 25);
      sunGradient.addColorStop(0, '#ffff80');
      sunGradient.addColorStop(0.5, '#ffdd00');
      sunGradient.addColorStop(1, '#ff8800');
      ctx.fillStyle = sunGradient;
      ctx.fill();

      // Sun rays
      ctx.strokeStyle = '#ffdd0040';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(100 + Math.cos(angle) * 30, 30 + Math.sin(angle) * 30);
        ctx.lineTo(100 + Math.cos(angle) * 45, 30 + Math.sin(angle) * 45);
        ctx.stroke();
      }

      // Draw gas particles
      gasParticles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        switch (particle.type) {
          case 'co2':
            ctx.fillStyle = '#ff6b6b80';
            break;
          case 'h2o':
            ctx.fillStyle = '#6bb3ff80';
            break;
          case 'ch4':
            ctx.fillStyle = '#6bff6b80';
            break;
          case 'n2o':
            ctx.fillStyle = '#ffbb6b80';
            break;
        }
        ctx.fill();
      });

      // Emit new photons
      if (frameCount % Math.floor(30 / emissionRate) === 0) {
        // Solar photon from sun
        photonsRef.current.push(createPhoton('solar'));
      }

      // Emit IR from ground based on temperature
      if (frameCount % Math.floor(20 / emissionRate) === 0) {
        photonsRef.current.push(createPhoton('infrared'));
      }

      // Update and draw photons
      const newAbsorptionCount = { ...absorptionCount };
      const photonsToKeep: Photon[] = [];

      photonsRef.current.forEach(photon => {
        if (photon.absorbed) return;

        // Move photon
        photon.x += photon.vx;
        photon.y += photon.vy;

        // Check boundaries
        if (photon.y < -10 || photon.y > height + 10 || photon.x < -10 || photon.x > width + 10) {
          if (photon.type === 'infrared' && photon.y < 0) {
            newAbsorptionCount.escaped++;
          }
          return; // Remove photon
        }

        // Solar photon hitting ground
        if (photon.type === 'solar' && photon.y > groundY) {
          newAbsorptionCount.solar++;
          // Absorb and emit IR
          setTimeout(() => {
            if (isPlaying) {
              photonsRef.current.push(createPhoton('infrared', photon.x, groundY));
            }
          }, 100);
          return; // Remove solar photon
        }

        // IR photon absorption by greenhouse gases
        if (photon.type === 'infrared' &&
            photon.y > atmosphereTop &&
            photon.y < atmosphereBottom) {
          const absorptionProbability = (co2Level / 1000) * 0.02;
          if (Math.random() < absorptionProbability) {
            newAbsorptionCount.ir++;
            // Re-emit in random direction
            setTimeout(() => {
              if (isPlaying) {
                const reemitted = createPhoton('infrared', photon.x, photon.y);
                reemitted.vy = (Math.random() - 0.5) * 4;
                reemitted.vx = (Math.random() - 0.5) * 2;
                photonsRef.current.push(reemitted);
                newAbsorptionCount.reemitted++;
              }
            }, 50);
            return; // Remove absorbed photon
          }
        }

        // Draw photon
        ctx.beginPath();
        if (photon.type === 'solar') {
          ctx.arc(photon.x, photon.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffdd00';
        } else {
          ctx.arc(photon.x, photon.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ff4444';
        }
        ctx.fill();

        // Add glow effect
        ctx.beginPath();
        ctx.arc(photon.x, photon.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = photon.type === 'solar' ? '#ffdd0030' : '#ff444430';
        ctx.fill();

        photonsToKeep.push(photon);
      });

      photonsRef.current = photonsToKeep;
      setAbsorptionCount(newAbsorptionCount);

      // Draw labels
      if (showLabels) {
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Espace', 10, 35);

        ctx.fillStyle = '#333';
        ctx.fillText('Atmosphère', 10, atmosphereTop + 20);
        ctx.fillText('Couche de gaz à effet de serre', 10, (atmosphereTop + atmosphereBottom) / 2);

        ctx.fillStyle = '#fff';
        ctx.fillText('Surface terrestre', 10, groundY + 20);

        // Legend
        ctx.fillStyle = '#333';
        ctx.fillText('Légende:', width - 150, 80);

        ctx.beginPath();
        ctx.arc(width - 140, 100, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd00';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText('Rayonnement solaire', width - 130, 105);

        ctx.beginPath();
        ctx.arc(width - 140, 125, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText('Rayonnement infrarouge', width - 130, 130);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, co2Level, gasParticles, showLabels, emissionRate, createPhoton, absorptionCount]);

  const resetSimulation = () => {
    photonsRef.current = [];
    nextIdRef.current = 0;
    setAbsorptionCount({ solar: 0, ir: 0, escaped: 0, reemitted: 0 });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
        <h3 className="text-lg font-semibold text-white">Effet de serre</h3>
        <p className="text-orange-100 text-sm">
          Visualisez comment les gaz à effet de serre piègent la chaleur
        </p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full rounded-lg border border-gray-200"
              style={{ backgroundColor: '#0a0a20' }}
            />

            {/* Controls */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Lecture'}
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
              >
                🔄 Réinitialiser
              </button>
              <label className="flex items-center gap-2 ml-4">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Afficher les labels</span>
              </label>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-6">
            {/* CO2 Level */}
            <div className="bg-orange-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-orange-900 mb-2">
                Concentration de CO₂
              </label>
              <input
                type="range"
                min="200"
                max="800"
                value={co2Level}
                onChange={(e) => setCo2Level(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-sm text-orange-700 mt-1">
                <span>200 ppm</span>
                <span className="font-semibold">{co2Level} ppm</span>
                <span>800 ppm</span>
              </div>
              <div className="mt-2 text-xs text-orange-600">
                Pré-industriel: ~280 ppm | Actuel: ~420 ppm
              </div>
            </div>

            {/* Temperature display */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm font-medium text-red-900 mb-2">
                Température moyenne de surface
              </div>
              <div className="text-3xl font-bold text-red-600">
                {temperature}°C
              </div>
              <div className="text-xs text-red-500 mt-1">
                (Sans effet de serre: -18°C)
              </div>
            </div>

            {/* Emission rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux d'émission
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={emissionRate}
                onChange={(e) => setEmissionRate(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="text-sm text-gray-500 text-center">{emissionRate.toFixed(1)}x</div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Statistiques</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-600">☀️ Solaire absorbé:</span>
                  <span>{absorptionCount.solar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">🔥 IR absorbé:</span>
                  <span>{absorptionCount.ir}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">🚀 IR échappé:</span>
                  <span>{absorptionCount.escaped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">↩️ IR réémis:</span>
                  <span>{absorptionCount.reemitted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Comment fonctionne l'effet de serre?</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li><strong>Rayonnement solaire</strong> (lumière visible, ondes courtes) traverse l'atmosphère et atteint la surface</li>
                <li><strong>La Terre absorbe</strong> l'énergie et se réchauffe</li>
                <li><strong>Rayonnement infrarouge</strong> (ondes longues) est émis par la surface chaude</li>
                <li><strong>Les gaz à effet de serre</strong> (CO₂, H₂O, CH₄) absorbent et réémettent l'IR</li>
                <li>Une partie de l'IR est <strong>renvoyée vers la surface</strong>, la réchauffant davantage</li>
              </ol>
            </div>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Bilan radiatif :</span>
                <BlockMath math="P_{in} = P_{out} \text{ à l'équilibre}" />
              </div>
              <div className="text-sm">
                <span className="font-medium">Loi de Stefan-Boltzmann :</span>
                <BlockMath math="P = \sigma T^4" />
              </div>
              <div className="text-xs text-gray-500">
                où <InlineMath math="\sigma = 5.67 \times 10^{-8}" /> W/(m²·K⁴)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
