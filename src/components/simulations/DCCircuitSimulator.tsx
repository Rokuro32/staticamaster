'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type SimulationMode = 'series' | 'parallel' | 'mixed' | 'internal';

const MODE_LABELS: Record<SimulationMode, string> = {
  series: 'Série',
  parallel: 'Parallèle',
  mixed: 'Mixte',
  internal: 'Pile réelle',
};

const MODE_DESCRIPTIONS: Record<SimulationMode, string> = {
  series: 'Résistances branchées bout à bout. Le courant est le même partout. R_éq = R₁ + R₂ + ...',
  parallel: 'Résistances branchées entre les mêmes nœuds. La tension est la même aux bornes de chaque résistance. 1/R_éq = 1/R₁ + 1/R₂ + ...',
  mixed: 'Combinaison série-parallèle. Simplifiez par étapes en identifiant les groupes série et parallèle.',
  internal: 'Une pile réelle possède une résistance interne r. La tension aux bornes est V = ε − I·r, où ε est la f.é.m.',
};

// ─── Drawing helpers ─────────────────────────────────────────────
function drawResistor(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, label: string, valueOhm: number, voltageDrop?: number) {
  const zigzags = 6;
  const amp = 12;
  const segLen = (x2 - x1) / (zigzags * 2);

  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let i = 0; i < zigzags * 2; i++) {
    const xn = x1 + segLen * (i + 1);
    const yn = i % 2 === 0 ? y - amp : y + amp;
    ctx.lineTo(xn, yn);
  }
  ctx.lineTo(x2, y);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // label
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, (x1 + x2) / 2, y - amp - 8);

  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`${valueOhm.toFixed(1)} Ω`, (x1 + x2) / 2, y + amp + 18);

  if (voltageDrop !== undefined) {
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`${voltageDrop.toFixed(2)} V`, (x1 + x2) / 2, y + amp + 34);
  }
}

function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, emf: number, vertical = false) {
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;

  if (vertical) {
    // Vertical battery
    const gapHalf = 8;
    // short plate (−)
    ctx.beginPath();
    ctx.moveTo(x - 8, y + gapHalf);
    ctx.lineTo(x + 8, y + gapHalf);
    ctx.stroke();
    // long plate (+)
    ctx.beginPath();
    ctx.moveTo(x - 16, y - gapHalf);
    ctx.lineTo(x + 16, y - gapHalf);
    ctx.stroke();

    // + and − labels
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', x + 24, y - gapHalf + 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('−', x + 24, y + gapHalf + 5);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`ε = ${emf.toFixed(1)} V`, x - 36, y + 5);
  } else {
    // Horizontal battery
    const gapHalf = 8;
    // short plate (−)
    ctx.beginPath();
    ctx.moveTo(x - gapHalf, y - 8);
    ctx.lineTo(x - gapHalf, y + 8);
    ctx.stroke();
    // long plate (+)
    ctx.beginPath();
    ctx.moveTo(x + gapHalf, y - 16);
    ctx.lineTo(x + gapHalf, y + 16);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', x + gapHalf + 2, y - 20);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('−', x - gapHalf - 2, y - 20);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`ε = ${emf.toFixed(1)} V`, x, y + 30);
  }
}

function drawWire(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCurrentArrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left' | 'up' | 'down', current: number) {
  const size = 8;
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  switch (direction) {
    case 'right':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 1.5, y);
      ctx.lineTo(x, y + size);
      break;
    case 'left':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * 1.5, y);
      ctx.lineTo(x, y + size);
      break;
    case 'up':
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y - size * 1.5);
      ctx.lineTo(x + size, y);
      break;
    case 'down':
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y + size * 1.5);
      ctx.lineTo(x + size, y);
      break;
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  const label = `I = ${current.toFixed(3)} A`;
  switch (direction) {
    case 'right':
    case 'left':
      ctx.fillText(label, x, y - 14);
      break;
    case 'up':
    case 'down':
      ctx.fillText(label, x + 50, y);
      break;
  }
}

function drawNode(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#374151';
  ctx.fill();
}

