'use client';

import { useState, useRef, useCallback } from 'react';
import { BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

interface Force {
  id: string;
  name: string;
  magnitude: number;
  angle: number; // degrees
  color: string;
  applicationPoint: { x: number; y: number };
}

type SimulationMode = 'freePlace' | 'boxCenter';

export function ForceAdditionSimulator() {
  const [mode, setMode] = useState<SimulationMode>('boxCenter');

  const modes: { id: SimulationMode; label: string; description: string }[] = [
    { id: 'boxCenter', label: 'Forces sur une boite', description: 'Placez des forces sur une boite et voyez la résultante' },
    { id: 'freePlace', label: 'Placement libre', description: 'Placez des forces librement sur le canvas' },
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
        {mode === 'boxCenter' && <BoxForceSimulator />}
        {mode === 'freePlace' && <FreePlaceForceSimulator />}
      </div>
    </div>
  );
}

// ============================================
// BOX FORCE SIMULATOR
// ============================================
function BoxForceSimulator() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });
  const [forces, setForces] = useState<Force[]>([]);
  const [selectedForce, setSelectedForce] = useState<string | null>(null);
  const [pendingForce, setPendingForce] = useState<Omit<Force, 'id' | 'applicationPoint'> | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Box dimensions and position
  const boxWidth = 120;
  const boxHeight = 80;
  const boxCenter = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  // Grid settings
  const gridSize = 20;

  // Calculate resultant force
  const resultant = forces.reduce(
    (acc, f) => {
      const rad = (f.angle * Math.PI) / 180;
      return {
        x: acc.x + f.magnitude * Math.cos(rad),
        y: acc.y + f.magnitude * Math.sin(rad),
      };
    },
    { x: 0, y: 0 }
  );

  const resultantMagnitude = Math.sqrt(resultant.x ** 2 + resultant.y ** 2);
  const resultantAngle = (Math.atan2(resultant.y, resultant.x) * 180) / Math.PI;

  // Predefined forces
  const forceOptions = [
    { name: 'F1', magnitude: 100, angle: 0, color: '#dc2626', label: 'Force 1 (droite)' },
    { name: 'F2', magnitude: 100, angle: 90, color: '#2563eb', label: 'Force 2 (haut)' },
    { name: 'F3', magnitude: 100, angle: 180, color: '#16a34a', label: 'Force 3 (gauche)' },
    { name: 'F4', magnitude: 100, angle: 270, color: '#9333ea', label: 'Force 4 (bas)' },
    { name: 'F5', magnitude: 100, angle: 45, color: '#f59e0b', label: 'Force 5 (45°)' },
    { name: 'F6', magnitude: 100, angle: 135, color: '#ec4899', label: 'Force 6 (135°)' },
  ];

  const snapToGrid = (point: { x: number; y: number }) => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  });

  const handleSelectForce = (force: Omit<Force, 'id' | 'applicationPoint'>) => {
    setPendingForce(force);
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!pendingForce) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const snapped = snapToGrid({ x, y });

    const newForce: Force = {
      ...pendingForce,
      id: `force-${Date.now()}`,
      applicationPoint: snapped,
    };

    setForces([...forces, newForce]);
    setPendingForce(null);
    setMousePos(null);
  }, [pendingForce, forces]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!pendingForce) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos(snapToGrid({ x, y }));
  }, [pendingForce]);

  const handleDeleteForce = (id: string) => {
    setForces(forces.filter(f => f.id !== id));
    setSelectedForce(null);
  };

  const handleRotateForce = (id: string, delta: number) => {
    setForces(forces.map(f =>
      f.id === id ? { ...f, angle: (f.angle + delta + 360) % 360 } : f
    ));
  };

  const handleMagnitudeChange = (id: string, magnitude: number) => {
    setForces(forces.map(f =>
      f.id === id ? { ...f, magnitude } : f
    ));
  };

  const handleClearAll = () => {
    setForces([]);
    setSelectedForce(null);
    setPendingForce(null);
  };

  // Arrow drawing helper
  const drawArrow = (
    startX: number,
    startY: number,
    angle: number,
    length: number,
    color: string,
    strokeWidth: number = 3
  ) => {
    const rad = (-angle * Math.PI) / 180; // Negate for canvas coordinates
    const endX = startX + length * Math.cos(rad);
    const endY = startY + length * Math.sin(rad);

    const headLength = 12;
    const headAngle1 = rad + (Math.PI * 5) / 6;
    const headAngle2 = rad - (Math.PI * 5) / 6;

    return (
      <g>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polygon
          points={`
            ${endX},${endY}
            ${endX + headLength * Math.cos(headAngle1)},${endY + headLength * Math.sin(headAngle1)}
            ${endX + headLength * Math.cos(headAngle2)},${endY + headLength * Math.sin(headAngle2)}
          `}
          fill={color}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className={cn(
            "relative border-2 border-blue-200 rounded-lg overflow-hidden bg-blue-50",
            pendingForce ? "cursor-copy" : "cursor-default"
          )}
          style={{ width: canvasSize.width, height: canvasSize.height }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePos(null)}
        >
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="forceGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#bfdbfe"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#forceGrid)" />

            {/* Box */}
            <rect
              x={boxCenter.x - boxWidth / 2}
              y={boxCenter.y - boxHeight / 2}
              width={boxWidth}
              height={boxHeight}
              fill="#e5e7eb"
              stroke="#374151"
              strokeWidth="3"
              rx="4"
            />
            <text
              x={boxCenter.x}
              y={boxCenter.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-medium fill-gray-600"
            >
              Objet
            </text>

            {/* Placed forces */}
            {forces.map(force => {
              const length = Math.min(force.magnitude * 0.6, 80);
              const isSelected = selectedForce === force.id;
              return (
                <g
                  key={force.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedForce(force.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  {drawArrow(
                    force.applicationPoint.x,
                    force.applicationPoint.y,
                    force.angle,
                    length,
                    force.color,
                    isSelected ? 4 : 3
                  )}
                  <circle
                    cx={force.applicationPoint.x}
                    cy={force.applicationPoint.y}
                    r={isSelected ? 6 : 4}
                    fill={force.color}
                  />
                  <text
                    x={force.applicationPoint.x + (length / 2 + 20) * Math.cos((-force.angle * Math.PI) / 180)}
                    y={force.applicationPoint.y + (length / 2 + 20) * Math.sin((-force.angle * Math.PI) / 180)}
                    textAnchor="middle"
                    className="text-xs font-bold"
                    fill={force.color}
                  >
                    {force.name}
                  </text>
                  {/* Invisible larger click area */}
                  <line
                    x1={force.applicationPoint.x}
                    y1={force.applicationPoint.y}
                    x2={force.applicationPoint.x + length * Math.cos((-force.angle * Math.PI) / 180)}
                    y2={force.applicationPoint.y + length * Math.sin((-force.angle * Math.PI) / 180)}
                    stroke="transparent"
                    strokeWidth="20"
                  />
                </g>
              );
            })}

            {/* Resultant force (green, dashed) */}
            {forces.length > 1 && resultantMagnitude > 0.1 && (
              <g>
                <line
                  x1={boxCenter.x}
                  y1={boxCenter.y}
                  x2={boxCenter.x + (resultantMagnitude * 0.6) * Math.cos((-resultantAngle * Math.PI) / 180)}
                  y2={boxCenter.y + (resultantMagnitude * 0.6) * Math.sin((-resultantAngle * Math.PI) / 180)}
                  stroke="#059669"
                  strokeWidth="4"
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                />
                <polygon
                  points={(() => {
                    const rad = (-resultantAngle * Math.PI) / 180;
                    const length = Math.min(resultantMagnitude * 0.6, 80);
                    const endX = boxCenter.x + length * Math.cos(rad);
                    const endY = boxCenter.y + length * Math.sin(rad);
                    const headLength = 14;
                    const headAngle1 = rad + (Math.PI * 5) / 6;
                    const headAngle2 = rad - (Math.PI * 5) / 6;
                    return `${endX},${endY} ${endX + headLength * Math.cos(headAngle1)},${endY + headLength * Math.sin(headAngle1)} ${endX + headLength * Math.cos(headAngle2)},${endY + headLength * Math.sin(headAngle2)}`;
                  })()}
                  fill="#059669"
                />
                <text
                  x={boxCenter.x + (resultantMagnitude * 0.3 + 25) * Math.cos((-resultantAngle * Math.PI) / 180)}
                  y={boxCenter.y + (resultantMagnitude * 0.3 + 25) * Math.sin((-resultantAngle * Math.PI) / 180)}
                  textAnchor="middle"
                  className="text-sm font-bold fill-emerald-700"
                >
                  R
                </text>
              </g>
            )}

            {/* Preview of pending force */}
            {pendingForce && mousePos && (
              <g opacity={0.5}>
                {drawArrow(
                  mousePos.x,
                  mousePos.y,
                  pendingForce.angle,
                  Math.min(pendingForce.magnitude * 0.6, 80),
                  pendingForce.color
                )}
                <circle cx={mousePos.x} cy={mousePos.y} r={4} fill={pendingForce.color} />
              </g>
            )}
          </svg>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Pending selection indicator */}
          {pendingForce && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Force: {pendingForce.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    Cliquez sur le canvas pour placer
                  </p>
                </div>
                <button
                  onClick={() => setPendingForce(null)}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Force buttons */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">
              Ajouter une force
            </p>
            <div className="grid grid-cols-2 gap-2">
              {forceOptions.map(force => (
                <button
                  key={force.name}
                  onClick={() => handleSelectForce(force)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-colors text-left",
                    pendingForce?.name === force.name
                      ? "border-blue-500 bg-blue-100 ring-2 ring-blue-300"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: force.color }}
                  />
                  <span className="text-sm font-medium">{force.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected force controls */}
          {selectedForce && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                Force sélectionnée: {forces.find(f => f.id === selectedForce)?.name}
              </p>

              {/* Magnitude slider */}
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Magnitude: {forces.find(f => f.id === selectedForce)?.magnitude} N
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={forces.find(f => f.id === selectedForce)?.magnitude || 100}
                  onChange={(e) => handleMagnitudeChange(selectedForce, parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Rotation and delete buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRotateForce(selectedForce, -15)}
                  className="flex-1 p-2 bg-white border border-gray-200 rounded hover:bg-gray-100"
                  title="Rotation -15°"
                >
                  -15°
                </button>
                <button
                  onClick={() => handleRotateForce(selectedForce, 15)}
                  className="flex-1 p-2 bg-white border border-gray-200 rounded hover:bg-gray-100"
                  title="Rotation +15°"
                >
                  +15°
                </button>
                <button
                  onClick={() => handleDeleteForce(selectedForce)}
                  className="p-2 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Clear all button */}
          {forces.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full p-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Tout effacer
            </button>
          )}

          {/* Placed forces list */}
          {forces.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Forces placées
              </p>
              <div className="space-y-1">
                {forces.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                      <span>{f.name}</span>
                    </div>
                    <span className="text-gray-500">{f.magnitude}N @ {f.angle}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Component breakdown */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">Décomposition des forces</h3>
          {forces.length === 0 ? (
            <p className="text-sm text-gray-500">Ajoutez des forces pour voir la décomposition</p>
          ) : (
            <div className="space-y-2">
              {forces.map(f => {
                const rad = (f.angle * Math.PI) / 180;
                const fx = f.magnitude * Math.cos(rad);
                const fy = f.magnitude * Math.sin(rad);
                return (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                    <span className="font-medium w-8">{f.name}:</span>
                    <span className="font-mono">
                      ({fx.toFixed(1)}, {fy.toFixed(1)}) N
                    </span>
                  </div>
                );
              })}
              {forces.length > 1 && (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="w-8">R:</span>
                      <span className="font-mono">
                        ({resultant.x.toFixed(1)}, {resultant.y.toFixed(1)}) N
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Resultant */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <h3 className="font-semibold text-emerald-800 mb-3">Force Résultante</h3>
          {forces.length === 0 ? (
            <p className="text-sm text-emerald-600">Ajoutez des forces pour calculer la résultante</p>
          ) : forces.length === 1 ? (
            <p className="text-sm text-emerald-600">Ajoutez plus de forces pour voir la somme vectorielle</p>
          ) : (
            <div className="space-y-2">
              <p className="text-emerald-700">
                <strong>Magnitude:</strong> |R| = {resultantMagnitude.toFixed(2)} N
              </p>
              <p className="text-emerald-700">
                <strong>Direction:</strong> θ = {resultantAngle.toFixed(1)}°
              </p>
              <p className="text-emerald-700">
                <strong>Composantes:</strong> Rx = {resultant.x.toFixed(2)} N, Ry = {resultant.y.toFixed(2)} N
              </p>
              {resultantMagnitude < 0.1 && (
                <div className="mt-2 p-2 bg-emerald-100 rounded text-sm text-emerald-800">
                  Les forces s'annulent! L'objet est en équilibre.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Formules</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Somme vectorielle:</p>
            <BlockMath math="\vec{R} = \sum_{i=1}^{n} \vec{F}_i" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Composantes:</p>
            <BlockMath math="R_x = \sum F_{ix}, \quad R_y = \sum F_{iy}" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FREE PLACE FORCE SIMULATOR (similar but without box)
// ============================================
function FreePlaceForceSimulator() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize] = useState({ width: 600, height: 500 });
  const [forces, setForces] = useState<Force[]>([]);
  const [selectedForce, setSelectedForce] = useState<string | null>(null);
  const [draggedForce, setDraggedForce] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Custom force input
  const [newForceName, setNewForceName] = useState('F1');
  const [newForceMagnitude, setNewForceMagnitude] = useState(100);
  const [newForceAngle, setNewForceAngle] = useState(0);

  const gridSize = 20;
  const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  // Calculate resultant
  const resultant = forces.reduce(
    (acc, f) => {
      const rad = (f.angle * Math.PI) / 180;
      return {
        x: acc.x + f.magnitude * Math.cos(rad),
        y: acc.y + f.magnitude * Math.sin(rad),
      };
    },
    { x: 0, y: 0 }
  );

  const resultantMagnitude = Math.sqrt(resultant.x ** 2 + resultant.y ** 2);
  const resultantAngle = (Math.atan2(resultant.y, resultant.x) * 180) / Math.PI;

  const snapToGrid = (point: { x: number; y: number }) => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  });

  const colors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#f59e0b', '#ec4899', '#0891b2', '#84cc16'];

  const handleAddForce = () => {
    const newForce: Force = {
      id: `force-${Date.now()}`,
      name: newForceName,
      magnitude: newForceMagnitude,
      angle: newForceAngle,
      color: colors[forces.length % colors.length],
      applicationPoint: { ...origin },
    };
    setForces([...forces, newForce]);
    setNewForceName(`F${forces.length + 2}`);
  };

  const handleMouseDown = (e: React.MouseEvent, forceId: string) => {
    const force = forces.find(f => f.id === forceId);
    if (!force) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedForce(forceId);
    setDragOffset({
      x: e.clientX - rect.left - force.applicationPoint.x,
      y: e.clientY - rect.top - force.applicationPoint.y,
    });
    setSelectedForce(forceId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedForce) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    const snapped = snapToGrid({ x, y });

    setForces(forces.map(f =>
      f.id === draggedForce ? { ...f, applicationPoint: snapped } : f
    ));
  };

  const handleMouseUp = () => {
    setDraggedForce(null);
  };

  const handleDeleteForce = (id: string) => {
    setForces(forces.filter(f => f.id !== id));
    setSelectedForce(null);
  };

  const handleRotateForce = (id: string, delta: number) => {
    setForces(forces.map(f =>
      f.id === id ? { ...f, angle: (f.angle + delta + 360) % 360 } : f
    ));
  };

  const drawArrow = (
    startX: number,
    startY: number,
    angle: number,
    length: number,
    color: string,
    strokeWidth: number = 3
  ) => {
    const rad = (-angle * Math.PI) / 180;
    const endX = startX + length * Math.cos(rad);
    const endY = startY + length * Math.sin(rad);

    const headLength = 12;
    const headAngle1 = rad + (Math.PI * 5) / 6;
    const headAngle2 = rad - (Math.PI * 5) / 6;

    return (
      <g>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polygon
          points={`
            ${endX},${endY}
            ${endX + headLength * Math.cos(headAngle1)},${endY + headLength * Math.sin(headAngle1)}
            ${endX + headLength * Math.cos(headAngle2)},${endY + headLength * Math.sin(headAngle2)}
          `}
          fill={color}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative border-2 border-blue-200 rounded-lg overflow-hidden bg-blue-50"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="freeGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#bfdbfe"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#freeGrid)" />

            {/* Origin point */}
            <circle cx={origin.x} cy={origin.y} r={6} fill="#374151" />
            <text x={origin.x + 10} y={origin.y - 10} className="text-xs fill-gray-600">O</text>

            {/* Forces */}
            {forces.map(force => {
              const length = Math.min(force.magnitude * 0.6, 100);
              const isSelected = selectedForce === force.id;
              return (
                <g
                  key={force.id}
                  style={{ cursor: draggedForce === force.id ? 'grabbing' : 'grab' }}
                  onMouseDown={(e) => handleMouseDown(e, force.id)}
                >
                  {drawArrow(
                    force.applicationPoint.x,
                    force.applicationPoint.y,
                    force.angle,
                    length,
                    force.color,
                    isSelected ? 4 : 3
                  )}
                  <circle
                    cx={force.applicationPoint.x}
                    cy={force.applicationPoint.y}
                    r={isSelected ? 6 : 4}
                    fill={force.color}
                  />
                  <text
                    x={force.applicationPoint.x + (length / 2 + 20) * Math.cos((-force.angle * Math.PI) / 180)}
                    y={force.applicationPoint.y + (length / 2 + 20) * Math.sin((-force.angle * Math.PI) / 180)}
                    textAnchor="middle"
                    className="text-xs font-bold"
                    fill={force.color}
                  >
                    {force.name}
                  </text>
                  {/* Invisible click area */}
                  <line
                    x1={force.applicationPoint.x}
                    y1={force.applicationPoint.y}
                    x2={force.applicationPoint.x + length * Math.cos((-force.angle * Math.PI) / 180)}
                    y2={force.applicationPoint.y + length * Math.sin((-force.angle * Math.PI) / 180)}
                    stroke="transparent"
                    strokeWidth="20"
                  />
                </g>
              );
            })}

            {/* Resultant at origin */}
            {forces.length > 1 && resultantMagnitude > 0.1 && (
              <g>
                {drawArrow(origin.x, origin.y, resultantAngle, Math.min(resultantMagnitude * 0.6, 100), '#059669', 4)}
                <text
                  x={origin.x + (resultantMagnitude * 0.3 + 25) * Math.cos((-resultantAngle * Math.PI) / 180)}
                  y={origin.y + (resultantMagnitude * 0.3 + 25) * Math.sin((-resultantAngle * Math.PI) / 180)}
                  textAnchor="middle"
                  className="text-sm font-bold fill-emerald-700"
                >
                  R
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Add new force */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">
              Nouvelle force
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom</label>
                <input
                  type="text"
                  value={newForceName}
                  onChange={(e) => setNewForceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Magnitude: {newForceMagnitude} N</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={newForceMagnitude}
                  onChange={(e) => setNewForceMagnitude(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Angle: {newForceAngle}°</label>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={newForceAngle}
                  onChange={(e) => setNewForceAngle(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleAddForce}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ajouter la force
              </button>
            </div>
          </div>

          {/* Selected force controls */}
          {selectedForce && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                Force sélectionnée: {forces.find(f => f.id === selectedForce)?.name}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRotateForce(selectedForce, -15)}
                  className="flex-1 p-2 bg-white border border-gray-200 rounded hover:bg-gray-100"
                >
                  -15°
                </button>
                <button
                  onClick={() => handleRotateForce(selectedForce, 15)}
                  className="flex-1 p-2 bg-white border border-gray-200 rounded hover:bg-gray-100"
                >
                  +15°
                </button>
                <button
                  onClick={() => handleDeleteForce(selectedForce)}
                  className="p-2 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Glissez la force pour la repositionner
              </p>
            </div>
          )}

          {/* Forces list */}
          {forces.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Forces ({forces.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {forces.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                      <span>{f.name}</span>
                    </div>
                    <span className="text-gray-500">{f.magnitude}N @ {f.angle}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resultant */}
      {forces.length > 1 && (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <h3 className="font-semibold text-emerald-800 mb-2">Force Résultante R</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <p className="text-emerald-700">
              <strong>|R|</strong> = {resultantMagnitude.toFixed(2)} N
            </p>
            <p className="text-emerald-700">
              <strong>θ</strong> = {resultantAngle.toFixed(1)}°
            </p>
            <p className="text-emerald-700">
              <strong>R</strong> = ({resultant.x.toFixed(2)}, {resultant.y.toFixed(2)}) N
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForceAdditionSimulator;
