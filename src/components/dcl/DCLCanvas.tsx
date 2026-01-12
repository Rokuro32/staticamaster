'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Force, Support, Point2D, Schema } from '@/types/question';
import { ForceArrow } from './ForceArrow';
import { SupportIcon } from './SupportIcon';
import { cn } from '@/lib/utils';

interface DCLCanvasProps {
  schema: Schema;
  placedForces: Force[];
  placedSupports: Support[];
  onForcesChange: (forces: Force[]) => void;
  onSupportsChange: (supports: Support[]) => void;
  readonly?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
}

export function DCLCanvas({
  schema,
  placedForces,
  placedSupports,
  onForcesChange,
  onSupportsChange,
  readonly = false,
  showGrid = true,
  showAxes = true,
}: DCLCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedForce, setSelectedForce] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'force' | 'support'; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });

  const width = schema.width || 600;
  const height = schema.height || 400;
  const gridSize = 20;

  // Convertir les coordonnées du canvas vers les coordonnées du problème
  const toCanvasCoords = (point: Point2D): Point2D => ({
    x: point.x,
    y: height - point.y, // Inverser Y pour avoir l'origine en bas
  });

  const fromCanvasCoords = (point: Point2D): Point2D => ({
    x: point.x,
    y: height - point.y,
  });

  // Snapping à la grille
  const snapToGrid = (point: Point2D): Point2D => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  });

  // Gestion du drag
  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    itemType: 'force' | 'support',
    itemId: string
  ) => {
    if (readonly) return;

    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const item = itemType === 'force'
      ? placedForces.find(f => f.id === itemId)
      : placedSupports.find(s => s.id === itemId);

    if (!item) return;

    const point = 'applicationPoint' in item ? item.applicationPoint : item.position;
    const canvasPoint = toCanvasCoords(point);

    setDraggedItem({ type: itemType, id: itemId });
    setDragOffset({
      x: e.clientX - rect.left - canvasPoint.x,
      y: e.clientY - rect.top - canvasPoint.y,
    });
    setSelectedForce(itemType === 'force' ? itemId : null);
  }, [readonly, placedForces, placedSupports, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedItem || readonly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left - dragOffset.x;
    const canvasY = e.clientY - rect.top - dragOffset.y;

    const snapped = snapToGrid({ x: canvasX, y: canvasY });
    const problemCoords = fromCanvasCoords(snapped);

    // Limiter aux bornes du canvas
    const clampedX = Math.max(0, Math.min(width, problemCoords.x));
    const clampedY = Math.max(0, Math.min(height, problemCoords.y));

    if (draggedItem.type === 'force') {
      const newForces = placedForces.map(f =>
        f.id === draggedItem.id
          ? { ...f, applicationPoint: { x: clampedX, y: clampedY } }
          : f
      );
      onForcesChange(newForces);
    } else {
      const newSupports = placedSupports.map(s =>
        s.id === draggedItem.id
          ? { ...s, position: { x: clampedX, y: clampedY } }
          : s
      );
      onSupportsChange(newSupports);
    }
  }, [draggedItem, dragOffset, readonly, placedForces, placedSupports, onForcesChange, onSupportsChange, width, height]);

  const handleMouseUp = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Rotation d'une force
  const handleRotateForce = (forceId: string, deltaAngle: number) => {
    if (readonly) return;

    const newForces = placedForces.map(f =>
      f.id === forceId
        ? { ...f, angle: (f.angle + deltaAngle + 360) % 360 }
        : f
    );
    onForcesChange(newForces);
  };

  // Suppression d'un élément
  const handleDeleteItem = (type: 'force' | 'support', id: string) => {
    if (readonly) return;

    if (type === 'force') {
      onForcesChange(placedForces.filter(f => f.id !== id));
    } else {
      onSupportsChange(placedSupports.filter(s => s.id !== id));
    }
    setSelectedForce(null);
  };

  return (
    <div className="space-y-4">
      {/* Canvas principal */}
      <div
        ref={canvasRef}
        className={cn(
          'dcl-canvas relative select-none overflow-hidden',
          draggedItem && 'cursor-grabbing',
          !readonly && 'cursor-crosshair'
        )}
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grille */}
        {showGrid && (
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            <defs>
              <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Axes */}
        {showAxes && (
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            {/* Axe X */}
            <line
              x1="50"
              y1={height - 50}
              x2={width - 20}
              y2={height - 50}
              stroke="#6b7280"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text x={width - 15} y={height - 45} className="text-sm fill-gray-600">x</text>

            {/* Axe Y */}
            <line
              x1="50"
              y1={height - 50}
              x2="50"
              y2="20"
              stroke="#6b7280"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text x="55" y="25" className="text-sm fill-gray-600">y</text>

            {/* Marqueur de flèche */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>
          </svg>
        )}

        {/* Éléments du schéma (structure) */}
        <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
          {schema.elements.map(element => {
            const canvasStart = element.start ? toCanvasCoords(element.start) : null;
            const canvasEnd = element.end ? toCanvasCoords(element.end) : null;
            const canvasPos = element.position ? toCanvasCoords(element.position) : null;

            switch (element.type) {
              case 'beam':
                if (!canvasStart || !canvasEnd) return null;
                return (
                  <g key={element.id}>
                    <line
                      x1={canvasStart.x}
                      y1={canvasStart.y}
                      x2={canvasEnd.x}
                      y2={canvasEnd.y}
                      stroke="#374151"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {element.label && (
                      <text
                        x={(canvasStart.x + canvasEnd.x) / 2}
                        y={(canvasStart.y + canvasEnd.y) / 2 - 15}
                        textAnchor="middle"
                        className="text-sm font-medium fill-gray-700"
                      >
                        {element.label}
                      </text>
                    )}
                  </g>
                );

              case 'point':
              case 'joint':
                if (!canvasPos) return null;
                return (
                  <g key={element.id}>
                    <circle
                      cx={canvasPos.x}
                      cy={canvasPos.y}
                      r="6"
                      fill="#1f2937"
                    />
                    {element.label && (
                      <text
                        x={canvasPos.x + 12}
                        y={canvasPos.y + 4}
                        className="text-sm font-medium fill-gray-700"
                      >
                        {element.label}
                      </text>
                    )}
                  </g>
                );

              case 'member':
                if (!canvasStart || !canvasEnd) return null;
                return (
                  <line
                    key={element.id}
                    x1={canvasStart.x}
                    y1={canvasStart.y}
                    x2={canvasEnd.x}
                    y2={canvasEnd.y}
                    stroke="#4b5563"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );

              default:
                return null;
            }
          })}
        </svg>

        {/* Appuis et forces placés */}
        <svg className="absolute inset-0" width={width} height={height}>
          {/* Appuis placés */}
          {placedSupports.map(support => {
            const canvasPos = toCanvasCoords(support.position);
            return (
              <SupportIcon
                key={support.id}
                support={support}
                position={canvasPos}
                onMouseDown={(e) => handleMouseDown(e, 'support', support.id)}
                onDelete={() => handleDeleteItem('support', support.id)}
                readonly={readonly}
              />
            );
          })}

          {/* Forces placées */}
          {placedForces.map(force => {
            const canvasPos = toCanvasCoords(force.applicationPoint);
            return (
              <ForceArrow
                key={force.id}
                force={force}
                position={canvasPos}
                isSelected={selectedForce === force.id}
                onMouseDown={(e) => handleMouseDown(e, 'force', force.id)}
                onRotate={(delta) => handleRotateForce(force.id, delta)}
                onDelete={() => handleDeleteItem('force', force.id)}
                readonly={readonly}
              />
            );
          })}
        </svg>
      </div>

      {/* Légende et contrôles */}
      {!readonly && selectedForce && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Force sélectionnée:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleRotateForce(selectedForce, -15)}
              className="p-2 hover:bg-gray-200 rounded"
              title="Rotation -15°"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={() => handleRotateForce(selectedForce, 15)}
              className="p-2 hover:bg-gray-200 rounded"
              title="Rotation +15°"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteItem('force', selectedForce)}
              className="p-2 hover:bg-red-100 text-red-600 rounded"
              title="Supprimer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DCLCanvas;
