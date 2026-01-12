'use client';

import { memo } from 'react';
import type { Support, Point2D, SupportType } from '@/types/question';
import { cn } from '@/lib/utils';

interface SupportIconProps {
  support: Support;
  position: Point2D;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  readonly?: boolean;
  size?: number;
}

export const SupportIcon = memo(function SupportIcon({
  support,
  position,
  onMouseDown,
  onDelete,
  readonly = false,
  size = 40,
}: SupportIconProps) {
  const halfSize = size / 2;

  // Rotation pour l'appui rouleau
  const rotation = support.angle || 0;

  const renderSupport = () => {
    switch (support.type) {
      case 'pin': // Rotule (articulation)
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            {/* Triangle */}
            <polygon
              points={`0,-5 ${-halfSize * 0.8},${halfSize * 0.6} ${halfSize * 0.8},${halfSize * 0.6}`}
              fill="none"
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Cercle au sommet */}
            <circle cx="0" cy="-5" r="4" fill="#374151" />
            {/* Hachures au sol */}
            <line
              x1={-halfSize}
              y1={halfSize * 0.6 + 5}
              x2={halfSize}
              y2={halfSize * 0.6 + 5}
              stroke="#374151"
              strokeWidth="2"
            />
            {[...Array(5)].map((_, i) => (
              <line
                key={i}
                x1={-halfSize + i * (size / 4)}
                y1={halfSize * 0.6 + 5}
                x2={-halfSize + i * (size / 4) - 8}
                y2={halfSize * 0.6 + 15}
                stroke="#374151"
                strokeWidth="1.5"
              />
            ))}
          </g>
        );

      case 'roller': // Appui à rouleau
        return (
          <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`}>
            {/* Triangle */}
            <polygon
              points={`0,-5 ${-halfSize * 0.7},${halfSize * 0.4} ${halfSize * 0.7},${halfSize * 0.4}`}
              fill="none"
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Cercle au sommet */}
            <circle cx="0" cy="-5" r="4" fill="#374151" />
            {/* Rouleaux */}
            <circle cx={-halfSize * 0.4} cy={halfSize * 0.55} r="4" fill="none" stroke="#374151" strokeWidth="2" />
            <circle cx={halfSize * 0.4} cy={halfSize * 0.55} r="4" fill="none" stroke="#374151" strokeWidth="2" />
            {/* Ligne du sol */}
            <line
              x1={-halfSize}
              y1={halfSize * 0.55 + 6}
              x2={halfSize}
              y2={halfSize * 0.55 + 6}
              stroke="#374151"
              strokeWidth="2"
            />
          </g>
        );

      case 'fixed': // Encastrement
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            {/* Rectangle d'encastrement */}
            <rect
              x={-halfSize}
              y={-halfSize * 0.3}
              width={size}
              height={halfSize * 0.6}
              fill="#e5e7eb"
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Hachures */}
            {[...Array(6)].map((_, i) => (
              <line
                key={i}
                x1={-halfSize + i * (size / 5) + 5}
                y1={-halfSize * 0.3}
                x2={-halfSize + i * (size / 5) - 5}
                y2={halfSize * 0.3}
                stroke="#374151"
                strokeWidth="1.5"
              />
            ))}
          </g>
        );

      case 'cable': // Câble
        return (
          <g transform={`translate(${position.x}, ${position.y})`}>
            {/* Cercle d'attache */}
            <circle cx="0" cy="0" r="5" fill="#374151" />
            {/* Ligne du câble (représentation) */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-halfSize}
              stroke="#374151"
              strokeWidth="3"
              strokeDasharray="4,2"
            />
          </g>
        );

      case 'link': // Bielle
        return (
          <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`}>
            {/* Cercle d'attache haut */}
            <circle cx="0" cy="0" r="5" fill="none" stroke="#374151" strokeWidth="2" />
            {/* Bielle */}
            <line
              x1="0"
              y1="5"
              x2="0"
              y2={halfSize - 5}
              stroke="#374151"
              strokeWidth="4"
            />
            {/* Cercle d'attache bas */}
            <circle cx="0" cy={halfSize} r="5" fill="none" stroke="#374151" strokeWidth="2" />
          </g>
        );

      default:
        return (
          <circle
            cx={position.x}
            cy={position.y}
            r={halfSize / 2}
            fill="#e5e7eb"
            stroke="#374151"
            strokeWidth="2"
          />
        );
    }
  };

  return (
    <g
      className={cn(
        'support-icon',
        !readonly && 'cursor-grab'
      )}
      onMouseDown={onMouseDown}
    >
      {renderSupport()}

      {/* Label */}
      {support.reactions && support.reactions.length > 0 && (
        <text
          x={position.x}
          y={position.y + size * 0.8}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {support.reactions.join(', ')}
        </text>
      )}

      {/* Zone de sélection invisible plus grande */}
      <circle
        cx={position.x}
        cy={position.y}
        r={size}
        fill="transparent"
        style={{ cursor: readonly ? 'default' : 'grab' }}
      />
    </g>
  );
});

// Catalogue des appuis disponibles
export const SUPPORT_CATALOG: Array<{
  type: SupportType;
  name: string;
  description: string;
  reactions: string[];
}> = [
  {
    type: 'pin',
    name: 'Rotule',
    description: 'Bloque les translations, permet la rotation',
    reactions: ['Rx', 'Ry'],
  },
  {
    type: 'roller',
    name: 'Appui rouleau',
    description: 'Bloque une translation perpendiculaire',
    reactions: ['R⊥'],
  },
  {
    type: 'fixed',
    name: 'Encastrement',
    description: 'Bloque tous les mouvements',
    reactions: ['Rx', 'Ry', 'M'],
  },
  {
    type: 'cable',
    name: 'Câble',
    description: 'Force de traction uniquement',
    reactions: ['T'],
  },
  {
    type: 'link',
    name: 'Bielle',
    description: 'Force axiale uniquement',
    reactions: ['F'],
  },
];

export default SupportIcon;
