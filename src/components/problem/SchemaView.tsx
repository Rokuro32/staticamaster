'use client';

import { useState } from 'react';
import type { InstantiatedQuestion, Force, Support } from '@/types/question';
import type { ValidationResult } from '@/types/validation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DCLCanvas } from '@/components/dcl/DCLCanvas';
import { ForcePalette } from '@/components/dcl/ForcePalette';
import { cn } from '@/lib/utils';

interface SchemaViewProps {
  question: InstantiatedQuestion;
  placedForces: Force[];
  placedSupports: Support[];
  onForcesChange: (forces: Force[]) => void;
  onSupportsChange: (supports: Support[]) => void;
  onValidate: () => void;
  result?: ValidationResult;
  readonly?: boolean;
}

export function SchemaView({
  question,
  placedForces,
  placedSupports,
  onForcesChange,
  onSupportsChange,
  onValidate,
  result,
  readonly = false,
}: SchemaViewProps) {
  const [pendingForce, setPendingForce] = useState<Omit<Force, 'id' | 'applicationPoint'> | null>(null);
  const [pendingSupport, setPendingSupport] = useState<Omit<Support, 'id' | 'position'> | null>(null);

  // Schéma par défaut si non défini
  const schema = question.schema || {
    type: 'beam' as const,
    width: 600,
    height: 400,
    elements: [],
    correctForces: [],
    correctSupports: [],
  };

  const handleSelectForce = (force: Omit<Force, 'id' | 'applicationPoint'>) => {
    setPendingForce(force);
    setPendingSupport(null);
  };

  const handleSelectSupport = (support: Omit<Support, 'id' | 'position'>) => {
    setPendingSupport(support);
    setPendingForce(null);
  };

  const handlePendingPlaced = () => {
    setPendingForce(null);
    setPendingSupport(null);
  };

  const handleClearAll = () => {
    onForcesChange([]);
    onSupportsChange([]);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      {/* Canvas principal */}
      <Card variant="bordered">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Diagramme de corps libre</h3>
            {!readonly && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Tout effacer
              </Button>
            )}
          </div>

          <DCLCanvas
            schema={schema}
            placedForces={placedForces}
            placedSupports={placedSupports}
            onForcesChange={onForcesChange}
            onSupportsChange={onSupportsChange}
            pendingForce={pendingForce}
            pendingSupport={pendingSupport}
            onPendingPlaced={handlePendingPlaced}
            readonly={readonly}
            showGrid
            showAxes
          />

          {/* Instructions */}
          <div className={cn(
            "mt-4 p-3 rounded-lg",
            (pendingForce || pendingSupport) ? "bg-primary-50 border border-primary-200" : "bg-gray-50"
          )}>
            <p className="text-sm text-gray-600">
              {(pendingForce || pendingSupport) ? (
                <>
                  <strong className="text-primary-700">Cliquez sur le schéma</strong> pour placer {pendingForce ? `la force ${pendingForce.name}` : `l'appui ${pendingSupport?.type}`}.
                </>
              ) : (
                <>
                  <strong>Instructions:</strong> Sélectionnez une force ou un appui dans la palette à droite, puis cliquez sur le schéma pour le placer. Vous pouvez ensuite le déplacer et ajuster son orientation.
                </>
              )}
            </p>
          </div>

          {/* Résumé des éléments placés */}
          <div className="mt-4 flex gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Forces placées</p>
              <div className="flex flex-wrap gap-1">
                {placedForces.length > 0 ? (
                  placedForces.map(f => (
                    <span
                      key={f.id}
                      className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-sm"
                    >
                      {f.name || 'F'}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Aucune</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Appuis placés</p>
              <div className="flex flex-wrap gap-1">
                {placedSupports.length > 0 ? (
                  placedSupports.map(s => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {s.type}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Aucun</span>
                )}
              </div>
            </div>
          </div>

          {/* Résultat de validation */}
          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.isCorrect ? 'bg-success-50 border border-success-200' : 'bg-error-50 border border-error-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.isCorrect ? (
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`font-medium ${result.isCorrect ? 'text-success-700' : 'text-error-700'}`}>
                  {result.isCorrect ? 'DCL correct!' : 'DCL à corriger'}
                </span>
                <span className="text-sm text-gray-600">({result.score}%)</span>
              </div>

              {result.feedback.map(fb => (
                <p key={fb.id} className="text-sm text-gray-700 mt-1">
                  {fb.message}
                  {fb.suggestion && <span className="text-gray-500"> - {fb.suggestion}</span>}
                </p>
              ))}
            </div>
          )}

          {/* Bouton de validation */}
          {!readonly && (
            <div className="mt-4">
              <Button
                onClick={onValidate}
                disabled={placedForces.length === 0 && placedSupports.length === 0}
              >
                Vérifier mon DCL
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Palette d'outils */}
      {!readonly && (
        <ForcePalette
          onAddForce={handleSelectForce}
          onAddSupport={handleSelectSupport}
          selectedForce={pendingForce}
          selectedSupport={pendingSupport}
          onCancelSelection={handlePendingPlaced}
        />
      )}
    </div>
  );
}

export default SchemaView;
