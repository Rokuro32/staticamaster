'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { WaveSketchConfig } from '@/types/question';
import { Button } from '@/components/ui/Button';

interface WaveSketchQuestionProps {
  config: WaveSketchConfig;
  onDrawingComplete: (points: Array<{ x: number; y: number }>) => void;
  isAnswered: boolean;
  showCorrect?: boolean;
}

export function WaveSketchQuestion({
  config,
  onDrawingComplete,
  isAnswered,
  showCorrect = false,
}: WaveSketchQuestionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [canvasSize] = useState({ width: 600, height: 300 });

  // Convert wave coordinates to canvas coordinates
  const waveToCanvas = useCallback((waveX: number, waveY: number) => {
    const { xRange, yRange } = config;
    const padding = 50;
    const drawWidth = canvasSize.width - 2 * padding;
    const drawHeight = canvasSize.height - 2 * padding;

    const canvasX = padding + ((waveX - xRange[0]) / (xRange[1] - xRange[0])) * drawWidth;
    const canvasY = padding + ((yRange[1] - waveY) / (yRange[1] - yRange[0])) * drawHeight;

    return { x: canvasX, y: canvasY };
  }, [config, canvasSize]);

  // Convert canvas coordinates to wave coordinates
  const canvasToWave = useCallback((canvasX: number, canvasY: number) => {
    const { xRange, yRange } = config;
    const padding = 50;
    const drawWidth = canvasSize.width - 2 * padding;
    const drawHeight = canvasSize.height - 2 * padding;

    const waveX = xRange[0] + ((canvasX - padding) / drawWidth) * (xRange[1] - xRange[0]);
    const waveY = yRange[1] - ((canvasY - padding) / drawHeight) * (yRange[1] - yRange[0]);

    return { x: waveX, y: waveY };
  }, [config, canvasSize]);

  // Calculate expected wave value at x
  const expectedWaveY = useCallback((x: number) => {
    const { amplitude, wavelength, frequency, phase, phaseUnit, waveType } = config;

    let phaseRad = phase;
    if (phaseUnit === 'deg') {
      phaseRad = (phase * Math.PI) / 180;
    }

    // k = 2π/λ or ω = 2πf depending on context
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
  }, [config]);

  // Draw grid and axes
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { xRange, yRange, xAxisLabel, yAxisLabel, gridSpacing } = config;
    const padding = 50;
    const drawWidth = canvasSize.width - 2 * padding;
    const drawHeight = canvasSize.height - 2 * padding;

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
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(xAxisLabel, canvasSize.width / 2, canvasSize.height - 10);

    ctx.save();
    ctx.translate(15, canvasSize.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Tick labels on X axis
    ctx.font = '12px system-ui';
    for (let x = xRange[0]; x <= xRange[1]; x += gridSpacing) {
      if (x !== 0) {
        const { x: canvasX } = waveToCanvas(x, 0);
        ctx.fillText(x.toString(), canvasX, axisY + 20);
      }
    }

    // Tick labels on Y axis
    for (let y = yRange[0]; y <= yRange[1]; y += gridSpacing) {
      if (y !== 0) {
        const { y: canvasY } = waveToCanvas(0, y);
        ctx.fillText(y.toString(), axisX - 20, canvasY + 4);
      }
    }
  }, [config, canvasSize, waveToCanvas]);

  // Draw the expected wave (after answer submitted)
  const drawExpectedWave = useCallback((ctx: CanvasRenderingContext2D) => {
    const { xRange } = config;
    const padding = 50;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();

    const steps = 200;
    const dx = (xRange[1] - xRange[0]) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = xRange[0] + i * dx;
      const y = expectedWaveY(x);
      const { x: canvasX, y: canvasY } = waveToCanvas(x, y);

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }, [config, expectedWaveY, waveToCanvas]);

  // Draw user's points
  const drawUserWave = useCallback((ctx: CanvasRenderingContext2D) => {
    if (drawnPoints.length < 2) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Sort points by x coordinate
    const sortedPoints = [...drawnPoints].sort((a, b) => a.x - b.x);

    for (let i = 0; i < sortedPoints.length; i++) {
      const { x: canvasX, y: canvasY } = waveToCanvas(sortedPoints[i].x, sortedPoints[i].y);
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }

    ctx.stroke();
  }, [drawnPoints, waveToCanvas]);

  // Redraw everything
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);

    if (showCorrect) {
      drawExpectedWave(ctx);
    }

    drawUserWave(ctx);
  }, [drawGrid, drawExpectedWave, drawUserWave, showCorrect]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Mouse/touch event handlers
  const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    return canvasToWave(canvasX, canvasY);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAnswered) return;
    setIsDrawing(true);
    const pos = getEventPosition(e);
    if (pos) {
      setDrawnPoints([pos]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isAnswered) return;
    const pos = getEventPosition(e);
    if (pos) {
      // Only add point if x is within range and different from last
      const { xRange } = config;
      if (pos.x >= xRange[0] && pos.x <= xRange[1]) {
        setDrawnPoints(prev => [...prev, pos]);
      }
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setDrawnPoints([]);
  };

  const handleSubmit = () => {
    onDrawingComplete(drawnPoints);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      {!isAnswered && (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClear} disabled={drawnPoints.length === 0}>
            Effacer
          </Button>
          <Button onClick={handleSubmit} disabled={drawnPoints.length < 10}>
            Valider mon dessin
          </Button>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Votre dessin</span>
        </div>
        {showCorrect && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500 rounded" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600">Solution attendue</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Dessinez la fonction d'onde en cliquant et glissant sur le graphique.
        Assurez-vous de respecter l'amplitude, la longueur d'onde et la phase indiquees.
      </p>
    </div>
  );
}

export default WaveSketchQuestion;
