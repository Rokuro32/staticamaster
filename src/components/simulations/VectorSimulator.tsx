'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

type SimulationMode = 'addition' | 'dotProduct' | 'crossProduct' | 'cartesianPolar';

export function VectorSimulator() {
  const [mode, setMode] = useState<SimulationMode>('addition');

  const modes: { id: SimulationMode; label: string; description: string }[] = [
    { id: 'addition', label: 'Addition vectorielle', description: 'Visualisez la somme de deux vecteurs' },
    { id: 'dotProduct', label: 'Produit scalaire', description: 'Calculez et visualisez le produit scalaire' },
    { id: 'crossProduct', label: 'Produit vectoriel', description: 'Calculez le produit vectoriel et visualisez le moment' },
    { id: 'cartesianPolar', label: 'Cartésien ↔ Polaire', description: 'Conversion entre coordonnées' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Mode selector */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {modes.find((m) => m.id === mode)?.description}
        </p>
      </div>

      {/* Simulator content */}
      <div className="p-6">
        {mode === 'addition' && <VectorAddition />}
        {mode === 'dotProduct' && <DotProductSimulator />}
        {mode === 'crossProduct' && <CrossProductSimulator />}
        {mode === 'cartesianPolar' && <CartesianPolarConverter />}
      </div>
    </div>
  );
}

// ============================================
// VECTOR ADDITION SIMULATOR
// ============================================
function VectorAddition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });

  // Vector A
  const [ax, setAx] = useState(3);
  const [ay, setAy] = useState(2);

  // Vector B
  const [bx, setBx] = useState(1);
  const [by, setBy] = useState(4);

  // Resultant vector
  const rx = ax + bx;
  const ry = ay + by;

  // Magnitudes
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  const magR = Math.sqrt(rx * rx + ry * ry);

  // Scale and origin
  const scale = 40;
  const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  const toCanvas = useCallback(
    (x: number, y: number) => ({
      x: origin.x + x * scale,
      y: origin.y - y * scale,
    }),
    [origin, scale]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      color: string,
      label: string,
      lineWidth: number = 3
    ) => {
      const from = toCanvas(fromX, fromY);
      const to = toCanvas(toX, toY);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const headLength = 15;

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLength * Math.cos(angle - Math.PI / 6),
        to.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to.x - headLength * Math.cos(angle + Math.PI / 6),
        to.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(label, midX + 10, midY - 10);
    },
    [toCanvas]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1;

    for (let x = -10; x <= 10; x++) {
      const { x: cx } = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvasSize.height);
      ctx.stroke();
    }
    for (let y = -10; y <= 10; y++) {
      const { y: cy } = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvasSize.width, cy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvasSize.width, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvasSize.height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#1e3a5f';
    ctx.font = '14px system-ui';
    ctx.fillText('x', canvasSize.width - 20, origin.y - 10);
    ctx.fillText('y', origin.x + 10, 20);

    // Tick marks
    ctx.font = '12px system-ui';
    for (let i = -6; i <= 6; i++) {
      if (i !== 0) {
        const { x: cx } = toCanvas(i, 0);
        const { y: cy } = toCanvas(0, i);
        ctx.fillText(i.toString(), cx - 5, origin.y + 18);
        ctx.fillText(i.toString(), origin.x + 8, cy + 4);
      }
    }

    // Draw parallelogram (hint for addition)
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    // From A tip to R
    const aTip = toCanvas(ax, ay);
    const rTip = toCanvas(rx, ry);
    ctx.beginPath();
    ctx.moveTo(aTip.x, aTip.y);
    ctx.lineTo(rTip.x, rTip.y);
    ctx.stroke();

    // From B tip to R
    const bTip = toCanvas(bx, by);
    ctx.beginPath();
    ctx.moveTo(bTip.x, bTip.y);
    ctx.lineTo(rTip.x, rTip.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw vectors
    drawArrow(ctx, 0, 0, ax, ay, '#dc2626', 'A', 3); // Red
    drawArrow(ctx, 0, 0, bx, by, '#2563eb', 'B', 3); // Blue
    drawArrow(ctx, 0, 0, rx, ry, '#16a34a', 'R', 4); // Green (resultant)

    // Origin point
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [ax, ay, bx, by, rx, ry, canvasSize, drawArrow, toCanvas, origin]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Canvas */}
        <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Vector A */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Vecteur A (rouge)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Ax
                </label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={ax}
                  onChange={(e) => setAx(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{ax}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Ay
                </label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={ay}
                  onChange={(e) => setAy(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{ay}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-red-600">
              |A| = {magA.toFixed(2)}
            </p>
          </div>

          {/* Vector B */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">Vecteur B (bleu)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Bx
                </label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={bx}
                  onChange={(e) => setBx(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{bx}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  By
                </label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={by}
                  onChange={(e) => setBy(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{by}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-blue-600">
              |B| = {magB.toFixed(2)}
            </p>
          </div>

          {/* Resultant */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Vecteur Résultant R = A + B</h3>
            <div className="text-green-700">
              <p className="font-mono">
                R = ({ax} + {bx}, {ay} + {by}) = ({rx}, {ry})
              </p>
              <p className="mt-1">|R| = {magR.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Formule d'addition vectorielle</h3>
        <BlockMath math="\vec{R} = \vec{A} + \vec{B} = (A_x + B_x)\hat{i} + (A_y + B_y)\hat{j}" />
        <div className="mt-3 text-sm text-gray-600">
          <p>L'addition vectorielle se fait composante par composante. Le vecteur résultant R (vert) est la diagonale du parallélogramme formé par A et B.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DOT PRODUCT SIMULATOR
// ============================================
function DotProductSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });

  // Vector A
  const [ax, setAx] = useState(4);
  const [ay, setAy] = useState(2);

  // Vector B
  const [bx, setBx] = useState(2);
  const [by, setBy] = useState(4);

  // Calculations
  const dotProduct = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);

  // Angle between vectors
  const cosTheta = magA > 0 && magB > 0 ? dotProduct / (magA * magB) : 0;
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  const thetaDeg = (theta * 180) / Math.PI;

  // Projection of A onto B
  const projAonB = magB > 0 ? dotProduct / magB : 0;
  const projVecX = magB > 0 ? projAonB * (bx / magB) : 0;
  const projVecY = magB > 0 ? projAonB * (by / magB) : 0;

  const scale = 40;
  const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  const toCanvas = useCallback(
    (x: number, y: number) => ({
      x: origin.x + x * scale,
      y: origin.y - y * scale,
    }),
    [origin, scale]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      color: string,
      label: string,
      lineWidth: number = 3,
      dashed: boolean = false
    ) => {
      const from = toCanvas(fromX, fromY);
      const to = toCanvas(toX, toY);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;

      const angle = Math.atan2(dy, dx);
      const headLength = 12;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      if (dashed) ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLength * Math.cos(angle - Math.PI / 6),
        to.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to.x - headLength * Math.cos(angle + Math.PI / 6),
        to.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(label, midX + 10, midY - 10);
    },
    [toCanvas]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 1;

    for (let x = -10; x <= 10; x++) {
      const { x: cx } = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvasSize.height);
      ctx.stroke();
    }
    for (let y = -10; y <= 10; y++) {
      const { y: cy } = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvasSize.width, cy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvasSize.width, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvasSize.height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#581c87';
    ctx.font = '14px system-ui';
    ctx.fillText('x', canvasSize.width - 20, origin.y - 10);
    ctx.fillText('y', origin.x + 10, 20);

    // Tick marks
    ctx.font = '12px system-ui';
    for (let i = -6; i <= 6; i++) {
      if (i !== 0) {
        const { x: cx } = toCanvas(i, 0);
        const { y: cy } = toCanvas(0, i);
        ctx.fillText(i.toString(), cx - 5, origin.y + 18);
        ctx.fillText(i.toString(), origin.x + 8, cy + 4);
      }
    }

    // Draw angle arc
    if (magA > 0 && magB > 0) {
      const angleA = Math.atan2(ay, ax);
      const angleB = Math.atan2(by, bx);
      const startAngle = Math.min(angleA, angleB);
      const endAngle = Math.max(angleA, angleB);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 40, -endAngle, -startAngle);
      ctx.stroke();

      // Angle label
      const midAngle = (angleA + angleB) / 2;
      const labelX = origin.x + 55 * Math.cos(midAngle);
      const labelY = origin.y - 55 * Math.sin(midAngle);
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = '#a855f7';
      ctx.fillText('θ', labelX, labelY);
    }

    // Draw projection line (perpendicular from A to B direction)
    if (magB > 0) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      const aTip = toCanvas(ax, ay);
      const projTip = toCanvas(projVecX, projVecY);
      ctx.beginPath();
      ctx.moveTo(aTip.x, aTip.y);
      ctx.lineTo(projTip.x, projTip.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw projection vector
    if (magB > 0 && Math.abs(projAonB) > 0.1) {
      drawArrow(ctx, 0, 0, projVecX, projVecY, '#f59e0b', 'proj', 2, true);
    }

    // Draw vectors
    drawArrow(ctx, 0, 0, ax, ay, '#dc2626', 'A', 3);
    drawArrow(ctx, 0, 0, bx, by, '#2563eb', 'B', 3);

    // Origin
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [ax, ay, bx, by, magA, magB, projVecX, projVecY, projAonB, canvasSize, drawArrow, toCanvas, origin]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Canvas */}
        <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Vector A */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Vecteur A (rouge)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Ax</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={ax}
                  onChange={(e) => setAx(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{ax}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Ay</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={ay}
                  onChange={(e) => setAy(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{ay}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-red-600">|A| = {magA.toFixed(2)}</p>
          </div>

          {/* Vector B */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">Vecteur B (bleu)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Bx</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={bx}
                  onChange={(e) => setBx(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{bx}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">By</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={by}
                  onChange={(e) => setBy(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{by}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-blue-600">|B| = {magB.toFixed(2)}</p>
          </div>

          {/* Results */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">Résultats</h3>
            <div className="space-y-2 text-purple-700">
              <p className="font-mono text-lg">
                A · B = {ax}×{bx} + {ay}×{by} = <strong>{dotProduct}</strong>
              </p>
              <p>
                Angle θ = <strong>{thetaDeg.toFixed(1)}°</strong> ({theta.toFixed(3)} rad)
              </p>
              <p className="text-sm">
                Projection de A sur B = <strong>{projAonB.toFixed(2)}</strong>
              </p>
              <div className={`mt-2 text-sm p-2 rounded ${
                dotProduct > 0 ? 'bg-green-100 text-green-800' :
                dotProduct < 0 ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {dotProduct > 0 && 'Les vecteurs pointent dans la même direction générale (angle aigu)'}
                {dotProduct < 0 && 'Les vecteurs pointent dans des directions opposées (angle obtus)'}
                {dotProduct === 0 && 'Les vecteurs sont perpendiculaires (angle = 90°)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulas */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Formules du produit scalaire</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Forme algébrique:</p>
            <BlockMath math="\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Forme géométrique:</p>
            <BlockMath math="\vec{A} \cdot \vec{B} = |\vec{A}| \cdot |\vec{B}| \cdot \cos\theta" />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p>Le produit scalaire donne un scalaire (nombre), pas un vecteur. Il mesure à quel point deux vecteurs pointent dans la même direction.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CROSS PRODUCT SIMULATOR
// ============================================
function CrossProductSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });

  // Vector A (position vector r)
  const [ax, setAx] = useState(3);
  const [ay, setAy] = useState(1);

  // Vector B (force vector F)
  const [bx, setBx] = useState(1);
  const [by, setBy] = useState(3);

  // Show as moment of force application
  const [showMomentApplication, setShowMomentApplication] = useState(true);

  // Calculations
  // For 2D vectors, cross product gives a scalar (z-component)
  // A × B = Ax*By - Ay*Bx
  const crossProduct = ax * by - ay * bx;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);

  // Angle between vectors
  const angleA = Math.atan2(ay, ax);
  const angleB = Math.atan2(by, bx);
  let angleBetween = angleB - angleA;
  // Normalize to [-π, π]
  while (angleBetween > Math.PI) angleBetween -= 2 * Math.PI;
  while (angleBetween < -Math.PI) angleBetween += 2 * Math.PI;
  const sinTheta = Math.sin(angleBetween);
  const thetaDeg = (angleBetween * 180) / Math.PI;

  // Area of parallelogram = |A × B|
  const parallelogramArea = Math.abs(crossProduct);

  const scale = 40;
  const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  const toCanvas = useCallback(
    (x: number, y: number) => ({
      x: origin.x + x * scale,
      y: origin.y - y * scale,
    }),
    [origin, scale]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      color: string,
      label: string,
      lineWidth: number = 3
    ) => {
      const from = toCanvas(fromX, fromY);
      const to = toCanvas(toX, toY);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;

      const angle = Math.atan2(dy, dx);
      const headLength = 12;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headLength * Math.cos(angle - Math.PI / 6),
        to.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to.x - headLength * Math.cos(angle + Math.PI / 6),
        to.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(label, midX + 10, midY - 10);
    },
    [toCanvas]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.height);
    gradient.addColorStop(0, '#fef3c7');
    gradient.addColorStop(1, '#fef9c3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1;

    for (let x = -10; x <= 10; x++) {
      const { x: cx } = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvasSize.height);
      ctx.stroke();
    }
    for (let y = -10; y <= 10; y++) {
      const { y: cy } = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvasSize.width, cy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvasSize.width, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvasSize.height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#92400e';
    ctx.font = '14px system-ui';
    ctx.fillText('x', canvasSize.width - 20, origin.y - 10);
    ctx.fillText('y', origin.x + 10, 20);

    // Tick marks
    ctx.font = '12px system-ui';
    for (let i = -6; i <= 6; i++) {
      if (i !== 0) {
        const { x: cx } = toCanvas(i, 0);
        const { y: cy } = toCanvas(0, i);
        ctx.fillText(i.toString(), cx - 5, origin.y + 18);
        ctx.fillText(i.toString(), origin.x + 8, cy + 4);
      }
    }

    // Draw parallelogram (area = |A × B|)
    const o = toCanvas(0, 0);
    const a = toCanvas(ax, ay);
    const b = toCanvas(bx, by);
    const ab = toCanvas(ax + bx, ay + by);

    ctx.fillStyle = crossProduct >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(ab.x, ab.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = crossProduct >= 0 ? '#22c55e' : '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle arc
    if (magA > 0.1 && magB > 0.1) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const arcRadius = 35;
      const startAngle = -angleA;
      const endAngle = -angleB;
      ctx.arc(origin.x, origin.y, arcRadius, startAngle, endAngle, crossProduct > 0);
      ctx.stroke();

      // Angle label
      const midAngle = (angleA + angleB) / 2;
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = '#f97316';
      ctx.fillText('θ', origin.x + 50 * Math.cos(midAngle), origin.y - 50 * Math.sin(midAngle));
    }

    // Draw vectors
    if (showMomentApplication) {
      drawArrow(ctx, 0, 0, ax, ay, '#2563eb', 'r', 3); // Position vector
      drawArrow(ctx, ax, ay, ax + bx, ay + by, '#dc2626', 'F', 3); // Force at end of r
    } else {
      drawArrow(ctx, 0, 0, ax, ay, '#2563eb', 'A', 3);
      drawArrow(ctx, 0, 0, bx, by, '#dc2626', 'B', 3);
    }

    // Draw rotation direction indicator
    if (Math.abs(crossProduct) > 0.1) {
      const indicatorRadius = 25;
      const indicatorX = origin.x;
      const indicatorY = origin.y - 80;

      ctx.strokeStyle = crossProduct > 0 ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (crossProduct > 0) {
        // Counter-clockwise
        ctx.arc(indicatorX, indicatorY, indicatorRadius, Math.PI * 0.5, -Math.PI * 0.5, true);
      } else {
        // Clockwise
        ctx.arc(indicatorX, indicatorY, indicatorRadius, -Math.PI * 0.5, Math.PI * 0.5, true);
      }
      ctx.stroke();

      // Arrow head on arc
      const arrowAngle = crossProduct > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      const arrowX = indicatorX + indicatorRadius * Math.cos(arrowAngle);
      const arrowY = indicatorY + indicatorRadius * Math.sin(arrowAngle);
      ctx.fillStyle = crossProduct > 0 ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      if (crossProduct > 0) {
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX + 8, arrowY + 8);
        ctx.lineTo(arrowX - 4, arrowY + 10);
      } else {
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX + 8, arrowY - 8);
        ctx.lineTo(arrowX - 4, arrowY - 10);
      }
      ctx.closePath();
      ctx.fill();

      // Z-axis indicator (into or out of screen)
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = crossProduct > 0 ? '#22c55e' : '#ef4444';
      const zLabel = crossProduct > 0 ? '⊙ +z (sort)' : '⊗ -z (entre)';
      ctx.fillText(zLabel, indicatorX - 35, indicatorY + 50);
    }

    // Origin
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Application point for moment
    if (showMomentApplication) {
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [ax, ay, bx, by, crossProduct, magA, magB, angleA, angleB, showMomentApplication, canvasSize, drawArrow, toCanvas, origin]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Canvas */}
        <div className="border-2 border-amber-200 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showMomentApplication}
                onChange={(e) => setShowMomentApplication(e.target.checked)}
                className="w-5 h-5 accent-amber-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Afficher comme moment de force (M = r × F)
              </span>
            </label>
          </div>

          {/* Vector A / r */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">
              {showMomentApplication ? 'Vecteur position r (bleu)' : 'Vecteur A (bleu)'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  {showMomentApplication ? 'rx' : 'Ax'}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={ax}
                  onChange={(e) => setAx(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{ax}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  {showMomentApplication ? 'ry' : 'Ay'}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={ay}
                  onChange={(e) => setAy(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono text-blue-600">{ay}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-blue-600">
              |{showMomentApplication ? 'r' : 'A'}| = {magA.toFixed(2)}
            </p>
          </div>

          {/* Vector B / F */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">
              {showMomentApplication ? 'Vecteur force F (rouge)' : 'Vecteur B (rouge)'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  {showMomentApplication ? 'Fx' : 'Bx'}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={bx}
                  onChange={(e) => setBx(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{bx}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  {showMomentApplication ? 'Fy' : 'By'}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={by}
                  onChange={(e) => setBy(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-sm font-mono text-red-600">{by}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-red-600">
              |{showMomentApplication ? 'F' : 'B'}| = {magB.toFixed(2)}
            </p>
          </div>

          {/* Results */}
          <div className={`p-4 rounded-lg border-2 ${
            crossProduct > 0
              ? 'bg-green-50 border-green-300'
              : crossProduct < 0
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-300'
          }`}>
            <h3 className="font-semibold text-gray-800 mb-2">
              {showMomentApplication ? 'Moment de force' : 'Produit vectoriel'}
            </h3>
            <div className="space-y-2">
              <p className="font-mono text-lg">
                {showMomentApplication ? 'M = r × F' : 'A × B'} = {ax}×{by} - {ay}×{bx} = <strong className={
                  crossProduct > 0 ? 'text-green-700' : crossProduct < 0 ? 'text-red-700' : 'text-gray-700'
                }>{crossProduct.toFixed(2)}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Angle θ = {thetaDeg.toFixed(1)}°
              </p>
              <p className="text-sm text-gray-600">
                Aire du parallélogramme = {parallelogramArea.toFixed(2)}
              </p>
              <div className={`mt-2 text-sm p-2 rounded ${
                crossProduct > 0 ? 'bg-green-100 text-green-800' :
                crossProduct < 0 ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {crossProduct > 0 && (showMomentApplication
                  ? 'Moment positif → rotation antihoraire (⊙ sort de l\'écran)'
                  : 'Résultat positif → direction +z (sort de l\'écran)')}
                {crossProduct < 0 && (showMomentApplication
                  ? 'Moment négatif → rotation horaire (⊗ entre dans l\'écran)'
                  : 'Résultat négatif → direction -z (entre dans l\'écran)')}
                {crossProduct === 0 && 'Vecteurs parallèles ou colinéaires → produit nul'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulas */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Formules du produit vectoriel</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Forme algébrique (2D → scalaire):</p>
            <BlockMath math="\vec{A} \times \vec{B} = A_x B_y - A_y B_x" />
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Forme géométrique:</p>
            <BlockMath math="|\vec{A} \times \vec{B}| = |\vec{A}| \cdot |\vec{B}| \cdot \sin\theta" />
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-2">Application: Moment de force</h4>
          <BlockMath math="\vec{M} = \vec{r} \times \vec{F}" />
          <p className="text-sm text-amber-700 mt-2">
            Le moment de force (ou couple) est le produit vectoriel du vecteur position r (du point de rotation au point d'application)
            par le vecteur force F. En 2D, le résultat est un scalaire représentant la composante z du moment.
          </p>
        </div>

        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-sm font-medium text-gray-700">Propriétés:</p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• Anti-commutatif: A×B = -B×A</li>
              <li>• Non associatif</li>
              <li>• Distributif</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-sm font-medium text-gray-700">Direction (règle main droite):</p>
            <p className="text-xs text-gray-600 mt-1">
              Doigts de A vers B → pouce indique la direction du résultat (perpendiculaire au plan)
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-sm font-medium text-gray-700">Interprétation géométrique:</p>
            <p className="text-xs text-gray-600 mt-1">
              |A×B| = aire du parallélogramme formé par A et B
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CARTESIAN ↔ POLAR CONVERTER
// ============================================
function CartesianPolarConverter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });

  // Mode: edit cartesian or polar
  const [editMode, setEditMode] = useState<'cartesian' | 'polar'>('cartesian');

  // Cartesian coordinates
  const [x, setX] = useState(3);
  const [y, setY] = useState(4);

  // Calculated polar
  const r = Math.sqrt(x * x + y * y);
  const thetaRad = Math.atan2(y, x);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  // For polar input mode
  const [polarR, setPolarR] = useState(5);
  const [polarTheta, setPolarTheta] = useState(53.13); // degrees

  // Sync based on edit mode
  useEffect(() => {
    if (editMode === 'polar') {
      const radians = (polarTheta * Math.PI) / 180;
      setX(parseFloat((polarR * Math.cos(radians)).toFixed(2)));
      setY(parseFloat((polarR * Math.sin(radians)).toFixed(2)));
    }
  }, [editMode, polarR, polarTheta]);

  useEffect(() => {
    if (editMode === 'cartesian') {
      setPolarR(parseFloat(r.toFixed(2)));
      setPolarTheta(parseFloat(thetaDeg.toFixed(2)));
    }
  }, [editMode, r, thetaDeg]);

  const scale = 40;
  const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  const toCanvas = useCallback(
    (px: number, py: number) => ({
      x: origin.x + px * scale,
      y: origin.y - py * scale,
    }),
    [origin, scale]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 1;

    for (let gx = -10; gx <= 10; gx++) {
      const { x: cx } = toCanvas(gx, 0);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvasSize.height);
      ctx.stroke();
    }
    for (let gy = -10; gy <= 10; gy++) {
      const { y: cy } = toCanvas(0, gy);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvasSize.width, cy);
      ctx.stroke();
    }

    // Draw polar circles
    ctx.strokeStyle = '#86efac';
    ctx.setLineDash([3, 3]);
    for (let cr = 1; cr <= 6; cr++) {
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, cr * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvasSize.width, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvasSize.height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#166534';
    ctx.font = '14px system-ui';
    ctx.fillText('x', canvasSize.width - 20, origin.y - 10);
    ctx.fillText('y', origin.x + 10, 20);

    // Tick marks
    ctx.font = '12px system-ui';
    for (let i = -6; i <= 6; i++) {
      if (i !== 0) {
        const { x: cx } = toCanvas(i, 0);
        const { y: cy } = toCanvas(0, i);
        ctx.fillText(i.toString(), cx - 5, origin.y + 18);
        ctx.fillText(i.toString(), origin.x + 8, cy + 4);
      }
    }

    const point = toCanvas(x, y);

    // Draw angle arc
    if (r > 0.1) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const arcRadius = 30;
      if (thetaRad >= 0) {
        ctx.arc(origin.x, origin.y, arcRadius, 0, -thetaRad, true);
      } else {
        ctx.arc(origin.x, origin.y, arcRadius, 0, -thetaRad, false);
      }
      ctx.stroke();

      // Angle label
      const labelAngle = thetaRad / 2;
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = '#f97316';
      ctx.fillText('θ', origin.x + 45 * Math.cos(labelAngle), origin.y - 45 * Math.sin(labelAngle));
    }

    // Draw x component
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    const xEnd = toCanvas(x, 0);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xEnd.x, xEnd.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw r (vector from origin to point)
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(origin.y - point.y, point.x - origin.x);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(
      point.x - 12 * Math.cos(angle - Math.PI / 6),
      point.y + 12 * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      point.x - 12 * Math.cos(angle + Math.PI / 6),
      point.y + 12 * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Labels
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#16a34a';
    ctx.fillText('r', (origin.x + point.x) / 2 - 15, (origin.y + point.y) / 2 - 10);

    ctx.fillStyle = '#dc2626';
    ctx.fillText('x', (origin.x + xEnd.x) / 2, origin.y + 20);
    ctx.fillText('y', point.x + 10, (origin.y + point.y) / 2);

    // Point
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Origin
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [x, y, r, thetaRad, canvasSize, toCanvas, origin, scale]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Canvas */}
        <div className="border-2 border-green-200 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode('cartesian')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                editMode === 'cartesian'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Modifier Cartésien
            </button>
            <button
              onClick={() => setEditMode('polar')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                editMode === 'polar'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Modifier Polaire
            </button>
          </div>

          {/* Cartesian controls */}
          <div className={`p-4 rounded-lg border-2 ${
            editMode === 'cartesian' ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className="font-semibold text-blue-800 mb-3">
              Coordonnées Cartésiennes (x, y)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">x</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.25"
                  value={x}
                  onChange={(e) => {
                    if (editMode === 'cartesian') {
                      setX(parseFloat(e.target.value));
                    }
                  }}
                  disabled={editMode !== 'cartesian'}
                  className="w-full accent-blue-600"
                />
                <span className="text-lg font-mono text-blue-600">{x}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">y</label>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.25"
                  value={y}
                  onChange={(e) => {
                    if (editMode === 'cartesian') {
                      setY(parseFloat(e.target.value));
                    }
                  }}
                  disabled={editMode !== 'cartesian'}
                  className="w-full accent-blue-600"
                />
                <span className="text-lg font-mono text-blue-600">{y}</span>
              </div>
            </div>
          </div>

          {/* Polar controls */}
          <div className={`p-4 rounded-lg border-2 ${
            editMode === 'polar' ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className="font-semibold text-orange-800 mb-3">
              Coordonnées Polaires (r, θ)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-700 mb-1">r (rayon)</label>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.25"
                  value={editMode === 'polar' ? polarR : r}
                  onChange={(e) => {
                    if (editMode === 'polar') {
                      setPolarR(parseFloat(e.target.value));
                    }
                  }}
                  disabled={editMode !== 'polar'}
                  className="w-full accent-orange-600"
                />
                <span className="text-lg font-mono text-orange-600">
                  {editMode === 'polar' ? polarR : r.toFixed(2)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-700 mb-1">θ (degrés)</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={editMode === 'polar' ? polarTheta : thetaDeg}
                  onChange={(e) => {
                    if (editMode === 'polar') {
                      setPolarTheta(parseFloat(e.target.value));
                    }
                  }}
                  disabled={editMode !== 'polar'}
                  className="w-full accent-orange-600"
                />
                <span className="text-lg font-mono text-orange-600">
                  {editMode === 'polar' ? polarTheta : thetaDeg.toFixed(1)}°
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Équivalences</h3>
            <div className="grid grid-cols-2 gap-4 text-green-700">
              <div>
                <p className="text-sm text-green-600">Cartésien:</p>
                <p className="font-mono text-lg">({x}, {y})</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Polaire:</p>
                <p className="font-mono text-lg">({r.toFixed(2)}, {thetaDeg.toFixed(1)}°)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulas */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Formules de conversion</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">Cartésien → Polaire:</p>
            <BlockMath math="r = \sqrt{x^2 + y^2}" />
            <BlockMath math="\theta = \arctan\left(\frac{y}{x}\right)" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">Polaire → Cartésien:</p>
            <BlockMath math="x = r \cos\theta" />
            <BlockMath math="y = r \sin\theta" />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p>Les coordonnées polaires utilisent la distance à l'origine (r) et l'angle par rapport à l'axe x positif (θ). Attention au quadrant lors du calcul de θ !</p>
        </div>
      </div>
    </div>
  );
}

export default VectorSimulator;
