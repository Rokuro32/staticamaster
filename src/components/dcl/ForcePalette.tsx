'use client';

import { useState } from 'react';
import type { Force, Support, SupportType } from '@/types/question';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SUPPORT_CATALOG } from './SupportIcon';
import { cn } from '@/lib/utils';

interface ForcePaletteProps {
  onAddForce: (force: Omit<Force, 'id' | 'applicationPoint'>) => void;
  onAddSupport: (support: Omit<Support, 'id' | 'position'>) => void;
  selectedForce?: Omit<Force, 'id' | 'applicationPoint'> | null;
  selectedSupport?: Omit<Support, 'id' | 'position'> | null;
  onCancelSelection?: () => void;
  availableForces?: string[];
  availableSupports?: SupportType[];
}

const DEFAULT_FORCES = [
  { name: 'W', label: 'Poids', color: '#dc2626', angle: 270 },
  { name: 'T', label: 'Tension', color: '#2563eb', angle: 45, isUnknown: true },
  { name: 'N', label: 'Normale', color: '#16a34a', angle: 90, isUnknown: true },
  { name: 'F', label: 'Force appliquée', color: '#9333ea', angle: 0 },
  { name: 'Rx', label: 'Réaction X', color: '#0891b2', angle: 0, isUnknown: true },
  { name: 'Ry', label: 'Réaction Y', color: '#0891b2', angle: 90, isUnknown: true },
];

export function ForcePalette({
  onAddForce,
  onAddSupport,
  selectedForce,
  selectedSupport,
  onCancelSelection,
  availableForces,
  availableSupports,
}: ForcePaletteProps) {
  const [activeTab, setActiveTab] = useState<'forces' | 'supports'>('forces');
  const [customForceName, setCustomForceName] = useState('');
  const [customForceAngle, setCustomForceAngle] = useState(0);

  const hasPendingSelection = selectedForce || selectedSupport;

  const forces = availableForces
    ? DEFAULT_FORCES.filter(f => availableForces.includes(f.name))
    : DEFAULT_FORCES;

  const supports = availableSupports
    ? SUPPORT_CATALOG.filter(s => availableSupports.includes(s.type))
    : SUPPORT_CATALOG;

  const handleAddCustomForce = () => {
    if (!customForceName.trim()) return;

    onAddForce({
      name: customForceName.trim(),
      angle: customForceAngle,
      color: '#6b7280',
      isUnknown: true,
    });
    setCustomForceName('');
  };

  return (
    <Card variant="bordered" padding="sm" className="w-64">
      {/* Selection indicator */}
      {hasPendingSelection && (
        <div className="mb-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">
                {selectedForce ? `Force: ${selectedForce.name}` : `Appui: ${selectedSupport?.type}`}
              </p>
              <p className="text-xs text-primary-600">
                Cliquez sur le canvas pour placer
              </p>
            </div>
            <button
              onClick={onCancelSelection}
              className="p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded"
              title="Annuler"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-4 border-b">
        <button
          onClick={() => setActiveTab('forces')}
          className={cn(
            'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'forces'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Forces
        </button>
        <button
          onClick={() => setActiveTab('supports')}
          className={cn(
            'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'supports'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Appuis
        </button>
      </div>

      {/* Contenu */}
      {activeTab === 'forces' && (
        <div className="space-y-4">
          {/* Forces prédéfinies */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Forces courantes
            </p>
            <div className="grid grid-cols-2 gap-2">
              {forces.map(force => {
                const isSelected = selectedForce?.name === force.name;
                return (
                  <button
                    key={force.name}
                    onClick={() => onAddForce(force)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-left",
                      isSelected
                        ? "border-primary-500 bg-primary-100 ring-2 ring-primary-300"
                        : "border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: force.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{force.name}</p>
                      <p className="text-xs text-gray-500">{force.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Force personnalisée */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Force personnalisée
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={customForceName}
                onChange={e => setCustomForceName(e.target.value)}
                placeholder="Nom (ex: F₁)"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customForceAngle}
                  onChange={e => setCustomForceAngle(parseInt(e.target.value) || 0)}
                  placeholder="Angle"
                  className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                />
                <span className="py-2 text-gray-500">°</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddCustomForce}
                disabled={!customForceName.trim()}
                className="w-full"
              >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supports' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
            Types d'appui
          </p>
          {supports.map(support => {
            const isSelected = selectedSupport?.type === support.type;
            return (
              <button
                key={support.type}
                onClick={() => onAddSupport({
                  type: support.type,
                  reactions: support.reactions,
                })}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left",
                  isSelected
                    ? "border-primary-500 bg-primary-100 ring-2 ring-primary-300"
                    : "border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                )}
              >
                <SupportPreview type={support.type} />
                <div>
                  <p className="text-sm font-medium">{support.name}</p>
                  <p className="text-xs text-gray-500">{support.description}</p>
                  <p className="text-xs text-primary-600 mt-1">
                    Réactions: {support.reactions.join(', ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500">
          <strong>1.</strong> Sélectionnez un élément ci-dessus<br />
          <strong>2.</strong> Cliquez sur le canvas pour le placer<br />
          <strong>3.</strong> Glissez pour repositionner, utilisez les boutons pour pivoter
        </p>
      </div>
    </Card>
  );
}

// Prévisualisation d'un appui
function SupportPreview({ type }: { type: SupportType }) {
  const size = 30;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {type === 'pin' && (
        <g transform={`translate(${size/2}, ${size/2})`}>
          <polygon points="0,-5 -10,8 10,8" fill="none" stroke="#374151" strokeWidth="1.5" />
          <circle cx="0" cy="-5" r="2.5" fill="#374151" />
        </g>
      )}
      {type === 'roller' && (
        <g transform={`translate(${size/2}, ${size/2})`}>
          <polygon points="0,-5 -8,5 8,5" fill="none" stroke="#374151" strokeWidth="1.5" />
          <circle cx="-4" cy="8" r="2.5" fill="none" stroke="#374151" strokeWidth="1.5" />
          <circle cx="4" cy="8" r="2.5" fill="none" stroke="#374151" strokeWidth="1.5" />
        </g>
      )}
      {type === 'fixed' && (
        <g transform={`translate(${size/2}, ${size/2})`}>
          <rect x="-12" y="-4" width="24" height="8" fill="#e5e7eb" stroke="#374151" strokeWidth="1.5" />
          {[...Array(4)].map((_, i) => (
            <line key={i} x1={-10 + i * 6} y1="-4" x2={-14 + i * 6} y2="4" stroke="#374151" strokeWidth="1" />
          ))}
        </g>
      )}
      {type === 'cable' && (
        <g transform={`translate(${size/2}, ${size/2})`}>
          <circle cx="0" cy="0" r="3" fill="#374151" />
          <line x1="0" y1="0" x2="0" y2="-10" stroke="#374151" strokeWidth="2" strokeDasharray="2,1" />
        </g>
      )}
      {type === 'link' && (
        <g transform={`translate(${size/2}, ${size/2})`}>
          <circle cx="0" cy="-6" r="3" fill="none" stroke="#374151" strokeWidth="1.5" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#374151" strokeWidth="2" />
          <circle cx="0" cy="6" r="3" fill="none" stroke="#374151" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

export default ForcePalette;
