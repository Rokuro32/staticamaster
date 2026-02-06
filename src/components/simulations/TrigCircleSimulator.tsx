'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

// Special angles in degrees
const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

// Quadrant information
const QUADRANTS = [
  { name: 'I', range: '0° - 90°', sin: '+', cos: '+', tan: '+', color: '#22c55e' },
  { name: 'II', range: '90° - 180°', sin: '+', cos: '−', tan: '−', color: '#3b82f6' },
  { name: 'III', range: '180° - 270°', sin: '−', cos: '−', tan: '+', color: '#f59e0b' },
  { name: 'IV', range: '270° - 360°', sin: '−', cos: '+', tan: '−', color: '#ef4444' },
];

export function TrigCircleSimulator() {
  const [angle, setAngle] = useState(45); // Angle in degrees
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(30); // degrees per second
  const [showProjections, setShowProjections] = useState(true);
  const [showTriangle, setShowTriangle] = useState(true);
  const [showTangent, setShowTangent] = useState(false);
  const [showAllQuadrants, setShowAllQuadrants] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const canvasSize = 400;
  const graphWidth = 350;
  const graphHeight = 150;

  // Convert degrees to radians
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  // Get current quadrant (1-4)
  const getQuadrant = (deg: number) => {
    const normalizedAngle = ((deg % 360) + 360) % 360;
    if (normalizedAngle < 90) return 1;
    if (normalizedAngle < 180) return 2;
    if (normalizedAngle < 270) return 3;
    return 4;
  };

  // Calculate trig values
  const rad = toRadians(angle);
  const sinValue = Math.sin(rad);
  const cosValue = Math.cos(rad);
  const tanValue = Math.abs(cosValue) < 0.0001 ? Infinity : Math.tan(rad);

  // Animation loop
  useEffect(() => {
    if (isAnimating) {
      lastTimeRef.current = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        setAngle(prev => (prev + animationSpeed * dt) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, animationSpeed]);

  // Draw the unit circle
  const drawCircle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = canvasSize * 0.38;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw quadrant backgrounds
    if (showAllQuadrants) {
      const quadrantColors = ['#dcfce7', '#dbeafe', '#fef3c7', '#fee2e2'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = quadrantColors[i] + '60';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius + 10, -Math.PI / 2 + (i * Math.PI) / 2, -Math.PI / 2 + ((i + 1) * Math.PI) / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i += 0.5) {
      if (i === 0) continue;
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 20, centerY - i * radius);
      ctx.lineTo(centerX + radius + 20, centerY - i * radius);
      ctx.stroke();
      // Vertical
      ctx.beginPath();
      ctx.moveTo(centerX + i * radius, centerY - radius - 20);
      ctx.lineTo(centerX + i * radius, centerY + radius + 20);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    // X axis
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 30, centerY);
    ctx.lineTo(centerX + radius + 30, centerY);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 30);
    ctx.lineTo(centerX, centerY + radius + 30);
    ctx.stroke();

    // Axis arrows
    ctx.fillStyle = '#374151';
    // X arrow
    ctx.beginPath();
    ctx.moveTo(centerX + radius + 30, centerY);
    ctx.lineTo(centerX + radius + 20, centerY - 5);
    ctx.lineTo(centerX + radius + 20, centerY + 5);
    ctx.closePath();
    ctx.fill();
    // Y arrow
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 30);
    ctx.lineTo(centerX - 5, centerY - radius - 20);
    ctx.lineTo(centerX + 5, centerY - radius - 20);
    ctx.closePath();
    ctx.fill();

    // Axis labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('x', centerX + radius + 40, centerY + 5);
    ctx.fillText('y', centerX + 5, centerY - radius - 35);

    // Draw unit circle
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw special angle markers
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px system-ui';
    for (const deg of [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]) {
      const r = toRadians(deg);
      const x = centerX + Math.cos(r) * radius;
      const y = centerY - Math.sin(r) * radius;

      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw angle arc
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, -rad, rad > 0);
    ctx.stroke();

    // Angle label
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 12px system-ui';
    const labelAngle = rad / 2;
    const labelRadius = 55;
    ctx.fillText(`${angle.toFixed(0)}°`, centerX + Math.cos(-labelAngle) * labelRadius, centerY + Math.sin(-labelAngle) * labelRadius);

    // Calculate point position
    const pointX = centerX + cosValue * radius;
    const pointY = centerY - sinValue * radius;

    // Draw right triangle
    if (showTriangle) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(pointX, centerY);
      ctx.lineTo(pointX, pointY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw projections
    if (showProjections) {
      // Cosine projection (horizontal)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(pointX, centerY);
      ctx.stroke();

      // Sine projection (vertical)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pointX, centerY);
      ctx.lineTo(pointX, pointY);
      ctx.stroke();

      // Labels
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('cos θ', (centerX + pointX) / 2, centerY + 18);

      ctx.fillStyle = '#ef4444';
      ctx.save();
      ctx.translate(pointX + 15, (centerY + pointY) / 2);
      ctx.fillText('sin θ', 0, 4);
      ctx.restore();
    }

    // Draw tangent line
    if (showTangent && Math.abs(cosValue) > 0.01) {
      const tanLength = Math.min(Math.abs(tanValue), 3) * radius;
      const tanY = centerY - tanLength * Math.sign(tanValue);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX + radius, centerY);
      ctx.lineTo(centerX + radius, tanY);
      ctx.stroke();

      // Tangent label
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      if (Math.abs(tanValue) < 10) {
        ctx.fillText('tan θ', centerX + radius + 5, (centerY + tanY) / 2);
      }

      // Line from origin through point to tangent
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius, tanY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw radius line
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointX, pointY);
    ctx.stroke();

    // Draw point on circle
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(pointX, pointY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Point coordinates
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    const coordX = pointX + 12;
    const coordY = pointY - 12;
    ctx.fillText(`(${cosValue.toFixed(2)}, ${sinValue.toFixed(2)})`, coordX, coordY);

    // Draw scale markers
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('1', centerX + radius, centerY + 15);
    ctx.fillText('-1', centerX - radius, centerY + 15);
    ctx.fillText('1', centerX - 12, centerY - radius);
    ctx.fillText('-1', centerX - 15, centerY + radius);
    ctx.fillText('0', centerX - 12, centerY + 15);

    // Quadrant labels
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('I', centerX + radius * 0.6, centerY - radius * 0.7);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('II', centerX - radius * 0.6, centerY - radius * 0.7);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('III', centerX - radius * 0.6, centerY + radius * 0.75);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('IV', centerX + radius * 0.6, centerY + radius * 0.75);

  }, [angle, cosValue, sinValue, showProjections, showTriangle, showTangent, showAllQuadrants, tanValue]);

  // Draw sine/cosine graphs
  const drawGraphs = useCallback(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { left: 40, right: 20, top: 20, bottom: 30 };
    const width = graphWidth - padding.left - padding.right;
    const height = graphHeight - padding.top - padding.bottom;
    const centerY = padding.top + height / 2;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, graphWidth, graphHeight);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = -1; i <= 1; i += 0.5) {
      const y = centerY - i * (height / 2);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(graphWidth - padding.right, y);
      ctx.stroke();
    }

    // Vertical lines (every 90°)
    for (let deg = 0; deg <= 360; deg += 90) {
      const x = padding.left + (deg / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, graphHeight - padding.bottom);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding.left, centerY);
    ctx.lineTo(graphWidth - padding.right, centerY);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, graphHeight - padding.bottom);
    ctx.stroke();

    // Draw cosine curve
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const x = padding.left + (i / 360) * width;
      const y = centerY - Math.cos(toRadians(i)) * (height / 2) * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw sine curve
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const x = padding.left + (i / 360) * width;
      const y = centerY - Math.sin(toRadians(i)) * (height / 2) * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current angle marker
    const currentX = padding.left + (((angle % 360) + 360) % 360 / 360) * width;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(currentX, padding.top);
    ctx.lineTo(currentX, graphHeight - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current points
    const cosY = centerY - cosValue * (height / 2) * 0.9;
    const sinY = centerY - sinValue * (height / 2) * 0.9;

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(currentX, cosY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(currentX, sinY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('0°', padding.left, graphHeight - 10);
    ctx.fillText('90°', padding.left + width * 0.25, graphHeight - 10);
    ctx.fillText('180°', padding.left + width * 0.5, graphHeight - 10);
    ctx.fillText('270°', padding.left + width * 0.75, graphHeight - 10);
    ctx.fillText('360°', padding.left + width, graphHeight - 10);

    ctx.textAlign = 'right';
    ctx.fillText('1', padding.left - 5, padding.top + 10);
    ctx.fillText('0', padding.left - 5, centerY + 4);
    ctx.fillText('-1', padding.left - 5, graphHeight - padding.bottom);

    // Legend
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('cos θ', graphWidth - 60, padding.top + 15);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('sin θ', graphWidth - 60, padding.top + 30);

  }, [angle, cosValue, sinValue]);

  // Draw all
  useEffect(() => {
    drawCircle();
    drawGraphs();
  }, [drawCircle, drawGraphs]);

  const currentQuadrant = getQuadrant(angle);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <div>
            <h3 className="font-bold text-gray-800">Cercle trigonométrique</h3>
            <p className="text-xs text-gray-600">
              Visualisez les relations entre sinus, cosinus et tangente selon l'angle
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {/* Left: Circle */}
          <div className="flex-shrink-0">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                className="cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - canvasSize / 2;
                  const y = -(e.clientY - rect.top - canvasSize / 2);
                  const newAngle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                  setAngle(newAngle);
                }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">
              Cliquez sur le cercle pour changer l'angle
            </p>
          </div>

          {/* Right: Controls and values */}
          <div className="flex-1 space-y-4">
            {/* Current values */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 font-medium mb-1">Cosinus</div>
                <div className="text-xl font-bold text-green-700">{cosValue.toFixed(4)}</div>
                <div className="text-xs text-green-600 mt-1">
                  {cosValue >= 0 ? '(+)' : '(−)'}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-xs text-red-600 font-medium mb-1">Sinus</div>
                <div className="text-xl font-bold text-red-700">{sinValue.toFixed(4)}</div>
                <div className="text-xs text-red-600 mt-1">
                  {sinValue >= 0 ? '(+)' : '(−)'}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-600 font-medium mb-1">Tangente</div>
                <div className="text-xl font-bold text-amber-700">
                  {Math.abs(tanValue) > 1000 ? '±∞' : tanValue.toFixed(4)}
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  {Math.abs(tanValue) > 1000 ? 'indéfini' : tanValue >= 0 ? '(+)' : '(−)'}
                </div>
              </div>
            </div>

            {/* Angle control */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">Angle θ</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-indigo-600">{angle.toFixed(1)}°</span>
                  <span className="text-sm text-gray-500">
                    ({(angle * Math.PI / 180).toFixed(3)} rad)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={angle}
                onChange={(e) => setAngle(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-5"
              />

              {/* Special angle buttons */}
              <div className="flex flex-wrap gap-1 mt-2">
                {[0, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360].map(deg => (
                  <button
                    key={deg}
                    onClick={() => setAngle(deg)}
                    className={cn(
                      "px-2 py-1 text-[10px] rounded transition-colors",
                      Math.abs(angle - deg) < 1
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 border hover:bg-gray-100"
                    )}
                  >
                    {deg}°
                  </button>
                ))}
              </div>

              {/* Animation controls */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                    isAnimating
                      ? "bg-red-500 text-white"
                      : "bg-indigo-500 text-white hover:bg-indigo-600"
                  )}
                >
                  {isAnimating ? '⏸ Pause' : '▶ Animer'}
                </button>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-xs text-gray-500">{animationSpeed}°/s</span>
              </div>
            </div>

            {/* Display options */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-bold text-gray-700 mb-2">Affichage</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProjections}
                    onChange={(e) => setShowProjections(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Projections sin/cos
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTriangle}
                    onChange={(e) => setShowTriangle(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Triangle rectangle
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTangent}
                    onChange={(e) => setShowTangent(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Tangente
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllQuadrants}
                    onChange={(e) => setShowAllQuadrants(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Couleurs quadrants
                </label>
              </div>
            </div>

            {/* Current quadrant info */}
            <div
              className="border rounded-lg p-3"
              style={{
                backgroundColor: QUADRANTS[currentQuadrant - 1].color + '15',
                borderColor: QUADRANTS[currentQuadrant - 1].color + '40'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold" style={{ color: QUADRANTS[currentQuadrant - 1].color }}>
                    Quadrant {QUADRANTS[currentQuadrant - 1].name}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({QUADRANTS[currentQuadrant - 1].range})
                  </span>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span>
                  <span className="text-green-600 font-medium">cos: </span>
                  <span className="font-bold">{QUADRANTS[currentQuadrant - 1].cos}</span>
                </span>
                <span>
                  <span className="text-red-600 font-medium">sin: </span>
                  <span className="font-bold">{QUADRANTS[currentQuadrant - 1].sin}</span>
                </span>
                <span>
                  <span className="text-amber-600 font-medium">tan: </span>
                  <span className="font-bold">{QUADRANTS[currentQuadrant - 1].tan}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sine/Cosine graph */}
        <div className="mt-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <canvas
              ref={graphCanvasRef}
              width={graphWidth}
              height={graphHeight}
              className="w-full"
            />
          </div>
        </div>

        {/* Quadrant summary table */}
        <div className="mt-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Signes par quadrant</h4>
          <div className="grid grid-cols-4 gap-2">
            {QUADRANTS.map((q, i) => (
              <div
                key={q.name}
                className={cn(
                  "rounded-lg p-2 text-center border-2 transition-all",
                  currentQuadrant === i + 1 ? "ring-2 ring-offset-1" : ""
                )}
                style={{
                  backgroundColor: q.color + '15',
                  borderColor: q.color + '40',
                  ringColor: q.color
                }}
              >
                <div className="font-bold text-sm" style={{ color: q.color }}>
                  {q.name}
                </div>
                <div className="text-[10px] text-gray-500">{q.range}</div>
                <div className="mt-1 space-y-0.5 text-xs">
                  <div><span className="text-green-600">cos:</span> <span className="font-bold">{q.cos}</span></div>
                  <div><span className="text-red-600">sin:</span> <span className="font-bold">{q.sin}</span></div>
                  <div><span className="text-amber-600">tan:</span> <span className="font-bold">{q.tan}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulas */}
        <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
          <h4 className="text-sm font-bold text-indigo-900 mb-3">Relations fondamentales</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="bg-white px-3 py-2 rounded border shadow-sm">
                <InlineMath math="\cos^2\theta + \sin^2\theta = 1" />
              </div>
              <div className="bg-white px-3 py-2 rounded border shadow-sm">
                <InlineMath math="\tan\theta = \frac{\sin\theta}{\cos\theta}" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-white px-3 py-2 rounded border shadow-sm">
                <InlineMath math="\cos(-\theta) = \cos\theta" />
              </div>
              <div className="bg-white px-3 py-2 rounded border shadow-sm">
                <InlineMath math="\sin(-\theta) = -\sin\theta" />
              </div>
            </div>
          </div>

          {/* Verification of identity */}
          <div className="mt-3 p-2 bg-white rounded border">
            <p className="text-xs text-gray-600">
              Vérification: <InlineMath math={`\\cos^2(${angle.toFixed(0)}°) + \\sin^2(${angle.toFixed(0)}°) = ${(cosValue*cosValue + sinValue*sinValue).toFixed(6)}`} /> ≈ 1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrigCircleSimulator;