// ─── Series Mode ─────────────────────────────────────────────────
function SeriesMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emf, setEmf] = useState(12);
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(200);
  const [r3, setR3] = useState(150);
  const [numResistors, setNumResistors] = useState(3);

  const resistors = [r1, r2, r3].slice(0, numResistors);
  const rEq = resistors.reduce((a, b) => a + b, 0);
  const current = emf / rEq;
  const voltages = resistors.map(r => current * r);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const yTop = 100;
    const yBot = H - 60;
    const xLeft = 80;
    const xRight = W - 80;

    // Battery on the left (vertical)
    drawWire(ctx, [[xLeft, yTop], [xLeft, (yTop + yBot) / 2 - 20]]);
    drawBattery(ctx, xLeft, (yTop + yBot) / 2, emf, true);
    drawWire(ctx, [[xLeft, (yTop + yBot) / 2 + 20], [xLeft, yBot]]);

    // Top wire
    drawWire(ctx, [[xLeft, yTop], [xRight, yTop]]);
    // Bottom wire
    drawWire(ctx, [[xLeft, yBot], [xRight, yBot]]);

    // Current arrow on top
    drawCurrentArrow(ctx, (xLeft + xRight) / 2, yTop - 2, 'right', current);

    // Resistors on the right side (vertical path)
    const n = resistors.length;
    const totalSpan = yBot - yTop;
    const resLen = totalSpan / n;

    for (let i = 0; i < n; i++) {
      const yStart = yTop + i * resLen;
      const yEnd = yTop + (i + 1) * resLen;
      // Draw vertical wire segments then horizontal resistor
      const yMid = (yStart + yEnd) / 2;
      const rWidth = 100;
      const rxLeft = xRight - rWidth / 2;
      const rxRight = xRight + rWidth / 2;

      // Wire down to resistor level
      if (i === 0) {
        drawWire(ctx, [[xRight, yStart], [xRight, yMid]]);
      }

      // Horizontal resistor
      drawWire(ctx, [[xRight, yMid], [rxLeft, yMid]]);
      drawResistor(ctx, rxLeft - rWidth + 20, yMid, rxLeft + 20, `R${i + 1}`, resistors[i], voltages[i]);
      drawWire(ctx, [[rxRight, yMid], [xRight, yMid]]);

      // Wire down
      if (i < n - 1) {
        drawWire(ctx, [[xRight, yMid], [xRight, yMid + resLen]]);
      } else {
        drawWire(ctx, [[xRight, yMid], [xRight, yBot]]);
      }
    }
  }, [emf, resistors, current, voltages]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={700} height={420} className="w-full max-w-[700px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ε (V)</label>
          <input type="range" min={1} max={24} step={0.5} value={emf} onChange={e => setEmf(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{emf.toFixed(1)} V</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de R</label>
          <select value={numResistors} onChange={e => setNumResistors(+e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₁ (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={r1} onChange={e => setR1(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{r1} Ω</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₂ (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={r2} onChange={e => setR2(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{r2} Ω</span>
        </div>
        {numResistors >= 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">R₃ (Ω)</label>
            <input type="range" min={10} max={1000} step={10} value={r3} onChange={e => setR3(+e.target.value)} className="w-full" />
            <span className="text-sm text-gray-500">{r3} Ω</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Résultats — Résistances en série</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">R_éq = </span>
            {resistors.map((r, i) => <span key={i}>{i > 0 ? ' + ' : ''}{r}</span>)} = <strong>{rEq.toFixed(1)} Ω</strong>
          </div>
          <div>
            <span className="font-medium">I = ε / R_éq = </span> {emf.toFixed(1)} / {rEq.toFixed(1)} = <strong>{current.toFixed(4)} A</strong> = <strong>{(current * 1000).toFixed(2)} mA</strong>
          </div>
          {voltages.map((v, i) => (
            <div key={i}>
              <span className="font-medium">V_{`R${i + 1}`} = I × R{i + 1} = </span> {(current * 1000).toFixed(2)} mA × {resistors[i]} Ω = <strong>{v.toFixed(3)} V</strong>
            </div>
          ))}
          <div>
            <span className="font-medium">Vérification : </span> ΣV = {voltages.map(v => v.toFixed(3)).join(' + ')} = <strong>{voltages.reduce((a, b) => a + b, 0).toFixed(3)} V</strong> = ε ✓
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Parallel Mode ───────────────────────────────────────────────
function ParallelMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emf, setEmf] = useState(12);
  const [r1, setR1] = useState(100);
  const [r2, setR2] = useState(200);
  const [r3, setR3] = useState(300);
  const [numResistors, setNumResistors] = useState(3);

  const resistors = [r1, r2, r3].slice(0, numResistors);
  const rEq = 1 / resistors.reduce((sum, r) => sum + 1 / r, 0);
  const totalCurrent = emf / rEq;
  const branchCurrents = resistors.map(r => emf / r);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const n = resistors.length;
    const yTop = 60;
    const yBot = H - 60;
    const xLeft = 100;
    const xRight = W - 100;
    const xBatMid = xLeft;

    // Battery on left
    drawWire(ctx, [[xBatMid, yTop], [xBatMid, (yTop + yBot) / 2 - 20]]);
    drawBattery(ctx, xBatMid, (yTop + yBot) / 2, emf, true);
    drawWire(ctx, [[xBatMid, (yTop + yBot) / 2 + 20], [xBatMid, yBot]]);

    // Top and bottom wires
    const nodeTopX = (xLeft + xRight) / 2;
    drawWire(ctx, [[xLeft, yTop], [nodeTopX, yTop]]);
    drawWire(ctx, [[xLeft, yBot], [nodeTopX, yBot]]);

    // Current arrow
    drawCurrentArrow(ctx, (xLeft + nodeTopX) / 2, yTop - 2, 'right', totalCurrent);

    // Top and bottom nodes
    drawNode(ctx, nodeTopX, yTop);
    drawNode(ctx, nodeTopX, yBot);

    // Parallel resistors
    const spacing = (xRight - nodeTopX - 40) / Math.max(n - 1, 1);
    const resHalfH = 50;

    for (let i = 0; i < n; i++) {
      const x = n === 1 ? nodeTopX + 80 : nodeTopX + 20 + spacing * i;
      const yMid = (yTop + yBot) / 2;

      // Vertical wires
      drawWire(ctx, [[nodeTopX, yTop], [x, yTop], [x, yMid - resHalfH]]);
      drawWire(ctx, [[x, yMid + resHalfH], [x, yBot], [nodeTopX, yBot]]);

      // Draw resistor vertically by rotating
      ctx.save();
      ctx.translate(x, yMid);
      ctx.rotate(-Math.PI / 2);
      drawResistor(ctx, -resHalfH, 0, resHalfH, `R${i + 1}`, resistors[i]);
      ctx.restore();

      // Branch current
      ctx.fillStyle = '#059669';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`I${i + 1} = ${(branchCurrents[i] * 1000).toFixed(1)} mA`, x, yBot + 20);
    }
  }, [emf, resistors, totalCurrent, branchCurrents]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={700} height={380} className="w-full max-w-[700px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ε (V)</label>
          <input type="range" min={1} max={24} step={0.5} value={emf} onChange={e => setEmf(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{emf.toFixed(1)} V</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de R</label>
          <select value={numResistors} onChange={e => setNumResistors(+e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₁ (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={r1} onChange={e => setR1(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{r1} Ω</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₂ (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={r2} onChange={e => setR2(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{r2} Ω</span>
        </div>
        {numResistors >= 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">R₃ (Ω)</label>
            <input type="range" min={10} max={1000} step={10} value={r3} onChange={e => setR3(+e.target.value)} className="w-full" />
            <span className="text-sm text-gray-500">{r3} Ω</span>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Résultats — Résistances en parallèle</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">1/R_éq = </span>
            {resistors.map((r, i) => <span key={i}>{i > 0 ? ' + ' : ''}1/{r}</span>)}
          </div>
          <div>
            <strong>R_éq = {rEq.toFixed(2)} Ω</strong>
          </div>
          <div>
            <span className="font-medium">I_total = ε / R_éq = </span> {emf.toFixed(1)} / {rEq.toFixed(2)} = <strong>{(totalCurrent * 1000).toFixed(2)} mA</strong>
          </div>
          {branchCurrents.map((ic, i) => (
            <div key={i}>
              <span className="font-medium">I{i + 1} = ε / R{i + 1} = </span> {emf.toFixed(1)} / {resistors[i]} = <strong>{(ic * 1000).toFixed(2)} mA</strong>
            </div>
          ))}
          <div>
            <span className="font-medium">Vérification : </span> ΣI = {branchCurrents.map(i => (i * 1000).toFixed(2)).join(' + ')} = <strong>{(branchCurrents.reduce((a, b) => a + b, 0) * 1000).toFixed(2)} mA</strong> = I_total ✓
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mixed Mode ──────────────────────────────────────────────────
function MixedMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emf, setEmf] = useState(12);
  const [rSeries, setRSeries] = useState(100);
  const [rPar1, setRPar1] = useState(200);
  const [rPar2, setRPar2] = useState(300);

  const rParEq = (rPar1 * rPar2) / (rPar1 + rPar2);
  const rTotal = rSeries + rParEq;
  const totalCurrent = emf / rTotal;
  const vSeries = totalCurrent * rSeries;
  const vParallel = totalCurrent * rParEq;
  const iPar1 = vParallel / rPar1;
  const iPar2 = vParallel / rPar2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const yTop = 80;
    const yBot = H - 80;
    const yMid = (yTop + yBot) / 2;
    const xLeft = 80;
    const xRight = W - 80;

    // Battery on left
    drawWire(ctx, [[xLeft, yTop], [xLeft, yMid - 20]]);
    drawBattery(ctx, xLeft, yMid, emf, true);
    drawWire(ctx, [[xLeft, yMid + 20], [xLeft, yBot]]);

    // Top wire to series resistor
    const xSeriesEnd = xLeft + (xRight - xLeft) * 0.4;
    drawWire(ctx, [[xLeft, yTop], [xLeft + 30, yTop]]);
    drawResistor(ctx, xLeft + 30, yTop, xSeriesEnd, 'R₁ (série)', rSeries, vSeries);
    drawWire(ctx, [[xSeriesEnd, yTop], [xSeriesEnd + 30, yTop]]);

    // Current arrow
    drawCurrentArrow(ctx, xLeft + 15, yTop - 2, 'right', totalCurrent);

    // Node before parallel
    const nodeX = xSeriesEnd + 30;
    drawNode(ctx, nodeX, yTop);
    drawNode(ctx, nodeX, yBot);

    // Bottom wire
    drawWire(ctx, [[xLeft, yBot], [nodeX, yBot]]);

    // Two parallel branches
    const xPar = nodeX + 80;
    const yBranch1 = yTop + 40;
    const yBranch2 = yBot - 40;

    // Branch 1 (R₂)
    drawWire(ctx, [[nodeX, yTop], [xPar, yTop], [xPar, yBranch1 - 20]]);
    ctx.save();
    ctx.translate(xPar, (yBranch1 + yMid) / 2 - 10);
    ctx.rotate(-Math.PI / 2);
    drawResistor(ctx, -40, 0, 40, 'R₂', rPar1);
    ctx.restore();
    drawWire(ctx, [[xPar, yMid + 20], [xPar, yBot], [nodeX, yBot]]);

    // Branch 2 (R₃)
    const xPar2 = xPar + 120;
    drawWire(ctx, [[nodeX, yTop], [xPar2, yTop], [xPar2, yBranch1 - 20]]);
    ctx.save();
    ctx.translate(xPar2, (yBranch1 + yMid) / 2 - 10);
    ctx.rotate(-Math.PI / 2);
    drawResistor(ctx, -40, 0, 40, 'R₃', rPar2);
    ctx.restore();
    drawWire(ctx, [[xPar2, yMid + 20], [xPar2, yBot], [nodeX, yBot]]);

    // Branch currents
    ctx.fillStyle = '#059669';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`I₂ = ${(iPar1 * 1000).toFixed(1)} mA`, xPar, yBot + 18);
    ctx.fillText(`I₃ = ${(iPar2 * 1000).toFixed(1)} mA`, xPar2, yBot + 18);
  }, [emf, rSeries, rPar1, rPar2, vSeries, totalCurrent, iPar1, iPar2]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={700} height={400} className="w-full max-w-[700px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ε (V)</label>
          <input type="range" min={1} max={24} step={0.5} value={emf} onChange={e => setEmf(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{emf.toFixed(1)} V</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₁ série (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={rSeries} onChange={e => setRSeries(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{rSeries} Ω</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₂ parallèle (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={rPar1} onChange={e => setRPar1(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{rPar1} Ω</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R₃ parallèle (Ω)</label>
          <input type="range" min={10} max={1000} step={10} value={rPar2} onChange={e => setRPar2(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{rPar2} Ω</span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Résultats — Circuit mixte (R₁ en série + R₂ ∥ R₃)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">R₂ ∥ R₃ = </span> ({rPar1} × {rPar2}) / ({rPar1} + {rPar2}) = <strong>{rParEq.toFixed(2)} Ω</strong></div>
          <div><span className="font-medium">R_total = </span> R₁ + R₂∥R₃ = {rSeries} + {rParEq.toFixed(2)} = <strong>{rTotal.toFixed(2)} Ω</strong></div>
          <div><span className="font-medium">I_total = </span> ε / R_total = {emf} / {rTotal.toFixed(2)} = <strong>{(totalCurrent * 1000).toFixed(2)} mA</strong></div>
          <div><span className="font-medium">V_R₁ = </span> I × R₁ = <strong>{vSeries.toFixed(3)} V</strong></div>
          <div><span className="font-medium">V_parallèle = </span> I × R₂∥R₃ = <strong>{vParallel.toFixed(3)} V</strong></div>
          <div><span className="font-medium">I₂ = </span> V_par / R₂ = <strong>{(iPar1 * 1000).toFixed(2)} mA</strong></div>
          <div><span className="font-medium">I₃ = </span> V_par / R₃ = <strong>{(iPar2 * 1000).toFixed(2)} mA</strong></div>
          <div><span className="font-medium">Vérification : </span> V_R₁ + V_par = {vSeries.toFixed(3)} + {vParallel.toFixed(3)} = <strong>{(vSeries + vParallel).toFixed(3)} V</strong> = ε ✓</div>
        </div>
      </div>
    </div>
  );
}

// ─── Internal Resistance Mode ────────────────────────────────────
function InternalResistanceMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emf, setEmf] = useState(12);
  const [rInt, setRInt] = useState(2);
  const [rLoad, setRLoad] = useState(100);

  const totalR = rInt + rLoad;
  const current = emf / totalR;
  const vTerminal = emf - current * rInt;
  const vInternal = current * rInt;
  const powerLoad = current * current * rLoad;
  const powerInternal = current * current * rInt;
  const efficiency = (rLoad / totalR) * 100;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const yTop = 80;
    const yBot = H - 80;
    const yMid = (yTop + yBot) / 2;
    const xLeft = 100;
    const xRight = W - 100;

    // Dashed box around battery + internal resistance
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(xLeft - 50, yTop - 30, 200, yBot - yTop + 60);
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pile réelle', xLeft + 50, yTop - 38);

    // Battery
    drawWire(ctx, [[xLeft, yTop], [xLeft, yMid - 20]]);
    drawBattery(ctx, xLeft, yMid, emf, true);
    drawWire(ctx, [[xLeft, yMid + 20], [xLeft, yBot]]);

    // Internal resistance (on top, in series)
    const xRintStart = xLeft + 20;
    const xRintEnd = xLeft + 120;
    drawWire(ctx, [[xLeft, yTop], [xRintStart, yTop]]);
    drawResistor(ctx, xRintStart, yTop, xRintEnd, 'r (interne)', rInt, vInternal);
    drawWire(ctx, [[xRintEnd, yTop], [xRight, yTop]]);

    // External load resistor
    drawWire(ctx, [[xRight, yTop], [xRight, yMid - 40]]);
    ctx.save();
    ctx.translate(xRight, yMid);
    ctx.rotate(-Math.PI / 2);
    drawResistor(ctx, -50, 0, 50, 'R (charge)', rLoad, vTerminal);
    ctx.restore();
    drawWire(ctx, [[xRight, yMid + 40], [xRight, yBot]]);

    // Bottom wire
    drawWire(ctx, [[xLeft, yBot], [xRight, yBot]]);

    // Current
    drawCurrentArrow(ctx, (xRintEnd + xRight) / 2, yTop - 2, 'right', current);

    // Terminal voltage label
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`V_bornes = ${vTerminal.toFixed(2)} V`, xRight + 5, yBot + 30);

    // Voltmeter symbol
    ctx.beginPath();
    ctx.arc(xRight + 5, yBot + 50, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('V', xRight + 5, yBot + 55);
  }, [emf, rInt, rLoad, current, vInternal, vTerminal]);

  useEffect(() => { draw(); }, [draw]);

  // Generate V vs I graph data
  const graphPoints: { I: number; V: number }[] = [];
  for (let rl = 1; rl <= 2000; rl += 5) {
    const i = emf / (rInt + rl);
    const v = emf - i * rInt;
    graphPoints.push({ I: i, V: v });
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={700} height={400} className="w-full max-w-[700px] mx-auto bg-white rounded-lg border border-gray-200" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ε - f.é.m. (V)</label>
          <input type="range" min={1} max={24} step={0.5} value={emf} onChange={e => setEmf(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{emf.toFixed(1)} V</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">r interne (Ω)</label>
          <input type="range" min={0.1} max={50} step={0.1} value={rInt} onChange={e => setRInt(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{rInt.toFixed(1)} Ω</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">R charge (Ω)</label>
          <input type="range" min={1} max={1000} step={1} value={rLoad} onChange={e => setRLoad(+e.target.value)} className="w-full" />
          <span className="text-sm text-gray-500">{rLoad} Ω</span>
        </div>
      </div>

      {/* V vs I characteristic */}
      <VIGraph emf={emf} rInt={rInt} currentPoint={current} vPoint={vTerminal} />

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2">Résultats — Pile réelle</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">I = ε / (r + R) = </span> {emf} / ({rInt} + {rLoad}) = <strong>{(current * 1000).toFixed(2)} mA</strong></div>
          <div><span className="font-medium">V_bornes = ε − I·r = </span> {emf} − {(current * 1000).toFixed(2)}×10⁻³ × {rInt} = <strong>{vTerminal.toFixed(3)} V</strong></div>
          <div><span className="font-medium">Chute interne = I·r = </span> <strong>{vInternal.toFixed(3)} V</strong></div>
          <div><span className="font-medium">P_charge = I²R = </span> <strong>{(powerLoad * 1000).toFixed(2)} mW</strong></div>
          <div><span className="font-medium">P_interne = I²r = </span> <strong>{(powerInternal * 1000).toFixed(2)} mW</strong></div>
          <div><span className="font-medium">Rendement = R/(r+R) = </span> <strong>{efficiency.toFixed(1)}%</strong></div>
          <div className="md:col-span-2 mt-2 p-2 bg-white rounded border border-purple-100">
            <span className="font-medium">Note : </span>
            Quand R ≫ r, V_bornes ≈ ε (pile quasi-idéale). Quand R → 0 (court-circuit), I → ε/r et V_bornes → 0.
          </div>
        </div>
      </div>
    </div>
  );
}

// V-I characteristic graph for real battery
function VIGraph({ emf, rInt, currentPoint, vPoint }: { emf: number; rInt: number; currentPoint: number; vPoint: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const gW = W - padding.left - padding.right;
    const gH = H - padding.top - padding.bottom;

    const iMax = emf / rInt; // short circuit current
    const vMax = emf * 1.1;
    const iMaxDisplay = iMax * 1.1;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (gW / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + gH);
      ctx.stroke();

      const y = padding.top + (gH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + gW, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + gH);
    ctx.lineTo(padding.left + gW, padding.top + gH);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('I (A)', padding.left + gW / 2, H - 8);

    ctx.save();
    ctx.translate(16, padding.top + gH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('V (V)', 0, 0);
    ctx.restore();

    // Axis ticks
    ctx.font = '10px Inter, sans-serif';
    for (let i = 0; i <= 5; i++) {
      const iVal = (iMaxDisplay / 5) * i;
      const x = padding.left + (gW / 5) * i;
      ctx.textAlign = 'center';
      ctx.fillText(iVal.toFixed(2), x, padding.top + gH + 18);

      const vVal = vMax - (vMax / 5) * i;
      const y = padding.top + (gH / 5) * i;
      ctx.textAlign = 'right';
      ctx.fillText(vVal.toFixed(1), padding.left - 8, y + 4);
    }

    // V = emf - I*r line
    ctx.beginPath();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2.5;
    const x0 = padding.left + (0 / iMaxDisplay) * gW;
    const y0 = padding.top + (1 - emf / vMax) * gH;
    const x1 = padding.left + (iMax / iMaxDisplay) * gW;
    const y1 = padding.top + (1 - 0 / vMax) * gH;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Current operating point
    const px = padding.left + (currentPoint / iMaxDisplay) * gW;
    const py = padding.top + (1 - vPoint / vMax) * gH;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`(${(currentPoint * 1000).toFixed(1)} mA, ${vPoint.toFixed(2)} V)`, px + 10, py - 8);

    // Title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Caractéristique V = ε − I·r', W / 2, 18);

    // EMF label
    ctx.fillStyle = '#7c3aed';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ε = ${emf} V`, x0 + 5, y0 - 8);
    ctx.fillText(`I_cc = ${iMax.toFixed(3)} A`, x1 - 60, y1 - 8);
  }, [emf, rInt, currentPoint, vPoint]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div>
      <canvas ref={canvasRef} width={500} height={280} className="w-full max-w-[500px] mx-auto bg-white rounded-lg border border-gray-200" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function DCCircuitSimulator() {
  const [mode, setMode] = useState<SimulationMode>('series');

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
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
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
        {mode === 'series' && <SeriesMode />}
        {mode === 'parallel' && <ParallelMode />}
        {mode === 'mixed' && <MixedMode />}
        {mode === 'internal' && <InternalResistanceMode />}
      </div>
    </div>
  );
}
