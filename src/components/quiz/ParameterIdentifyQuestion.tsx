'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { ParameterIdentifyConfig } from '@/types/question';
import { NumericInput } from '@/components/ui/Input';

interface ParameterIdentifyQuestionProps {
  config: ParameterIdentifyConfig;
  onSubmit: (params: Record<string, number>) => void;
  isAnswered: boolean;
  correctValues?: Record<string, number>;
}

export function ParameterIdentifyQuestion({
  config,
  onSubmit,
  isAnswered,
  correctValues,
}: ParameterIdentifyQuestionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 550, height: 280 });
  const [values, setValues] = useState<Record<string, number | ''>>({});

  const { waveConfig, parametersToFind } = config;

  // Initialize values
  useEffect(() => {
    const initial: Record<string, number | ''> = {};
    parametersToFind.forEach(param => {
      initial[param] = '';
    });
    setValues(initial);
  }, [parametersToFind]);

  // Convert wave coordinates to canvas coordinates
  const waveToCanvas = useCallback((waveX: number, waveY: number) => {
    const { xRange, yRange } = waveConfig;
    const padding = 50;
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

  // Draw the graph with helper markers
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { xRange, yRange, xAxisLabel, yAxisLabel, gridSpacing, amplitude } = waveConfig;
    const padding = 50;

    // Clear canvas
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid lines
    ctx.strokeStyle = '#fef08a';
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

    // Draw amplitude reference lines (dashed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const { y: topY } = waveToCanvas(0, amplitude);
    const { y: bottomY } = waveToCanvas(0, -amplitude);

    ctx.beginPath();
    ctx.moveTo(padding, topY);
    ctx.lineTo(canvasSize.width - padding, topY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, bottomY);
    ctx.lineTo(canvasSize.width - padding, bottomY);
    ctx.stroke();

    ctx.setLineDash([]);

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

    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(canvasSize.width - padding, axisY);
    ctx.lineTo(canvasSize.width - padding - 8, axisY - 5);
    ctx.lineTo(canvasSize.width - padding - 8, axisY + 5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(axisX, padding);
    ctx.lineTo(axisX - 5, padding + 8);
    ctx.lineTo(axisX + 5, padding + 8);
    ctx.fill();

    // Axis labels
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(xAxisLabel, canvasSize.width / 2, canvasSize.height - 10);

    ctx.save();
    ctx.translate(15, canvasSize.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Tick labels
    ctx.font = '11px system-ui';
    for (let x = xRange[0]; x <= xRange[1]; x += gridSpacing) {
      if (x !== 0) {
        const { x: canvasX } = waveToCanvas(x, 0);
        ctx.fillText(x.toString(), canvasX, axisY + 18);
      }
    }

    for (let y = yRange[0]; y <= yRange[1]; y += gridSpacing) {
      if (y !== 0) {
        const { y: canvasY } = waveToCanvas(0, y);
        ctx.fillText(y.toString(), axisX - 18, canvasY + 4);
      }
    }

    // Draw the wave
    ctx.strokeStyle = '#ea580c';
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

    // Draw measurement helpers
    // Amplitude marker
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('A', axisX + 15, topY + 4);
    ctx.fillText('-A', axisX + 15, bottomY + 4);

  }, [waveConfig, waveY, waveToCanvas, canvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleValueChange = (param: string, value: number | '') => {
    setValues(prev => ({ ...prev, [param]: value }));
  };

  const handleSubmit = () => {
    const numericValues: Record<string, number> = {};
    Object.entries(values).forEach(([key, val]) => {
      numericValues[key] = val === '' ? 0 : val;
    });
    onSubmit(numericValues);
  };

  const paramLabels: Record<string, { label: string; unit: string; hint: string }> = {
    amplitude: { label: 'Amplitude (A)', unit: 'm', hint: 'Distance maximale par rapport a l\'equilibre' },
    wavelength: { label: 'Longueur d\'onde (λ)', unit: 'm', hint: 'Distance entre deux cretes consecutives' },
    frequency: { label: 'Frequence (f)', unit: 'Hz', hint: 'Nombre d\'oscillations par seconde' },
    period: { label: 'Periode (T)', unit: 's', hint: 'Temps pour un cycle complet' },
    phase: { label: 'Phase initiale (φ)', unit: 'rad', hint: 'Decalage de l\'onde a x=0 ou t=0' },
  };

  const allFilled = parametersToFind.every(param => values[param] !== '' && values[param] !== undefined);

  return (
    <div className="space-y-6">
      <div className="border-2 border-amber-300 rounded-lg overflow-hidden bg-amber-50">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm font-medium text-amber-800 mb-1">
          Analysez le graphique et identifiez les parametres suivants:
        </p>
        <p className="text-xs text-amber-600">
          Utilisez les lignes de reference et la grille pour mesurer les valeurs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {parametersToFind.map(param => {
          const info = paramLabels[param];
          const isCorrect = isAnswered && correctValues &&
            Math.abs((values[param] as number) - correctValues[param]) / correctValues[param] < 0.1;
          const isIncorrect = isAnswered && !isCorrect;

          return (
            <div
              key={param}
              className={`p-4 rounded-lg border-2 ${
                isCorrect ? 'border-green-500 bg-green-50' :
                isIncorrect ? 'border-red-500 bg-red-50' :
                'border-gray-200 bg-white'
              }`}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {info.label}
              </label>
              <div className="flex gap-2 items-center">
                <NumericInput
                  value={values[param] ?? ''}
                  onChange={(val) => handleValueChange(param, val)}
                  placeholder="0"
                  disabled={isAnswered}
                />
                <span className="text-sm text-gray-500 font-mono">{info.unit}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{info.hint}</p>
              {isAnswered && correctValues && (
                <p className={`text-sm mt-2 font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect ? 'Correct!' : `Reponse attendue: ${correctValues[param]} ${info.unit}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!isAnswered && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="w-full px-4 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Valider mes reponses
        </button>
      )}
    </div>
  );
}

export default ParameterIdentifyQuestion;
