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
  trail: { x: number; y: number }[];
  justEmitted?: boolean;
  flashTimer?: number;
}

interface Stats {
  solarAbsorbed: number;
  irEmittedUp: number;
  irAbsorbed: number;
  irEscaped: number;
  irReturnedToGround: number;
}

export function GreenhouseEffectSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const photonsRef = useRef<Photon[]>([]);
  const statsRef = useRef<Stats>({ solarAbsorbed: 0, irEmittedUp: 0, irAbsorbed: 0, irEscaped: 0, irReturnedToGround: 0 });
  const nextIdRef = useRef(0);
  const frameCountRef = useRef(0);

  // Simulation parameters
  const [isPlaying, setIsPlaying] = useState(true);
  const [co2Level, setCo2Level] = useState(400);
  const [showLabels, setShowLabels] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState<Stats>({ solarAbsorbed: 0, irEmittedUp: 0, irAbsorbed: 0, irEscaped: 0, irReturnedToGround: 0 });
  const [groundTemp, setGroundTemp] = useState(15);
  const [energyBalance, setEnergyBalance] = useState(0);

  // Flash effects for absorption/emission
  const [flashEffects, setFlashEffects] = useState<{ x: number; y: number; type: 'absorb' | 'emit'; timer: number }[]>([]);

  // Calculate temperature
  useEffect(() => {
    const baseTemp = 14;
    const warming = (co2Level - 280) * 0.006;
    setGroundTemp(Math.round((baseTemp + warming) * 10) / 10);
  }, [co2Level]);

  // Update displayed stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({ ...statsRef.current });
      // Energy balance: incoming vs outgoing
      const incoming = statsRef.current.solarAbsorbed;
      const outgoing = statsRef.current.irEscaped;
      if (incoming > 0) {
        setEnergyBalance(Math.round((1 - outgoing / incoming) * 100));
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const createPhoton = useCallback((type: 'solar' | 'infrared', x?: number, y?: number, goingDown?: boolean): Photon => {
    const id = nextIdRef.current++;
    const speed = 3;

    if (type === 'solar') {
      const startX = x ?? 80 + Math.random() * 200;
      return {
        id,
        x: startX,
        y: y ?? -5,
        vx: 0.3,
        vy: speed,
        type,
        trail: [],
        justEmitted: true,
        flashTimer: 10
      };
    } else {
      const startX = x ?? 50 + Math.random() * 700;
      const startY = y ?? 440;
      const angle = goingDown
        ? Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8  // Going down
        : -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.3; // Going up
      return {
        id,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed * 0.5,
        vy: Math.sin(angle) * speed,
        type,
        trail: [],
        justEmitted: true,
        flashTimer: 10
      };
    }
  }, []);

  // Main animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Layer positions
    const spaceY = 60;
    const atmosphereTop = 120;
    const greenhouseTop = 180;
    const greenhouseBottom = 320;
    const groundY = 440;

    // Gas molecule positions (for visualization)
    const gasMolecules: { x: number; y: number }[] = [];
    const numMolecules = Math.floor((co2Level - 150) / 8);
    for (let i = 0; i < numMolecules; i++) {
      gasMolecules.push({
        x: 30 + (i % 25) * 30 + Math.random() * 10,
        y: greenhouseTop + 20 + Math.floor(i / 25) * 35 + Math.random() * 10
      });
    }

    const animate = () => {
      frameCountRef.current++;
      const frame = frameCountRef.current;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw space
      ctx.fillStyle = '#0c0c24';
      ctx.fillRect(0, 0, width, spaceY);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 47 + frame * 0.01) % width;
        const sy = (i * 23) % spaceY;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Sun
      const sunX = 100;
      const sunY = 35;
      ctx.beginPath();
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 35);
      sunGrad.addColorStop(0, '#ffff99');
      sunGrad.addColorStop(0.5, '#ffcc00');
      sunGrad.addColorStop(1, '#ff880040');
      ctx.fillStyle = sunGrad;
      ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
      ctx.fill();

      // Sun rays animation
      ctx.strokeStyle = '#ffdd0060';
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + frame * 0.02;
        const r1 = 38 + Math.sin(frame * 0.1 + i) * 3;
        const r2 = 50 + Math.sin(frame * 0.1 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * r1, sunY + Math.sin(angle) * r1);
        ctx.lineTo(sunX + Math.cos(angle) * r2, sunY + Math.sin(angle) * r2);
        ctx.stroke();
      }

      // Upper atmosphere (transparent to visible light)
      const upperAtmosGrad = ctx.createLinearGradient(0, spaceY, 0, atmosphereTop);
      upperAtmosGrad.addColorStop(0, '#1a1a50');
      upperAtmosGrad.addColorStop(1, '#4a90c2');
      ctx.fillStyle = upperAtmosGrad;
      ctx.fillRect(0, spaceY, width, atmosphereTop - spaceY);

      // Main atmosphere
      const atmosGrad = ctx.createLinearGradient(0, atmosphereTop, 0, groundY);
      atmosGrad.addColorStop(0, '#87CEEB');
      atmosGrad.addColorStop(0.5, '#a8d8ea');
      atmosGrad.addColorStop(1, '#cce5f0');
      ctx.fillStyle = atmosGrad;
      ctx.fillRect(0, atmosphereTop, width, groundY - atmosphereTop);

      // Greenhouse gas layer (more visible with more CO2)
      const ghgOpacity = Math.min(0.5, (co2Level - 150) / 600);
      const ghgGrad = ctx.createLinearGradient(0, greenhouseTop, 0, greenhouseBottom);
      ghgGrad.addColorStop(0, `rgba(255, 150, 100, ${ghgOpacity * 0.3})`);
      ghgGrad.addColorStop(0.5, `rgba(255, 120, 80, ${ghgOpacity})`);
      ghgGrad.addColorStop(1, `rgba(255, 150, 100, ${ghgOpacity * 0.3})`);
      ctx.fillStyle = ghgGrad;
      ctx.fillRect(0, greenhouseTop, width, greenhouseBottom - greenhouseTop);

      // Draw gas molecules
      gasMolecules.forEach((mol, i) => {
        const wobble = Math.sin(frame * 0.05 + i) * 2;
        ctx.beginPath();
        ctx.arc(mol.x + wobble, mol.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6b6b90';
        ctx.fill();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1;
        ctx.stroke();

        // CO2 label on some molecules
        if (i % 8 === 0) {
          ctx.font = '8px system-ui';
          ctx.fillStyle = '#cc3333';
          ctx.fillText('CO₂', mol.x - 8, mol.y + 3);
        }
      });

      // Draw ground
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, '#3d8b40');
      groundGrad.addColorStop(0.3, '#2d6b30');
      groundGrad.addColorStop(1, '#1d4b20');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, width, height - groundY);

      // Ground heat glow based on temperature
      const heatIntensity = Math.min(1, (groundTemp - 10) / 20);
      ctx.fillStyle = `rgba(255, 100, 50, ${heatIntensity * 0.3})`;
      ctx.fillRect(0, groundY, width, 15);

      // Emit photons
      if (frame % Math.floor(40 / speed) === 0) {
        photonsRef.current.push(createPhoton('solar'));
      }

      // Emit IR from ground
      if (frame % Math.floor(25 / speed) === 0) {
        const irPhoton = createPhoton('infrared');
        photonsRef.current.push(irPhoton);
        statsRef.current.irEmittedUp++;
      }

      // Update and draw photons
      const newPhotons: Photon[] = [];

      photonsRef.current.forEach(photon => {
        // Update trail
        photon.trail.push({ x: photon.x, y: photon.y });
        if (photon.trail.length > 8) photon.trail.shift();

        // Move
        photon.x += photon.vx * speed;
        photon.y += photon.vy * speed;

        // Decrease flash timer
        if (photon.flashTimer && photon.flashTimer > 0) {
          photon.flashTimer--;
        }

        // Check boundaries
        if (photon.x < -20 || photon.x > width + 20 || photon.y < -20 || photon.y > height + 20) {
          if (photon.type === 'infrared' && photon.y < 0) {
            statsRef.current.irEscaped++;
          }
          return;
        }

        // Solar photon reaching ground
        if (photon.type === 'solar' && photon.y > groundY - 5) {
          statsRef.current.solarAbsorbed++;
          // Ground absorbs and emits IR
          setTimeout(() => {
            if (isPlaying) {
              const newIR = createPhoton('infrared', photon.x, groundY - 5, false);
              photonsRef.current.push(newIR);
              statsRef.current.irEmittedUp++;
            }
          }, 50);
          return;
        }

        // IR photon in greenhouse layer
        if (photon.type === 'infrared' && photon.y > greenhouseTop && photon.y < greenhouseBottom) {
          const absorptionChance = (co2Level / 400) * 0.035 * speed;
          if (Math.random() < absorptionChance) {
            statsRef.current.irAbsorbed++;

            // Re-emit in random direction (50% up, 50% down)
            setTimeout(() => {
              if (isPlaying) {
                const goingDown = Math.random() < 0.5;
                const reemitted = createPhoton('infrared', photon.x, photon.y, goingDown);
                reemitted.vx = (Math.random() - 0.5) * 2;
                photonsRef.current.push(reemitted);
                if (goingDown) {
                  statsRef.current.irReturnedToGround++;
                }
              }
            }, 30);
            return;
          }
        }

        // IR returning to ground
        if (photon.type === 'infrared' && photon.vy > 0 && photon.y > groundY - 5) {
          // Absorbed by ground - increases temperature
          return;
        }

        // Draw photon trail
        if (photon.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(photon.trail[0].x, photon.trail[0].y);
          for (let i = 1; i < photon.trail.length; i++) {
            ctx.lineTo(photon.trail[i].x, photon.trail[i].y);
          }
          ctx.strokeStyle = photon.type === 'solar'
            ? 'rgba(255, 220, 0, 0.4)'
            : 'rgba(255, 80, 80, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw photon as wave
        const waveLength = photon.type === 'solar' ? 12 : 20;
        const amplitude = photon.type === 'solar' ? 4 : 6;

        ctx.beginPath();
        ctx.strokeStyle = photon.type === 'solar' ? '#ffdd00' : '#ff4444';
        ctx.lineWidth = photon.type === 'solar' ? 2 : 3;

        const angle = Math.atan2(photon.vy, photon.vx);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);

        for (let i = -2; i <= 2; i++) {
          const t = i / 2;
          const wave = Math.sin((photon.x + photon.y) * 0.3 + frame * 0.3) * amplitude;
          const px = photon.x + perpX * wave * Math.cos(t * Math.PI);
          const py = photon.y + perpY * wave * Math.cos(t * Math.PI);
          if (i === -2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Glow effect
        ctx.beginPath();
        ctx.arc(photon.x, photon.y, photon.type === 'solar' ? 8 : 10, 0, Math.PI * 2);
        const glowColor = photon.type === 'solar' ? 'rgba(255, 220, 0, 0.3)' : 'rgba(255, 80, 80, 0.3)';
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Arrow head showing direction
        const arrowSize = 6;
        ctx.beginPath();
        ctx.fillStyle = photon.type === 'solar' ? '#ffdd00' : '#ff4444';
        const headX = photon.x + Math.cos(angle) * 8;
        const headY = photon.y + Math.sin(angle) * 8;
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX - arrowSize * Math.cos(angle - 0.5), headY - arrowSize * Math.sin(angle - 0.5));
        ctx.lineTo(headX - arrowSize * Math.cos(angle + 0.5), headY - arrowSize * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fill();

        newPhotons.push(photon);
      });

      photonsRef.current = newPhotons;

      // Draw labels
      if (showLabels) {
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ffffff';
        ctx.fillText('ESPACE', 10, 45);

        ctx.fillStyle = '#1a4a70';
        ctx.fillText('Haute atmosphère', 10, spaceY + 30);

        ctx.fillStyle = '#8b4513';
        ctx.fillText('COUCHE DE GAZ À EFFET DE SERRE', 10, greenhouseTop + 25);
        ctx.font = '11px system-ui';
        ctx.fillText(`(CO₂, H₂O, CH₄, N₂O)`, 10, greenhouseTop + 42);

        ctx.font = 'bold 13px system-ui';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SURFACE TERRESTRE', 10, groundY + 25);

        // Legend box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(width - 200, 75, 190, 90);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(width - 200, 75, 190, 90);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText('Légende', width - 190, 95);

        // Solar
        ctx.beginPath();
        ctx.arc(width - 180, 115, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd00';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = '11px system-ui';
        ctx.fillText('Lumière visible (solaire)', width - 168, 119);

        // IR
        ctx.beginPath();
        ctx.arc(width - 180, 140, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText('Rayonnement infrarouge', width - 168, 144);
      }

      // Energy flow arrows
      ctx.globalAlpha = 0.6;

      // Incoming solar arrow
      ctx.beginPath();
      ctx.moveTo(150, 20);
      ctx.lineTo(250, 100);
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(250, 100);
      ctx.lineTo(240, 85);
      ctx.lineTo(235, 100);
      ctx.closePath();
      ctx.fillStyle = '#ffdd00';
      ctx.fill();

      // Outgoing IR arrow (size based on escape rate)
      const escapeRate = statsRef.current.irEscaped / Math.max(1, statsRef.current.irEmittedUp);
      ctx.beginPath();
      ctx.moveTo(width - 150, 100);
      ctx.lineTo(width - 100, 20);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2 + escapeRate * 3;
      ctx.stroke();

      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, co2Level, showLabels, speed, createPhoton, groundTemp]);

  const resetSimulation = () => {
    photonsRef.current = [];
    nextIdRef.current = 0;
    frameCountRef.current = 0;
    statsRef.current = { solarAbsorbed: 0, irEmittedUp: 0, irAbsorbed: 0, irEscaped: 0, irReturnedToGround: 0 };
    setStats({ solarAbsorbed: 0, irEmittedUp: 0, irAbsorbed: 0, irEscaped: 0, irReturnedToGround: 0 });
    setEnergyBalance(0);
  };

  // Presets
  const presets = [
    { name: 'Pré-industriel', co2: 280, emoji: '🏭' },
    { name: 'Actuel (2024)', co2: 420, emoji: '🌍' },
    { name: 'Scénario +2°C', co2: 550, emoji: '🌡️' },
    { name: 'Scénario extrême', co2: 800, emoji: '🔥' },
  ];

  const trappingRate = stats.irEmittedUp > 0
    ? Math.round((stats.irAbsorbed / stats.irEmittedUp) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
        <h3 className="text-lg font-semibold text-white">Effet de serre</h3>
        <p className="text-orange-100 text-sm">
          Visualisez comment les gaz à effet de serre piègent le rayonnement infrarouge
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
              className="w-full rounded-lg border border-gray-300 shadow-inner"
            />

            {/* Controls */}
            <div className="flex flex-wrap gap-2 mt-4">
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
              <label className="flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Labels</span>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">Vitesse:</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-20 accent-orange-500"
                />
                <span className="text-sm text-gray-700">{speed}x</span>
              </div>
            </div>
          </div>

          {/* Parameters & Stats */}
          <div className="space-y-4">
            {/* CO2 Level */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <label className="block text-sm font-semibold text-orange-900 mb-3">
                Concentration de CO₂
              </label>
              <input
                type="range"
                min="200"
                max="800"
                value={co2Level}
                onChange={(e) => setCo2Level(Number(e.target.value))}
                className="w-full accent-orange-500 h-2"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-orange-600">200 ppm</span>
                <span className="text-xl font-bold text-orange-700">{co2Level} ppm</span>
                <span className="text-xs text-orange-600">800 ppm</span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1 mt-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setCo2Level(preset.co2)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      co2Level === preset.co2
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-200'
                    }`}
                  >
                    {preset.emoji} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-lg p-4 border border-red-200">
              <div className="text-sm font-semibold text-red-900 mb-1">
                Température de surface
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-red-600">{groundTemp}</span>
                <span className="text-xl text-red-500">°C</span>
              </div>
              <div className="mt-2 h-3 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-500 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/50 transition-all duration-300"
                  style={{ marginLeft: `${((groundTemp + 20) / 50) * 100}%`, width: '3px' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-20°C</span>
                <span>+30°C</span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                Statistiques en temps réel
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    Solaire absorbé
                  </span>
                  <span className="font-mono font-bold">{stats.solarAbsorbed}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-red-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    IR émis (sol)
                  </span>
                  <span className="font-mono font-bold">{stats.irEmittedUp}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-orange-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-orange-400" />
                    IR absorbé (GES)
                  </span>
                  <span className="font-mono font-bold">{stats.irAbsorbed}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-purple-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-400" />
                    IR renvoyé au sol
                  </span>
                  <span className="font-mono font-bold">{stats.irReturnedToGround}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-blue-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-400" />
                    IR échappé (espace)
                  </span>
                  <span className="font-mono font-bold">{stats.irEscaped}</span>
                </div>
              </div>

              {/* Trapping indicator */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Taux de piégeage IR</span>
                  <span className="font-bold text-orange-600">{trappingRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300"
                    style={{ width: `${trappingRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-100">
          <h4 className="font-semibold text-gray-900 mb-4">Mécanisme de l'effet de serre</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl mb-2">☀️ → 🌍</div>
              <div className="font-medium text-gray-800">1. Entrée d'énergie</div>
              <p className="text-sm text-gray-600 mt-1">
                Le rayonnement solaire (lumière visible) traverse l'atmosphère
                et est absorbé par la surface terrestre.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl mb-2">🌍 → 🔴</div>
              <div className="font-medium text-gray-800">2. Émission IR</div>
              <p className="text-sm text-gray-600 mt-1">
                La Terre chauffée émet un rayonnement infrarouge
                (chaleur) vers l'atmosphère.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl mb-2">🔴 ↔️ CO₂</div>
              <div className="font-medium text-gray-800">3. Piégeage</div>
              <p className="text-sm text-gray-600 mt-1">
                Les GES absorbent l'IR et le réémettent dans toutes les directions,
                dont vers le sol = réchauffement.
              </p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="text-sm">
              <span className="font-medium">Bilan radiatif à l'équilibre :</span>
              <BlockMath math="P_{solaire} = P_{IR \, échappé}" />
            </div>
            <div className="text-sm">
              <span className="font-medium">Plus de CO₂ → moins d'IR s'échappe → réchauffement pour rétablir l'équilibre</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
