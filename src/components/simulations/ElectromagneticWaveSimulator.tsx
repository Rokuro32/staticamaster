'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import dynamic from 'next/dynamic';

// Dynamic import for 3D view to avoid SSR issues
const EMWave3DView = dynamic(() => import('./EMWave3DView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-slate-900 text-slate-400 rounded-xl">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Chargement de la vue 3D...
      </div>
    </div>
  ),
});

type SimulationMode = 'emwave' | 'polarization' | 'spectrum' | 'maxwell' | 'young' | 'diffraction' | 'bragg';
type PolarizationType = 'linear' | 'circular' | 'elliptical';

export function ElectromagneticWaveSimulator() {
  const [mode, setMode] = useState<SimulationMode>('emwave');
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [view3D, setView3D] = useState(true); // New state for 3D toggle

  // Common parameters
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(1);
  const [wavelength, setWavelength] = useState(500); // nm for visible light

  // EM Wave parameters
  const [showEField, setShowEField] = useState(true);
  const [showBField, setShowBField] = useState(true);
  const [showPoynting, setShowPoynting] = useState(false);
  const [showWavefronts, setShowWavefronts] = useState(false);

  // Polarization parameters
  const [polarizationType, setPolarizationType] = useState<PolarizationType>('linear');
  const [polarizationAngle, setPolarizationAngle] = useState(0);
  const [analyzerAngle, setAnalyzerAngle] = useState(0);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [phaseShift, setPhaseShift] = useState(90); // for circular/elliptical
  const [amplitudeRatio, setAmplitudeRatio] = useState(1); // Ey/Ex ratio

  // Young's slits parameters
  const [slitSeparation, setSlitSeparation] = useState(0.5); // mm
  const [screenDistance, setScreenDistance] = useState(1); // m
  const [slitWidth, setSlitWidth] = useState(0.1); // mm

  // Diffraction parameters
  const [singleSlitWidth, setSingleSlitWidth] = useState(0.2); // mm

  // Bragg/Grating parameters
  const [gratingLines, setGratingLines] = useState(500); // lines/mm
  const [diffractionOrder, setDiffractionOrder] = useState(1);
  const [crystalSpacing, setCrystalSpacing] = useState(0.3); // nm for Bragg

  // Maxwell sandbox parameters - charges
  interface Charge {
    id: number;
    x: number;
    y: number;
    q: number; // positive or negative
    vx: number;
    vy: number;
    oscillating: boolean;
    oscillationAmplitude: number;
    oscillationFrequency: number;
  }
  const [charges, setCharges] = useState<Charge[]>([
    { id: 1, x: 400, y: 175, q: 1, vx: 0, vy: 0, oscillating: true, oscillationAmplitude: 50, oscillationFrequency: 1 }
  ]);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showEFieldLines, setShowEFieldLines] = useState(true);
  const [showBFieldLines, setShowBFieldLines] = useState(true);
  const [chargeMode, setChargeMode] = useState<'dipole' | 'moving' | 'static'>('dipole');

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // Maxwell sandbox mouse handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'maxwell') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on a charge
    const clickedCharge = charges.find(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedCharge) {
      setSelectedChargeId(clickedCharge.id);
      setIsDragging(true);
    } else {
      setSelectedChargeId(null);
    }
  }, [mode, charges]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'maxwell' || !isDragging || selectedChargeId === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCharges(prev => prev.map(charge =>
      charge.id === selectedChargeId
        ? { ...charge, x: Math.max(20, Math.min(780, x)), y: Math.max(20, Math.min(330, y)) }
        : charge
    ));
  }, [mode, isDragging, selectedChargeId]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const addCharge = useCallback((positive: boolean) => {
    const newId = Math.max(0, ...charges.map(c => c.id)) + 1;
    setCharges(prev => [...prev, {
      id: newId,
      x: 200 + Math.random() * 400,
      y: 100 + Math.random() * 150,
      q: positive ? 1 : -1,
      vx: chargeMode === 'moving' ? (Math.random() - 0.5) * 2 : 0,
      vy: chargeMode === 'moving' ? (Math.random() - 0.5) * 2 : 0,
      oscillating: chargeMode === 'dipole',
      oscillationAmplitude: 40,
      oscillationFrequency: 0.8 + Math.random() * 0.4
    }]);
  }, [charges, chargeMode]);

  const removeSelectedCharge = useCallback(() => {
    if (selectedChargeId !== null) {
      setCharges(prev => prev.filter(c => c.id !== selectedChargeId));
      setSelectedChargeId(null);
    }
  }, [selectedChargeId]);

  const clearCharges = useCallback(() => {
    setCharges([]);
    setSelectedChargeId(null);
  }, []);

  // Speed of light
  const c = 3e8; // m/s

  // Calculate E and B field values
  const getEField = useCallback((x: number, t: number) => {
    const k = (2 * Math.PI) / (wavelength * 1e-9);
    const omega = 2 * Math.PI * frequency;
    return amplitude * Math.sin(k * x - omega * t);
  }, [amplitude, wavelength, frequency]);

  const getBField = useCallback((x: number, t: number) => {
    const k = (2 * Math.PI) / (wavelength * 1e-9);
    const omega = 2 * Math.PI * frequency;
    return (amplitude / c) * Math.sin(k * x - omega * t);
  }, [amplitude, wavelength, frequency]);

  // Polarization calculations
  const getPolarizedE = useCallback((t: number) => {
    const omega = 2 * Math.PI * frequency;

    if (polarizationType === 'linear') {
      const E = amplitude * Math.sin(omega * t);
      return {
        Ex: E * Math.cos(polarizationAngle * Math.PI / 180),
        Ey: E * Math.sin(polarizationAngle * Math.PI / 180)
      };
    } else if (polarizationType === 'circular') {
      return {
        Ex: amplitude * Math.sin(omega * t),
        Ey: amplitude * Math.sin(omega * t + Math.PI / 2)
      };
    } else {
      // Elliptical
      return {
        Ex: amplitude * Math.sin(omega * t),
        Ey: amplitude * amplitudeRatio * Math.sin(omega * t + phaseShift * Math.PI / 180)
      };
    }
  }, [amplitude, frequency, polarizationType, polarizationAngle, phaseShift, amplitudeRatio]);

  // Malus's Law
  const getTransmittedIntensity = useCallback(() => {
    const theta = (analyzerAngle - polarizationAngle) * Math.PI / 180;
    return Math.cos(theta) ** 2;
  }, [analyzerAngle, polarizationAngle]);

  // Young's double slit interference
  const getYoungIntensity = useCallback((y: number) => {
    // y is position on screen in meters
    const d = slitSeparation * 1e-3; // convert to meters
    const L = screenDistance;
    const lambda = wavelength * 1e-9;
    const a = slitWidth * 1e-3;

    // Phase difference
    const delta = (2 * Math.PI * d * y) / (lambda * L);

    // Single slit envelope (diffraction)
    const beta = (Math.PI * a * y) / (lambda * L);
    const singleSlitFactor = beta !== 0 ? (Math.sin(beta) / beta) ** 2 : 1;

    // Double slit interference
    const doubleSlit = Math.cos(delta / 2) ** 2;

    return singleSlitFactor * doubleSlit;
  }, [slitSeparation, screenDistance, wavelength, slitWidth]);

  // Single slit diffraction
  const getDiffractionIntensity = useCallback((theta: number) => {
    const a = singleSlitWidth * 1e-3;
    const lambda = wavelength * 1e-9;
    const beta = (Math.PI * a * Math.sin(theta)) / lambda;

    if (Math.abs(beta) < 0.001) return 1;
    return (Math.sin(beta) / beta) ** 2;
  }, [singleSlitWidth, wavelength]);

  // Grating diffraction
  const getGratingMaxima = useCallback(() => {
    const d = 1 / (gratingLines * 1000); // grating spacing in meters
    const lambda = wavelength * 1e-9;
    const maxima: number[] = [];

    for (let m = -5; m <= 5; m++) {
      const sinTheta = (m * lambda) / d;
      if (Math.abs(sinTheta) <= 1) {
        maxima.push(Math.asin(sinTheta) * 180 / Math.PI);
      }
    }
    return maxima;
  }, [gratingLines, wavelength]);

  // Bragg's Law
  const getBraggAngle = useCallback(() => {
    const d = crystalSpacing * 1e-9;
    const lambda = wavelength * 1e-9;
    const sinTheta = (diffractionOrder * lambda) / (2 * d);

    if (Math.abs(sinTheta) <= 1) {
      return Math.asin(sinTheta) * 180 / Math.PI;
    }
    return null;
  }, [crystalSpacing, wavelength, diffractionOrder]);

  // Draw EM Wave (3D perspective)
  useEffect(() => {
    if (mode !== 'emwave') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const centerX = 50;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;

    // X-axis (propagation direction)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '14px system-ui';
    ctx.fillText('z (propagation)', width - 100, centerY + 20);

    // Draw arrow
    ctx.beginPath();
    ctx.moveTo(width - 20, centerY);
    ctx.lineTo(width - 30, centerY - 5);
    ctx.lineTo(width - 30, centerY + 5);
    ctx.closePath();
    ctx.fill();

    // Y-axis (E field direction)
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, height - 20);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillText('E', centerX - 20, 35);

    // Draw E field wave
    if (showEField) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const waveLength = 150;
      const maxAmp = 80 * amplitude;

      for (let i = 0; i <= width - centerX - 40; i++) {
        const x = centerX + i;
        const phase = (i / waveLength) * 2 * Math.PI - time * 2 * Math.PI * frequency;
        const y = centerY - maxAmp * Math.sin(phase);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw E field vectors at intervals
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= width - centerX - 40; i += 30) {
        const x = centerX + i;
        const phase = (i / waveLength) * 2 * Math.PI - time * 2 * Math.PI * frequency;
        const y = centerY - maxAmp * Math.sin(phase);

        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Arrow head
        if (Math.abs(y - centerY) > 10) {
          const direction = y < centerY ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 3, y + direction * 6);
          ctx.lineTo(x + 3, y + direction * 6);
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.fill();
        }
      }
    }

    // Draw B field (perpendicular - shown as depth with perspective)
    if (showBField) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;

      const waveLength = 150;
      const maxAmp = 50 * amplitude;
      const perspective = 0.5;

      // Draw perspective B wave (shown as if going into/out of screen)
      ctx.beginPath();
      for (let i = 0; i <= width - centerX - 40; i++) {
        const x = centerX + i;
        const phase = (i / waveLength) * 2 * Math.PI - time * 2 * Math.PI * frequency;
        const bValue = Math.sin(phase);

        // Perspective offset (simulate depth)
        const xOffset = maxAmp * bValue * perspective;
        const yOffset = maxAmp * bValue * perspective * 0.3;

        if (i === 0) {
          ctx.moveTo(x + xOffset, centerY + yOffset);
        } else {
          ctx.lineTo(x + xOffset, centerY + yOffset);
        }
      }
      ctx.stroke();

      // Draw B field vectors (circles for into/out of page)
      for (let i = 0; i <= width - centerX - 40; i += 30) {
        const phase = (i / waveLength) * 2 * Math.PI - time * 2 * Math.PI * frequency;
        const bValue = Math.sin(phase);
        const x = centerX + i;

        ctx.beginPath();
        ctx.arc(x, centerY, 5, 0, 2 * Math.PI);

        if (bValue > 0.1) {
          // Out of page (dot)
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        } else if (bValue < -0.1) {
          // Into page (cross)
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 3, centerY - 3);
          ctx.lineTo(x + 3, centerY + 3);
          ctx.moveTo(x + 3, centerY - 3);
          ctx.lineTo(x - 3, centerY + 3);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#3b82f6';
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#3b82f6';
      ctx.fillText('B', centerX + 25, height - 30);
    }

    // Draw Poynting vector
    if (showPoynting) {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.lineWidth = 3;

      // Big arrow in propagation direction
      ctx.beginPath();
      ctx.moveTo(width / 2 - 60, centerY + 50);
      ctx.lineTo(width / 2 + 60, centerY + 50);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width / 2 + 60, centerY + 50);
      ctx.lineTo(width / 2 + 45, centerY + 42);
      ctx.lineTo(width / 2 + 45, centerY + 58);
      ctx.closePath();
      ctx.fill();

      ctx.font = '14px system-ui';
      ctx.fillText('S = E × B (Poynting)', width / 2 - 50, centerY + 75);
    }

    // Legend
    ctx.font = '12px system-ui';
    if (showEField) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(width - 120, 20, 15, 15);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Champ E', width - 100, 32);
    }
    if (showBField) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width - 120, 45, 15, 15);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Champ B', width - 100, 57);
    }

  }, [mode, time, amplitude, frequency, showEField, showBField, showPoynting]);

  // Draw Polarization
  useEffect(() => {
    if (mode !== 'polarization') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 4;
    const centerY = height / 2;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const maxRadius = 80 * amplitude;

    // Draw coordinate axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius - 20, centerY);
    ctx.lineTo(centerX + maxRadius + 20, centerY);
    ctx.moveTo(centerX, centerY - maxRadius - 20);
    ctx.lineTo(centerX, centerY + maxRadius + 20);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui';
    ctx.fillText('Ex', centerX + maxRadius + 25, centerY + 5);
    ctx.fillText('Ey', centerX + 5, centerY - maxRadius - 10);

    // Draw polarization trace
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const steps = 100;
    const omega = 2 * Math.PI * frequency;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * (2 * Math.PI / omega);
      const E = getPolarizedE(time - t);
      const x = centerX + E.Ex * maxRadius;
      const y = centerY - E.Ey * maxRadius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw current E vector
    const currentE = getPolarizedE(time);
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + currentE.Ex * maxRadius, centerY - currentE.Ey * maxRadius);
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(-currentE.Ey, currentE.Ex);
    const endX = centerX + currentE.Ex * maxRadius;
    const endY = centerY - currentE.Ey * maxRadius;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 10 * Math.cos(angle - 0.3), endY + 10 * Math.sin(angle - 0.3));
    ctx.lineTo(endX - 10 * Math.cos(angle + 0.3), endY + 10 * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();

    // Draw analyzer if enabled
    if (showAnalyzer) {
      const analyzerX = width * 0.65;
      const analyzerRadius = maxRadius + 30;

      // Draw analyzer circle
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(analyzerX, centerY, analyzerRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw polarizer axis
      const axisAngle = analyzerAngle * Math.PI / 180;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(
        analyzerX - analyzerRadius * Math.cos(axisAngle),
        centerY + analyzerRadius * Math.sin(axisAngle)
      );
      ctx.lineTo(
        analyzerX + analyzerRadius * Math.cos(axisAngle),
        centerY - analyzerRadius * Math.sin(axisAngle)
      );
      ctx.stroke();

      // Draw transmitted intensity
      const intensity = getTransmittedIntensity();
      const barHeight = 150;
      const barWidth = 30;
      const barX = width - 80;

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(barX, centerY - barHeight / 2, barWidth, barHeight);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(barX, centerY + barHeight / 2 - barHeight * intensity, barWidth, barHeight * intensity);

      ctx.fillStyle = '#1e293b';
      ctx.font = '12px system-ui';
      ctx.fillText('I/I₀', barX + 5, centerY - barHeight / 2 - 10);
      ctx.fillText((intensity * 100).toFixed(0) + '%', barX + 2, centerY + barHeight / 2 + 20);

      // Malus's Law label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.fillText('Analyseur', analyzerX - 25, centerY - analyzerRadius - 15);
    }

    // Labels
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px system-ui';
    ctx.fillText('Polarisation: ' + polarizationType, centerX - 50, 30);

  }, [mode, time, amplitude, frequency, polarizationType, polarizationAngle, phaseShift, amplitudeRatio, showAnalyzer, analyzerAngle, getPolarizedE, getTransmittedIntensity]);

  // Draw Spectrum
  useEffect(() => {
    if (mode !== 'spectrum') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // EM Spectrum bands (wavelength ranges in m)
    const bands = [
      { name: 'Gamma', min: 1e-14, max: 1e-11, color: '#4c1d95' },
      { name: 'X', min: 1e-11, max: 1e-8, color: '#5b21b6' },
      { name: 'UV', min: 1e-8, max: 380e-9, color: '#7c3aed' },
      { name: 'Visible', min: 380e-9, max: 750e-9, color: 'rainbow' },
      { name: 'IR', min: 750e-9, max: 1e-3, color: '#dc2626' },
      { name: 'Micro-ondes', min: 1e-3, max: 1, color: '#f97316' },
      { name: 'Radio', min: 1, max: 1e6, color: '#eab308' },
    ];

    const logMin = Math.log10(1e-14);
    const logMax = Math.log10(1e6);
    const logRange = logMax - logMin;

    const barHeight = 60;
    const barY = height / 2 - barHeight / 2;

    // Draw spectrum bands
    bands.forEach(band => {
      const x1 = ((Math.log10(band.min) - logMin) / logRange) * width;
      const x2 = ((Math.log10(band.max) - logMin) / logRange) * width;

      if (band.color === 'rainbow') {
        // Draw visible spectrum
        const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
        gradient.addColorStop(0, '#8b5cf6');    // Violet
        gradient.addColorStop(0.17, '#3b82f6'); // Blue
        gradient.addColorStop(0.33, '#06b6d4'); // Cyan
        gradient.addColorStop(0.5, '#22c55e');  // Green
        gradient.addColorStop(0.67, '#eab308'); // Yellow
        gradient.addColorStop(0.83, '#f97316'); // Orange
        gradient.addColorStop(1, '#ef4444');    // Red
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = band.color;
      }

      ctx.fillRect(x1, barY, x2 - x1, barHeight);

      // Labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(band.name, (x1 + x2) / 2, barY + barHeight + 20);
    });

    // Draw wavelength scale
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barY + barHeight + 40);
    ctx.lineTo(width, barY + barHeight + 40);
    ctx.stroke();

    const scalePoints = [-14, -11, -8, -6, -3, 0, 3, 6];
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    scalePoints.forEach(exp => {
      const x = ((exp - logMin) / logRange) * width;
      ctx.beginPath();
      ctx.moveTo(x, barY + barHeight + 35);
      ctx.lineTo(x, barY + barHeight + 45);
      ctx.stroke();
      ctx.fillText(`10^${exp} m`, x, barY + barHeight + 60);
    });

    // Draw current wavelength indicator
    const currentWavelengthM = wavelength * 1e-9;
    const currentX = ((Math.log10(currentWavelengthM) - logMin) / logRange) * width;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(currentX, barY - 20);
    ctx.lineTo(currentX, barY + barHeight + 20);
    ctx.stroke();

    // Wavelength value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`λ = ${wavelength} nm`, currentX, barY - 30);

    // Color indicator for visible
    if (wavelength >= 380 && wavelength <= 750) {
      const hue = ((750 - wavelength) / (750 - 380)) * 270;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.beginPath();
      ctx.arc(currentX, barY - 50, 15, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Spectre électromagnétique', 20, 30);

    // Frequency scale
    const freqHz = c / (wavelength * 1e-9);
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`f = ${freqHz.toExponential(2)} Hz`, currentX, height - 20);

  }, [mode, wavelength]);

  // Draw Maxwell's charge sandbox - interactive charges creating E and B fields
  useEffect(() => {
    if (mode !== 'maxwell') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calculate fields at each point
    const gridSpacing = 30;
    const arrowScale = 15;

    // For each charge, calculate its current position (with oscillation)
    const chargePositions = charges.map(charge => {
      let x = charge.x;
      let y = charge.y;

      if (charge.oscillating && chargeMode === 'dipole') {
        // Oscillating charge - creates EM radiation
        const oscillationOffset = charge.oscillationAmplitude * Math.sin(2 * Math.PI * charge.oscillationFrequency * time);
        y = charge.y + oscillationOffset;
      } else if (chargeMode === 'moving') {
        // Moving charge - creates magnetic field
        x = charge.x + charge.vx * time * 50;
        y = charge.y + charge.vy * time * 50;
        // Wrap around
        if (x > width) x = x % width;
        if (x < 0) x = width + (x % width);
        if (y > height) y = y % height;
        if (y < 0) y = height + (y % height);
      }

      return { ...charge, currentX: x, currentY: y };
    });

    // Draw electric field lines
    if (showEFieldLines) {
      for (let gx = gridSpacing / 2; gx < width; gx += gridSpacing) {
        for (let gy = gridSpacing / 2; gy < height; gy += gridSpacing) {
          let Ex = 0;
          let Ey = 0;

          // Sum contributions from all charges
          chargePositions.forEach(charge => {
            const dx = gx - charge.currentX;
            const dy = gy - charge.currentY;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);

            if (r > 20) {
              const k = 1000; // Coulomb constant (scaled for visualization)
              const E = k * charge.q / r2;
              Ex += E * dx / r;
              Ey += E * dy / r;
            }
          });

          const E = Math.sqrt(Ex * Ex + Ey * Ey);
          if (E > 0.5) {
            const maxE = 50;
            const normalizedE = Math.min(E / maxE, 1);
            const arrowLength = arrowScale * normalizedE;

            // Normalize direction
            const dirX = Ex / E;
            const dirY = Ey / E;

            // Draw arrow
            const alpha = 0.3 + 0.7 * normalizedE;
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + dirX * arrowLength, gy + dirY * arrowLength);
            ctx.stroke();

            // Arrow head
            if (arrowLength > 5) {
              const headSize = 4;
              const angle = Math.atan2(dirY, dirX);
              ctx.beginPath();
              ctx.moveTo(gx + dirX * arrowLength, gy + dirY * arrowLength);
              ctx.lineTo(
                gx + dirX * arrowLength - headSize * Math.cos(angle - 0.5),
                gy + dirY * arrowLength - headSize * Math.sin(angle - 0.5)
              );
              ctx.lineTo(
                gx + dirX * arrowLength - headSize * Math.cos(angle + 0.5),
                gy + dirY * arrowLength - headSize * Math.sin(angle + 0.5)
              );
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }

    // Draw magnetic field (for moving/oscillating charges)
    if (showBFieldLines && (chargeMode === 'moving' || chargeMode === 'dipole')) {
      chargePositions.forEach(charge => {
        // Velocity for magnetic field calculation
        let vx = charge.vx;
        let vy = charge.vy;

        if (charge.oscillating && chargeMode === 'dipole') {
          // Velocity from oscillation
          vy = charge.oscillationAmplitude * 2 * Math.PI * charge.oscillationFrequency *
               Math.cos(2 * Math.PI * charge.oscillationFrequency * time);
          vx = 0;
        }

        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 0.1) {
          // Draw circular magnetic field lines around the velocity vector
          const numCircles = 4;
          for (let i = 1; i <= numCircles; i++) {
            const radius = 30 + i * 25;
            const alpha = 0.5 - i * 0.1;

            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(charge.currentX, charge.currentY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw direction indicators (dots for out, crosses for in)
            const numIndicators = 8;
            for (let j = 0; j < numIndicators; j++) {
              const angle = (j / numIndicators) * 2 * Math.PI + time * 0.5;
              const ix = charge.currentX + radius * Math.cos(angle);
              const iy = charge.currentY + radius * Math.sin(angle);

              // B field direction depends on charge sign and velocity direction
              const bDirection = charge.q * (vy > 0 ? 1 : -1);
              const isOut = (Math.cos(angle) > 0) === (bDirection > 0);

              ctx.fillStyle = `rgba(59, 130, 246, ${alpha + 0.2})`;
              ctx.strokeStyle = `rgba(59, 130, 246, ${alpha + 0.2})`;
              ctx.lineWidth = 1.5;

              if (isOut) {
                // Dot (coming out)
                ctx.beginPath();
                ctx.arc(ix, iy, 3, 0, 2 * Math.PI);
                ctx.fill();
              } else {
                // Cross (going in)
                ctx.beginPath();
                ctx.moveTo(ix - 3, iy - 3);
                ctx.lineTo(ix + 3, iy + 3);
                ctx.moveTo(ix + 3, iy - 3);
                ctx.lineTo(ix - 3, iy + 3);
                ctx.stroke();
              }
            }
          }
        }
      });
    }

    // Draw radiation waves for oscillating dipole
    if (chargeMode === 'dipole') {
      chargePositions.forEach(charge => {
        if (charge.oscillating) {
          const numWaves = 6;
          for (let i = 0; i < numWaves; i++) {
            const wavePhase = (time * charge.oscillationFrequency * 2 + i / numWaves) % 1;
            const radius = wavePhase * Math.max(width, height);
            const alpha = 0.3 * (1 - wavePhase);

            if (alpha > 0.02) {
              ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(charge.currentX, charge.currentY, radius, 0, 2 * Math.PI);
              ctx.stroke();
            }
          }
        }
      });
    }

    // Draw charges
    chargePositions.forEach(charge => {
      const isSelected = charge.id === selectedChargeId;
      const radius = isSelected ? 18 : 15;

      // Glow effect
      const gradient = ctx.createRadialGradient(
        charge.currentX, charge.currentY, 0,
        charge.currentX, charge.currentY, radius * 2
      );

      if (charge.q > 0) {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(charge.currentX, charge.currentY, radius * 2, 0, 2 * Math.PI);
      ctx.fill();

      // Charge circle
      ctx.fillStyle = charge.q > 0 ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(charge.currentX, charge.currentY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(charge.currentX, charge.currentY, radius + 5, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Plus or minus sign
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(charge.q > 0 ? '+' : '−', charge.currentX, charge.currentY);
    });

    // Legend
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Cliquez pour sélectionner/déplacer une charge', 10, 10);
    ctx.fillText(`Mode: ${chargeMode === 'dipole' ? 'Dipôle oscillant' : chargeMode === 'moving' ? 'Charge en mouvement' : 'Charge statique'}`, 10, 28);

    // Field legend
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 10, 15, 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Champ E', width - 130, 12);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(width - 150, 32, 15, 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Champ B', width - 130, 34);

    if (chargeMode === 'dipole') {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(width - 150, 54, 15, 15);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Rayonnement', width - 130, 56);
    }

  }, [mode, time, charges, chargeMode, showEFieldLines, showBFieldLines, selectedChargeId]);

  // Draw Young's double slit
  useEffect(() => {
    if (mode !== 'young') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const slitX = 100;
    const screenX = width - 80;
    const centerY = height / 2;

    // Draw barrier with slits
    ctx.fillStyle = '#64748b';
    ctx.fillRect(slitX - 5, 0, 10, centerY - 30);
    ctx.fillRect(slitX - 5, centerY - 10, 10, 20);
    ctx.fillRect(slitX - 5, centerY + 30, 10, height - centerY - 30);

    // Draw light source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(30, centerY, 15, 0, 2 * Math.PI);
    ctx.fill();

    // Draw waves from slits
    const numWaves = 8;
    const maxRadius = screenX - slitX - 50;

    ctx.globalAlpha = 0.3;
    for (let wave = 0; wave < numWaves; wave++) {
      const radius = ((time * 100 + wave * 40) % maxRadius);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;

      // Top slit waves
      ctx.beginPath();
      ctx.arc(slitX, centerY - 20, radius, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // Bottom slit waves
      ctx.beginPath();
      ctx.arc(slitX, centerY + 20, radius, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw interference pattern on screen
    const patternHeight = height - 40;
    for (let y = 0; y < patternHeight; y++) {
      const yPos = (y - patternHeight / 2) / patternHeight * 0.02; // Scale to ±1cm
      const intensity = mode === 'young' ? getYoungIntensity(yPos) : getYoungIntensity(yPos);

      // Wavelength to color
      let color;
      if (wavelength >= 380 && wavelength <= 750) {
        const hue = ((750 - wavelength) / (750 - 380)) * 270;
        color = `hsl(${hue}, 100%, ${50 * intensity}%)`;
      } else {
        color = `rgb(${255 * intensity}, ${255 * intensity}, ${255 * intensity})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(screenX, 20 + y, 40, 1);
    }

    // Draw screen border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, 20, 40, patternHeight);

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui';
    ctx.fillText('Source', 15, centerY - 25);
    ctx.fillText('Fentes', slitX - 20, 20);
    ctx.fillText('Écran', screenX, height - 5);

    // Parameters
    ctx.fillText(`d = ${slitSeparation} mm`, slitX + 30, 30);
    ctx.fillText(`a = ${slitWidth} mm`, slitX + 30, 50);
    ctx.fillText(`L = ${screenDistance} m`, (slitX + screenX) / 2, height - 10);
    ctx.fillText(`λ = ${wavelength} nm`, 20, 30);

  }, [mode, time, wavelength, slitSeparation, slitWidth, screenDistance, getYoungIntensity]);

  // Draw diffraction pattern
  useEffect(() => {
    if (mode !== 'diffraction') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const slitX = 120;
    const screenX = width - 100;
    const centerY = height / 2;

    // Draw single slit
    ctx.fillStyle = '#64748b';
    ctx.fillRect(slitX - 5, 0, 10, centerY - 25);
    ctx.fillRect(slitX - 5, centerY + 25, 10, height - centerY - 25);

    // Draw light source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(40, centerY, 15, 0, 2 * Math.PI);
    ctx.fill();

    // Draw waves from slit using Huygens principle
    ctx.globalAlpha = 0.2;
    const numSources = 7;
    const slitHalfWidth = 20;

    for (let s = 0; s < numSources; s++) {
      const sourceY = centerY + (s - (numSources - 1) / 2) * (slitHalfWidth * 2 / numSources);

      for (let wave = 0; wave < 6; wave++) {
        const radius = ((time * 80 + wave * 35) % 200);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(slitX, sourceY, radius, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Draw diffraction pattern on screen
    const patternHeight = height - 40;
    for (let y = 0; y < patternHeight; y++) {
      const theta = Math.atan2(y - patternHeight / 2, screenX - slitX) * 2;
      const intensity = getDiffractionIntensity(theta);

      let color;
      if (wavelength >= 380 && wavelength <= 750) {
        const hue = ((750 - wavelength) / (750 - 380)) * 270;
        color = `hsl(${hue}, 100%, ${50 * intensity}%)`;
      } else {
        color = `rgb(${255 * intensity}, ${255 * intensity}, ${255 * intensity})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(screenX, 20 + y, 50, 1);
    }

    // Intensity graph
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < patternHeight; y++) {
      const theta = Math.atan2(y - patternHeight / 2, screenX - slitX) * 2;
      const intensity = getDiffractionIntensity(theta);
      const graphX = screenX + 60 + intensity * 80;

      if (y === 0) {
        ctx.moveTo(graphX, 20 + y);
      } else {
        ctx.lineTo(graphX, 20 + y);
      }
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui';
    ctx.fillText('Source', 25, centerY - 25);
    ctx.fillText('Fente', slitX - 15, 20);
    ctx.fillText(`a = ${singleSlitWidth} mm`, slitX + 20, 30);
    ctx.fillText(`λ = ${wavelength} nm`, 20, 30);
    ctx.fillText('I(θ)', screenX + 100, 20);

  }, [mode, time, wavelength, singleSlitWidth, getDiffractionIntensity]);

  // Draw Bragg/Grating
  useEffect(() => {
    if (mode !== 'bragg') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Draw crystal planes
    const numPlanes = 5;
    const planeSpacing = 40;
    const planeWidth = 200;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;

    for (let i = 0; i < numPlanes; i++) {
      const y = centerY + (i - 2) * planeSpacing;
      ctx.beginPath();
      ctx.moveTo(centerX - planeWidth / 2, y);
      ctx.lineTo(centerX + planeWidth / 2, y);
      ctx.stroke();

      // Draw atoms
      for (let j = 0; j < 8; j++) {
        const x = centerX - planeWidth / 2 + 20 + j * 25;
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw incoming X-ray
    const braggAngle = getBraggAngle();
    if (braggAngle !== null) {
      const incidentAngle = braggAngle * Math.PI / 180;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Incoming ray
      const rayLength = 150;
      const startX = centerX - rayLength * Math.cos(incidentAngle);
      const startY = centerY - planeSpacing - rayLength * Math.sin(incidentAngle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(centerX, centerY - planeSpacing);
      ctx.stroke();

      // Arrow
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - planeSpacing);
      ctx.lineTo(centerX - 15 * Math.cos(incidentAngle - 0.3), centerY - planeSpacing - 15 * Math.sin(incidentAngle - 0.3));
      ctx.lineTo(centerX - 15 * Math.cos(incidentAngle + 0.3), centerY - planeSpacing - 15 * Math.sin(incidentAngle + 0.3));
      ctx.closePath();
      ctx.fill();

      // Reflected ray
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - planeSpacing);
      ctx.lineTo(centerX + rayLength * Math.cos(incidentAngle), startY);
      ctx.stroke();

      // Second plane reflection
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.moveTo(startX + planeSpacing / Math.tan(incidentAngle), startY + planeSpacing / Math.sin(incidentAngle));
      ctx.lineTo(centerX + 20, centerY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.beginPath();
      ctx.moveTo(centerX + 20, centerY);
      ctx.lineTo(centerX + 20 + rayLength * Math.cos(incidentAngle), centerY - rayLength * Math.sin(incidentAngle));
      ctx.stroke();

      // Path difference indicator
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - planeSpacing);
      ctx.lineTo(centerX + 20, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Angle arc
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY - planeSpacing, 30, -Math.PI / 2, -Math.PI / 2 + incidentAngle);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px system-ui';
      ctx.fillText(`θ = ${braggAngle.toFixed(1)}°`, centerX + 35, centerY - planeSpacing - 20);
    }

    // Parameters
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px system-ui';
    ctx.fillText(`d = ${crystalSpacing} nm (espacement)`, 20, 30);
    ctx.fillText(`λ = ${wavelength} nm`, 20, 50);
    ctx.fillText(`n = ${diffractionOrder} (ordre)`, 20, 70);

    if (braggAngle !== null) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(`Angle de Bragg: θ = ${braggAngle.toFixed(2)}°`, 20, height - 20);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px system-ui';
      ctx.fillText('Pas de réflexion pour ces paramètres', 20, height - 20);
    }

    // Legend
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 20, 20, 3);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px system-ui';
    ctx.fillText('Rayon incident', width - 125, 25);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(width - 150, 40, 20, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Rayon réfléchi', width - 125, 45);

  }, [mode, wavelength, crystalSpacing, diffractionOrder, getBraggAngle]);


  const modes = [
    { id: 'emwave', label: 'Onde E-M', icon: '〰️' },
    { id: 'polarization', label: 'Polarisation', icon: '🔄' },
    { id: 'spectrum', label: 'Spectre EM', icon: '🌈' },
    { id: 'maxwell', label: 'Charges & Champs', icon: '⚡' },
    { id: 'young', label: 'Young', icon: '💡' },
    { id: 'diffraction', label: 'Diffraction', icon: '🔦' },
    { id: 'bragg', label: 'Bragg', icon: '💎' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Mode selector */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id as SimulationMode);
                setTime(0);
                lastTimeRef.current = 0;
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.id
                  ? 'bg-white text-violet-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span className="mr-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Common controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-full ${
                isPlaying ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={() => {
                setTime(0);
                lastTimeRef.current = 0;
              }}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              🔄
            </button>
          </div>

          {/* Mode-specific controls */}
          {mode === 'emwave' && (
            <>
              {/* 2D/3D Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Vue:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView3D(false)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      !view3D ? 'bg-white shadow text-violet-700' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    2D
                  </button>
                  <button
                    onClick={() => setView3D(true)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      view3D ? 'bg-white shadow text-violet-700' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    3D
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amplitude: {amplitude.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={amplitude}
                  onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence: {frequency.toFixed(1)} Hz
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showEField}
                    onChange={(e) => setShowEField(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-red-600 font-medium">Champ E</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBField}
                    onChange={(e) => setShowBField(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-blue-600 font-medium">Champ B</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPoynting}
                    onChange={(e) => setShowPoynting(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-green-600 font-medium">Poynting</span>
                </label>
                {view3D && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showWavefronts}
                      onChange={(e) => setShowWavefronts(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-purple-600 font-medium">Fronts d'onde</span>
                  </label>
                )}
              </div>
            </>
          )}

          {mode === 'polarization' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={polarizationType}
                  onChange={(e) => setPolarizationType(e.target.value as PolarizationType)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="linear">Linéaire</option>
                  <option value="circular">Circulaire</option>
                  <option value="elliptical">Elliptique</option>
                </select>
              </div>
              {polarizationType === 'linear' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Angle de polarisation: {polarizationAngle}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="5"
                    value={polarizationAngle}
                    onChange={(e) => setPolarizationAngle(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              {polarizationType === 'elliptical' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Déphasage: {phaseShift}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="5"
                      value={phaseShift}
                      onChange={(e) => setPhaseShift(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ratio Ey/Ex: {amplitudeRatio.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={amplitudeRatio}
                      onChange={(e) => setAmplitudeRatio(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showAnalyzer}
                    onChange={(e) => setShowAnalyzer(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Analyseur (Loi de Malus)</span>
                </label>
              </div>
              {showAnalyzer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Angle analyseur: {analyzerAngle}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="5"
                    value={analyzerAngle}
                    onChange={(e) => setAnalyzerAngle(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </>
          )}

          {mode === 'spectrum' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longueur d'onde: {wavelength} nm
              </label>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={wavelength}
                onChange={(e) => setWavelength(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>UV</span>
                <span>Visible</span>
                <span>IR</span>
              </div>
            </div>
          )}

          {mode === 'maxwell' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  value={chargeMode}
                  onChange={(e) => setChargeMode(e.target.value as 'dipole' | 'moving' | 'static')}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="dipole">Dipôle oscillant (rayonnement EM)</option>
                  <option value="moving">Charge en mouvement (champ B)</option>
                  <option value="static">Charge statique (champ E)</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => addCharge(true)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  + Charge +
                </button>
                <button
                  onClick={() => addCharge(false)}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  + Charge −
                </button>
                {selectedChargeId !== null && (
                  <button
                    onClick={removeSelectedCharge}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Supprimer
                  </button>
                )}
                <button
                  onClick={clearCharges}
                  className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                >
                  Effacer tout
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showEFieldLines}
                    onChange={(e) => setShowEFieldLines(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-red-600 font-medium">Champ E</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBFieldLines}
                    onChange={(e) => setShowBFieldLines(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-blue-600 font-medium">Champ B</span>
                </label>
              </div>
            </>
          )}

          {mode === 'young' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ: {wavelength} nm
                </label>
                <input
                  type="range"
                  min="380"
                  max="750"
                  step="10"
                  value={wavelength}
                  onChange={(e) => setWavelength(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Séparation fentes: {slitSeparation} mm
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={slitSeparation}
                  onChange={(e) => setSlitSeparation(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Largeur fente: {slitWidth} mm
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={slitWidth}
                  onChange={(e) => setSlitWidth(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance écran: {screenDistance} m
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={screenDistance}
                  onChange={(e) => setScreenDistance(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {mode === 'diffraction' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ: {wavelength} nm
                </label>
                <input
                  type="range"
                  min="380"
                  max="750"
                  step="10"
                  value={wavelength}
                  onChange={(e) => setWavelength(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Largeur fente: {singleSlitWidth} mm
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={singleSlitWidth}
                  onChange={(e) => setSingleSlitWidth(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {mode === 'bragg' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ: {wavelength} nm
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="2"
                  step="0.01"
                  value={wavelength}
                  onChange={(e) => setWavelength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Espacement cristal: {crystalSpacing} nm
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={crystalSpacing}
                  onChange={(e) => setCrystalSpacing(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordre n: {diffractionOrder}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={diffractionOrder}
                  onChange={(e) => setDiffractionOrder(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

        </div>

        {/* Canvas / 3D View */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          {mode === 'emwave' && view3D ? (
            <div className="h-[400px] rounded-lg overflow-hidden">
              <EMWave3DView
                amplitude={amplitude}
                frequency={frequency}
                wavelength={wavelength}
                showEField={showEField}
                showBField={showBField}
                showPoynting={showPoynting}
                showWavefronts={showWavefronts}
                isPlaying={isPlaying}
              />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={350}
              className={`w-full rounded-lg ${mode === 'maxwell' ? 'cursor-pointer' : ''}`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          )}
        </div>

        {/* 3D View Instructions */}
        {mode === 'emwave' && view3D && (
          <div className="mb-6 p-3 bg-violet-50 rounded-lg text-sm text-violet-700">
            <span className="font-medium">Navigation 3D:</span> Clic gauche + glisser pour tourner,
            molette pour zoomer, clic droit + glisser pour déplacer.
            <span className="ml-2 text-violet-500">
              E oscille en Y (rouge), B oscille en X (bleu), propagation en Z.
            </span>
          </div>
        )}

        {/* Formulas */}
        <div className="bg-violet-50 rounded-xl p-4">
          <h3 className="font-semibold text-violet-900 mb-3">Formules</h3>

          {mode === 'emwave' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <BlockMath math="E(z,t) = E_0 \sin(kz - \omega t) \quad \text{(Champ électrique)}" />
                <BlockMath math="B(z,t) = \frac{E_0}{c} \sin(kz - \omega t) \quad \text{(Champ magnétique)}" />
                <BlockMath math="\vec{S} = \frac{1}{\mu_0} \vec{E} \times \vec{B} \quad \text{(Vecteur de Poynting)}" />
                <BlockMath math="c = \frac{1}{\sqrt{\epsilon_0 \mu_0}} = 3 \times 10^8 \text{ m/s}" />
              </div>
            </div>
          )}

          {mode === 'polarization' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                {polarizationType === 'linear' && (
                  <BlockMath math="E_x = E_0 \cos\theta \sin(\omega t), \quad E_y = E_0 \sin\theta \sin(\omega t)" />
                )}
                {polarizationType === 'circular' && (
                  <BlockMath math="E_x = E_0 \sin(\omega t), \quad E_y = E_0 \sin(\omega t + \frac{\pi}{2})" />
                )}
                {polarizationType === 'elliptical' && (
                  <BlockMath math="E_x = E_0 \sin(\omega t), \quad E_y = E_0' \sin(\omega t + \phi)" />
                )}
                {showAnalyzer && (
                  <>
                    <BlockMath math="I = I_0 \cos^2(\theta) \quad \text{(Loi de Malus)}" />
                    <p className="mt-2">Intensité transmise: <InlineMath math={`I/I_0 = ${(getTransmittedIntensity() * 100).toFixed(1)}\\%`} /></p>
                  </>
                )}
              </div>
            </div>
          )}

          {mode === 'spectrum' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <BlockMath math="c = \lambda f" />
                <BlockMath math="E = hf = \frac{hc}{\lambda}" />
                <p className="mt-2">Pour λ = {wavelength} nm: f = {(c / (wavelength * 1e-9)).toExponential(2)} Hz</p>
              </div>
            </div>
          )}

          {mode === 'maxwell' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <p className="font-semibold mb-2">Équations de Maxwell:</p>
                <BlockMath math="\nabla \cdot \vec{E} = \frac{\rho}{\epsilon_0} \quad \text{(Gauss - sources de E)}" />
                <BlockMath math="\nabla \times \vec{B} = \mu_0 \vec{J} + \mu_0 \epsilon_0 \frac{\partial \vec{E}}{\partial t} \quad \text{(Ampère - courant crée B)}" />
                {chargeMode === 'dipole' && (
                  <>
                    <p className="mt-3 font-semibold">Rayonnement du dipôle:</p>
                    <BlockMath math="P = \frac{\mu_0 p_0^2 \omega^4}{12\pi c} \quad \text{(Puissance rayonnée)}" />
                  </>
                )}
                {chargeMode === 'moving' && (
                  <>
                    <p className="mt-3 font-semibold">Champ d'une charge en mouvement:</p>
                    <BlockMath math="\vec{B} = \frac{\mu_0}{4\pi} \frac{q\vec{v} \times \hat{r}}{r^2} \quad \text{(Biot-Savart)}" />
                  </>
                )}
                {chargeMode === 'static' && (
                  <>
                    <p className="mt-3 font-semibold">Champ électrostatique:</p>
                    <BlockMath math="\vec{E} = \frac{1}{4\pi\epsilon_0} \frac{q}{r^2} \hat{r} \quad \text{(Coulomb)}" />
                  </>
                )}
              </div>
            </div>
          )}

          {mode === 'young' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <BlockMath math="\Delta = d \sin\theta \approx \frac{dy}{L}" />
                <BlockMath math="y_n = \frac{n \lambda L}{d} \quad \text{(Maxima)}" />
                <BlockMath math="y_n = \frac{(n + \frac{1}{2}) \lambda L}{d} \quad \text{(Minima)}" />
                <BlockMath math="I = I_0 \cos^2\left(\frac{\pi d y}{\lambda L}\right) \cdot \text{sinc}^2\left(\frac{\pi a y}{\lambda L}\right)" />
              </div>
            </div>
          )}

          {mode === 'diffraction' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <BlockMath math="I(\theta) = I_0 \left(\frac{\sin\beta}{\beta}\right)^2, \quad \beta = \frac{\pi a \sin\theta}{\lambda}" />
                <BlockMath math="a \sin\theta_n = n\lambda \quad \text{(Minima, } n \neq 0\text{)}" />
                <BlockMath math="\Delta\theta_{central} = \frac{2\lambda}{a}" />
              </div>
            </div>
          )}

          {mode === 'bragg' && (
            <div className="space-y-2">
              <div className="text-sm text-violet-800">
                <BlockMath math="2d\sin\theta = n\lambda \quad \text{(Loi de Bragg)}" />
                <BlockMath math="d\sin\theta = m\lambda \quad \text{(Réseau de diffraction)}" />
                {getBraggAngle() !== null && (
                  <p className="mt-2">
                    Angle de Bragg: θ = {getBraggAngle()!.toFixed(2)}°
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
