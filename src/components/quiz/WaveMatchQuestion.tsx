'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { WaveMatchConfig, WaveSketchConfig } from '@/types/question';
import { cn } from '@/lib/utils';

interface WaveMatchQuestionProps {
  config: WaveMatchConfig;
  selectedOption: string | null;
  onSelect: (optionId: string) => void;
  isAnswered: boolean;
}

export function WaveMatchQuestion({
  config,
  selectedOption,
  onSelect,
  isAnswered,
}: WaveMatchQuestionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 500, height: 250 });

  const { waveConfig, options } = config;

  // Convert wave coordinates to canvas coordinates
  const waveToCanvas = useCallback((waveX: number, waveY: number) => {
    const { xRange, yRange } = waveConfig;
    const padding = 40;
    const drawWidth = canvasSize.width - 2 * padding;
    const drawHeight = canvasSize.height - 2 * padding;

    const canvasX = padding + ((waveX - xRange[0]) / (xRange[1] - xRange[0])) * drawWidth;
    const canvasY = padding + ((yRange[1] - waveY) / (yRange[1] - yRange[0])) * drawHeight;

    return { x: canvasX, y: canvasY };
  }, [waveConfig, canvasSize]);

  // Calculate wave value at x
  const waveY = useCallback((x: number) => {
    const { amplitude, wavelength, frequency, phase, phaseUnit, waveType } = waveConfig;

    let phaseRad = phase;
    if (phaseUnit === 'deg') {
      phaseRad = (phase * Math.PI) / 180;
    }

    let k = 0;
    if (wavelength) {
      k = (2 * Math.PI) / wavelength;
    } else if (frequency) {
      k = 2 * Math.PI * frequency;
    }

    if (waveType === 'cosine') {
      return amplitude * Math.cos(k * x + phaseRad);
    } else {
      return amplitude * Math.sin(k * x + phaseRad);
    }
  }, [waveConfig]);

  // Draw grid and wave
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { xRange, yRange, xAxisLabel, yAxisLabel, gridSpacing } = waveConfig;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let x = xRange[0]; x <= xRange[1]; x += gridSpacing) {
      const { x: canvasX } = waveToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(canvasX, padding);
      ctx.lineTo(canvasX, canvasSize.height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = yRange[0]; y <= yRange[1]; y += gridSpacing) {
      const { y: canvasY } = waveToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(padding, canvasY);
      ctx.lineTo(canvasSize.width - padding, canvasY);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    // X axis
    const { y: axisY } = waveToCanvas(0, 0);
    ctx.beginPath();
    ctx.moveTo(padding, axisY);
    ctx.lineTo(canvasSize.width - padding, axisY);
    ctx.stroke();

    // Y axis
    const { x: axisX } = waveToCanvas(0, 0);
    ctx.beginPath();
    ctx.moveTo(axisX, padding);
    ctx.lineTo(axisX, canvasSize.height - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(xAxisLabel, canvasSize.width / 2, canvasSize.height - 8);

    ctx.save();
    ctx.translate(12, canvasSize.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Tick labels
    ctx.font = '10px system-ui';
    for (let x = xRange[0]; x <= xRange[1]; x += gridSpacing) {
      if (x !== 0) {
        const { x: canvasX } = waveToCanvas(x, 0);
        ctx.fillText(x.toString(), canvasX, axisY + 15);
      }
    }

    for (let y = yRange[0]; y <= yRange[1]; y += gridSpacing) {
      if (y !== 0) {
        const { y: canvasY } = waveToCanvas(0, y);
        ctx.fillText(y.toString(), axisX - 15, canvasY + 3);
      }
    }

    // Draw the wave
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const steps = 200;
    const dx = (xRange[1] - xRange[0]) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = xRange[0] + i * dx;
      const y = waveY(x);
      const { x: canvasX, y: canvasY } = waveToCanvas(x, y);

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }

    ctx.stroke();
  }, [waveConfig, waveY, waveToCanvas, canvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Render LaTeX-like equation display
  const renderEquation = (equation: string) => {
    // Simple rendering - in production, use react-katex
    return <span className="font-mono">{equation}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-violet-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Quelle equation correspond a ce graphique?
        </p>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selectedOption === option.id;
            const showCorrect = isAnswered && option.isCorrect;
            const showIncorrect = isAnswered && isSelected && !option.isCorrect;

            return (
              <button
                key={option.id}
                onClick={() => !isAnswered && onSelect(option.id)}
                disabled={isAnswered}
                className={cn(
                  'w-full p-4 text-left border-2 rounded-lg transition-all',
                  !isAnswered && !isSelected && 'border-gray-200 hover:border-violet-300 hover:bg-violet-50',
                  !isAnswered && isSelected && 'border-violet-500 bg-violet-50',
                  showCorrect && 'border-green-500 bg-green-50',
                  showIncorrect && 'border-red-500 bg-red-50',
                  isAnswered && !showCorrect && !showIncorrect && 'border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    !isAnswered && !isSelected && 'border-gray-300',
                    !isAnswered && isSelected && 'border-violet-500 bg-violet-500',
                    showCorrect && 'border-green-500 bg-green-500',
                    showIncorrect && 'border-red-500 bg-red-500'
                  )}>
                    {(isSelected || showCorrect) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg">{renderEquation(option.equation)}</span>
                </div>
                {isAnswered && option.feedback && (
                  <p className="mt-2 text-sm text-gray-600 pl-8">{option.feedback}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WaveMatchQuestion;
