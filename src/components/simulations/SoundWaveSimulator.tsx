'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type SimulationMode = 'doppler' | 'mach' | 'intensity' | 'speed' | 'interference';

export function SoundWaveSimulator() {
  const [mode, setMode] = useState<SimulationMode>('doppler');
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);

  // Doppler parameters
  const [sourceFrequency, setSourceFrequency] = useState(440);
  const [sourceSpeed, setSourceSpeed] = useState(0);
  const [soundSpeed, setSoundSpeed] = useState(343);
  const [sourcePosition, setSourcePosition] = useState(0);

  // Mach parameters
  const [machSpeed, setMachSpeed] = useState(400);

  // Intensity parameters
  const [power, setPower] = useState(1);
  const [distance, setDistance] = useState(2);

  // Speed of sound parameters
  const [temperature, setTemperature] = useState(20);
  const [medium, setMedium] = useState<'air' | 'water' | 'steel'>('air');

  // Interference parameters
  const [speakerDistance, setSpeakerDistance] = useState(2);
  const [interferenceFreq, setInterferenceFreq] = useState(200);
  const [observerX, setObserverX] = useState(3);
  const [observerY, setObserverY] = useState(0);
  const [phaseDiff, setPhaseDiff] = useState(0);
  const [showWaveFronts, setShowWaveFronts] = useState(true);
  const [showInterferencePattern, setShowInterferencePattern] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const waveFrontsRef = useRef<{x: number, y: number, radius: number, time: number}[]>([]);

  // Interference wavelength
  const interferenceWavelength = soundSpeed / interferenceFreq;

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

  // Update source position for Doppler/Mach
  useEffect(() => {
    if (mode === 'doppler' || mode === 'mach') {
      const speed = mode === 'mach' ? machSpeed : sourceSpeed;
      setSourcePosition(prev => {
        const newPos = prev + speed * 0.016;
        if (newPos > 400) return -400;
        return newPos;
      });
    }
  }, [time, mode, sourceSpeed, machSpeed]);

  // Calculate Doppler frequencies
  const getDopplerFrequency = useCallback((observerPosition: 'front' | 'back') => {
    const vSource = sourceSpeed;
    const vSound = soundSpeed;

    if (observerPosition === 'front') {
      // Observer in front (source approaching)
      return sourceFrequency * (vSound / (vSound - vSource));
    } else {
      // Observer behind (source receding)
      return sourceFrequency * (vSound / (vSound + vSource));
    }
  }, [sourceFrequency, sourceSpeed, soundSpeed]);

  // Calculate Mach number and cone angle
  const machNumber = machSpeed / soundSpeed;
  const machAngle = machNumber > 1 ? Math.asin(1 / machNumber) * (180 / Math.PI) : 90;

  // Calculate intensity
  const intensity = power / (4 * Math.PI * distance * distance);
  const intensityDB = 10 * Math.log10(intensity / 1e-12);

  // Calculate speed of sound in different media
  const getSpeedOfSound = useCallback(() => {
    if (medium === 'air') {
      return 331.3 * Math.sqrt(1 + temperature / 273.15);
    } else if (medium === 'water') {
      return 1481 + 4.6 * (temperature - 20);
    } else {
      return 5960; // Steel (approximately constant)
    }
  }, [medium, temperature]);

  // Calculate interference at a point
  const getInterference = useCallback((x: number, y: number) => {
    const speaker1Y = speakerDistance / 2;
    const speaker2Y = -speakerDistance / 2;

    const r1 = Math.sqrt(x * x + (y - speaker1Y) * (y - speaker1Y));
    const r2 = Math.sqrt(x * x + (y - speaker2Y) * (y - speaker2Y));

    const pathDiff = r2 - r1;
    const phaseDiffTotal = (2 * Math.PI * pathDiff / interferenceWavelength) + phaseDiff;

    const resultantAmplitude = 2 * Math.abs(Math.cos(phaseDiffTotal / 2));

    return {
      r1,
      r2,
      pathDiff,
      phaseDiffTotal,
      resultantAmplitude,
      isConstructive: Math.abs(Math.cos(phaseDiffTotal / 2)) > 0.7,
      isDestructive: Math.abs(Math.cos(phaseDiffTotal / 2)) < 0.3
    };
  }, [speakerDistance, interferenceWavelength, phaseDiff]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (mode === 'doppler') {
      // Draw observer positions
      const observerFrontX = width - 80;
      const observerBackX = 80;

      // Draw observers
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(observerFrontX, centerY, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('O₁', observerFrontX, centerY + 4);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(observerBackX, centerY, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText('O₂', observerBackX, centerY + 4);

      // Source position
      const srcX = centerX + sourcePosition * 0.3;

      // Draw wave fronts
      const numWaves = 8;
      const waveSpacing = soundSpeed / sourceFrequency * 2;

      for (let i = 0; i < numWaves; i++) {
        const baseRadius = (i + 1) * waveSpacing + (time * soundSpeed * 10) % waveSpacing;
        const emitX = srcX - sourceSpeed * 0.3 * (i * 0.1 + (time * 10) % 0.1);

        if (baseRadius > 0 && baseRadius < 500) {
          const alpha = Math.max(0, 1 - baseRadius / 400);
          ctx.strokeStyle = `rgba(147, 197, 253, ${alpha * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(emitX, centerY, baseRadius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      // Draw source
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(srcX, centerY, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Speaker icon
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText('🔊', srcX - 8, centerY + 5);

      // Velocity arrow
      if (sourceSpeed !== 0) {
        const arrowLen = Math.min(80, Math.abs(sourceSpeed) * 0.2);
        const direction = sourceSpeed > 0 ? 1 : -1;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(srcX, centerY - 35);
        ctx.lineTo(srcX + arrowLen * direction, centerY - 35);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(srcX + arrowLen * direction, centerY - 35);
        ctx.lineTo(srcX + (arrowLen - 10) * direction, centerY - 40);
        ctx.lineTo(srcX + (arrowLen - 10) * direction, centerY - 30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px Inter';
        ctx.fillText(`v = ${sourceSpeed} m/s`, srcX + arrowLen * direction * 0.5, centerY - 45);
      }

      // Frequency labels
      const freqFront = getDopplerFrequency('front');
      const freqBack = getDopplerFrequency('back');

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`f = ${freqFront.toFixed(0)} Hz`, observerFrontX, centerY + 40);
      ctx.fillText(freqFront > sourceFrequency ? '↑ Plus aigu' : (freqFront < sourceFrequency ? '↓ Plus grave' : ''), observerFrontX, centerY + 55);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`f = ${freqBack.toFixed(0)} Hz`, observerBackX, centerY + 40);
      ctx.fillText(freqBack < sourceFrequency ? '↓ Plus grave' : (freqBack > sourceFrequency ? '↑ Plus aigu' : ''), observerBackX, centerY + 55);

      // Source frequency
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`f₀ = ${sourceFrequency} Hz`, srcX, centerY + 45);

    } else if (mode === 'mach') {
      const srcX = centerX + sourcePosition * 0.5;

      if (machNumber >= 1) {
        // Supersonic - draw Mach cone
        const coneAngleRad = Math.asin(1 / machNumber);

        // Shock wave cone
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(srcX, centerY);
        ctx.lineTo(srcX - 600, centerY - 600 * Math.tan(coneAngleRad));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(srcX, centerY);
        ctx.lineTo(srcX - 600, centerY + 600 * Math.tan(coneAngleRad));
        ctx.stroke();

        // Fill cone area
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.beginPath();
        ctx.moveTo(srcX, centerY);
        ctx.lineTo(srcX - 600, centerY - 600 * Math.tan(coneAngleRad));
        ctx.lineTo(srcX - 600, centerY + 600 * Math.tan(coneAngleRad));
        ctx.closePath();
        ctx.fill();

        // Compressed wave fronts inside cone
        for (let i = 1; i <= 5; i++) {
          const r = i * 40;
          const startAngle = Math.PI - coneAngleRad;
          const endAngle = Math.PI + coneAngleRad;

          ctx.strokeStyle = `rgba(147, 197, 253, ${0.5 - i * 0.08})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(srcX - r * 0.5, centerY, r, startAngle, endAngle);
          ctx.stroke();
        }

        // Angle annotation
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(srcX, centerY);
        ctx.lineTo(srcX - 100, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(srcX, centerY, 50, Math.PI, Math.PI + coneAngleRad, true);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '14px Inter';
        ctx.fillText(`θ = ${machAngle.toFixed(1)}°`, srcX - 80, centerY - 30);

      } else {
        // Subsonic - draw normal wave fronts
        for (let i = 1; i <= 6; i++) {
          const radius = i * 50 + (time * 100) % 50;
          const emitX = srcX - machSpeed * 0.3 * (i * 0.05);

          if (radius < 400) {
            ctx.strokeStyle = `rgba(147, 197, 253, ${0.6 - i * 0.08})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(emitX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }

      // Draw source (jet/object)
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(srcX + 30, centerY);
      ctx.lineTo(srcX - 20, centerY - 15);
      ctx.lineTo(srcX - 20, centerY + 15);
      ctx.closePath();
      ctx.fill();

      // Velocity info
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`v = ${machSpeed} m/s`, srcX, centerY - 40);
      ctx.fillText(`Mach ${machNumber.toFixed(2)}`, srcX, centerY - 55);

      // Regime label
      ctx.fillStyle = machNumber >= 1 ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 16px Inter';
      ctx.fillText(machNumber >= 1 ? 'SUPERSONIQUE' : 'SUBSONIQUE', srcX, centerY + 50);

      if (machNumber >= 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px Inter';
        ctx.fillText('Onde de choc (bang sonique)', srcX, centerY + 70);
      }

    } else if (mode === 'intensity') {
      // Draw source
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔊', centerX - 2, centerY + 6);

      // Draw intensity circles
      const maxRadius = 250;
      const numCircles = 8;

      for (let i = 1; i <= numCircles; i++) {
        const r = (i / numCircles) * maxRadius;
        const intensityAtR = power / (4 * Math.PI * (r / 50) * (r / 50));
        const alpha = Math.min(1, intensityAtR * 50);

        ctx.strokeStyle = `rgba(147, 197, 253, ${alpha * 0.4})`;
        ctx.lineWidth = 2 + alpha * 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.stroke();

        // Distance label
        if (i % 2 === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px Inter';
          ctx.fillText(`${(r / 50).toFixed(1)} m`, centerX + r + 15, centerY);
        }
      }

      // Draw measurement point
      const measureX = centerX + distance * 50;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(measureX, centerY, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Dashed line to measurement
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX + 25, centerY);
      ctx.lineTo(measureX - 12, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance label
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px Inter';
      ctx.fillText(`r = ${distance.toFixed(1)} m`, (centerX + measureX) / 2, centerY - 15);

      // Intensity display
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Inter';
      ctx.fillText(`I = ${intensity.toExponential(2)} W/m²`, measureX, centerY + 40);
      ctx.fillText(`${intensityDB.toFixed(1)} dB`, measureX, centerY + 60);

      // Power label
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px Inter';
      ctx.fillText(`P = ${power.toFixed(1)} W`, centerX, centerY + 50);

      // Intensity gradient bar
      const barX = 50;
      const barY = height - 40;
      const barWidth = width - 100;
      const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(0.5, '#fbbf24');
      gradient.addColorStop(1, '#ef4444');

      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY, barWidth, 15);

      // dB scale
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter';
      ctx.fillText('0 dB', barX, barY + 28);
      ctx.fillText('60 dB', barX + barWidth / 2, barY + 28);
      ctx.fillText('120 dB', barX + barWidth - 20, barY + 28);

      // Current level marker
      const markerPos = barX + Math.min(1, Math.max(0, intensityDB / 120)) * barWidth;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(markerPos, barY);
      ctx.lineTo(markerPos - 6, barY - 8);
      ctx.lineTo(markerPos + 6, barY - 8);
      ctx.closePath();
      ctx.fill();

    } else if (mode === 'speed') {
      const calculatedSpeed = getSpeedOfSound();

      // Draw medium representation
      let bgColor, particleColor, mediumName;
      if (medium === 'air') {
        bgColor = 'rgba(147, 197, 253, 0.1)';
        particleColor = '#93c5fd';
        mediumName = 'Air';
      } else if (medium === 'water') {
        bgColor = 'rgba(34, 211, 238, 0.2)';
        particleColor = '#22d3ee';
        mediumName = 'Eau';
      } else {
        bgColor = 'rgba(156, 163, 175, 0.3)';
        particleColor = '#9ca3af';
        mediumName = 'Acier';
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(50, 50, width - 100, height - 100);

      // Draw particles
      const particleCount = medium === 'air' ? 30 : (medium === 'water' ? 60 : 100);
      const particleSize = medium === 'air' ? 4 : (medium === 'water' ? 5 : 6);

      for (let i = 0; i < particleCount; i++) {
        const px = 60 + (i % 10) * ((width - 120) / 10);
        const py = 60 + Math.floor(i / 10) * ((height - 120) / (particleCount / 10));
        const offset = Math.sin(time * 10 + px * 0.02) * (medium === 'air' ? 8 : (medium === 'water' ? 5 : 2));

        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(px + offset, py, particleSize, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Wave propagation visualization
      const waveX = 50 + ((time * calculatedSpeed * 0.3) % (width - 100));
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.fillRect(waveX - 20, 50, 40, height - 100);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(waveX, 50);
      ctx.lineTo(waveX, height - 50);
      ctx.stroke();

      // Speed display
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`v = ${calculatedSpeed.toFixed(0)} m/s`, centerX, 35);

      // Medium label
      ctx.fillStyle = particleColor;
      ctx.font = 'bold 18px Inter';
      ctx.fillText(mediumName, centerX, height - 20);

      // Temperature effect (for air)
      if (medium === 'air') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '14px Inter';
        ctx.fillText(`T = ${temperature}°C`, centerX, height - 60);
      }

      // Comparison bar
      const barY = height - 90;
      const maxSpeed = 6000;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(80, barY, width - 160, 20);

      const speedRatio = calculatedSpeed / maxSpeed;
      const gradient = ctx.createLinearGradient(80, 0, 80 + (width - 160) * speedRatio, 0);
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
      ctx.fillRect(80, barY, (width - 160) * speedRatio, 20);

      // Speed markers
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('0', 80, barY + 32);
      ctx.textAlign = 'center';
      ctx.fillText('Air (343)', 80 + (width - 160) * (343 / maxSpeed), barY + 32);
      ctx.fillText('Eau (1480)', 80 + (width - 160) * (1480 / maxSpeed), barY + 32);
      ctx.textAlign = 'right';
      ctx.fillText('Acier (5960)', width - 80, barY + 32);

    } else if (mode === 'interference') {
      const scale = 60;
      const srcX = 100;

      // Speaker positions
      const speaker1Y = centerY - (speakerDistance / 2) * scale;
      const speaker2Y = centerY + (speakerDistance / 2) * scale;

      // Draw interference pattern (background)
      if (showInterferencePattern) {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let px = 0; px < width; px++) {
          for (let py = 0; py < height; py++) {
            const x = (px - srcX) / scale;
            const y = (centerY - py) / scale;

            if (x > 0) {
              const interference = getInterference(x, y);
              const intensityVal = interference.resultantAmplitude / 2;

              const idx = (py * width + px) * 4;

              if (interference.isConstructive) {
                data[idx] = 34;
                data[idx + 1] = Math.floor(197 * intensityVal);
                data[idx + 2] = 94;
                data[idx + 3] = Math.floor(100 * intensityVal);
              } else if (interference.isDestructive) {
                data[idx] = Math.floor(239 * (1 - intensityVal));
                data[idx + 1] = 68;
                data[idx + 2] = 68;
                data[idx + 3] = Math.floor(100 * (1 - intensityVal));
              } else {
                data[idx] = 59;
                data[idx + 1] = 130;
                data[idx + 2] = 246;
                data[idx + 3] = Math.floor(60 * intensityVal);
              }
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Draw wave fronts
      if (showWaveFronts) {
        const numWaves = 12;

        for (let i = 0; i < numWaves; i++) {
          const baseRadius = (i * interferenceWavelength + (time * soundSpeed) % interferenceWavelength) * scale;

          if (baseRadius > 0 && baseRadius < 600) {
            const alpha = Math.max(0, 0.4 - baseRadius / 1500);

            // Speaker 1 waves
            ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(srcX, speaker1Y, baseRadius, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();

            // Speaker 2 waves
            const phaseOffset = (phaseDiff / (2 * Math.PI)) * interferenceWavelength * scale;
            const radius2 = baseRadius - phaseOffset;
            if (radius2 > 0) {
              ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
              ctx.beginPath();
              ctx.arc(srcX, speaker2Y, radius2, -Math.PI / 2, Math.PI / 2);
              ctx.stroke();
            }
          }
        }
      }

      // Draw speakers
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(srcX - 25, speaker1Y - 20, 30, 40);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(srcX - 25, speaker2Y - 20, 30, 40);

      // Speaker cones
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(srcX - 10, speaker1Y, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(srcX - 10, speaker2Y, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Speaker labels
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('S₁', srcX - 10, speaker1Y - 30);
      ctx.fillText('S₂', srcX - 10, speaker2Y + 40);

      // Distance annotation
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(srcX - 40, speaker1Y);
      ctx.lineTo(srcX - 40, speaker2Y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(`d = ${speakerDistance.toFixed(1)} m`, srcX - 45, centerY);

      // Draw observer
      const obsX = srcX + observerX * scale;
      const obsY = centerY - observerY * scale;

      // Path lines to observer
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(srcX, speaker1Y);
      ctx.lineTo(obsX, obsY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.beginPath();
      ctx.moveTo(srcX, speaker2Y);
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

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter';
      ctx.fillText(`λ = ${interferenceWavelength.toFixed(2)} m`, width - 150, 75);
    }

  }, [time, mode, sourceFrequency, sourceSpeed, soundSpeed, sourcePosition,
      machSpeed, machNumber, machAngle, power, distance, intensity, intensityDB,
      temperature, medium, getDopplerFrequency, getSpeedOfSound,
      speakerDistance, interferenceFreq, interferenceWavelength, observerX, observerY,
      phaseDiff, showWaveFronts, showInterferencePattern, getInterference]);

  const handleReset = () => {
    setTime(0);
    setSourcePosition(0);
    lastTimeRef.current = 0;
    waveFrontsRef.current = [];
  };

  const freqFront = getDopplerFrequency('front');
  const freqBack = getDopplerFrequency('back');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ondes sonores
        </h2>
        <p className="text-gray-600">
          Explorez l'effet Doppler, le mur du son et la propagation acoustique
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center gap-2 flex-wrap">
        <button
          onClick={() => setMode('doppler')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'doppler'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Effet Doppler
        </button>
        <button
          onClick={() => setMode('mach')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'mach'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Cône de Mach
        </button>
        <button
          onClick={() => setMode('intensity')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'intensity'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Intensité sonore
        </button>
        <button
          onClick={() => setMode('speed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'speed'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Vitesse du son
        </button>
        <button
          onClick={() => setMode('interference')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'interference'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Interférence
        </button>
      </div>

      {/* Mathematical Equation */}
      <div className="bg-violet-50 rounded-lg p-4 text-center">
        {mode === 'doppler' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Effet Doppler</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`f' = f_0 \\cdot \\frac{v_{son}}{v_{son} \\mp v_{source}}`} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-100 rounded p-2">
                <span className="text-green-700">Approche: </span>
                <InlineMath math={`f' = ${freqFront.toFixed(0)} \\text{ Hz}`} />
              </div>
              <div className="bg-orange-100 rounded p-2">
                <span className="text-orange-700">Éloignement: </span>
                <InlineMath math={`f' = ${freqBack.toFixed(0)} \\text{ Hz}`} />
              </div>
            </div>
          </>
        )}
        {mode === 'mach' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Nombre de Mach et cône de choc</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`M = \\frac{v_{objet}}{v_{son}} = \\frac{${machSpeed}}{${soundSpeed}} = ${machNumber.toFixed(2)}`} />
            </div>
            {machNumber > 1 && (
              <div className="mt-2 text-sm">
                <BlockMath math={`\\sin(\\theta) = \\frac{1}{M} \\Rightarrow \\theta = ${machAngle.toFixed(1)}°`} />
              </div>
            )}
          </>
        )}
        {mode === 'intensity' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Intensité sonore</p>
            <div className="text-lg overflow-x-auto">
              <BlockMath math={`I = \\frac{P}{4\\pi r^2} = \\frac{${power.toFixed(1)}}{4\\pi \\cdot ${distance.toFixed(1)}^2} = ${intensity.toExponential(2)} \\text{ W/m}^2`} />
            </div>
            <div className="mt-2 text-sm">
              <BlockMath math={`L = 10 \\log_{10}\\left(\\frac{I}{I_0}\\right) = ${intensityDB.toFixed(1)} \\text{ dB}`} />
            </div>
          </>
        )}
        {mode === 'speed' && (
          <>
            <p className="text-sm text-violet-600 mb-2 font-medium">Vitesse du son</p>
            <div className="text-lg overflow-x-auto">
              {medium === 'air' ? (
                <BlockMath math={`v = 331.3 \\sqrt{1 + \\frac{T}{273.15}} = ${getSpeedOfSound().toFixed(0)} \\text{ m/s}`} />
              ) : (
                <BlockMath math={`v = ${getSpeedOfSound().toFixed(0)} \\text{ m/s dans ${medium === 'water' ? "l'eau" : "l'acier"}}`} />
              )}
            </div>
          </>
        )}
        {mode === 'interference' && (() => {
          const intfData = getInterference(observerX, observerY);
          const pathDiffInWavelengths = intfData.pathDiff / interferenceWavelength;
          const interferenceType = intfData.isConstructive ? 'Constructive' :
                                  intfData.isDestructive ? 'Destructive' : 'Partielle';
          return (
            <>
              <p className="text-sm text-violet-600 mb-2 font-medium">Interférence de deux sources</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-green-100 rounded p-3">
                  <p className="text-green-700 font-medium mb-1">Constructive (max)</p>
                  <BlockMath math={`\\Delta r = n\\lambda`} />
                </div>
                <div className="bg-red-100 rounded p-3">
                  <p className="text-red-700 font-medium mb-1">Destructive (min)</p>
                  <BlockMath math={`\\Delta r = \\left(n + \\frac{1}{2}\\right)\\lambda`} />
                </div>
              </div>
              <div className="mt-3 p-3 bg-white rounded">
                <p className="text-gray-600 mb-1">Au point P:</p>
                <BlockMath math={`\\Delta r = ${intfData.pathDiff.toFixed(3)} \\text{ m} = ${pathDiffInWavelengths.toFixed(2)}\\lambda`} />
                <p className={`font-bold mt-2 ${
                  intfData.isConstructive ? 'text-green-600' :
                  intfData.isDestructive ? 'text-red-600' : 'text-violet-600'
                }`}>
                  Interférence {interferenceType}
                </p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mode === 'doppler' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Fréquence source</span>
                <span className="text-violet-600 font-mono">{sourceFrequency} Hz</span>
              </label>
              <input
                type="range"
                min="100"
                max="1000"
                step="10"
                value={sourceFrequency}
                onChange={(e) => setSourceFrequency(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Vitesse source</span>
                <span className="text-violet-600 font-mono">{sourceSpeed} m/s</span>
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={sourceSpeed}
                onChange={(e) => setSourceSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Vitesse du son</span>
                <span className="text-violet-600 font-mono">{soundSpeed} m/s</span>
              </label>
              <input
                type="range"
                min="300"
                max="400"
                step="1"
                value={soundSpeed}
                onChange={(e) => setSoundSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </>
        )}

        {mode === 'mach' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Vitesse de l'objet</span>
                <span className="text-violet-600 font-mono">{machSpeed} m/s</span>
              </label>
              <input
                type="range"
                min="100"
                max="800"
                step="10"
                value={machSpeed}
                onChange={(e) => setMachSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">
                Mach 1 = {soundSpeed} m/s (mur du son)
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Vitesse du son</span>
                <span className="text-violet-600 font-mono">{soundSpeed} m/s</span>
              </label>
              <input
                type="range"
                min="300"
                max="400"
                step="1"
                value={soundSpeed}
                onChange={(e) => setSoundSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-700 mb-2">Régime de vol</p>
              <div className={`text-center py-2 rounded ${machNumber < 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {machNumber < 0.8 ? 'Subsonique' :
                 machNumber < 1.0 ? 'Transsonique' :
                 machNumber < 5 ? 'Supersonique' : 'Hypersonique'}
              </div>
            </div>
          </>
        )}

        {mode === 'intensity' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Puissance source</span>
                <span className="text-violet-600 font-mono">{power.toFixed(1)} W</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={power}
                onChange={(e) => setPower(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Distance</span>
                <span className="text-violet-600 font-mono">{distance.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-700 mb-2">Niveau sonore</p>
              <div className="text-center">
                <span className={`text-2xl font-bold ${
                  intensityDB < 60 ? 'text-green-600' :
                  intensityDB < 90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {intensityDB.toFixed(0)} dB
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {intensityDB < 30 ? 'Très calme (bibliothèque)' :
                   intensityDB < 60 ? 'Normal (conversation)' :
                   intensityDB < 90 ? 'Fort (trafic)' :
                   intensityDB < 120 ? 'Très fort (concert)' : 'Dangereux!'}
                </p>
              </div>
            </div>
          </>
        )}

        {mode === 'speed' && (
          <>
            <div className="space-y-2">
              <label className="font-medium text-gray-700">Milieu de propagation</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMedium('air')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    medium === 'air'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  Air
                </button>
                <button
                  onClick={() => setMedium('water')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    medium === 'water'
                      ? 'bg-cyan-100 text-cyan-700 border-2 border-cyan-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  Eau
                </button>
                <button
                  onClick={() => setMedium('steel')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    medium === 'steel'
                      ? 'bg-gray-300 text-gray-700 border-2 border-gray-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  Acier
                </button>
              </div>
            </div>

            {medium === 'air' && (
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Température</span>
                  <span className="text-violet-600 font-mono">{temperature}°C</span>
                </label>
                <input
                  type="range"
                  min="-40"
                  max="50"
                  step="1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-700 mb-2">Vitesse calculée</p>
              <div className="text-center">
                <span className="text-2xl font-bold text-violet-600">
                  {getSpeedOfSound().toFixed(0)} m/s
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  = {(getSpeedOfSound() * 3.6).toFixed(0)} km/h
                </p>
              </div>
            </div>
          </>
        )}

        {mode === 'interference' && (
          <>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Fréquence</span>
                <span className="text-violet-600 font-mono">{interferenceFreq} Hz</span>
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={interferenceFreq}
                onChange={(e) => setInterferenceFreq(parseInt(e.target.value))}
                className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500">λ = {interferenceWavelength.toFixed(2)} m</p>
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
          </>
        )}
      </div>

      {/* Canvas */}
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          width={700}
          height={350}
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

      {/* Educational Notes */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Concepts clés</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Effet Doppler</h4>
            <p className="text-blue-700">
              Le changement de fréquence perçue lorsque la source ou l'observateur est en mouvement.
              Approche → fréquence plus élevée.
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Cône de Mach</h4>
            <p className="text-red-700">
              À vitesse supersonique (M {">"} 1), les ondes forment un cône de choc.
              L'angle diminue quand la vitesse augmente.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Loi en 1/r²</h4>
            <p className="text-green-700">
              L'intensité sonore diminue avec le carré de la distance.
              Doubler la distance divise l'intensité par 4.
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Vitesse du son</h4>
            <p className="text-orange-700">
              Dépend du milieu et de la température.
              Plus rapide dans les solides que dans les gaz.
            </p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4">
            <h4 className="font-medium text-violet-800 mb-2">Interférence</h4>
            <p className="text-violet-700">
              Deux sources cohérentes créent des zones de renforcement (Δr = nλ)
              et d'annulation (Δr = (n+½)λ).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoundWaveSimulator;
