'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type SimulationMode = 'ecg' | 'dipole' | 'leads' | 'pathologies';

const MODE_LABELS: Record<SimulationMode, string> = {
  ecg: 'Signal ECG',
  dipole: 'Dipôle cardiaque',
  leads: 'Triangle d\'Einthoven',
  pathologies: 'Pathologies',
};

const MODE_DESCRIPTIONS: Record<SimulationMode, string> = {
  ecg: 'Le cœur génère un signal électrique périodique. L\'ECG enregistre la différence de potentiel (en mV) entre des électrodes placées sur la peau. Chaque onde (P, QRS, T) correspond à une phase de dépolarisation ou repolarisation.',
  dipole: 'Le cœur se comporte comme un dipôle électrique tournant. Le vecteur cardiaque change de direction et d\'amplitude au cours du cycle cardiaque, créant les différentes ondes de l\'ECG.',
  leads: 'Einthoven a défini 3 dérivations bipolaires (I, II, III) formant un triangle équilatéral. Chaque dérivation mesure la projection du vecteur cardiaque sur un axe différent. Loi d\'Einthoven : V_II = V_I + V_III.',
  pathologies: 'Les anomalies du signal ECG révèlent des pathologies cardiaques. Comparez un ECG normal avec différentes conditions : tachycardie, bradycardie, fibrillation et bloc AV.',
};

// ─── ECG Waveform Generation ─────────────────────────────────────

interface ECGParams {
  heartRate: number;       // BPM
  pAmplitude: number;      // mV
  qrsAmplitude: number;    // mV
  tAmplitude: number;      // mV
  prInterval: number;      // seconds
  qrsDuration: number;     // seconds
  qtInterval: number;      // seconds
  noise: number;           // noise level
  irregular: boolean;      // irregular rhythm
  pWavePresent: boolean;
  flatST: boolean;         // ST elevation
}

const NORMAL_PARAMS: ECGParams = {
  heartRate: 72,
  pAmplitude: 0.25,
  qrsAmplitude: 1.6,
  tAmplitude: 0.35,
  prInterval: 0.16,
  qrsDuration: 0.08,
  qtInterval: 0.36,
  noise: 0.02,
  irregular: false,
  pWavePresent: true,
  flatST: false,
};

function generateECGCycle(params: ECGParams, sampleRate: number): number[] {
  const cycleDuration = 60 / params.heartRate;
  const numSamples = Math.floor(cycleDuration * sampleRate);
  const samples: number[] = new Array(numSamples).fill(0);

  // P wave - atrial depolarization
  if (params.pWavePresent) {
    const pStart = 0.05 * sampleRate;
    const pDuration = 0.08 * sampleRate;
    for (let i = 0; i < pDuration; i++) {
      const t = i / pDuration;
      const idx = Math.floor(pStart + i);
      if (idx < numSamples) {
        samples[idx] += params.pAmplitude * Math.sin(Math.PI * t);
      }
    }
  }

  // QRS complex - ventricular depolarization
  const qrsStart = (params.prInterval + 0.05) * sampleRate;
  const qrsDur = params.qrsDuration * sampleRate;

  // Q wave (small negative)
  const qDur = qrsDur * 0.2;
  for (let i = 0; i < qDur; i++) {
    const t = i / qDur;
    const idx = Math.floor(qrsStart + i);
    if (idx >= 0 && idx < numSamples) {
      samples[idx] += -0.15 * params.qrsAmplitude * Math.sin(Math.PI * t);
    }
  }

  // R wave (tall positive)
  const rStart = qrsStart + qDur;
  const rDur = qrsDur * 0.35;
  for (let i = 0; i < rDur; i++) {
    const t = i / rDur;
    const idx = Math.floor(rStart + i);
    if (idx >= 0 && idx < numSamples) {
      samples[idx] += params.qrsAmplitude * Math.sin(Math.PI * t);
    }
  }

  // S wave (small negative)
  const sStart = rStart + rDur;
  const sDur = qrsDur * 0.25;
  for (let i = 0; i < sDur; i++) {
    const t = i / sDur;
    const idx = Math.floor(sStart + i);
    if (idx >= 0 && idx < numSamples) {
      samples[idx] += -0.25 * params.qrsAmplitude * Math.sin(Math.PI * t);
    }
  }

  // ST segment (possibly elevated)
  if (params.flatST) {
    const stStart = sStart + sDur;
    const stDur = 0.08 * sampleRate;
    for (let i = 0; i < stDur; i++) {
      const idx = Math.floor(stStart + i);
      if (idx >= 0 && idx < numSamples) {
        samples[idx] += 0.3;
      }
    }
  }

  // T wave - ventricular repolarization
  const tStart = (params.prInterval + 0.05 + params.qtInterval - 0.16) * sampleRate;
  const tDur = 0.16 * sampleRate;
  for (let i = 0; i < tDur; i++) {
    const t = i / tDur;
    const idx = Math.floor(tStart + i);
    if (idx >= 0 && idx < numSamples) {
      samples[idx] += params.tAmplitude * Math.sin(Math.PI * t);
    }
  }

  // Add noise
  for (let i = 0; i < numSamples; i++) {
    samples[i] += (Math.random() - 0.5) * params.noise * 2;
  }

  return samples;
}

