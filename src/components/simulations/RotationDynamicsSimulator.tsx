'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

type SimulationMode = 'torque' | 'couple' | 'leverArm' | 'supports' | 'equilibrium' | 'inertia' | 'angularAcceleration' | 'rotationalEnergy';

export function RotationDynamicsSimulator() {
  const [mode, setMode] = useState<SimulationMode>('torque');

  const modes: { id: SimulationMode; label: string; description: string }[] = [
    { id: 'torque', label: 'Moment de force', description: 'Visualisez le moment d\'une force par rapport à un point' },
    { id: 'couple', label: 'Couple de forces', description: 'Moment résultant de deux forces égales et opposées' },
    { id: 'leverArm', label: 'Bras de levier', description: 'Comprenez l\'effet du bras de levier sur le moment' },
    { id: 'inertia', label: 'Moment d\'inertie', description: 'Résistance d\'un corps à la rotation selon sa géométrie' },
    { id: 'angularAcceleration', label: 'Accélération angulaire', description: 'Relation entre moment, inertie et accélération (M = Iα)' },
    { id: 'rotationalEnergy', label: 'Énergie rotationnelle', description: 'Énergie cinétique de rotation et conservation' },
    { id: 'supports', label: 'Types d\'appui', description: 'Découvrez les différents types d\'appui et leurs réactions' },
    { id: 'equilibrium', label: 'Équilibre de rotation', description: 'Conditions d\'équilibre d\'un corps rigide' },
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
                  ? 'bg-indigo-600 text-white'
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
        {mode === 'torque' && <TorqueSimulator />}
        {mode === 'couple' && <CoupleSimulator />}
        {mode === 'leverArm' && <LeverArmSimulator />}
        {mode === 'inertia' && <MomentOfInertiaSimulator />}
        {mode === 'angularAcceleration' && <AngularAccelerationSimulator />}
        {mode === 'rotationalEnergy' && <RotationalEnergySimulator />}
        {mode === 'supports' && <SupportsSimulator />}
        {mode === 'equilibrium' && <EquilibriumSimulator />}
      </div>
    </div>
  );
}

