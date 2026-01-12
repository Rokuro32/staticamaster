'use client';

import type { InstantiatedQuestion } from '@/types/question';
import type { ValidationResult } from '@/types/validation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface EquationViewProps {
  question: InstantiatedQuestion;
  selectedEquations: string[];
  onEquationsChange: (equations: string[]) => void;
  onValidate: () => void;
  result?: ValidationResult;
  readonly?: boolean;
}

// Équations d'équilibre disponibles
const AVAILABLE_EQUATIONS = [
  { id: 'sum-fx', label: 'ΣFx = 0', latex: '\\sum F_x = 0', description: 'Somme des forces horizontales' },
  { id: 'sum-fy', label: 'ΣFy = 0', latex: '\\sum F_y = 0', description: 'Somme des forces verticales' },
  { id: 'sum-fz', label: 'ΣFz = 0', latex: '\\sum F_z = 0', description: 'Somme des forces en Z (3D)' },
  { id: 'sum-ma', label: 'ΣMA = 0', latex: '\\sum M_A = 0', description: 'Somme des moments au point A' },
  { id: 'sum-mb', label: 'ΣMB = 0', latex: '\\sum M_B = 0', description: 'Somme des moments au point B' },
  { id: 'sum-mc', label: 'ΣMC = 0', latex: '\\sum M_C = 0', description: 'Somme des moments au point C' },
  { id: 'sum-mo', label: 'ΣMO = 0', latex: '\\sum M_O = 0', description: 'Somme des moments à l\'origine' },
];

// Équations spécifiques pour treillis
const TRUSS_EQUATIONS = [
  { id: 'node-equilibrium', label: 'Équilibre au nœud', description: 'ΣFx = 0 et ΣFy = 0 à chaque nœud' },
  { id: 'section-cut', label: 'Coupe de section', description: 'Équilibre de la partie coupée' },
];

// Relations utiles
const USEFUL_RELATIONS = [
  { id: 'moment-def', label: 'M = F × d', description: 'Définition du moment' },
  { id: 'pythagore', label: 'R² = Fx² + Fy²', description: 'Résultante (Pythagore)' },
  { id: 'angle', label: 'θ = arctan(Fy/Fx)', description: 'Angle de la résultante' },
  { id: 'decomp-x', label: 'Fx = F cos(θ)', description: 'Composante X' },
  { id: 'decomp-y', label: 'Fy = F sin(θ)', description: 'Composante Y' },
  { id: 'stress', label: 'σ = F/A', description: 'Contrainte normale' },
  { id: 'strain', label: 'ε = ΔL/L', description: 'Déformation' },
  { id: 'youngs', label: 'E = σ/ε', description: 'Module de Young' },
];

export function EquationView({
  question,
  selectedEquations,
  onEquationsChange,
  onValidate,
  result,
  readonly = false,
}: EquationViewProps) {
  const toggleEquation = (id: string) => {
    if (readonly) return;

    if (selectedEquations.includes(id)) {
      onEquationsChange(selectedEquations.filter(e => e !== id));
    } else {
      onEquationsChange([...selectedEquations, id]);
    }
  };

  // Déterminer quelles équations afficher selon le type de question
  const showTrussEquations = question.tags.includes('truss-nodes') || question.tags.includes('truss-sections');
  const showMaterialsEquations = question.tags.includes('stress') || question.tags.includes('strain');

  return (
    <Card variant="bordered">
      <CardContent>
        <h3 className="font-semibold text-gray-900 mb-4">
          Sélectionnez les équations nécessaires
        </h3>

        <p className="text-sm text-gray-600 mb-6">
          Choisissez les équations d'équilibre et relations qui permettent de résoudre ce problème.
          Cliquez sur une équation pour la sélectionner ou désélectionner.
        </p>

        {/* Équations d'équilibre */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Équations d'équilibre</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_EQUATIONS.map(eq => (
              <button
                key={eq.id}
                onClick={() => toggleEquation(eq.id)}
                disabled={readonly}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedEquations.includes(eq.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300',
                  readonly && 'cursor-default'
                )}
              >
                <p className="font-mono text-lg font-semibold text-gray-900">
                  {eq.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{eq.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Équations spécifiques treillis */}
        {showTrussEquations && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Méthodes pour treillis</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {TRUSS_EQUATIONS.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => toggleEquation(eq.id)}
                  disabled={readonly}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    selectedEquations.includes(eq.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300',
                    readonly && 'cursor-default'
                  )}
                >
                  <p className="font-medium text-gray-900">{eq.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{eq.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relations utiles */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Relations utiles</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {USEFUL_RELATIONS.filter(rel => {
              // Filtrer selon le module
              if (showMaterialsEquations) return true;
              return !['stress', 'strain', 'youngs'].includes(rel.id);
            }).map(eq => (
              <button
                key={eq.id}
                onClick={() => toggleEquation(eq.id)}
                disabled={readonly}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedEquations.includes(eq.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300',
                  readonly && 'cursor-default'
                )}
              >
                <p className="font-mono text-sm font-medium text-gray-900">{eq.label}</p>
                <p className="text-xs text-gray-500">{eq.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Résumé des sélections */}
        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Équations sélectionnées ({selectedEquations.length}):
          </p>
          {selectedEquations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedEquations.map(id => {
                const eq = [...AVAILABLE_EQUATIONS, ...TRUSS_EQUATIONS, ...USEFUL_RELATIONS]
                  .find(e => e.id === id);
                return (
                  <span
                    key={id}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {eq?.label || id}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune équation sélectionnée</p>
          )}
        </div>

        {/* Résultat de validation */}
        {result && (
          <div className={`mb-4 p-4 rounded-lg ${
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
                {result.isCorrect ? 'Bonnes équations!' : 'Sélection à revoir'}
              </span>
              <span className="text-sm text-gray-600">({result.score}%)</span>
            </div>

            {result.feedback.map(fb => (
              <p key={fb.id} className="text-sm text-gray-700 mt-1">
                {fb.message}
              </p>
            ))}
          </div>
        )}

        {/* Bouton de validation */}
        {!readonly && (
          <Button
            onClick={onValidate}
            disabled={selectedEquations.length === 0}
          >
            Vérifier mes équations
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default EquationView;