function generateECGSignal(params: ECGParams, durationSeconds: number, sampleRate: number): number[] {
  const totalSamples = durationSeconds * sampleRate;
  const signal: number[] = [];

  while (signal.length < totalSamples) {
    const effectiveParams = { ...params };
    if (params.irregular) {
      effectiveParams.heartRate = params.heartRate * (0.7 + Math.random() * 0.6);
    }
    const cycle = generateECGCycle(effectiveParams, sampleRate);
    signal.push(...cycle);
  }

  return signal.slice(0, totalSamples);
}

// ─── ECG Signal Mode ─────────────────────────────────────────────
function ECGSignalMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heartRate, setHeartRate] = useState(72);
  const [speed, setSpeed] = useState(25); // mm/s paper speed
  const [showLabels, setShowLabels] = useState(true);

  const sampleRate = 500;
  const signalRef = useRef<number[]>([]);

  useEffect(() => {
    signalRef.current = generateECGSignal({ ...NORMAL_PARAMS, heartRate }, 10, sampleRate);
  }, [heartRate]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 40, bottom: 40, left: 60, right: 20 };
    const gW = W - padding.left - padding.right;
    const gH = H - padding.top - padding.bottom;
    const yCenter = padding.top + gH / 2;

    // ECG grid paper background
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(padding.left, padding.top, gW, gH);

    // Small grid (1mm equivalent)
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 0.5;
    const smallGrid = 10;
    for (let x = padding.left; x <= padding.left + gW; x += smallGrid) {
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + gH);
      ctx.stroke();
    }
    for (let y = padding.top; y <= padding.top + gH; y += smallGrid) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + gW, y);
      ctx.stroke();
    }

    // Large grid (5mm equivalent)
    ctx.strokeStyle = '#f59e0b50';
    ctx.lineWidth = 1;
    for (let x = padding.left; x <= padding.left + gW; x += smallGrid * 5) {
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + gH);
      ctx.stroke();
    }
    for (let y = padding.top; y <= padding.top + gH; y += smallGrid * 5) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + gW, y);
      ctx.stroke();
    }

    // Baseline
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, yCenter);
    ctx.lineTo(padding.left + gW, yCenter);
    ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis labels (mV)
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const mVPerPixel = 2.0 / (gH / 2); // ±2 mV range
    for (let mv = -1.5; mv <= 1.5; mv += 0.5) {
      const y = yCenter - mv / mVPerPixel;
      if (y >= padding.top && y <= padding.top + gH) {
        ctx.fillText(`${mv.toFixed(1)}`, padding.left - 8, y + 4);
      }
    }

    ctx.save();
    ctx.translate(14, yCenter);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tension (mV)', 0, 0);
    ctx.restore();

    // Draw ECG signal
    const signal = signalRef.current;
    if (signal.length === 0) return;

    const pixelsPerSample = gW / (sampleRate * (gW / (speed * 50)));
    const samplesVisible = Math.floor(gW / pixelsPerSample);
    const startSample = Math.floor(offsetRef.current) % (signal.length - samplesVisible);

    ctx.beginPath();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;

    for (let i = 0; i < samplesVisible && (startSample + i) < signal.length; i++) {
      const x = padding.left + i * pixelsPerSample;
      const val = signal[startSample + i];
      const y = yCenter - val / mVPerPixel;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels on first visible cycle
    if (showLabels && samplesVisible > 0) {
      const cycleSamples = Math.floor(60 / heartRate * sampleRate);
      const cycleStart = startSample;

      const labelWave = (name: string, sampleOffset: number, color: string, yOff: number) => {
        const x = padding.left + (sampleOffset - startSample) * pixelsPerSample;
        if (x > padding.left && x < padding.left + gW - 40) {
          ctx.fillStyle = color;
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, padding.top + yOff);

          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x, padding.top + yOff + 4);
          ctx.lineTo(x, yCenter - 20);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };

      // Approximate positions
      const pPos = cycleStart + Math.floor(0.09 * sampleRate);
      const qrsPos = cycleStart + Math.floor((0.05 + NORMAL_PARAMS.prInterval + NORMAL_PARAMS.qrsDuration / 2) * sampleRate);
      const tPos = cycleStart + Math.floor((0.05 + NORMAL_PARAMS.prInterval + NORMAL_PARAMS.qtInterval - 0.08) * sampleRate);

      labelWave('P', pPos, '#3b82f6', 20);
      labelWave('QRS', qrsPos, '#dc2626', 20);
      labelWave('T', tPos, '#7c3aed', 20);

      // Interval labels at bottom
      const prStartX = padding.left + (cycleStart + 0.05 * sampleRate - startSample) * pixelsPerSample;
      const prEndX = padding.left + (cycleStart + (0.05 + NORMAL_PARAMS.prInterval) * sampleRate - startSample) * pixelsPerSample;
      if (prStartX > padding.left && prEndX < padding.left + gW) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const yBar = padding.top + gH - 15;
        ctx.moveTo(prStartX, yBar);
        ctx.lineTo(prEndX, yBar);
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PR: ${(NORMAL_PARAMS.prInterval * 1000).toFixed(0)} ms`, (prStartX + prEndX) / 2, yBar - 4);
      }
    }

    // Title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ECG — Dérivation II — ${heartRate} BPM`, W / 2, 20);

    // Time axis label
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Temps (vitesse papier : ${speed} mm/s)`, padding.left + gW / 2, H - 8);
  }, [heartRate, speed, showLabels]);

  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        offsetRef.current += 2;
      }
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={800} height={350} className="w-full max-w-[800px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence cardiaque (BPM)</label>
          <input type="range" min={30} max={180} step={1} value={heartRate} onChange={e => setHeartRate(+e.target.value)} className="w-40" />
          <span className="ml-2 text-sm text-gray-500">{heartRate} BPM</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vitesse papier</label>
          <select value={speed} onChange={e => setSpeed(+e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value={25}>25 mm/s (standard)</option>
            <option value={50}>50 mm/s</option>
          </select>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />
          Annotations
        </label>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">Interprétation du signal ECG</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white rounded p-3 border border-green-100">
            <span className="font-bold text-blue-600">Onde P</span>
            <p className="text-gray-600 mt-1">Dépolarisation des oreillettes. Amplitude ~0.25 mV, durée ~80 ms.</p>
          </div>
          <div className="bg-white rounded p-3 border border-green-100">
            <span className="font-bold text-red-600">Complexe QRS</span>
            <p className="text-gray-600 mt-1">Dépolarisation des ventricules. Amplitude ~1.6 mV, durée ~80 ms. C'est l'événement électrique le plus puissant.</p>
          </div>
          <div className="bg-white rounded p-3 border border-green-100">
            <span className="font-bold text-purple-600">Onde T</span>
            <p className="text-gray-600 mt-1">Repolarisation des ventricules. Amplitude ~0.35 mV. Suit le complexe QRS après le segment ST.</p>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <strong>Période : </strong>{(60 / heartRate).toFixed(3)} s | <strong>Fréquence : </strong>{heartRate} BPM |
          <strong> Intervalle PR : </strong>{(NORMAL_PARAMS.prInterval * 1000).toFixed(0)} ms |
          <strong> Durée QRS : </strong>{(NORMAL_PARAMS.qrsDuration * 1000).toFixed(0)} ms |
          <strong> Intervalle QT : </strong>{(NORMAL_PARAMS.qtInterval * 1000).toFixed(0)} ms
        </div>
      </div>
    </div>
  );
}

// ─── Cardiac Dipole Mode ─────────────────────────────────────────
function DipoleMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heartRate, setHeartRate] = useState(72);
  const [showField, setShowField] = useState(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W * 0.35;
    const cy = H * 0.5;
    const heartSize = 70;
    const cycleDuration = 60 / heartRate;
    const phase = (timeRef.current % cycleDuration) / cycleDuration;

    // Calculate dipole vector based on cardiac phase
    let angle = 0;   // radians, 0 = right
    let magnitude = 0;

    if (phase < 0.1) {
      // P wave - atrial depolarization, vector points downward-left
      const t = phase / 0.1;
      angle = Math.PI * 0.7; // ~125 degrees (inferior-left)
      magnitude = 0.3 * Math.sin(Math.PI * t);
    } else if (phase >= 0.15 && phase < 0.25) {
      // QRS - ventricular depolarization
      const t = (phase - 0.15) / 0.1;
      if (t < 0.3) {
        // Q - septal depolarization, right
        angle = -Math.PI * 0.3;
        magnitude = 0.2 * Math.sin(Math.PI * t / 0.3);
      } else if (t < 0.7) {
        // R - main ventricular depolarization, down-left
        const rt = (t - 0.3) / 0.4;
        angle = Math.PI * 0.65;
        magnitude = Math.sin(Math.PI * rt);
      } else {
        // S - late ventricular, up-right
        const st = (t - 0.7) / 0.3;
        angle = -Math.PI * 0.4;
        magnitude = 0.3 * Math.sin(Math.PI * st);
      }
    } else if (phase >= 0.35 && phase < 0.5) {
      // T wave - ventricular repolarization
      const t = (phase - 0.35) / 0.15;
      angle = Math.PI * 0.55;
      magnitude = 0.35 * Math.sin(Math.PI * t);
    }

    // Draw heart shape
    ctx.save();
    ctx.translate(cx, cy);

    // Simple heart outline
    ctx.beginPath();
    ctx.moveTo(0, heartSize * 0.4);
    ctx.bezierCurveTo(-heartSize * 0.1, heartSize * 0.2, -heartSize * 0.6, -heartSize * 0.1, -heartSize * 0.35, -heartSize * 0.45);
    ctx.bezierCurveTo(-heartSize * 0.15, -heartSize * 0.7, 0, -heartSize * 0.45, 0, -heartSize * 0.25);
    ctx.bezierCurveTo(0, -heartSize * 0.45, heartSize * 0.15, -heartSize * 0.7, heartSize * 0.35, -heartSize * 0.45);
    ctx.bezierCurveTo(heartSize * 0.6, -heartSize * 0.1, heartSize * 0.1, heartSize * 0.2, 0, heartSize * 0.4);
    ctx.closePath();

    // Heart fill with depolarization wave
    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, heartSize);
    const depolarizationColor = phase >= 0.15 && phase < 0.25
      ? `rgba(239, 68, 68, ${0.3 + magnitude * 0.5})`
      : phase < 0.1
        ? `rgba(59, 130, 246, ${0.2 + magnitude * 0.3})`
        : `rgba(252, 211, 77, ${0.2})`;
    gradient.addColorStop(0, depolarizationColor);
    gradient.addColorStop(1, 'rgba(254, 240, 240, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw dipole vector
    if (magnitude > 0.01) {
      const vecLen = magnitude * 100;
      const vx = Math.cos(angle) * vecLen;
      const vy = -Math.sin(angle) * vecLen; // canvas y is inverted

      // Arrow shaft
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vx, vy);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrowhead
      const headLen = 12;
      const headAngle = 0.4;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(
        vx - headLen * Math.cos(angle - headAngle),
        vy + headLen * Math.sin(angle - headAngle)
      );
      ctx.moveTo(vx, vy);
      ctx.lineTo(
        vx - headLen * Math.cos(angle + headAngle),
        vy + headLen * Math.sin(angle + headAngle)
      );
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.stroke();

      // + and - charges
      const chargeOffset = vecLen * 0.15;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', vx + Math.cos(angle) * chargeOffset, vy - Math.sin(angle) * chargeOffset + 6);
      ctx.fillStyle = '#2563eb';
      ctx.fillText('−', -Math.cos(angle) * chargeOffset, Math.sin(angle) * chargeOffset + 6);

      // Electric field lines (simplified)
      if (showField) {
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        for (let i = -2; i <= 2; i++) {
          const offsetAngle = angle + (i * 0.4);
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(offsetAngle + Math.PI) * 30,
            -Math.sin(offsetAngle + Math.PI) * 30
          );
          const cpx = Math.cos(offsetAngle + Math.PI / 2) * i * 30;
          const cpy = -Math.sin(offsetAngle + Math.PI / 2) * i * 30;
          ctx.quadraticCurveTo(cpx, cpy,
            Math.cos(offsetAngle) * (vecLen + 20),
            -Math.sin(offsetAngle) * (vecLen + 20)
          );
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    ctx.restore();

    // Phase indicator on right side
    const phaseX = W * 0.72;
    const phaseY = 40;
    const phaseW = W * 0.24;
    const phaseH = H - 80;

    // Mini ECG trace on right
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(phaseX, phaseY, phaseW, phaseH);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(phaseX, phaseY, phaseW, phaseH);

    // Generate one cycle
    const miniSignal = generateECGCycle(NORMAL_PARAMS, 200);
    const midY = phaseY + phaseH / 2;
    ctx.beginPath();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < miniSignal.length; i++) {
      const x = phaseX + (i / miniSignal.length) * phaseW;
      const y = midY - miniSignal[i] * (phaseH * 0.35);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current position indicator
    const posX = phaseX + phase * phaseW;
    ctx.beginPath();
    ctx.moveTo(posX, phaseY);
    ctx.lineTo(posX, phaseY + phaseH);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Phase label
    let phaseLabel = 'Repos';
    let phaseColor = '#6b7280';
    if (phase < 0.1) { phaseLabel = 'Onde P (oreillettes)'; phaseColor = '#3b82f6'; }
    else if (phase >= 0.15 && phase < 0.25) { phaseLabel = 'Complexe QRS (ventricules)'; phaseColor = '#dc2626'; }
    else if (phase >= 0.25 && phase < 0.35) { phaseLabel = 'Segment ST'; phaseColor = '#6b7280'; }
    else if (phase >= 0.35 && phase < 0.5) { phaseLabel = 'Onde T (repolarisation)'; phaseColor = '#7c3aed'; }

    ctx.fillStyle = phaseColor;
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(phaseLabel, cx, H - 15);

    // Titles
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Vecteur cardiaque', cx, 20);
    ctx.fillText('ECG simultané', phaseX + phaseW / 2, 28);

    // Legend
    ctx.fillStyle = '#059669';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('→ Vecteur dipôle', 10, H - 10);
  }, [heartRate, showField]);

  useEffect(() => {
    const lastTime = { current: performance.now() };
    const animate = (now: number) => {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      if (isPlaying) {
        timeRef.current += dt;
      }
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={800} height={380} className="w-full max-w-[800px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence (BPM)</label>
          <input type="range" min={40} max={120} step={1} value={heartRate} onChange={e => setHeartRate(+e.target.value)} className="w-40" />
          <span className="ml-2 text-sm text-gray-500">{heartRate} BPM</span>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={showField} onChange={e => setShowField(e.target.checked)} />
          Lignes de champ
        </label>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-emerald-900 mb-2">Le cœur comme dipôle électrique</h4>
        <p className="text-gray-700">
          Le cœur génère un champ électrique qui change au cours du cycle cardiaque. On modélise cette activité
          par un <strong>dipôle électrique</strong> dont le vecteur (flèche verte) tourne et change d'amplitude.
          La différence de potentiel mesurée entre deux électrodes sur la peau est la <strong>projection</strong> de
          ce vecteur sur l'axe reliant les deux électrodes.
        </p>
        <p className="text-gray-700 mt-2">
          <strong>V = |d| × cos(θ)</strong>, où <strong>d</strong> est le vecteur dipôle et <strong>θ</strong> l'angle
          entre le dipôle et l'axe de la dérivation.
        </p>
      </div>
    </div>
  );
}

// ─── Einthoven Triangle Mode ─────────────────────────────────────
function LeadsMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heartRate, setHeartRate] = useState(72);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Triangle vertices (RA, LA, LL)
    const triCx = W * 0.35;
    const triCy = H * 0.48;
    const triSize = 120;

    // Equilateral triangle points
    const RA = { x: triCx - triSize, y: triCy - triSize * 0.5 }; // right arm (top-left)
    const LA = { x: triCx + triSize, y: triCy - triSize * 0.5 }; // left arm (top-right)
    const LL = { x: triCx, y: triCy + triSize }; // left leg (bottom)

    // Calculate dipole vector based on phase
    const cycleDuration = 60 / heartRate;
    const phase = (timeRef.current % cycleDuration) / cycleDuration;

    let angle = 0;
    let magnitude = 0;

    if (phase < 0.1) {
      const t = phase / 0.1;
      angle = Math.PI * 0.7;
      magnitude = 0.3 * Math.sin(Math.PI * t);
    } else if (phase >= 0.15 && phase < 0.25) {
      const t = (phase - 0.15) / 0.1;
      if (t < 0.3) { angle = -Math.PI * 0.3; magnitude = 0.2 * Math.sin(Math.PI * t / 0.3); }
      else if (t < 0.7) { angle = Math.PI * 0.65; magnitude = Math.sin(Math.PI * (t - 0.3) / 0.4); }
      else { angle = -Math.PI * 0.4; magnitude = 0.3 * Math.sin(Math.PI * (t - 0.7) / 0.3); }
    } else if (phase >= 0.35 && phase < 0.5) {
      const t = (phase - 0.35) / 0.15;
      angle = Math.PI * 0.55;
      magnitude = 0.35 * Math.sin(Math.PI * t);
    }

    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(RA.x, RA.y);
    ctx.lineTo(LA.x, LA.y);
    ctx.lineTo(LL.x, LL.y);
    ctx.closePath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lead labels
    const leads = [
      { name: 'I', from: RA, to: LA, color: '#dc2626', angle: 0 },
      { name: 'II', from: RA, to: LL, color: '#2563eb', angle: Math.PI / 3 },
      { name: 'III', from: LA, to: LL, color: '#059669', angle: 2 * Math.PI / 3 },
    ];

    // Draw leads with arrows
    leads.forEach(lead => {
      const midX = (lead.from.x + lead.to.x) / 2;
      const midY = (lead.from.y + lead.to.y) / 2;
      const dx = lead.to.x - lead.from.x;
      const dy = lead.to.y - lead.from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len;
      const ny = dy / len;

      // Arrow on lead
      ctx.beginPath();
      ctx.moveTo(lead.from.x + nx * 20, lead.from.y + ny * 20);
      ctx.lineTo(lead.to.x - nx * 20, lead.to.y - ny * 20);
      ctx.strokeStyle = lead.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arrowhead
      const ax = lead.to.x - nx * 20;
      const ay = lead.to.y - ny * 20;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 10 * nx + 6 * ny, ay - 10 * ny - 6 * nx);
      ctx.lineTo(ax - 10 * nx - 6 * ny, ay - 10 * ny + 6 * nx);
      ctx.closePath();
      ctx.fillStyle = lead.color;
      ctx.fill();

      // Label
      const offX = -ny * 18;
      const offY = nx * 18;
      ctx.fillStyle = lead.color;
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lead.name, midX + offX, midY + offY + 5);
    });

    // Electrode labels
    const electrodes = [
      { label: 'RA', sublabel: 'Bras droit', pos: RA, dx: -20, dy: -15 },
      { label: 'LA', sublabel: 'Bras gauche', pos: LA, dx: 20, dy: -15 },
      { label: 'LL', sublabel: 'Jambe gauche', pos: LL, dx: 0, dy: 25 },
    ];

    electrodes.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.label, e.pos.x + e.dx, e.pos.y + e.dy);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(e.sublabel, e.pos.x + e.dx, e.pos.y + e.dy + 13);
    });

    // Dipole vector at center
    if (magnitude > 0.01) {
      const vecLen = magnitude * 60;
      const vx = Math.cos(angle) * vecLen;
      const vy = -Math.sin(angle) * vecLen;

      ctx.beginPath();
      ctx.moveTo(triCx, triCy);
      ctx.lineTo(triCx + vx, triCy + vy);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.stroke();

      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(triCx + vx, triCy + vy);
      ctx.lineTo(triCx + vx - headLen * Math.cos(angle - 0.4), triCy + vy + headLen * Math.sin(angle - 0.4));
      ctx.moveTo(triCx + vx, triCy + vy);
      ctx.lineTo(triCx + vx - headLen * Math.cos(angle + 0.4), triCy + vy + headLen * Math.sin(angle + 0.4));
      ctx.stroke();
    }

    // Projections on each lead = voltage
    const projections = leads.map(lead => {
      const leadAngle = Math.atan2(-(lead.to.y - lead.from.y), lead.to.x - lead.from.x);
      return magnitude * Math.cos(angle - leadAngle);
    });

    // Mini ECG traces on right side
    const traceX = W * 0.62;
    const traceW = W * 0.35;
    const traceH = 70;

    leads.forEach((lead, idx) => {
      const ty = 30 + idx * (traceH + 25);

      // Label
      ctx.fillStyle = lead.color;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Dérivation ${lead.name}`, traceX, ty);

      // Trace background
      ctx.fillStyle = '#fefce8';
      ctx.fillRect(traceX, ty + 5, traceW, traceH);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(traceX, ty + 5, traceW, traceH);

      // Generate signal for this lead (scaled by projection)
      const leadAngle = Math.atan2(-(leads[idx].to.y - leads[idx].from.y), leads[idx].to.x - leads[idx].from.x);
      const scale = Math.cos(NORMAL_PARAMS.qrsAmplitude > 0 ? leadAngle - Math.PI * 0.65 : 0);

      const signal = generateECGCycle({ ...NORMAL_PARAMS, heartRate, qrsAmplitude: NORMAL_PARAMS.qrsAmplitude * Math.abs(scale) }, 200);
      const midY = ty + 5 + traceH / 2;

      ctx.beginPath();
      ctx.strokeStyle = lead.color;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < signal.length; i++) {
        const x = traceX + (i / signal.length) * traceW;
        const y = midY - signal[i] * (traceH * 0.4) * (scale >= 0 ? 1 : -1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Position marker
      const posX = traceX + phase * traceW;
      ctx.beginPath();
      ctx.moveTo(posX, ty + 5);
      ctx.lineTo(posX, ty + 5 + traceH);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Current voltage
      ctx.fillStyle = '#374151';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${(projections[idx] * 1.6).toFixed(2)} mV`, traceX + traceW, ty + 5 + traceH + 14);
    });

    // Einthoven's law
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const lawY = H - 20;
    ctx.fillText('Loi d\'Einthoven :  V_II = V_I + V_III', W / 2, lawY);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(
      `${(projections[1] * 1.6).toFixed(2)} ≈ ${(projections[0] * 1.6).toFixed(2)} + ${(projections[2] * 1.6).toFixed(2)} = ${((projections[0] + projections[2]) * 1.6).toFixed(2)}`,
      W / 2, lawY + 16
    );
  }, [heartRate]);

  useEffect(() => {
    const lastTime = { current: performance.now() };
    const animate = (now: number) => {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      if (isPlaying) timeRef.current += dt;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={800} height={380} className="w-full max-w-[800px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence (BPM)</label>
          <input type="range" min={40} max={120} step={1} value={heartRate} onChange={e => setHeartRate(+e.target.value)} className="w-40" />
          <span className="ml-2 text-sm text-gray-500">{heartRate} BPM</span>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-blue-900 mb-2">Triangle d'Einthoven</h4>
        <p className="text-gray-700">
          Les 3 dérivations bipolaires forment un triangle équilatéral autour du cœur.
          Chaque dérivation mesure la <strong>projection</strong> du vecteur cardiaque sur son axe :
        </p>
        <ul className="mt-2 space-y-1 text-gray-700">
          <li><span className="font-bold text-red-600">I</span> : RA → LA (horizontal, 0°)</li>
          <li><span className="font-bold text-blue-600">II</span> : RA → LL (+60°)</li>
          <li><span className="font-bold text-green-600">III</span> : LA → LL (+120°)</li>
        </ul>
        <p className="text-gray-700 mt-2">
          <strong>Loi d'Einthoven :</strong> V<sub>II</sub> = V<sub>I</sub> + V<sub>III</sub> — c'est une conséquence directe de la loi des mailles de Kirchhoff appliquée au triangle.
        </p>
      </div>
    </div>
  );
}

// ─── Pathologies Mode ────────────────────────────────────────────
function PathologiesMode() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selected, setSelected] = useState(0);

  const pathologies = [
    {
      name: 'Normal',
      description: 'Rythme sinusal normal. FC 72 BPM, intervalles réguliers.',
      params: { ...NORMAL_PARAMS },
      color: '#16a34a',
    },
    {
      name: 'Tachycardie sinusale',
      description: 'FC > 100 BPM. Causes : exercice, stress, fièvre, anémie. Ondes P présentes, rythme régulier.',
      params: { ...NORMAL_PARAMS, heartRate: 130 },
      color: '#dc2626',
    },
    {
      name: 'Bradycardie sinusale',
      description: 'FC < 60 BPM. Normal chez les athlètes. Peut indiquer un bloc sino-auriculaire.',
      params: { ...NORMAL_PARAMS, heartRate: 42 },
      color: '#2563eb',
    },
    {
      name: 'Fibrillation auriculaire',
      description: 'Rythme irrégulier, absence d\'ondes P. Les oreillettes se contractent de façon chaotique. Risque d\'AVC.',
      params: { ...NORMAL_PARAMS, heartRate: 110, pWavePresent: false, irregular: true, noise: 0.08 },
      color: '#d97706',
    },
    {
      name: 'Élévation du segment ST',
      description: 'Signe classique d\'un infarctus du myocarde (crise cardiaque). Le segment ST est surélevé par rapport à la ligne de base.',
      params: { ...NORMAL_PARAMS, flatST: true },
      color: '#7c3aed',
    },
  ];

  const sampleRate = 500;
  const signalsRef = useRef<number[][]>([]);

  useEffect(() => {
    signalsRef.current = pathologies.map(p => generateECGSignal(p.params, 8, sampleRate));
  }, []);

  const draw = useCallback(() => {
    pathologies.forEach((patho, idx) => {
      const canvas = canvasRefs.current[idx];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const isSelected = idx === selected;
      const padding = { top: 8, bottom: 8, left: 10, right: 10 };
      const gW = W - padding.left - padding.right;
      const gH = H - padding.top - padding.bottom;
      const yCenter = padding.top + gH / 2;

      // Background
      ctx.fillStyle = isSelected ? '#fefce8' : '#fafafa';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = isSelected ? '#fde68a' : '#f3f4f6';
      ctx.lineWidth = 0.5;
      for (let x = padding.left; x <= padding.left + gW; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + gH);
        ctx.stroke();
      }
      for (let y = padding.top; y <= padding.top + gH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + gW, y);
        ctx.stroke();
      }

      // Baseline
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, yCenter);
      ctx.lineTo(padding.left + gW, yCenter);
      ctx.stroke();

      // Signal
      const signal = signalsRef.current[idx];
      if (!signal || signal.length === 0) return;

      const mVPerPixel = 2.5 / (gH / 2);
      const pixelsPerSample = gW / (sampleRate * 2.5);
      const samplesVisible = Math.floor(gW / pixelsPerSample);
      const startSample = Math.floor(offsetRef.current) % Math.max(1, signal.length - samplesVisible);

      ctx.beginPath();
      ctx.strokeStyle = patho.color;
      ctx.lineWidth = isSelected ? 2 : 1.5;

      for (let i = 0; i < samplesVisible && (startSample + i) < signal.length; i++) {
        const x = padding.left + i * pixelsPerSample;
        const val = signal[startSample + i];
        const y = yCenter - val / mVPerPixel;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [selected, pathologies]);

  useEffect(() => {
    const animate = () => {
      if (isPlaying) offsetRef.current += 1.5;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw]);

  const selPatho = pathologies[selected];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pathologies.map((patho, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`text-left rounded-lg border-2 overflow-hidden transition-all ${
              selected === idx ? 'border-amber-400 shadow-md' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-white">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: patho.color }} />
              <span className="font-medium text-sm text-gray-900">{patho.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{patho.params.heartRate} BPM</span>
            </div>
            <canvas
              ref={el => { canvasRefs.current[idx] = el; }}
              width={380}
              height={80}
              className="w-full"
            />
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
      </div>

      <div className="rounded-lg border-2 p-4" style={{ borderColor: selPatho.color + '60', backgroundColor: selPatho.color + '10' }}>
        <h4 className="font-semibold text-gray-900 mb-1" style={{ color: selPatho.color }}>
          {selPatho.name}
        </h4>
        <p className="text-sm text-gray-700">{selPatho.description}</p>
        <div className="mt-2 text-sm text-gray-600">
          <strong>FC : </strong>{selPatho.params.heartRate} BPM |
          <strong> Période : </strong>{(60 / selPatho.params.heartRate).toFixed(2)} s |
          <strong> Onde P : </strong>{selPatho.params.pWavePresent ? 'présente' : 'absente'} |
          <strong> Rythme : </strong>{selPatho.params.irregular ? 'irrégulier' : 'régulier'}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-amber-900 mb-2">Lien avec l'électricité</h4>
        <p className="text-gray-700">
          L'ECG est une application directe des concepts d'électricité : le cœur est un <strong>générateur
          de différence de potentiel</strong> (~1-2 mV). Le signal se propage à travers le corps (un
          conducteur avec une résistance interne), et les électrodes mesurent la <strong>tension</strong> entre
          deux points, exactement comme un voltmètre dans un circuit.
        </p>
        <p className="text-gray-700 mt-2">
          La résistance de la peau (~1-100 kΩ) joue le rôle de <strong>résistance de contact</strong>,
          analogue à la résistance interne d'une pile. Le gel conducteur réduit cette résistance
          pour améliorer le signal.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function ECGSimulator() {
  const [mode, setMode] = useState<SimulationMode>('ecg');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {(Object.keys(MODE_LABELS) as SimulationMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              mode === m
                ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      {/* Simulation */}
      <div className="p-6">
        {mode === 'ecg' && <ECGSignalMode />}
        {mode === 'dipole' && <DipoleMode />}
        {mode === 'leads' && <LeadsMode />}
        {mode === 'pathologies' && <PathologiesMode />}
      </div>
    </div>
  );
}
