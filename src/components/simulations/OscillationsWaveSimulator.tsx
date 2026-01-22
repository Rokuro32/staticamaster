'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type SimulationMode = 'shm' | 'energy' | 'forced' | 'standing' | 'modes' | 'beats';
type ReflectionType = 'fixed' | 'free';

export function OscillationsWaveSimulator() {
  const [mode, setMode] = useState<SimulationMode>('shm');
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  // Common parameters
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(1);
  const [phase, setPhase] = useState(0);

  // Standing wave parameters
  const [wavelength, setWavelength] = useState(2);
  const [reflectionType, setReflectionType] = useState<ReflectionType>('fixed');
  const [showIncident, setShowIncident] = useState(true);
  const [showReflected, setShowReflected] = useState(true);
  const [showResultant, setShowResultant] = useState(true);

  // Modes parameters
  const [harmonicMode, setHarmonicMode] = useState(1);
  const [stringLength, setStringLength] = useState(4);

  // Beats parameters
  const [frequency2, setFrequency2] = useState(1.5);

  // Energy parameters
  const [mass, setMass] = useState(1);
  const [springConstant, setSpringConstant] = useState(40);
  const [damping, setDamping] = useState(0);
  const [showEnergyBars, setShowEnergyBars] = useState(true);

  // Forced oscillation parameters
  const [drivingFrequency, setDrivingFrequency] = useState(1);
  const [forceAmplitude, setForceAmplitude] = useState(10);
  const [forcedDamping, setForcedDamping] = useState(2);

  // Sound speed for standing waves
  const soundSpeed = 343;

  // Energy canvas ref
  const energyCanvasRef = useRef<HTMLCanvasElement>(null);

  // Resonance canvas ref
  const resonanceCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const springCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // SHM displacement
  const getDisplacement = useCallback((t: number) => {
    return amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
  }, [amplitude, frequency, phase]);

  // Damped oscillation (for energy mode)
  const getDampedDisplacement = useCallback((t: number) => {
    const omega0 = Math.sqrt(springConstant / mass);
    const gamma = damping / (2 * mass);

    if (gamma >= omega0) {
      // Overdamped or critically damped
      return amplitude * Math.exp(-gamma * t);
    }

    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    return amplitude * Math.exp(-gamma * t) * Math.cos(omegaD * t);
  }, [amplitude, mass, springConstant, damping]);

  const getDampedVelocity = useCallback((t: number) => {
    const omega0 = Math.sqrt(springConstant / mass);
    const gamma = damping / (2 * mass);

    if (gamma >= omega0) {
      return -gamma * amplitude * Math.exp(-gamma * t);
    }

    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    const expTerm = Math.exp(-gamma * t);
    return amplitude * expTerm * (-gamma * Math.cos(omegaD * t) - omegaD * Math.sin(omegaD * t));
  }, [amplitude, mass, springConstant, damping]);

  // Energy calculations
  const getEnergies = useCallback((t: number) => {
    const x = getDampedDisplacement(t);
    const v = getDampedVelocity(t);

    const kineticEnergy = 0.5 * mass * v * v;
    const potentialEnergy = 0.5 * springConstant * x * x;
    const totalEnergy = kineticEnergy + potentialEnergy;
    const initialEnergy = 0.5 * springConstant * amplitude * amplitude;
    const lostEnergy = initialEnergy - totalEnergy;

    return {
      kinetic: kineticEnergy,
      potential: potentialEnergy,
      total: totalEnergy,
      lost: Math.max(0, lostEnergy),
      initial: initialEnergy,
    };
  }, [getDampedDisplacement, getDampedVelocity, mass, springConstant, amplitude]);

  // Forced oscillation calculations
  const naturalFrequency = Math.sqrt(springConstant / mass); // ω₀ in rad/s
  const naturalFrequencyHz = naturalFrequency / (2 * Math.PI);

  const getForcedAmplitude = useCallback((omegaD: number) => {
    // A = F₀ / √[(k - mω²)² + (bω)²]
    const omega0Sq = springConstant / mass;
    const omegaDSq = omegaD * omegaD;
    const denominator = Math.sqrt(
      Math.pow(springConstant - mass * omegaDSq, 2) + Math.pow(forcedDamping * omegaD, 2)
    );
    return forceAmplitude / denominator;
  }, [springConstant, mass, forcedDamping, forceAmplitude]);

  const getForcedPhase = useCallback((omegaD: number) => {
    // φ = arctan(bω / (k - mω²))
    const numerator = forcedDamping * omegaD;
    const denominator = springConstant - mass * omegaD * omegaD;
    return Math.atan2(numerator, denominator);
  }, [springConstant, mass, forcedDamping]);

  const getForcedDisplacement = useCallback((t: number) => {
    const omegaD = 2 * Math.PI * drivingFrequency;
    const A = getForcedAmplitude(omegaD);
    const phi = getForcedPhase(omegaD);
    return A * Math.sin(omegaD * t - phi);
  }, [drivingFrequency, getForcedAmplitude, getForcedPhase]);

  const getDrivingForce = useCallback((t: number) => {
    const omegaD = 2 * Math.PI * drivingFrequency;
    return forceAmplitude * Math.sin(omegaD * t);
  }, [drivingFrequency, forceAmplitude]);

  // Q factor (quality factor)
  const qFactor = forcedDamping > 0 ? Math.sqrt(springConstant * mass) / forcedDamping : Infinity;

  // Wave functions for standing waves
  const getIncidentWave = useCallback((x: number, t: number) => {
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * frequency;
    return amplitude * Math.sin(k * x - omega * t);
  }, [amplitude, wavelength, frequency]);

  const getReflectedWave = useCallback((x: number, t: number, L: number) => {
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * frequency;
    const phaseShift = reflectionType === 'fixed' ? Math.PI : 0;
    return amplitude * Math.sin(k * (2 * L - x) - omega * t + phaseShift);
  }, [amplitude, wavelength, frequency, reflectionType]);

  const getModeWave = useCallback((x: number, t: number, n: number, L: number) => {
    const k = (n * Math.PI) / L;
    const omega = 2 * Math.PI * frequency * n;
    return amplitude * Math.sin(k * x) * Math.cos(omega * t);
  }, [amplitude, frequency]);

  // Draw main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

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
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, height);
    ctx.stroke();

    const maxAmplitude = 2;
    const scale = (height / 2 - 20) / maxAmplitude;

    if (mode === 'shm') {
      // SHM Mode - y(t) graph
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('t (s)', width - 30, centerY - 10);
      ctx.fillText('y (m)', 45, 15);

      // Draw wave
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();

      const duration = 4;
      for (let px = 40; px < width; px++) {
        const t = ((px - 40) / (width - 40)) * duration;
        const y = getDisplacement(t);
        const canvasY = centerY - y * scale;

        if (px === 40) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
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

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(markerX, markerY);
      ctx.lineTo(markerX, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (mode === 'standing') {
      // Standing wave mode
      const L = 4;
      const wallX = width - 40;
      const xScale = (wallX - 50) / L;

      // Draw wall
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(wallX, 20, 15, height - 40);
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      for (let i = 0; i < (height - 40) / 10; i++) {
        ctx.beginPath();
        ctx.moveTo(wallX + 15, 20 + i * 10);
        ctx.lineTo(wallX, 30 + i * 10);
        ctx.stroke();
      }

      // Boundary indicator
      ctx.fillStyle = reflectionType === 'fixed' ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.arc(wallX, centerY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(reflectionType === 'fixed' ? 'Fixe' : 'Libre', wallX, height - 10);

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

      // Resultant
      if (showResultant) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 50; px < wallX; px++) {
          const x = (px - 50) / xScale;
          const y = getIncidentWave(x, time) + getReflectedWave(x, time, L);
          const canvasY = centerY - y * scale;
          if (px === 50) ctx.moveTo(px, canvasY);
          else ctx.lineTo(px, canvasY);
        }
        ctx.stroke();
      }

      // Legend
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      let legendY = 25;
      if (showIncident) { ctx.fillStyle = '#3b82f6'; ctx.fillText('--- Incidente', 60, legendY); legendY += 15; }
      if (showReflected) { ctx.fillStyle = '#f59e0b'; ctx.fillText('--- Réfléchie', 60, legendY); legendY += 15; }
      if (showResultant) { ctx.fillStyle = '#8b5cf6'; ctx.fillText('— Stationnaire', 60, legendY); }

    } else if (mode === 'modes') {
      // Harmonic modes
      const L = stringLength;
      const wallX = width - 40;
      const xScale = (wallX - 50) / L;

      // Draw endpoints
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(50, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wallX, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Mode wave
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let px = 50; px < wallX; px++) {
        const x = (px - 50) / xScale;
        const y = getModeWave(x, time, harmonicMode, L);
        const canvasY = centerY - y * scale;
        if (px === 50) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Draw nodes
      for (let i = 1; i < harmonicMode; i++) {
        const nodeX = (i * L) / harmonicMode;
        const px = 50 + nodeX * xScale;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw antinodes
      for (let i = 0; i < harmonicMode; i++) {
        const antinodeX = ((i + 0.5) * L) / harmonicMode;
        const px = 50 + antinodeX * xScale;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Legend
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('● Noeuds', 60, 25);
      ctx.fillStyle = '#22c55e';
      ctx.fillText('● Ventres', 60, 40);

    } else if (mode === 'beats') {
      // Beats
      const beatFreq = Math.abs(frequency2 - frequency);
      const avgFreq = (frequency + frequency2) / 2;
      const deltaFreq = Math.abs(frequency2 - frequency) / 2;

      // Filled envelope
      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.beginPath();
      ctx.moveTo(40, centerY);
      for (let px = 40; px < width - 20; px++) {
        const t = (px - 40) / (width - 60) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        ctx.lineTo(px, centerY - envelope * scale * 0.5);
      }
      for (let px = width - 21; px >= 40; px--) {
        const t = (px - 40) / (width - 60) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        ctx.lineTo(px, centerY + envelope * scale * 0.5);
      }
      ctx.closePath();
      ctx.fill();

      // Beat wave
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 40; px < width - 20; px++) {
        const t = (px - 40) / (width - 60) * 4;
        const carrier = Math.sin(2 * Math.PI * avgFreq * (time + t));
        const modulation = Math.cos(2 * Math.PI * deltaFreq * (time + t));
        const y = 2 * amplitude * modulation * carrier;
        const canvasY = centerY - y * scale * 0.5;
        if (px === 40) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Envelope lines
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let px = 40; px < width - 20; px++) {
        const t = (px - 40) / (width - 60) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY - envelope * scale * 0.5;
        if (px === 40) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let px = 40; px < width - 20; px++) {
        const t = (px - 40) / (width - 60) * 4;
        const envelope = 2 * amplitude * Math.abs(Math.cos(2 * Math.PI * deltaFreq * (time + t)));
        const canvasY = centerY + envelope * scale * 0.5;
        if (px === 40) ctx.moveTo(px, canvasY);
        else ctx.lineTo(px, canvasY);
      }
      ctx.stroke();

      // Beat frequency label
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`f_bat = ${beatFreq.toFixed(2)} Hz`, 60, 30);
    }

  }, [time, mode, amplitude, frequency, frequency2, phase, wavelength, reflectionType,
      harmonicMode, stringLength, showIncident, showReflected, showResultant,
      getDisplacement, getIncidentWave, getReflectedWave, getModeWave]);

  // Draw energy visualization
  useEffect(() => {
    if (mode !== 'energy') return;

    const canvas = energyCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    const energies = getEnergies(time);
    const maxEnergy = energies.initial * 1.1;

    if (showEnergyBars) {
      // Bar chart mode
      const barWidth = 80;
      const barSpacing = 30;
      const startX = (width - 4 * barWidth - 3 * barSpacing) / 2;
      const maxBarHeight = height - 80;

      // Draw bars
      const bars = [
        { label: 'Cinétique', value: energies.kinetic, color: '#3b82f6', labelColor: '#1d4ed8' },
        { label: 'Potentielle', value: energies.potential, color: '#22c55e', labelColor: '#15803d' },
        { label: 'Totale', value: energies.total, color: '#8b5cf6', labelColor: '#6d28d9' },
        { label: 'Perdue', value: energies.lost, color: '#ef4444', labelColor: '#b91c1c' },
      ];

      bars.forEach((bar, i) => {
        const x = startX + i * (barWidth + barSpacing);
        const barHeight = (bar.value / maxEnergy) * maxBarHeight;
        const y = height - 40 - barHeight;

        // Bar background
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(x, height - 40 - maxBarHeight, barWidth, maxBarHeight);

        // Bar fill
        ctx.fillStyle = bar.color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Bar border
        ctx.strokeStyle = bar.labelColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = bar.labelColor;
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(bar.label, x + barWidth / 2, height - 20);

        // Value
        ctx.fillStyle = '#374151';
        ctx.font = '11px Inter';
        ctx.fillText(`${bar.value.toFixed(2)} J`, x + barWidth / 2, y - 8);
      });

      // Title
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Distribution de l\'énergie', width / 2, 25);

      // Initial energy reference line
      const initialY = height - 40 - (energies.initial / maxEnergy) * maxBarHeight;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX - 20, initialY);
      ctx.lineTo(startX + 4 * barWidth + 3 * barSpacing + 20, initialY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`E₀ = ${energies.initial.toFixed(2)} J`, startX - 15, initialY - 5);

    } else {
      // Time graph mode
      const padding = 50;
      const graphWidth = width - 2 * padding;
      const graphHeight = height - 2 * padding;
      const duration = 6;

      // Draw grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw axes
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('t (s)', width / 2, height - 10);
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('E (J)', 0, 0);
      ctx.restore();

      // Draw energy curves
      const curves = [
        { fn: (t: number) => getEnergies(t).kinetic, color: '#3b82f6', label: 'Ec' },
        { fn: (t: number) => getEnergies(t).potential, color: '#22c55e', label: 'Ep' },
        { fn: (t: number) => getEnergies(t).total, color: '#8b5cf6', label: 'Et' },
      ];

      curves.forEach(curve => {
        ctx.strokeStyle = curve.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= graphWidth; px++) {
          const t = (px / graphWidth) * duration;
          const e = curve.fn(t);
          const x = padding + px;
          const y = height - padding - (e / maxEnergy) * graphHeight;
          if (px === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Lost energy area (filled)
      if (damping > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.moveTo(padding, height - padding - (energies.initial / maxEnergy) * graphHeight);
        for (let px = 0; px <= graphWidth; px++) {
          const t = (px / graphWidth) * duration;
          const e = getEnergies(t).total;
          const x = padding + px;
          const y = height - padding - (e / maxEnergy) * graphHeight;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width - padding, height - padding - (energies.initial / maxEnergy) * graphHeight);
        ctx.closePath();
        ctx.fill();
      }

      // Current time marker
      const markerX = padding + (time % duration) / duration * graphWidth;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(markerX, padding);
      ctx.lineTo(markerX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);

      // Legend
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      let legendY = padding + 15;
      curves.forEach(curve => {
        ctx.fillStyle = curve.color;
        ctx.fillRect(width - padding - 70, legendY - 8, 12, 3);
        ctx.fillText(curve.label, width - padding - 55, legendY);
        legendY += 15;
      });
      if (damping > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fillRect(width - padding - 70, legendY - 8, 12, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Pertes', width - padding - 55, legendY);
      }
    }
  }, [time, mode, getEnergies, showEnergyBars, damping]);

  // Draw resonance curve for forced mode
  useEffect(() => {
    if (mode !== 'forced') return;

    const canvas = resonanceCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(0, 0, width, height);

    const padding = { left: 60, right: 30, top: 30, bottom: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Frequency range (0 to 3x natural frequency)
    const maxFreqHz = naturalFrequencyHz * 3;
    const minFreqHz = 0.1;

    // Find max amplitude for scaling
    let maxAmp = 0;
    for (let f = minFreqHz; f <= maxFreqHz; f += 0.01) {
      const omega = 2 * Math.PI * f;
      const amp = getForcedAmplitude(omega);
      if (amp > maxAmp && amp < 100) maxAmp = amp; // Cap at 100 for display
    }
    maxAmp *= 1.1;

    // Draw grid
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (graphWidth / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#78350f';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Fréquence d\'excitation f_d (Hz)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amplitude A (m)', 0, 0);
    ctx.restore();

    // Tick labels on X axis
    ctx.font = '10px Inter';
    for (let f = 0; f <= maxFreqHz; f += maxFreqHz / 6) {
      const x = padding.left + (f / maxFreqHz) * graphWidth;
      ctx.fillText(f.toFixed(1), x, height - padding.bottom + 15);
    }

    // Natural frequency line
    const f0X = padding.left + (naturalFrequencyHz / maxFreqHz) * graphWidth;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(f0X, padding.top);
    ctx.lineTo(f0X, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('f₀', f0X, padding.top - 8);

    // Draw resonance curve
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let first = true;
    for (let px = 0; px <= graphWidth; px++) {
      const f = minFreqHz + (px / graphWidth) * (maxFreqHz - minFreqHz);
      const omega = 2 * Math.PI * f;
      let amp = getForcedAmplitude(omega);
      if (amp > maxAmp) amp = maxAmp; // Clamp

      const x = padding.left + px;
      const y = padding.top + graphHeight - (amp / maxAmp) * graphHeight;

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Current driving frequency marker
    const currentX = padding.left + ((drivingFrequency - minFreqHz) / (maxFreqHz - minFreqHz)) * graphWidth;
    const currentOmega = 2 * Math.PI * drivingFrequency;
    let currentAmp = getForcedAmplitude(currentOmega);
    if (currentAmp > maxAmp) currentAmp = maxAmp;
    const currentY = padding.top + graphHeight - (currentAmp / maxAmp) * graphHeight;

    // Vertical line to current point
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, height - padding.bottom);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current point marker
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Amplitude value at current frequency
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`A = ${currentAmp.toFixed(3)} m`, currentX + 15, currentY);

    // Title
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Courbe de résonance', width / 2, 18);

    // Resonance indicator
    const isNearResonance = Math.abs(drivingFrequency - naturalFrequencyHz) < 0.15;
    if (isNearResonance) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 14px Inter';
      ctx.fillText('RÉSONANCE!', width / 2, height - padding.bottom - graphHeight - 5);
    }

  }, [mode, drivingFrequency, naturalFrequencyHz, getForcedAmplitude, forcedDamping]);

  // Draw forced mass-spring system
  useEffect(() => {
    if (mode !== 'forced') return;

    const canvas = springCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const equilibriumY = height / 2;
    const scale = 40;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    const displacement = getForcedDisplacement(time);
    const drivingForce = getDrivingForce(time);
    const massY = equilibriumY + displacement * scale;

    // Ceiling
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(centerX - 60, 0, 120, 15);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX - 55 + i * 10, 15);
      ctx.lineTo(centerX - 65 + i * 10, 0);
      ctx.stroke();
    }

    // Spring
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

    // Mass
    const massSize = 50;
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('m', centerX, massY + 5);

    // Driving force arrow
    const forceScale = 2;
    const forceLength = drivingForce * forceScale;
    const forceStartY = massY + massSize/2 + 10;
    const forceEndY = forceStartY + forceLength;

    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, forceStartY);
    ctx.lineTo(centerX, forceEndY);
    ctx.stroke();

    // Arrow head
    const arrowSize = 8;
    const arrowDir = forceLength > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(centerX, forceEndY);
    ctx.lineTo(centerX - arrowSize, forceEndY - arrowSize * arrowDir);
    ctx.lineTo(centerX + arrowSize, forceEndY - arrowSize * arrowDir);
    ctx.closePath();
    ctx.fill();

    // Force label
    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`F = ${drivingForce.toFixed(1)} N`, centerX + 35, massY + massSize/2 + 25);

    // Equilibrium line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY);
    ctx.lineTo(width, equilibriumY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Équilibre', 5, equilibriumY - 5);

    // Displacement indicator
    ctx.fillStyle = '#7c3aed';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`x = ${displacement.toFixed(3)} m`, width - 10, 30);

    // Phase indicator - small diagram
    const phaseY = height - 40;
    const phaseRadius = 20;
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width - 50, phaseY, phaseRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Force vector (blue)
    const forceAngle = 2 * Math.PI * drivingFrequency * time;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - 50, phaseY);
    ctx.lineTo(width - 50 + phaseRadius * Math.cos(forceAngle - Math.PI/2), phaseY + phaseRadius * Math.sin(forceAngle - Math.PI/2));
    ctx.stroke();

    // Response vector (violet)
    const responsePhase = getForcedPhase(2 * Math.PI * drivingFrequency);
    const responseAngle = forceAngle - responsePhase;
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - 50, phaseY);
    ctx.lineTo(width - 50 + phaseRadius * Math.cos(responseAngle - Math.PI/2), phaseY + phaseRadius * Math.sin(responseAngle - Math.PI/2));
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Phase', width - 50, phaseY + phaseRadius + 12);

  }, [time, mode, getForcedDisplacement, getDrivingForce, getForcedPhase, drivingFrequency]);

  // Draw mass-spring for SHM and energy mode
  useEffect(() => {
    if (mode !== 'shm' && mode !== 'energy') return;

    const canvas = springCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const equilibriumY = height / 2;
    const scale = 60;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Use damped displacement for energy mode
    const displacement = mode === 'energy' ? getDampedDisplacement(time) : getDisplacement(time);
    const massY = equilibriumY + displacement * scale;

    // Ceiling
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(centerX - 60, 0, 120, 15);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX - 55 + i * 10, 15);
      ctx.lineTo(centerX - 65 + i * 10, 0);
      ctx.stroke();
    }

    // Spring
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

    // Mass
    const massSize = 50;
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - massSize/2, massY - massSize/2, massSize, massSize);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('m', centerX, massY + 5);

    // Equilibrium line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY);
    ctx.lineTo(width, equilibriumY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Équilibre', 10, equilibriumY - 5);

    // Amplitude markers
    ctx.strokeStyle = '#c4b5fd';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY - amplitude * scale);
    ctx.lineTo(width, equilibriumY - amplitude * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, equilibriumY + amplitude * scale);
    ctx.lineTo(width, equilibriumY + amplitude * scale);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [time, mode, amplitude, getDisplacement, getDampedDisplacement]);

  const handleReset = () => {
    setTime(0);
    lastTimeRef.current = 0;
  };

  const period = frequency > 0 ? (1 / frequency).toFixed(3) : '∞';
  const angularFrequency = (2 * Math.PI * frequency).toFixed(3);
  const beatFrequency = Math.abs(frequency2 - frequency);
  const modeWavelength = ((2 * stringLength) / harmonicMode).toFixed(2);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Oscillations et ondes mécaniques
        </h2>
        <p className="text-gray-600">
          MHS, ondes stationnaires, modes propres et battements
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center gap-2 flex-wrap">
        <button
          onClick={() => setMode('shm')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'shm' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          MHS
        </button>
        <button
          onClick={() => setMode('energy')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'energy' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Énergie
        </button>
        <button
          onClick={() => setMode('forced')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'forced' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Résonance
        </button>
        <button
          onClick={() => setMode('standing')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'standing' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Réflexion
        </button>
        <button
          onClick={() => setMode('modes')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'modes' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Modes propres
        </button>
        <button
          onClick={() => setMode('beats')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'beats' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Battements
        </button>
      </div>

      {/* Mathematical Equation */}
      <div className="bg-violet-50 rounded-lg p-4 text-center">
        {mode === 'shm' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Mouvement Harmonique Simple</p>
            <BlockMath math={`y(t) = A \\sin(2\\pi f t + \\phi) = ${amplitude.toFixed(1)} \\sin(${angularFrequency} t + ${phase.toFixed(2)})`} />
          </>
        )}
        {mode === 'energy' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Conservation de l'énergie (avec amortissement)</p>
            <BlockMath math={`E_c = \\frac{1}{2}mv^2 \\quad E_p = \\frac{1}{2}kx^2 \\quad E_{tot} = E_c + E_p`} />
            {damping > 0 && (
              <div className="mt-2 text-sm">
                <BlockMath math={`x(t) = A e^{-\\gamma t} \\cos(\\omega_d t) \\quad \\gamma = \\frac{b}{2m} = ${(damping / (2 * mass)).toFixed(2)}`} />
              </div>
            )}
          </>
        )}
        {mode === 'forced' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Oscillateur forcé et résonance</p>
            <BlockMath math={`m\\ddot{x} + b\\dot{x} + kx = F_0\\sin(\\omega_d t)`} />
            <div className="mt-2 text-sm">
              <BlockMath math={`A(\\omega_d) = \\frac{F_0}{\\sqrt{(k-m\\omega_d^2)^2 + (b\\omega_d)^2}} \\quad \\omega_0 = \\sqrt{\\frac{k}{m}} = ${naturalFrequency.toFixed(2)} \\text{ rad/s}`} />
            </div>
          </>
        )}
        {mode === 'standing' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Superposition des ondes</p>
            <BlockMath math={`y = y_1 + y_2 = A\\sin(kx - \\omega t) ${reflectionType === 'fixed' ? '-' : '+'} A\\sin(kx + \\omega t)`} />
            <div className="mt-2 text-sm">
              <BlockMath math={reflectionType === 'fixed' ? `y = 2A\\sin(kx)\\cos(\\omega t)` : `y = 2A\\cos(kx)\\sin(\\omega t)`} />
            </div>
          </>
        )}
        {mode === 'modes' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Mode propre n = {harmonicMode}</p>
            <BlockMath math={`y_n = A\\sin\\left(\\frac{n\\pi x}{L}\\right)\\cos(\\omega_n t)`} />
            <div className="mt-2 text-sm">
              <BlockMath math={`\\lambda_n = \\frac{2L}{n} = ${modeWavelength} \\text{ m}`} />
            </div>
          </>
        )}
        {mode === 'beats' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Battements</p>
            <BlockMath math={`y = A\\sin(2\\pi f_1 t) + A\\sin(2\\pi f_2 t)`} />
            <div className="mt-2 text-sm">
              <BlockMath math={`f_{bat} = |f_2 - f_1| = ${beatFrequency.toFixed(2)} \\text{ Hz}`} />
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Amplitude - always shown */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Amplitude <InlineMath math="A" /></span>
            <span className="text-violet-600 font-mono">{amplitude.toFixed(1)} m</span>
          </label>
          <input
            type="range" min="0.1" max="2" step="0.1" value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Fréquence <InlineMath math="f" /></span>
            <span className="text-violet-600 font-mono">{frequency.toFixed(1)} Hz</span>
          </label>
          <input
            type="range" min="0.1" max="3" step="0.1" value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value))}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <p className="text-xs text-gray-500">T = {period} s</p>
        </div>

        {/* Mode-specific controls */}
        {mode === 'shm' && (
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Phase <InlineMath math="\phi" /></span>
              <span className="text-violet-600 font-mono">{phase.toFixed(2)} rad</span>
            </label>
            <input
              type="range" min="0" max={2 * Math.PI} step="0.1" value={phase}
              onChange={(e) => setPhase(parseFloat(e.target.value))}
              className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>
        )}

        {mode === 'energy' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Masse <InlineMath math="m" /></span>
                <span className="text-violet-600 font-mono">{mass.toFixed(1)} kg</span>
              </label>
              <input
                type="range" min="0.5" max="5" step="0.5" value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Constante <InlineMath math="k" /></span>
                <span className="text-violet-600 font-mono">{springConstant} N/m</span>
              </label>
              <input
                type="range" min="10" max="100" step="5" value={springConstant}
                onChange={(e) => setSpringConstant(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">ω₀ = {Math.sqrt(springConstant / mass).toFixed(2)} rad/s</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Amortissement <InlineMath math="b" /></span>
                <span className="text-violet-600 font-mono">{damping.toFixed(1)} kg/s</span>
              </label>
              <input
                type="range" min="0" max="10" step="0.5" value={damping}
                onChange={(e) => setDamping(parseFloat(e.target.value))}
                className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <p className="text-xs text-gray-500">
                {damping === 0 ? 'Sans friction' : damping < 2 * Math.sqrt(springConstant * mass) ? 'Sous-amorti' : 'Sur-amorti'}
              </p>
            </div>
          </>
        )}

        {mode === 'forced' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Fréq. excitation <InlineMath math="f_d" /></span>
                <span className="text-violet-600 font-mono">{drivingFrequency.toFixed(2)} Hz</span>
              </label>
              <input
                type="range" min="0.1" max="3" step="0.05" value={drivingFrequency}
                onChange={(e) => setDrivingFrequency(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">ω_d = {(2 * Math.PI * drivingFrequency).toFixed(2)} rad/s</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Force <InlineMath math="F_0" /></span>
                <span className="text-violet-600 font-mono">{forceAmplitude.toFixed(0)} N</span>
              </label>
              <input
                type="range" min="1" max="50" step="1" value={forceAmplitude}
                onChange={(e) => setForceAmplitude(parseFloat(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Amortissement <InlineMath math="b" /></span>
                <span className="text-violet-600 font-mono">{forcedDamping.toFixed(1)} kg/s</span>
              </label>
              <input
                type="range" min="0.5" max="15" step="0.5" value={forcedDamping}
                onChange={(e) => setForcedDamping(parseFloat(e.target.value))}
                className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Masse <InlineMath math="m" /></span>
                <span className="text-violet-600 font-mono">{mass.toFixed(1)} kg</span>
              </label>
              <input
                type="range" min="0.5" max="5" step="0.5" value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Constante <InlineMath math="k" /></span>
                <span className="text-violet-600 font-mono">{springConstant} N/m</span>
              </label>
              <input
                type="range" min="10" max="100" step="5" value={springConstant}
                onChange={(e) => setSpringConstant(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>f₀ (naturelle):</span>
                <span className="font-mono text-amber-700">{naturalFrequencyHz.toFixed(2)} Hz</span>
              </div>
              <div className="flex justify-between">
                <span>Ratio f_d/f₀:</span>
                <span className={`font-mono ${Math.abs(drivingFrequency - naturalFrequencyHz) < 0.1 ? 'text-red-600 font-bold' : 'text-amber-700'}`}>
                  {(drivingFrequency / naturalFrequencyHz).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Facteur Q:</span>
                <span className="font-mono text-amber-700">{qFactor.toFixed(1)}</span>
              </div>
            </div>
          </>
        )}

        {mode === 'standing' && (
          <>
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Type de réflexion</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReflectionType('fixed')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm ${reflectionType === 'fixed' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100'}`}
                >
                  Fixe
                </button>
                <button
                  onClick={() => setReflectionType('free')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm ${reflectionType === 'free' ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-100'}`}
                >
                  Libre
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Longueur d'onde</span>
                <span className="text-violet-600 font-mono">{wavelength.toFixed(1)} m</span>
              </label>
              <input
                type="range" min="0.5" max="4" step="0.1" value={wavelength}
                onChange={(e) => setWavelength(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-gray-700 text-sm">Affichage</label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showIncident} onChange={(e) => setShowIncident(e.target.checked)} className="rounded" />
                  <span className="text-blue-600">Incidente</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showReflected} onChange={(e) => setShowReflected(e.target.checked)} className="rounded" />
                  <span className="text-amber-600">Réfléchie</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showResultant} onChange={(e) => setShowResultant(e.target.checked)} className="rounded" />
                  <span className="text-violet-600">Stationnaire</span>
                </label>
              </div>
            </div>
          </>
        )}

        {mode === 'modes' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Mode n</span>
                <span className="text-violet-600 font-mono">n = {harmonicMode}</span>
              </label>
              <input
                type="range" min="1" max="8" step="1" value={harmonicMode}
                onChange={(e) => setHarmonicMode(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">{harmonicMode === 1 ? 'Fondamental' : `${harmonicMode}e harmonique`}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Longueur L</span>
                <span className="text-violet-600 font-mono">{stringLength.toFixed(1)} m</span>
              </label>
              <input
                type="range" min="1" max="6" step="0.5" value={stringLength}
                onChange={(e) => setStringLength(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between"><span>Noeuds:</span><span className="font-mono">{harmonicMode + 1}</span></div>
              <div className="flex justify-between"><span>Ventres:</span><span className="font-mono">{harmonicMode}</span></div>
              <div className="flex justify-between"><span>λₙ:</span><span className="font-mono">{modeWavelength} m</span></div>
            </div>
          </>
        )}

        {mode === 'beats' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Fréquence 2</span>
                <span className="text-violet-600 font-mono">{frequency2.toFixed(1)} Hz</span>
              </label>
              <input
                type="range" min="0.5" max="3" step="0.1" value={frequency2}
                onChange={(e) => setFrequency2(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-sm text-green-700">Fréquence de battement</p>
              <p className="text-2xl font-mono text-green-600">{beatFrequency.toFixed(2)} Hz</p>
            </div>
          </>
        )}
      </div>

      {/* Visualization */}
      <div className={`grid ${(mode === 'shm' || mode === 'energy' || mode === 'forced') ? 'lg:grid-cols-2' : ''} gap-6`}>
        {mode !== 'energy' && mode !== 'forced' && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">
              {mode === 'shm' ? 'Graphique y(t)' : mode === 'beats' ? 'Battements' : 'Onde sur la corde'}
            </h3>
            <canvas ref={canvasRef} width={600} height={250} className="w-full border border-gray-200 rounded-lg" />
          </div>
        )}

        {mode === 'forced' && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Courbe de résonance A(f)</h3>
            <canvas ref={resonanceCanvasRef} width={500} height={300} className="w-full border border-amber-200 rounded-lg" />
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-amber-500"></div>
                <span>Amplitude</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-500" style={{borderStyle: 'dashed'}}></div>
                <span>f₀ naturelle</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                <span>f_d actuelle</span>
              </div>
            </div>
          </div>
        )}

        {mode === 'energy' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Énergie du système</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEnergyBars(true)}
                  className={`px-3 py-1 text-sm rounded-lg ${showEnergyBars ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Barres
                </button>
                <button
                  onClick={() => setShowEnergyBars(false)}
                  className={`px-3 py-1 text-sm rounded-lg ${!showEnergyBars ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Graphique
                </button>
              </div>
            </div>
            <canvas ref={energyCanvasRef} width={500} height={280} className="w-full border border-gray-200 rounded-lg" />
          </div>
        )}

        {(mode === 'shm' || mode === 'energy') && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Système masse-ressort</h3>
            <canvas ref={springCanvasRef} width={300} height={280} className="w-full border border-gray-200 rounded-lg" />
            {mode === 'energy' && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-blue-600 font-medium">E<sub>c</sub></p>
                  <p className="text-blue-800 font-mono">{getEnergies(time).kinetic.toFixed(3)} J</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-green-600 font-medium">E<sub>p</sub></p>
                  <p className="text-green-800 font-mono">{getEnergies(time).potential.toFixed(3)} J</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-2 text-center">
                  <p className="text-violet-600 font-medium">E<sub>tot</sub></p>
                  <p className="text-violet-800 font-mono">{getEnergies(time).total.toFixed(3)} J</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-red-600 font-medium">Perdue</p>
                  <p className="text-red-800 font-mono">{getEnergies(time).lost.toFixed(3)} J</p>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'forced' && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Oscillateur forcé</h3>
            <canvas ref={springCanvasRef} width={300} height={300} className="w-full border border-gray-200 rounded-lg" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-violet-50 rounded-lg p-2 text-center">
                <p className="text-violet-600 font-medium">Amplitude</p>
                <p className="text-violet-800 font-mono">{getForcedAmplitude(2 * Math.PI * drivingFrequency).toFixed(3)} m</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-blue-600 font-medium">Force</p>
                <p className="text-blue-800 font-mono">{getDrivingForce(time).toFixed(1)} N</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <p className="text-amber-600 font-medium">Déphasage</p>
                <p className="text-amber-800 font-mono">{(getForcedPhase(2 * Math.PI * drivingFrequency) * 180 / Math.PI).toFixed(1)}°</p>
              </div>
              <div className={`rounded-lg p-2 text-center ${Math.abs(drivingFrequency - naturalFrequencyHz) < 0.15 ? 'bg-red-100' : 'bg-gray-50'}`}>
                <p className={`font-medium ${Math.abs(drivingFrequency - naturalFrequencyHz) < 0.15 ? 'text-red-600' : 'text-gray-600'}`}>État</p>
                <p className={`font-mono text-sm ${Math.abs(drivingFrequency - naturalFrequencyHz) < 0.15 ? 'text-red-800 font-bold' : 'text-gray-800'}`}>
                  {Math.abs(drivingFrequency - naturalFrequencyHz) < 0.15 ? 'RÉSONANCE' : drivingFrequency < naturalFrequencyHz ? 'Sous-résonance' : 'Sur-résonance'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isPlaying ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button onClick={handleReset} className="px-6 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          ↺ Réinitialiser
        </button>
      </div>

      {/* Educational Notes */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Concepts clés</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-violet-50 rounded-lg p-4">
            <h4 className="font-medium text-violet-800 mb-2">MHS</h4>
            <p className="text-violet-700">Oscillation sinusoïdale caractérisée par A, f et φ. Base de tous les phénomènes ondulatoires.</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Énergie</h4>
            <p className="text-orange-700">E<sub>tot</sub> = E<sub>c</sub> + E<sub>p</sub> = ½kA². Sans friction, l'énergie totale est conservée.</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">Résonance</h4>
            <p className="text-amber-700">À f<sub>d</sub> = f₀, l'amplitude est maximale. Le facteur Q mesure la largeur du pic de résonance.</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Amortissement</h4>
            <p className="text-red-700">L'amplitude décroît exponentiellement. L'énergie est dissipée par friction.</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Modes propres</h4>
            <p className="text-green-700">λₙ = 2L/n. Seules certaines longueurs d'onde forment des ondes stationnaires stables.</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Battements</h4>
            <p className="text-blue-700">f<sub>bat</sub> = |f₂-f₁|. Modulation d'amplitude due à deux fréquences proches.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OscillationsWaveSimulator;
