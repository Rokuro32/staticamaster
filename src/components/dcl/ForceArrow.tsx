'use client';

import { memo } from 'react';
import type { Force, Point2D } from '@/types/question';
import { cn } from '@/lib/utils';

interface ForceArrowProps {
  force: Force;
  position: Point2D; // Position sur le canvas (pas les coordonnées du problème)
  isSelected?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onRotate?: (deltaAngle: number) => void;
  onDelete?: () => void;
  readonly?: boolean;
  length?: number;
}

export const ForceArrow = memo(function ForceArrow({
  force,
  position,
  isSelected = false,
  onMouseDown,
  onRotate,
  onDelete,
  readonly = false,
  length = 60,
}: ForceArrowProps) {
  // Calculer les points de la flèche
  const angleRad = (-force.angle * Math.PI) / 180; // Négatif car Y est inversé sur le canvas
  const endX = position.x + length * Math.cos(angleRad);
  const endY = position.y + length * Math.sin(angleRad);

  // Points de la tête de flèche
  const headLength = 12;
  const headWidth = 8;
  const headAngle1 = angleRad + (Math.PI * 5) / 6;
  const headAngle2 = angleRad - (Math.PI * 5) / 6;

  const headPoints = [
    `${endX},${endY}`,
    `${endX + headLength * Math.cos(headAngle1)},${endY + headLength * Math.sin(headAngle1)}`,
    `${endX + headLength * Math.cos(headAngle2)},${endY + headLength * Math.sin(headAngle2)}`,
  ].join(' ');

  const color = force.color || (force.isUnknown ? '#3b82f6' : '#ef4444');

  return (
    <g
      className={cn(
        'force-arrow',
        isSelected && 'selected',
        !readonly && 'cursor-grab'
      )}
      onMouseDown={onMouseDown}
    >
      {/* Ligne de la force */}
      <line
        x1={position.x}
        y1={position.y}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={isSelected ? 4 : 3}
        strokeLinecap="round"
      />

      {/* Tête de flèche */}
      <polygon
        points={headPoints}
        fill={color}
      />

      {/* Point d'application */}
      <circle
        cx={position.x}
        cy={position.y}
        r={isSelected ? 6 : 4}
        fill={color}
      />

      {/* Label */}
      {force.name && (
        <text
          x={position.x + (length / 2 + 15) * Math.cos(angleRad)}
          y={position.y + (length / 2 + 15) * Math.sin(angleRad)}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill={color}
          style={{ pointerEvents: 'none' }}
        >
          {force.name}
          {force.magnitude && ` (${force.magnitude})`}
        </text>
      )}

      {/* Zone de sélection invisible plus grande */}
      <line
        x1={position.x}
        y1={position.y}
        x2={endX}
        y2={endY}
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: readonly ? 'default' : 'grab' }}
      />
    </g>
  );
});

// Composant wrapper SVG pour utilisation standalone
export function ForceArrowSVG(props: ForceArrowProps & { width?: number; height?: number }) {
  const { width = 100, height = 100, ...arrowProps } = props;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <ForceArrow {...arrowProps} />
    </svg>
  );
}

export default ForceArrow;