// ============================================
// TORQUE (MOMENT DE FORCE) SIMULATOR
// ============================================
function TorqueSimulator() {
  const [canvasSize] = useState({ width: 600, height: 450 });
  const [forceMagnitude, setForceMagnitude] = useState(100);
  const [forceAngle, setForceAngle] = useState(90); // degrees from horizontal
  const [distance, setDistance] = useState(150); // pixels from pivot
  const [pivotPos] = useState({ x: 150, y: 300 });

  // Force application point
  const forcePoint = {
    x: pivotPos.x + distance,
    y: pivotPos.y,
  };

  // Calculate torque
  const angleRad = (forceAngle * Math.PI) / 180;
  const leverArm = distance * Math.sin(angleRad);
  const torque = forceMagnitude * leverArm / 100; // Nm (scaled)
  const torqueDirection = torque > 0 ? 'antihoraire' : torque < 0 ? 'horaire' : 'nul';

  // Force vector end point
  const forceLength = 80;
  const forceEnd = {
    x: forcePoint.x + forceLength * Math.cos((forceAngle * Math.PI) / 180),
    y: forcePoint.y - forceLength * Math.sin((forceAngle * Math.PI) / 180),
  };

  // Perpendicular distance visualization
  const perpPoint = {
    x: pivotPos.x,
    y: pivotPos.y - leverArm,
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-indigo-200 rounded-lg overflow-hidden bg-indigo-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="torqueGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#c7d2fe" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#torqueGrid)" />

            {/* Beam */}
            <line
              x1={pivotPos.x}
              y1={pivotPos.y}
              x2={pivotPos.x + distance + 50}
              y2={pivotPos.y}
              stroke="#374151"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Pivot point */}
            <circle cx={pivotPos.x} cy={pivotPos.y} r="12" fill="#4f46e5" />
            <text x={pivotPos.x} y={pivotPos.y + 35} textAnchor="middle" className="text-sm font-bold fill-indigo-700">
              O (pivot)
            </text>

            {/* Distance marker */}
            <line
              x1={pivotPos.x}
              y1={pivotPos.y + 20}
              x2={forcePoint.x}
              y2={pivotPos.y + 20}
              stroke="#6366f1"
              strokeWidth="2"
              markerEnd="url(#arrowTorque)"
              markerStart="url(#arrowTorqueStart)"
            />
            <text x={(pivotPos.x + forcePoint.x) / 2} y={pivotPos.y + 40} textAnchor="middle" className="text-xs fill-indigo-600">
              r = {(distance / 50).toFixed(1)} m
            </text>

            {/* Lever arm (perpendicular distance) */}
            {Math.abs(leverArm) > 5 && (
              <>
                <line
                  x1={pivotPos.x}
                  y1={pivotPos.y}
                  x2={pivotPos.x}
                  y2={pivotPos.y - leverArm}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5,3"
                />
                <line
                  x1={pivotPos.x}
                  y1={pivotPos.y - leverArm}
                  x2={forcePoint.x}
                  y2={forcePoint.y - leverArm}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.5"
                />
                <text x={pivotPos.x - 10} y={pivotPos.y - leverArm / 2} textAnchor="end" className="text-xs fill-emerald-600">
                  d = {Math.abs(leverArm / 50).toFixed(2)} m
                </text>
              </>
            )}

            {/* Force vector */}
            <line
              x1={forcePoint.x}
              y1={forcePoint.y}
              x2={forceEnd.x}
              y2={forceEnd.y}
              stroke="#dc2626"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points={(() => {
                const angle = Math.atan2(forcePoint.y - forceEnd.y, forceEnd.x - forcePoint.x);
                const headLength = 12;
                return `${forceEnd.x},${forceEnd.y} ${forceEnd.x - headLength * Math.cos(angle - Math.PI / 6)},${forceEnd.y + headLength * Math.sin(angle - Math.PI / 6)} ${forceEnd.x - headLength * Math.cos(angle + Math.PI / 6)},${forceEnd.y + headLength * Math.sin(angle + Math.PI / 6)}`;
              })()}
              fill="#dc2626"
            />
            <text x={forceEnd.x + 15} y={forceEnd.y} className="text-sm font-bold fill-red-600">
              F = {forceMagnitude} N
            </text>

            {/* Force application point */}
            <circle cx={forcePoint.x} cy={forcePoint.y} r="6" fill="#dc2626" />

            {/* Angle arc */}
            <path
              d={`M ${forcePoint.x + 30} ${forcePoint.y} A 30 30 0 0 ${forceAngle > 0 ? 0 : 1} ${forcePoint.x + 30 * Math.cos((forceAngle * Math.PI) / 180)} ${forcePoint.y - 30 * Math.sin((forceAngle * Math.PI) / 180)}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <text
              x={forcePoint.x + 45 * Math.cos((forceAngle * Math.PI) / 360)}
              y={forcePoint.y - 45 * Math.sin((forceAngle * Math.PI) / 360)}
              className="text-xs fill-amber-600"
            >
              θ = {forceAngle}°
            </text>

            {/* Rotation direction indicator */}
            {Math.abs(torque) > 0.1 && (
              <g transform={`translate(${pivotPos.x}, ${pivotPos.y - 80})`}>
                <path
                  d={torque > 0
                    ? "M -20 0 A 20 20 0 1 0 20 0"
                    : "M 20 0 A 20 20 0 1 1 -20 0"
                  }
                  fill="none"
                  stroke={torque > 0 ? '#10b981' : '#ef4444'}
                  strokeWidth="3"
                  markerEnd={`url(#rotation${torque > 0 ? 'CCW' : 'CW'})`}
                />
                <text y="-30" textAnchor="middle" className={`text-xs font-medium ${torque > 0 ? 'fill-emerald-600' : 'fill-red-600'}`}>
                  {torqueDirection}
                </text>
              </g>
            )}

            {/* Arrow markers */}
            <defs>
              <marker id="arrowTorque" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker id="arrowTorqueStart" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
                <polygon points="10 0, 0 3.5, 10 7" fill="#6366f1" />
              </marker>
              <marker id="rotationCCW" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
              </marker>
              <marker id="rotationCW" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Force F</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-red-700 mb-1">Magnitude: {forceMagnitude} N</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={forceMagnitude}
                  onChange={(e) => setForceMagnitude(parseInt(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
              <div>
                <label className="block text-sm text-red-700 mb-1">Angle: {forceAngle}°</label>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={forceAngle}
                  onChange={(e) => setForceAngle(parseInt(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-3">Position</h3>
            <div>
              <label className="block text-sm text-indigo-700 mb-1">Distance r: {(distance / 50).toFixed(1)} m</label>
              <input
                type="range"
                min="50"
                max="250"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className={cn(
            "p-4 rounded-lg border",
            torque > 0 ? "bg-emerald-50 border-emerald-200" : torque < 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
          )}>
            <h3 className="font-semibold text-gray-800 mb-2">Moment résultant</h3>
            <div className="space-y-1">
              <p className="text-lg font-mono font-bold">
                M = {torque.toFixed(2)} N·m
              </p>
              <p className="text-sm text-gray-600">
                Bras de levier: d = {Math.abs(leverArm / 50).toFixed(2)} m
              </p>
              <p className={cn(
                "text-sm font-medium",
                torque > 0 ? "text-emerald-600" : torque < 0 ? "text-red-600" : "text-gray-600"
              )}>
                Rotation: {torqueDirection}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Formule du moment de force</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Forme vectorielle:</p>
            <BlockMath math="\vec{M} = \vec{r} \times \vec{F}" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Forme scalaire:</p>
            <BlockMath math="M = r \cdot F \cdot \sin\theta = F \cdot d" />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Le moment de force mesure la tendance d'une force à faire tourner un objet autour d'un point.
          Le <strong>bras de levier</strong> (d) est la distance perpendiculaire entre la ligne d'action de la force et le pivot.
        </p>
      </div>
    </div>
  );
}

// ============================================
// COUPLE SIMULATOR
// ============================================
function CoupleSimulator() {
  const [canvasSize] = useState({ width: 600, height: 400 });
  const [forceMagnitude, setForceMagnitude] = useState(80);
  const [separation, setSeparation] = useState(200); // distance between forces
  const [rotation, setRotation] = useState(0); // rotation of the couple

  const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  const halfSep = separation / 2;

  // Calculate force positions based on rotation
  const rad = (rotation * Math.PI) / 180;
  const force1Pos = {
    x: center.x - halfSep * Math.cos(rad),
    y: center.y - halfSep * Math.sin(rad),
  };
  const force2Pos = {
    x: center.x + halfSep * Math.cos(rad),
    y: center.y + halfSep * Math.sin(rad),
  };

  // Force directions (perpendicular to line connecting them)
  const forceDir = rad + Math.PI / 2;
  const forceLength = 60;

  // Couple moment
  const coupleMoment = (forceMagnitude * separation) / 50; // Scaled to N·m

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-purple-200 rounded-lg overflow-hidden bg-purple-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="coupleGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9d5ff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#coupleGrid)" />

            {/* Rigid body (rectangle) */}
            <rect
              x={center.x - halfSep - 20}
              y={center.y - 30}
              width={separation + 40}
              height={60}
              fill="#e5e7eb"
              stroke="#374151"
              strokeWidth="3"
              rx="4"
              transform={`rotate(${rotation}, ${center.x}, ${center.y})`}
            />

            {/* Separation line */}
            <line
              x1={force1Pos.x}
              y1={force1Pos.y}
              x2={force2Pos.x}
              y2={force2Pos.y}
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <text
              x={center.x}
              y={center.y + 50 * Math.cos(rad) + 20}
              textAnchor="middle"
              className="text-xs fill-purple-600"
            >
              d = {(separation / 50).toFixed(1)} m
            </text>

            {/* Force 1 (up direction relative to couple) */}
            <g>
              <line
                x1={force1Pos.x}
                y1={force1Pos.y}
                x2={force1Pos.x + forceLength * Math.cos(forceDir)}
                y2={force1Pos.y + forceLength * Math.sin(forceDir)}
                stroke="#dc2626"
                strokeWidth="4"
              />
              <polygon
                points={(() => {
                  const endX = force1Pos.x + forceLength * Math.cos(forceDir);
                  const endY = force1Pos.y + forceLength * Math.sin(forceDir);
                  const headLength = 12;
                  return `${endX},${endY} ${endX - headLength * Math.cos(forceDir - Math.PI / 6)},${endY - headLength * Math.sin(forceDir - Math.PI / 6)} ${endX - headLength * Math.cos(forceDir + Math.PI / 6)},${endY - headLength * Math.sin(forceDir + Math.PI / 6)}`;
                })()}
                fill="#dc2626"
              />
              <circle cx={force1Pos.x} cy={force1Pos.y} r="5" fill="#dc2626" />
              <text
                x={force1Pos.x + (forceLength + 20) * Math.cos(forceDir)}
                y={force1Pos.y + (forceLength + 20) * Math.sin(forceDir)}
                className="text-sm font-bold fill-red-600"
              >
                F
              </text>
            </g>

            {/* Force 2 (opposite direction) */}
            <g>
              <line
                x1={force2Pos.x}
                y1={force2Pos.y}
                x2={force2Pos.x - forceLength * Math.cos(forceDir)}
                y2={force2Pos.y - forceLength * Math.sin(forceDir)}
                stroke="#2563eb"
                strokeWidth="4"
              />
              <polygon
                points={(() => {
                  const endX = force2Pos.x - forceLength * Math.cos(forceDir);
                  const endY = force2Pos.y - forceLength * Math.sin(forceDir);
                  const headLength = 12;
                  const angle = forceDir + Math.PI;
                  return `${endX},${endY} ${endX - headLength * Math.cos(angle - Math.PI / 6)},${endY - headLength * Math.sin(angle - Math.PI / 6)} ${endX - headLength * Math.cos(angle + Math.PI / 6)},${endY - headLength * Math.sin(angle + Math.PI / 6)}`;
                })()}
                fill="#2563eb"
              />
              <circle cx={force2Pos.x} cy={force2Pos.y} r="5" fill="#2563eb" />
              <text
                x={force2Pos.x - (forceLength + 20) * Math.cos(forceDir)}
                y={force2Pos.y - (forceLength + 20) * Math.sin(forceDir)}
                className="text-sm font-bold fill-blue-600"
              >
                -F
              </text>
            </g>

            {/* Center point */}
            <circle cx={center.x} cy={center.y} r="4" fill="#374151" />

            {/* Rotation indicator */}
            <g transform={`translate(${center.x}, ${center.y})`}>
              <path
                d="M -25 0 A 25 25 0 1 0 25 0"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="4,2"
              />
              <polygon points="25,-8 25,8 35,0" fill="#10b981" />
              <text y="-35" textAnchor="middle" className="text-xs font-medium fill-emerald-600">
                Rotation
              </text>
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Forces</h3>
            <div>
              <label className="block text-sm text-red-700 mb-1">Magnitude: {forceMagnitude} N</label>
              <input
                type="range"
                min="20"
                max="150"
                value={forceMagnitude}
                onChange={(e) => setForceMagnitude(parseInt(e.target.value))}
                className="w-full accent-red-600"
              />
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-3">Géométrie</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-purple-700 mb-1">Séparation: {(separation / 50).toFixed(1)} m</label>
                <input
                  type="range"
                  min="100"
                  max="300"
                  value={separation}
                  onChange={(e) => setSeparation(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
              <div>
                <label className="block text-sm text-purple-700 mb-1">Orientation: {rotation}°</label>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-2">Moment du couple</h3>
            <p className="text-2xl font-mono font-bold text-emerald-700">
              M = {coupleMoment.toFixed(1)} N·m
            </p>
            <p className="text-sm text-emerald-600 mt-2">
              Le moment est indépendant du point de référence!
            </p>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Moment d'un couple</h3>
        <BlockMath math="M_{couple} = F \cdot d" />
        <p className="text-sm text-gray-600 mt-3">
          Un <strong>couple</strong> est formé de deux forces égales en magnitude, parallèles mais de sens opposés.
          La résultante des forces est nulle, mais le moment résultant ne l'est pas.
          Propriété remarquable: le moment d'un couple est le même par rapport à n'importe quel point.
        </p>
      </div>
    </div>
  );
}

// ============================================
// LEVER ARM SIMULATOR
// ============================================
function LeverArmSimulator() {
  const [canvasSize] = useState({ width: 600, height: 400 });
  const [leverClass, setLeverClass] = useState<1 | 2 | 3>(1);
  const [effortForce, setEffortForce] = useState(50);
  const [loadForce, setLoadForce] = useState(100);
  const [effortDistance, setEffortDistance] = useState(200);
  const [loadDistance, setLoadDistance] = useState(100);

  const fulcrumX = canvasSize.width / 2;
  const beamY = 200;

  // Calculate mechanical advantage
  const mechanicalAdvantage = effortDistance / loadDistance;
  const equilibriumEffort = loadForce * loadDistance / effortDistance;
  const isBalanced = Math.abs(effortForce * effortDistance - loadForce * loadDistance) < 10;

  // Lever class configurations
  const leverConfigs = {
    1: { fulcrumPos: 0.5, effortSide: -1, loadSide: 1, name: 'Premier genre', example: 'Balançoire, ciseaux' },
    2: { fulcrumPos: 0, effortSide: 1, loadSide: 0.5, name: 'Deuxième genre', example: 'Brouette, casse-noix' },
    3: { fulcrumPos: 1, effortSide: 0.5, loadSide: 0, name: 'Troisième genre', example: 'Pince à épiler, bras humain' },
  };

  const config = leverConfigs[leverClass];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-amber-200 rounded-lg overflow-hidden bg-amber-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="leverGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fde68a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#leverGrid)" />

            {/* Lever beam */}
            <line
              x1={fulcrumX - effortDistance - 30}
              y1={beamY}
              x2={fulcrumX + loadDistance + 30}
              y2={beamY}
              stroke="#374151"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Fulcrum (triangle) */}
            <polygon
              points={`${fulcrumX},${beamY + 5} ${fulcrumX - 20},${beamY + 40} ${fulcrumX + 20},${beamY + 40}`}
              fill="#f59e0b"
              stroke="#d97706"
              strokeWidth="2"
            />
            <text x={fulcrumX} y={beamY + 60} textAnchor="middle" className="text-xs font-bold fill-amber-700">
              Pivot
            </text>

            {/* Effort force (left side for class 1) */}
            <g transform={`translate(${fulcrumX - effortDistance}, ${beamY})`}>
              <line x1="0" y1="0" x2="0" y2="-70" stroke="#2563eb" strokeWidth="4" />
              <polygon points="0,-70 -8,-55 8,-55" fill="#2563eb" />
              <circle cx="0" cy="0" r="6" fill="#2563eb" />
              <text x="0" y="-80" textAnchor="middle" className="text-sm font-bold fill-blue-600">
                Effort
              </text>
              <text x="0" y="-95" textAnchor="middle" className="text-xs fill-blue-600">
                {effortForce} N
              </text>
            </g>

            {/* Load force (right side for class 1) */}
            <g transform={`translate(${fulcrumX + loadDistance}, ${beamY})`}>
              <line x1="0" y1="0" x2="0" y2="70" stroke="#dc2626" strokeWidth="4" />
              <polygon points="0,70 -8,55 8,55" fill="#dc2626" />
              <circle cx="0" cy="0" r="6" fill="#dc2626" />
              <text x="0" y="90" textAnchor="middle" className="text-sm font-bold fill-red-600">
                Charge
              </text>
              <text x="0" y="105" textAnchor="middle" className="text-xs fill-red-600">
                {loadForce} N
              </text>
            </g>

            {/* Distance markers */}
            <line x1={fulcrumX} y1={beamY + 70} x2={fulcrumX - effortDistance} y2={beamY + 70} stroke="#2563eb" strokeWidth="2" />
            <text x={fulcrumX - effortDistance / 2} y={beamY + 90} textAnchor="middle" className="text-xs fill-blue-600">
              d₁ = {(effortDistance / 50).toFixed(1)} m
            </text>

            <line x1={fulcrumX} y1={beamY + 70} x2={fulcrumX + loadDistance} y2={beamY + 70} stroke="#dc2626" strokeWidth="2" />
            <text x={fulcrumX + loadDistance / 2} y={beamY + 90} textAnchor="middle" className="text-xs fill-red-600">
              d₂ = {(loadDistance / 50).toFixed(1)} m
            </text>

            {/* Balance indicator */}
            <g transform={`translate(${fulcrumX}, 50)`}>
              <circle r="30" fill={isBalanced ? '#10b981' : '#f59e0b'} opacity="0.2" />
              <text textAnchor="middle" dominantBaseline="middle" className={`text-sm font-bold ${isBalanced ? 'fill-emerald-600' : 'fill-amber-600'}`}>
                {isBalanced ? 'Équilibré' : 'Non équilibré'}
              </text>
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-3">Classe de levier</h3>
            <div className="flex gap-2">
              {[1, 2, 3].map((c) => (
                <button
                  key={c}
                  onClick={() => setLeverClass(c as 1 | 2 | 3)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                    leverClass === c
                      ? "bg-amber-500 text-white"
                      : "bg-white text-amber-700 border border-amber-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              {config.name}: {config.example}
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">Effort</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-blue-700 mb-1">Force: {effortForce} N</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={effortForce}
                  onChange={(e) => setEffortForce(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm text-blue-700 mb-1">Distance: {(effortDistance / 50).toFixed(1)} m</label>
                <input
                  type="range"
                  min="50"
                  max="250"
                  value={effortDistance}
                  onChange={(e) => setEffortDistance(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Charge</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-red-700 mb-1">Force: {loadForce} N</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={loadForce}
                  onChange={(e) => setLoadForce(parseInt(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
              <div>
                <label className="block text-sm text-red-700 mb-1">Distance: {(loadDistance / 50).toFixed(1)} m</label>
                <input
                  type="range"
                  min="50"
                  max="250"
                  value={loadDistance}
                  onChange={(e) => setLoadDistance(parseInt(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-2">Avantage mécanique</h3>
            <p className="text-xl font-mono font-bold text-emerald-700">
              AM = {mechanicalAdvantage.toFixed(2)}
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              Effort requis pour équilibre: {equilibriumEffort.toFixed(1)} N
            </p>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Principe du levier</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Condition d'équilibre:</p>
            <BlockMath math="F_1 \cdot d_1 = F_2 \cdot d_2" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Avantage mécanique:</p>
            <BlockMath math="AM = \frac{d_1}{d_2} = \frac{F_2}{F_1}" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUPPORTS SIMULATOR
// ============================================
function SupportsSimulator() {
  const [selectedSupport, setSelectedSupport] = useState<'pin' | 'roller' | 'fixed'>('pin');

  const supports = [
    {
      id: 'pin' as const,
      name: 'Articulation (Rotule)',
      description: 'Bloque les translations X et Y, permet la rotation',
      reactions: ['Rx', 'Ry'],
      dof: 1,
      symbol: (
        <g>
          <polygon points="0,-8 -15,15 15,15" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="0" cy="-8" r="5" fill="#4f46e5" />
          <line x1="-20" y1="18" x2="20" y2="18" stroke="#374151" strokeWidth="2" />
          {[-12, -4, 4, 12].map((x, i) => (
            <line key={i} x1={x} y1="18" x2={x - 6} y2="28" stroke="#374151" strokeWidth="1.5" />
          ))}
        </g>
      ),
      reactionDiagram: (
        <g>
          <line x1="0" y1="0" x2="40" y2="0" stroke="#dc2626" strokeWidth="3" markerEnd="url(#arrowSupport)" />
          <text x="50" y="5" className="text-sm fill-red-600">Rx</text>
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrowSupport)" />
          <text x="5" y="-45" className="text-sm fill-blue-600">Ry</text>
        </g>
      ),
    },
    {
      id: 'roller' as const,
      name: 'Appui simple (Rouleau)',
      description: 'Bloque une translation perpendiculaire, permet rotation et glissement',
      reactions: ['R⊥'],
      dof: 2,
      symbol: (
        <g>
          <polygon points="0,-8 -12,10 12,10" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="0" cy="-8" r="5" fill="#10b981" />
          <circle cx="-6" cy="16" r="5" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="6" cy="16" r="5" fill="none" stroke="#374151" strokeWidth="2" />
          <line x1="-18" y1="24" x2="18" y2="24" stroke="#374151" strokeWidth="2" />
        </g>
      ),
      reactionDiagram: (
        <g>
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowSupport)" />
          <text x="5" y="-45" className="text-sm fill-emerald-600">R⊥</text>
        </g>
      ),
    },
    {
      id: 'fixed' as const,
      name: 'Encastrement',
      description: 'Bloque toutes les translations et la rotation',
      reactions: ['Rx', 'Ry', 'M'],
      dof: 0,
      symbol: (
        <g>
          <rect x="-20" y="-8" width="40" height="16" fill="#e5e7eb" stroke="#374151" strokeWidth="2" />
          {[-15, -5, 5, 15].map((x, i) => (
            <line key={i} x1={x} y1="-8" x2={x - 8} y2="8" stroke="#374151" strokeWidth="1.5" />
          ))}
        </g>
      ),
      reactionDiagram: (
        <g>
          <line x1="0" y1="0" x2="40" y2="0" stroke="#dc2626" strokeWidth="3" markerEnd="url(#arrowSupport)" />
          <text x="50" y="5" className="text-sm fill-red-600">Rx</text>
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrowSupport)" />
          <text x="5" y="-45" className="text-sm fill-blue-600">Ry</text>
          <path d="M 20 -20 A 20 20 0 1 0 -20 -20" fill="none" stroke="#9333ea" strokeWidth="3" />
          <polygon points="-20,-28 -28,-20 -20,-12" fill="#9333ea" />
          <text x="-10" y="-35" className="text-sm fill-purple-600">M</text>
        </g>
      ),
    },
  ];

  const current = supports.find(s => s.id === selectedSupport)!;

  return (
    <div className="space-y-6">
      {/* Support selector */}
      <div className="flex gap-4 justify-center">
        {supports.map((support) => (
          <button
            key={support.id}
            onClick={() => setSelectedSupport(support.id)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              selectedSupport === support.id
                ? "border-indigo-500 bg-indigo-50 shadow-lg"
                : "border-gray-200 bg-white hover:border-indigo-300"
            )}
          >
            <svg width="60" height="60" viewBox="-30 -30 60 60">
              {support.symbol}
            </svg>
            <p className="text-sm font-medium mt-2 text-center">{support.name.split(' ')[0]}</p>
          </button>
        ))}
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-xl">
          <h3 className="font-bold text-xl text-gray-800 mb-2">{current.name}</h3>
          <p className="text-gray-600 mb-4">{current.description}</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Réactions:</span>
              <div className="flex gap-2">
                {current.reactions.map((r) => (
                  <span key={r} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-mono">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Degrés de liberté:</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm font-bold">
                {current.dof}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Nombre d'inconnues:</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm font-bold">
                {current.reactions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">Diagramme des réactions</h3>
          <svg width="200" height="150" viewBox="-50 -80 200 150" className="mx-auto">
            <defs>
              <marker id="arrowSupport" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>

            {/* Support symbol */}
            <g transform="translate(50, 30)">
              {current.symbol}
            </g>

            {/* Reaction arrows */}
            <g transform="translate(50, 20)">
              {current.reactionDiagram}
            </g>

            {/* Beam indication */}
            <line x1="50" y1="20" x2="150" y2="20" stroke="#374151" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Type d'appui</th>
              <th className="p-3 text-center">Réactions</th>
              <th className="p-3 text-center">DDL</th>
              <th className="p-3 text-left">Mouvement permis</th>
            </tr>
          </thead>
          <tbody>
            <tr className={cn("border-b", selectedSupport === 'roller' && "bg-emerald-50")}>
              <td className="p-3 font-medium">Appui simple (rouleau)</td>
              <td className="p-3 text-center">1 (R⊥)</td>
              <td className="p-3 text-center">2</td>
              <td className="p-3">Translation parallèle + Rotation</td>
            </tr>
            <tr className={cn("border-b", selectedSupport === 'pin' && "bg-indigo-50")}>
              <td className="p-3 font-medium">Articulation (rotule)</td>
              <td className="p-3 text-center">2 (Rx, Ry)</td>
              <td className="p-3 text-center">1</td>
              <td className="p-3">Rotation uniquement</td>
            </tr>
            <tr className={cn(selectedSupport === 'fixed' && "bg-purple-50")}>
              <td className="p-3 font-medium">Encastrement</td>
              <td className="p-3 text-center">3 (Rx, Ry, M)</td>
              <td className="p-3 text-center">0</td>
              <td className="p-3">Aucun mouvement</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Isostaticité</h3>
        <p className="text-sm text-gray-600">
          Pour qu'une structure soit <strong>isostatique</strong> (déterminée), le nombre d'inconnues
          de réaction doit être égal au nombre d'équations d'équilibre disponibles (3 en 2D: ΣFx=0, ΣFy=0, ΣM=0).
        </p>
      </div>
    </div>
  );
}

// ============================================
// EQUILIBRIUM SIMULATOR
// ============================================
function EquilibriumSimulator() {
  const [canvasSize] = useState({ width: 700, height: 450 });
  const [forces, setForces] = useState([
    { id: '1', x: 200, magnitude: 80, angle: 270 }, // Weight
    { id: '2', x: 500, magnitude: 60, angle: 270 }, // Applied force
  ]);
  const [showReactions, setShowReactions] = useState(true);

  const beamLength = 500;
  const beamStart = 100;
  const beamY = 200;
  const beamEnd = beamStart + beamLength;

  // Support positions
  const pinX = beamStart + 50;
  const rollerX = beamEnd - 50;

  // Calculate reactions for equilibrium
  // Sum of moments about pin = 0
  // Rroller * (rollerX - pinX) - F1 * (force1X - pinX) - F2 * (force2X - pinX) = 0

  const totalMomentAboutPin = forces.reduce((sum, f) => {
    const verticalComponent = f.magnitude * Math.sin((f.angle * Math.PI) / 180);
    return sum + verticalComponent * (f.x - pinX);
  }, 0);

  const rollerReaction = totalMomentAboutPin / (rollerX - pinX);

  // Sum of vertical forces = 0
  const totalVerticalForce = forces.reduce((sum, f) => {
    return sum + f.magnitude * Math.sin((f.angle * Math.PI) / 180);
  }, 0);

  const pinReactionY = totalVerticalForce - rollerReaction;

  // Sum of horizontal forces = 0
  const totalHorizontalForce = forces.reduce((sum, f) => {
    return sum + f.magnitude * Math.cos((f.angle * Math.PI) / 180);
  }, 0);

  const pinReactionX = -totalHorizontalForce;

  // Check equilibrium
  const sumFx = totalHorizontalForce + pinReactionX;
  const sumFy = totalVerticalForce - pinReactionY - rollerReaction;
  const sumM = forces.reduce((sum, f) => {
    const verticalComponent = f.magnitude * Math.sin((f.angle * Math.PI) / 180);
    return sum + verticalComponent * (f.x - pinX);
  }, 0) - rollerReaction * (rollerX - pinX);

  const isInEquilibrium = Math.abs(sumFx) < 0.1 && Math.abs(sumFy) < 0.1 && Math.abs(sumM) < 0.1;

  const handleForceChange = (id: string, field: 'x' | 'magnitude' | 'angle', value: number) => {
    setForces(forces.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-teal-200 rounded-lg overflow-hidden bg-teal-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="eqGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#99f6e4" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#eqGrid)" />

            {/* Ground */}
            <rect x="0" y={beamY + 60} width={canvasSize.width} height="100" fill="#e5e7eb" />

            {/* Beam */}
            <line
              x1={beamStart}
              y1={beamY}
              x2={beamEnd}
              y2={beamY}
              stroke="#374151"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Pin support (left) */}
            <g transform={`translate(${pinX}, ${beamY})`}>
              <polygon points="0,5 -18,40 18,40" fill="none" stroke="#374151" strokeWidth="2" />
              <circle cx="0" cy="5" r="6" fill="#4f46e5" />
              <line x1="-25" y1="43" x2="25" y2="43" stroke="#374151" strokeWidth="2" />
              {[-15, -5, 5, 15].map((x, i) => (
                <line key={i} x1={x} y1="43" x2={x - 8} y2="55" stroke="#374151" strokeWidth="1.5" />
              ))}
              <text x="0" y="70" textAnchor="middle" className="text-xs font-bold fill-indigo-600">A (rotule)</text>
            </g>

            {/* Roller support (right) */}
            <g transform={`translate(${rollerX}, ${beamY})`}>
              <polygon points="0,5 -15,30 15,30" fill="none" stroke="#374151" strokeWidth="2" />
              <circle cx="0" cy="5" r="6" fill="#10b981" />
              <circle cx="-8" cy="38" r="6" fill="none" stroke="#374151" strokeWidth="2" />
              <circle cx="8" cy="38" r="6" fill="none" stroke="#374151" strokeWidth="2" />
              <line x1="-25" y1="47" x2="25" y2="47" stroke="#374151" strokeWidth="2" />
              <text x="0" y="70" textAnchor="middle" className="text-xs font-bold fill-emerald-600">B (rouleau)</text>
            </g>

            {/* Applied forces */}
            {forces.map((force, index) => {
              const rad = (force.angle * Math.PI) / 180;
              const length = 50 + force.magnitude * 0.3;
              const endX = force.x + length * Math.cos(rad);
              const endY = beamY - length * Math.sin(rad);

              return (
                <g key={force.id}>
                  <line
                    x1={force.x}
                    y1={beamY}
                    x2={endX}
                    y2={endY}
                    stroke="#dc2626"
                    strokeWidth="4"
                  />
                  <polygon
                    points={(() => {
                      const headLength = 12;
                      const angle = Math.atan2(beamY - endY, endX - force.x);
                      return `${endX},${endY} ${endX - headLength * Math.cos(angle - Math.PI / 6)},${endY + headLength * Math.sin(angle - Math.PI / 6)} ${endX - headLength * Math.cos(angle + Math.PI / 6)},${endY + headLength * Math.sin(angle + Math.PI / 6)}`;
                    })()}
                    fill="#dc2626"
                  />
                  <circle cx={force.x} cy={beamY} r="5" fill="#dc2626" />
                  <text x={force.x} y={beamY - length - 15} textAnchor="middle" className="text-sm font-bold fill-red-600">
                    F{index + 1} = {force.magnitude}N
                  </text>
                </g>
              );
            })}

            {/* Reaction forces */}
            {showReactions && (
              <>
                {/* Pin reactions */}
                {Math.abs(pinReactionX) > 0.1 && (
                  <g transform={`translate(${pinX}, ${beamY})`}>
                    <line
                      x1="0"
                      y1="0"
                      x2={pinReactionX > 0 ? 50 : -50}
                      y2="0"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeDasharray="5,3"
                    />
                    <polygon
                      points={pinReactionX > 0 ? "50,0 38,-6 38,6" : "-50,0 -38,-6 -38,6"}
                      fill="#2563eb"
                    />
                    <text x={pinReactionX > 0 ? 60 : -60} y="5" textAnchor={pinReactionX > 0 ? "start" : "end"} className="text-xs fill-blue-600">
                      Ax = {Math.abs(pinReactionX).toFixed(1)}N
                    </text>
                  </g>
                )}
                <g transform={`translate(${pinX}, ${beamY})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={pinReactionY > 0 ? 50 : -50}
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeDasharray="5,3"
                  />
                  <polygon
                    points={pinReactionY > 0 ? "0,50 -6,38 6,38" : "0,-50 -6,-38 6,-38"}
                    fill="#2563eb"
                  />
                  <text x="10" y={pinReactionY > 0 ? 60 : -55} className="text-xs fill-blue-600">
                    Ay = {Math.abs(pinReactionY).toFixed(1)}N
                  </text>
                </g>

                {/* Roller reaction */}
                <g transform={`translate(${rollerX}, ${beamY})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={rollerReaction > 0 ? 50 : -50}
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="5,3"
                  />
                  <polygon
                    points={rollerReaction > 0 ? "0,50 -6,38 6,38" : "0,-50 -6,-38 6,-38"}
                    fill="#10b981"
                  />
                  <text x="10" y={rollerReaction > 0 ? 60 : -55} className="text-xs fill-emerald-600">
                    By = {Math.abs(rollerReaction).toFixed(1)}N
                  </text>
                </g>
              </>
            )}

            {/* Equilibrium status */}
            <g transform={`translate(${canvasSize.width / 2}, 40)`}>
              <rect x="-80" y="-20" width="160" height="40" rx="8" fill={isInEquilibrium ? '#10b981' : '#f59e0b'} />
              <text textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-white">
                {isInEquilibrium ? 'En équilibre' : 'Calcul en cours...'}
              </text>
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="showReactions"
              checked={showReactions}
              onChange={(e) => setShowReactions(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="showReactions" className="text-sm font-medium text-gray-700">
              Afficher les réactions
            </label>
          </div>

          {forces.map((force, index) => (
            <div key={force.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">Force F{index + 1}</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-red-700 mb-1">
                    Position X: {((force.x - beamStart) / 100).toFixed(1)} m
                  </label>
                  <input
                    type="range"
                    min={beamStart + 30}
                    max={beamEnd - 30}
                    value={force.x}
                    onChange={(e) => handleForceChange(force.id, 'x', parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-red-700 mb-1">Magnitude: {force.magnitude} N</label>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={force.magnitude}
                    onChange={(e) => handleForceChange(force.id, 'magnitude', parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-red-700 mb-1">Angle: {force.angle}°</label>
                  <input
                    type="range"
                    min="180"
                    max="360"
                    value={force.angle}
                    onChange={(e) => handleForceChange(force.id, 'angle', parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h3 className="font-semibold text-teal-800 mb-2">Réactions calculées</h3>
            <div className="space-y-1 text-sm">
              <p className="text-blue-700">Ax = {pinReactionX.toFixed(2)} N</p>
              <p className="text-blue-700">Ay = {pinReactionY.toFixed(2)} N</p>
              <p className="text-emerald-700">By = {rollerReaction.toFixed(2)} N</p>
            </div>
          </div>
        </div>
      </div>

      {/* Equations */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Équations d'équilibre</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Somme des forces horizontales:</p>
            <BlockMath math="\sum F_x = 0" />
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Somme des forces verticales:</p>
            <BlockMath math="\sum F_y = 0" />
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Somme des moments:</p>
            <BlockMath math="\sum M = 0" />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Un corps rigide est en équilibre statique lorsque la somme des forces et la somme des moments
          par rapport à n'importe quel point sont nulles.
        </p>
      </div>
    </div>
  );
}

// ============================================
// MOMENT OF INERTIA SIMULATOR
// ============================================
type ShapeType = 'point' | 'rod' | 'disk' | 'ring' | 'sphere' | 'rectangle';

function MomentOfInertiaSimulator() {
  const [canvasSize] = useState({ width: 600, height: 400 });
  const [shape, setShape] = useState<ShapeType>('disk');
  const [mass, setMass] = useState(5); // kg
  const [radius, setRadius] = useState(100); // pixels (visual), represents 0.5m
  const [length, setLength] = useState(200); // for rod
  const [width, setWidth] = useState(100); // for rectangle
  const [height, setHeight] = useState(150); // for rectangle
  const [axisOffset, setAxisOffset] = useState(0); // for parallel axis theorem
  const [showParallelAxis, setShowParallelAxis] = useState(false);

  const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

  // Convert pixels to meters (scale: 200px = 1m)
  const scale = 200;
  const radiusM = radius / scale;
  const lengthM = length / scale;
  const widthM = width / scale;
  const heightM = height / scale;
  const offsetM = axisOffset / scale;

  // Calculate moment of inertia based on shape
  const calculateInertia = () => {
    switch (shape) {
      case 'point':
        return mass * radiusM * radiusM;
      case 'rod': // about center
        return (1 / 12) * mass * lengthM * lengthM;
      case 'disk': // about center axis
        return (1 / 2) * mass * radiusM * radiusM;
      case 'ring': // about center axis
        return mass * radiusM * radiusM;
      case 'sphere': // about diameter
        return (2 / 5) * mass * radiusM * radiusM;
      case 'rectangle': // about center
        return (1 / 12) * mass * (widthM * widthM + heightM * heightM);
      default:
        return 0;
    }
  };

  const I_cm = calculateInertia();
  // Parallel axis theorem: I = I_cm + md²
  const I_parallel = I_cm + mass * offsetM * offsetM;
  const displayedInertia = showParallelAxis && axisOffset > 0 ? I_parallel : I_cm;

  const shapes: { id: ShapeType; label: string; formula: string }[] = [
    { id: 'point', label: 'Point', formula: 'I = mr^2' },
    { id: 'rod', label: 'Tige', formula: 'I = \\frac{1}{12}mL^2' },
    { id: 'disk', label: 'Disque', formula: 'I = \\frac{1}{2}mr^2' },
    { id: 'ring', label: 'Anneau', formula: 'I = mr^2' },
    { id: 'sphere', label: 'Sphère', formula: 'I = \\frac{2}{5}mr^2' },
    { id: 'rectangle', label: 'Rectangle', formula: 'I = \\frac{1}{12}m(a^2+b^2)' },
  ];

  const renderShape = () => {
    switch (shape) {
      case 'point':
        return (
          <>
            {/* Dashed circle to show radius */}
            <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="8,4" />
            <circle cx={center.x + radius} cy={center.y} r="12" fill="#dc2626" />
            <text x={center.x + radius} y={center.y + 30} textAnchor="middle" className="text-sm font-bold fill-red-600">m</text>
            <line x1={center.x} y1={center.y} x2={center.x + radius} y2={center.y} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x + radius / 2} y={center.y - 10} textAnchor="middle" className="text-xs fill-indigo-600">r = {radiusM.toFixed(2)} m</text>
          </>
        );
      case 'rod':
        return (
          <>
            <line x1={center.x - length / 2} y1={center.y} x2={center.x + length / 2} y2={center.y} stroke="#374151" strokeWidth="12" strokeLinecap="round" />
            <line x1={center.x - length / 2} y1={center.y + 20} x2={center.x + length / 2} y2={center.y + 20} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x} y={center.y + 40} textAnchor="middle" className="text-xs fill-indigo-600">L = {lengthM.toFixed(2)} m</text>
          </>
        );
      case 'disk':
        return (
          <>
            <ellipse cx={center.x} cy={center.y} rx={radius} ry={radius * 0.3} fill="#93c5fd" stroke="#2563eb" strokeWidth="3" />
            <line x1={center.x} y1={center.y} x2={center.x + radius} y2={center.y} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x + radius / 2} y={center.y - 15} textAnchor="middle" className="text-xs fill-indigo-600">r = {radiusM.toFixed(2)} m</text>
          </>
        );
      case 'ring':
        return (
          <>
            <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke="#f59e0b" strokeWidth="12" />
            <line x1={center.x} y1={center.y} x2={center.x + radius} y2={center.y} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x + radius / 2} y={center.y - 15} textAnchor="middle" className="text-xs fill-indigo-600">r = {radiusM.toFixed(2)} m</text>
          </>
        );
      case 'sphere':
        return (
          <>
            <circle cx={center.x} cy={center.y} r={radius} fill="#fca5a5" stroke="#dc2626" strokeWidth="3" />
            <ellipse cx={center.x} cy={center.y} rx={radius} ry={radius * 0.2} fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="5,3" />
            <line x1={center.x} y1={center.y} x2={center.x + radius} y2={center.y} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x + radius / 2} y={center.y - 15} textAnchor="middle" className="text-xs fill-indigo-600">r = {radiusM.toFixed(2)} m</text>
          </>
        );
      case 'rectangle':
        return (
          <>
            <rect x={center.x - width / 2} y={center.y - height / 2} width={width} height={height} fill="#a5f3fc" stroke="#0891b2" strokeWidth="3" />
            <line x1={center.x - width / 2} y1={center.y + height / 2 + 15} x2={center.x + width / 2} y2={center.y + height / 2 + 15} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x} y={center.y + height / 2 + 35} textAnchor="middle" className="text-xs fill-indigo-600">a = {widthM.toFixed(2)} m</text>
            <line x1={center.x + width / 2 + 15} y1={center.y - height / 2} x2={center.x + width / 2 + 15} y2={center.y + height / 2} stroke="#6366f1" strokeWidth="2" />
            <text x={center.x + width / 2 + 35} y={center.y} textAnchor="middle" className="text-xs fill-indigo-600" transform={`rotate(90, ${center.x + width / 2 + 35}, ${center.y})`}>b = {heightM.toFixed(2)} m</text>
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-cyan-200 rounded-lg overflow-hidden bg-cyan-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="inertiaGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#a5f3fc" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#inertiaGrid)" />

            {/* Rotation axis (center) */}
            <line x1={center.x} y1={50} x2={center.x} y2={canvasSize.height - 50} stroke="#374151" strokeWidth="3" strokeDasharray="10,5" />
            <circle cx={center.x} cy={center.y} r="8" fill="#374151" />
            <text x={center.x + 15} y={60} className="text-xs font-bold fill-gray-700">Axe de rotation</text>

            {/* Parallel axis (if enabled) */}
            {showParallelAxis && axisOffset > 0 && (
              <>
                <line x1={center.x + axisOffset} y1={50} x2={center.x + axisOffset} y2={canvasSize.height - 50} stroke="#9333ea" strokeWidth="3" strokeDasharray="10,5" />
                <circle cx={center.x + axisOffset} cy={center.y} r="8" fill="#9333ea" />
                <line x1={center.x} y1={center.y + 40} x2={center.x + axisOffset} y2={center.y + 40} stroke="#9333ea" strokeWidth="2" />
                <text x={center.x + axisOffset / 2} y={center.y + 60} textAnchor="middle" className="text-xs fill-purple-600">d = {offsetM.toFixed(2)} m</text>
                <text x={center.x + axisOffset + 15} y={60} className="text-xs font-bold fill-purple-600">Axe parallèle</text>
              </>
            )}

            {/* Shape */}
            {renderShape()}

            {/* Rotation direction indicator */}
            <g transform={`translate(${center.x}, ${center.y - 120})`}>
              <path d="M -25 0 A 25 25 0 1 0 25 0" fill="none" stroke="#10b981" strokeWidth="3" />
              <polygon points="25,-8 25,8 35,0" fill="#10b981" />
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Shape selector */}
          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <h3 className="font-semibold text-cyan-800 mb-3">Forme géométrique</h3>
            <div className="grid grid-cols-3 gap-2">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShape(s.id)}
                  className={cn(
                    "py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                    shape === s.id
                      ? "bg-cyan-600 text-white"
                      : "bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mass */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm text-gray-700 mb-1">Masse: {mass} kg</label>
            <input
              type="range"
              min="1"
              max="20"
              value={mass}
              onChange={(e) => setMass(parseInt(e.target.value))}
              className="w-full accent-gray-600"
            />
          </div>

          {/* Dimension controls based on shape */}
          {(shape === 'point' || shape === 'disk' || shape === 'ring' || shape === 'sphere') && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <label className="block text-sm text-indigo-700 mb-1">Rayon: {radiusM.toFixed(2)} m</label>
              <input
                type="range"
                min="40"
                max="150"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          )}

          {shape === 'rod' && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <label className="block text-sm text-indigo-700 mb-1">Longueur: {lengthM.toFixed(2)} m</label>
              <input
                type="range"
                min="80"
                max="350"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          )}

          {shape === 'rectangle' && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
              <div>
                <label className="block text-sm text-indigo-700 mb-1">Largeur a: {widthM.toFixed(2)} m</label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm text-indigo-700 mb-1">Hauteur b: {heightM.toFixed(2)} m</label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Parallel axis theorem */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="parallelAxis"
                checked={showParallelAxis}
                onChange={(e) => setShowParallelAxis(e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
              <label htmlFor="parallelAxis" className="text-sm font-medium text-purple-700">
                Théorème des axes parallèles
              </label>
            </div>
            {showParallelAxis && (
              <div>
                <label className="block text-sm text-purple-700 mb-1">Distance d: {offsetM.toFixed(2)} m</label>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={axisOffset}
                  onChange={(e) => setAxisOffset(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            )}
          </div>

          {/* Result */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-2">Moment d'inertie</h3>
            <p className="text-2xl font-mono font-bold text-emerald-700">
              I = {displayedInertia.toFixed(4)} kg·m²
            </p>
            {showParallelAxis && axisOffset > 0 && (
              <div className="mt-2 text-sm text-emerald-600">
                <p>I<sub>cm</sub> = {I_cm.toFixed(4)} kg·m²</p>
                <p>md² = {(mass * offsetM * offsetM).toFixed(4)} kg·m²</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Formules du moment d'inertie</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {shapes.map((s) => (
            <div key={s.id} className={cn("p-3 rounded-lg", shape === s.id ? "bg-cyan-100 border border-cyan-300" : "bg-white")}>
              <p className="text-sm font-medium text-gray-700 mb-1">{s.label}:</p>
              <InlineMath math={s.formula} />
            </div>
          ))}
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm font-medium text-purple-800 mb-1">Théorème des axes parallèles:</p>
          <BlockMath math="I = I_{cm} + md^2" />
          <p className="text-sm text-purple-600 mt-2">
            Le moment d'inertie par rapport à un axe quelconque égale le moment d'inertie par rapport à un axe parallèle passant par le centre de masse, plus la masse multipliée par le carré de la distance entre les deux axes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANGULAR ACCELERATION SIMULATOR
// ============================================
function AngularAccelerationSimulator() {
  const [canvasSize] = useState({ width: 600, height: 400 });
  const [appliedTorque, setAppliedTorque] = useState(50); // N·m
  const [inertia, setInertia] = useState(10); // kg·m²
  const [isAnimating, setIsAnimating] = useState(false);
  const [angle, setAngle] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  const wheelRadius = 120;

  // Calculate angular acceleration: α = τ / I
  const angularAcceleration = appliedTorque / inertia;

  // Animation loop
  useEffect(() => {
    if (isAnimating) {
      lastTimeRef.current = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTimeRef.current) / 1000; // Convert to seconds
        lastTimeRef.current = time;

        setAngularVelocity((prev) => {
          const newVel = prev + angularAcceleration * dt;
          return Math.min(newVel, 20); // Cap velocity
        });

        setAngle((prev) => {
          const newAngle = prev + angularVelocity * dt + 0.5 * angularAcceleration * dt * dt;
          return newAngle % (2 * Math.PI);
        });

        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, angularAcceleration, angularVelocity]);

  const resetSimulation = () => {
    setIsAnimating(false);
    setAngle(0);
    setAngularVelocity(0);
  };

  // Wheel spokes
  const numSpokes = 8;
  const spokes = Array.from({ length: numSpokes }, (_, i) => {
    const spokeAngle = angle + (i * 2 * Math.PI) / numSpokes;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + wheelRadius * Math.cos(spokeAngle),
      y2: center.y + wheelRadius * Math.sin(spokeAngle),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-orange-200 rounded-lg overflow-hidden bg-orange-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="angularGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fed7aa" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#angularGrid)" />

            {/* Wheel */}
            <circle cx={center.x} cy={center.y} r={wheelRadius} fill="#fef3c7" stroke="#d97706" strokeWidth="8" />
            <circle cx={center.x} cy={center.y} r="15" fill="#d97706" />

            {/* Spokes */}
            {spokes.map((spoke, i) => (
              <line key={i} x1={spoke.x1} y1={spoke.y1} x2={spoke.x2} y2={spoke.y2} stroke="#92400e" strokeWidth="4" />
            ))}

            {/* Reference marker on wheel */}
            <circle
              cx={center.x + wheelRadius * Math.cos(angle)}
              cy={center.y + wheelRadius * Math.sin(angle)}
              r="10"
              fill="#dc2626"
            />

            {/* Applied torque arrow (curved) */}
            <g transform={`translate(${center.x}, ${center.y})`}>
              <path
                d={`M ${wheelRadius + 30} 0 A ${wheelRadius + 30} ${wheelRadius + 30} 0 0 1 0 -${wheelRadius + 30}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="4"
              />
              <polygon
                points={`0,-${wheelRadius + 38} 8,-${wheelRadius + 22} -8,-${wheelRadius + 22}`}
                fill="#2563eb"
              />
              <text x={wheelRadius + 50} y={-30} className="text-sm font-bold fill-blue-600">τ = {appliedTorque} N·m</text>
            </g>

            {/* Angular velocity indicator */}
            <g transform={`translate(${center.x}, ${center.y - wheelRadius - 60})`}>
              <text textAnchor="middle" className="text-sm fill-gray-700">
                ω = {angularVelocity.toFixed(2)} rad/s
              </text>
            </g>

            {/* Angular acceleration indicator */}
            <g transform={`translate(${center.x}, ${center.y + wheelRadius + 50})`}>
              <rect x="-80" y="-15" width="160" height="30" rx="6" fill="#f97316" />
              <text textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-white">
                α = {angularAcceleration.toFixed(2)} rad/s²
              </text>
            </g>

            {/* Angle indicator */}
            <g transform={`translate(80, ${canvasSize.height - 60})`}>
              <text className="text-xs fill-gray-600">Angle: {((angle * 180) / Math.PI).toFixed(1)}°</text>
              <text y="15" className="text-xs fill-gray-600">({(angle / (2 * Math.PI)).toFixed(2)} tours)</text>
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Animation controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={cn(
                "flex-1 py-3 rounded-lg font-semibold transition-colors",
                isAnimating ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-500 text-white hover:bg-emerald-600"
              )}
            >
              {isAnimating ? 'Pause' : 'Démarrer'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Reset
            </button>
          </div>

          {/* Torque */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">Couple appliqué τ</h3>
            <label className="block text-sm text-blue-700 mb-1">{appliedTorque} N·m</label>
            <input
              type="range"
              min="0"
              max="100"
              value={appliedTorque}
              onChange={(e) => setAppliedTorque(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Inertia */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-3">Moment d'inertie I</h3>
            <label className="block text-sm text-amber-700 mb-1">{inertia} kg·m²</label>
            <input
              type="range"
              min="1"
              max="50"
              value={inertia}
              onChange={(e) => setInertia(parseInt(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          {/* Results */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-2">Résultats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-700">Accélération angulaire α:</span>
                <span className="font-mono font-bold text-orange-800">{angularAcceleration.toFixed(3)} rad/s²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Vitesse angulaire ω:</span>
                <span className="font-mono font-bold text-orange-800">{angularVelocity.toFixed(3)} rad/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Angle θ:</span>
                <span className="font-mono font-bold text-orange-800">{((angle * 180) / Math.PI).toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* Analogy */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2">Analogie translation ↔ rotation</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Force F → Couple τ</p>
              <p>Masse m → Moment d'inertie I</p>
              <p>Accélération a → Accélération α</p>
              <p className="font-semibold pt-1">F = ma → τ = Iα</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Deuxième loi de Newton pour la rotation</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Équation fondamentale:</p>
            <BlockMath math="\tau = I \cdot \alpha" />
            <p className="text-xs text-gray-500 mt-2">
              où τ = couple (N·m), I = moment d'inertie (kg·m²), α = accélération angulaire (rad/s²)
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Cinématique de rotation:</p>
            <BlockMath math="\omega = \omega_0 + \alpha t" />
            <BlockMath math="\theta = \omega_0 t + \frac{1}{2}\alpha t^2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ROTATIONAL ENERGY SIMULATOR
// ============================================
function RotationalEnergySimulator() {
  const [canvasSize] = useState({ width: 650, height: 420 });
  const [mass, setMass] = useState(5); // kg
  const [radius, setRadius] = useState(0.5); // m
  const [angularVelocity, setAngularVelocity] = useState(10); // rad/s
  const [height, setHeight] = useState(3); // m (for rolling)
  const [shapeType, setShapeType] = useState<'disk' | 'ring' | 'sphere'>('disk');
  const [showRolling, setShowRolling] = useState(false);

  // Moment of inertia based on shape
  const getInertia = () => {
    switch (shapeType) {
      case 'disk': return 0.5 * mass * radius * radius;
      case 'ring': return mass * radius * radius;
      case 'sphere': return 0.4 * mass * radius * radius;
    }
  };

  const I = getInertia();
  const rotationalKE = 0.5 * I * angularVelocity * angularVelocity;
  const linearVelocity = angularVelocity * radius;
  const translationalKE = 0.5 * mass * linearVelocity * linearVelocity;
  const totalKE = rotationalKE + translationalKE;
  const potentialEnergy = mass * 9.81 * height;

  // For rolling without slipping
  const getKFactor = () => {
    switch (shapeType) {
      case 'disk': return 0.5;
      case 'ring': return 1;
      case 'sphere': return 0.4;
    }
  };

  const kFactor = getKFactor();
  // v² = 2gh / (1 + k) for rolling down
  const rollingVelocity = Math.sqrt((2 * 9.81 * height) / (1 + kFactor));
  const rollingOmega = rollingVelocity / radius;
  const rollingRotKE = 0.5 * I * rollingOmega * rollingOmega;
  const rollingTransKE = 0.5 * mass * rollingVelocity * rollingVelocity;

  const shapes = [
    { id: 'disk' as const, label: 'Disque plein', k: '1/2' },
    { id: 'ring' as const, label: 'Anneau', k: '1' },
    { id: 'sphere' as const, label: 'Sphère pleine', k: '2/5' },
  ];

  // Visual scale
  const visualRadius = 40;
  const rampLength = 350;
  const rampHeight = 180;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <div className="border-2 border-rose-200 rounded-lg overflow-hidden bg-rose-50">
          <svg width={canvasSize.width} height={canvasSize.height}>
            {/* Grid */}
            <defs>
              <pattern id="energyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fecdd3" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#energyGrid)" />

            {showRolling ? (
              // Rolling scenario
              <>
                {/* Ramp */}
                <polygon
                  points={`80,${canvasSize.height - 60} ${80 + rampLength},${canvasSize.height - 60} 80,${canvasSize.height - 60 - rampHeight}`}
                  fill="#e5e7eb"
                  stroke="#6b7280"
                  strokeWidth="3"
                />

                {/* Height marker */}
                <line x1="50" y1={canvasSize.height - 60} x2="50" y2={canvasSize.height - 60 - rampHeight} stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" />
                <text x="30" y={canvasSize.height - 60 - rampHeight / 2} textAnchor="middle" className="text-xs fill-indigo-600" transform={`rotate(-90, 30, ${canvasSize.height - 60 - rampHeight / 2})`}>
                  h = {height.toFixed(1)} m
                </text>

                {/* Object at top */}
                <g transform={`translate(100, ${canvasSize.height - 80 - rampHeight})`}>
                  <circle r={visualRadius} fill={shapeType === 'ring' ? 'none' : '#fca5a5'} stroke="#dc2626" strokeWidth={shapeType === 'ring' ? 8 : 3} />
                  <line x1="-20" y1="0" x2="20" y2="0" stroke="#92400e" strokeWidth="3" />
                  <line x1="0" y1="-20" x2="0" y2="20" stroke="#92400e" strokeWidth="3" />
                  <text y={-visualRadius - 10} textAnchor="middle" className="text-xs font-bold fill-gray-700">EP = {potentialEnergy.toFixed(1)} J</text>
                </g>

                {/* Object at bottom */}
                <g transform={`translate(${80 + rampLength - visualRadius - 20}, ${canvasSize.height - 60 - visualRadius})`}>
                  <circle r={visualRadius} fill={shapeType === 'ring' ? 'none' : '#86efac'} stroke="#16a34a" strokeWidth={shapeType === 'ring' ? 8 : 3} />
                  <line x1="-20" y1="0" x2="20" y2="0" stroke="#166534" strokeWidth="3" />
                  <line x1="0" y1="-20" x2="0" y2="20" stroke="#166534" strokeWidth="3" />
                </g>

                {/* Velocity arrow */}
                <g transform={`translate(${80 + rampLength + 30}, ${canvasSize.height - 60 - visualRadius})`}>
                  <line x1="0" y1="0" x2="60" y2="0" stroke="#16a34a" strokeWidth="4" />
                  <polygon points="60,0 48,-6 48,6" fill="#16a34a" />
                  <text x="30" y="-10" textAnchor="middle" className="text-xs fill-emerald-600">v = {rollingVelocity.toFixed(2)} m/s</text>
                </g>

                {/* Energy bars at bottom */}
                <g transform={`translate(80, ${canvasSize.height - 35})`}>
                  <rect x="0" y="-15" width={rampLength * (rollingTransKE / potentialEnergy)} height="12" fill="#3b82f6" rx="2" />
                  <rect x={rampLength * (rollingTransKE / potentialEnergy)} y="-15" width={rampLength * (rollingRotKE / potentialEnergy)} height="12" fill="#f97316" rx="2" />
                  <text x={rampLength / 2} y="8" textAnchor="middle" className="text-xs fill-gray-600">
                    Ec trans: {rollingTransKE.toFixed(1)} J | Ec rot: {rollingRotKE.toFixed(1)} J
                  </text>
                </g>

                {/* Ground */}
                <line x1="70" y1={canvasSize.height - 58} x2={canvasSize.width - 30} y2={canvasSize.height - 58} stroke="#374151" strokeWidth="4" />
              </>
            ) : (
              // Pure rotation scenario
              <>
                <g transform={`translate(${canvasSize.width / 2}, ${canvasSize.height / 2})`}>
                  {/* Rotating object */}
                  <circle r={80} fill={shapeType === 'ring' ? 'none' : '#fca5a5'} stroke="#dc2626" strokeWidth={shapeType === 'ring' ? 12 : 4} />
                  <circle r="10" fill="#dc2626" />

                  {/* Spokes for visualization */}
                  {[0, 45, 90, 135].map((a) => (
                    <line
                      key={a}
                      x1={-70 * Math.cos((a * Math.PI) / 180)}
                      y1={-70 * Math.sin((a * Math.PI) / 180)}
                      x2={70 * Math.cos((a * Math.PI) / 180)}
                      y2={70 * Math.sin((a * Math.PI) / 180)}
                      stroke="#92400e"
                      strokeWidth="4"
                    />
                  ))}

                  {/* Angular velocity arc */}
                  <path d="M 100 0 A 100 100 0 0 0 0 -100" fill="none" stroke="#2563eb" strokeWidth="4" />
                  <polygon points="0,-108 8,-95 -8,-95" fill="#2563eb" />
                  <text x="110" y="-40" className="text-sm font-bold fill-blue-600">ω = {angularVelocity} rad/s</text>
                </g>

                {/* Energy display */}
                <g transform={`translate(${canvasSize.width / 2}, ${canvasSize.height - 50})`}>
                  <rect x="-120" y="-25" width="240" height="50" rx="8" fill="#f97316" />
                  <text textAnchor="middle" y="-5" className="text-sm font-bold fill-white">Énergie cinétique de rotation</text>
                  <text textAnchor="middle" y="15" className="text-lg font-mono font-bold fill-white">Ec = {rotationalKE.toFixed(2)} J</text>
                </g>

                {/* Parameters display */}
                <g transform="translate(50, 50)">
                  <text className="text-sm fill-gray-700">m = {mass} kg</text>
                  <text y="20" className="text-sm fill-gray-700">r = {radius.toFixed(2)} m</text>
                  <text y="40" className="text-sm fill-gray-700">I = {I.toFixed(4)} kg·m²</text>
                </g>
              </>
            )}
          </svg>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowRolling(false)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                !showRolling ? "bg-rose-600 text-white" : "bg-white text-rose-700 border border-rose-300"
              )}
            >
              Rotation pure
            </button>
            <button
              onClick={() => setShowRolling(true)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                showRolling ? "bg-rose-600 text-white" : "bg-white text-rose-700 border border-rose-300"
              )}
            >
              Roulement
            </button>
          </div>

          {/* Shape selector */}
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
            <h3 className="font-semibold text-rose-800 mb-3">Forme</h3>
            <div className="space-y-2">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShapeType(s.id)}
                  className={cn(
                    "w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors text-left",
                    shapeType === s.id
                      ? "bg-rose-600 text-white"
                      : "bg-white text-rose-700 border border-rose-300"
                  )}
                >
                  {s.label} (k = {s.k})
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Masse: {mass} kg</label>
              <input
                type="range"
                min="1"
                max="20"
                value={mass}
                onChange={(e) => setMass(parseInt(e.target.value))}
                className="w-full accent-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Rayon: {radius.toFixed(2)} m</label>
              <input
                type="range"
                min="10"
                max="100"
                value={radius * 100}
                onChange={(e) => setRadius(parseInt(e.target.value) / 100)}
                className="w-full accent-gray-600"
              />
            </div>
            {!showRolling && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Vitesse angulaire: {angularVelocity} rad/s</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={angularVelocity}
                  onChange={(e) => setAngularVelocity(parseInt(e.target.value))}
                  className="w-full accent-gray-600"
                />
              </div>
            )}
            {showRolling && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hauteur: {height.toFixed(1)} m</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value))}
                  className="w-full accent-gray-600"
                />
              </div>
            )}
          </div>

          {/* Results */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-2">Énergies</h3>
            <div className="space-y-1 text-sm">
              {showRolling ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">EP initiale:</span>
                    <span className="font-mono font-bold">{potentialEnergy.toFixed(2)} J</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>Ec translation:</span>
                    <span className="font-mono font-bold">{rollingTransKE.toFixed(2)} J</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span>Ec rotation:</span>
                    <span className="font-mono font-bold">{rollingRotKE.toFixed(2)} J</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="font-mono">{(rollingTransKE + rollingRotKE).toFixed(2)} J</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">I:</span>
                    <span className="font-mono font-bold">{I.toFixed(4)} kg·m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Ec rotation:</span>
                    <span className="font-mono font-bold">{rotationalKE.toFixed(2)} J</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Formules d'énergie rotationnelle</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Énergie cinétique de rotation:</p>
            <BlockMath math="E_c^{rot} = \frac{1}{2} I \omega^2" />
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Roulement sans glissement:</p>
            <BlockMath math="v = r\omega" />
            <BlockMath math="E_c^{total} = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2" />
          </div>
        </div>
        {showRolling && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              Pour un objet qui roule depuis une hauteur h sans glissement:
            </p>
            <BlockMath math="mgh = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2 = \frac{1}{2}mv^2(1+k)" />
            <p className="text-sm text-blue-600 mt-2">
              où k = I/(mr²). Plus k est grand, plus l'énergie va dans la rotation, et plus l'objet est lent en bas de la pente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RotationDynamicsSimulator;
