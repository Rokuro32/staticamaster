'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { SimulationId } from '@/types/simulation';

function Loading() {
  return (
    <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-3 text-gray-500">
        <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        Chargement de la simulation…
      </div>
    </div>
  );
}

/**
 * Registre id de simulation -> composant.
 * Chargement à la demande : seule la simulation ouverte est téléchargée.
 * NB : les options de next/dynamic doivent être un objet littéral en ligne.
 */
const REGISTRY: Record<SimulationId, ComponentType> = {
  // Mathématiques
  'cercle-trigonometrique': dynamic(
    () => import('./TrigCircleSimulator').then((m) => m.TrigCircleSimulator),
    { ssr: false, loading: Loading }
  ),
  'operations-vectorielles': dynamic(
    () => import('./VectorSimulator').then((m) => m.VectorSimulator),
    { ssr: false, loading: Loading }
  ),

  // Statique
  'addition-de-forces': dynamic(
    () => import('./ForceAdditionSimulator').then((m) => m.ForceAdditionSimulator),
    { ssr: false, loading: Loading }
  ),
  'moments-et-rotation': dynamic(
    () => import('./RotationDynamicsSimulator').then((m) => m.RotationDynamicsSimulator),
    { ssr: false, loading: Loading }
  ),
  'analyse-de-treillis': dynamic(
    () => import('./truss/TrussAnalysisSimulator').then((m) => m.TrussAnalysisSimulator),
    { ssr: false, loading: Loading }
  ),
  'resistance-des-materiaux': dynamic(
    () => import('./rdm/MaterialStrengthSimulator').then((m) => m.MaterialStrengthSimulator),
    { ssr: false, loading: Loading }
  ),

  // Cinématique
  'cinematique-1d': dynamic(
    () => import('./KinematicsGraphSimulator').then((m) => m.KinematicsGraphSimulator),
    { ssr: false, loading: Loading }
  ),
  'cinematique-2d': dynamic(
    () => import('./ProjectileMotionSimulator').then((m) => m.ProjectileMotionSimulator),
    { ssr: false, loading: Loading }
  ),
  'mouvement-relatif': dynamic(
    () => import('./RelativeMotionSimulator').then((m) => m.RelativeMotionSimulator),
    { ssr: false, loading: Loading }
  ),

  // Mécanismes et machines
  'train-planetaire': dynamic(
    () => import('./PlanetaryGearSimulator').then((m) => m.PlanetaryGearSimulator),
    { ssr: false, loading: Loading }
  ),
  'coulisseaux-croises': dynamic(
    () => import('./SliderCrankSimulator').then((m) => m.SliderCrankSimulator),
    { ssr: false, loading: Loading }
  ),
  'bielle-manivelle': dynamic(
    () => import('./CrankRodSimulator').then((m) => m.CrankRodSimulator),
    { ssr: false, loading: Loading }
  ),

  // Ondes et oscillations
  'oscillations-et-ondes': dynamic(
    () => import('./OscillationsWaveSimulator').then((m) => m.OscillationsWaveSimulator),
    { ssr: false, loading: Loading }
  ),
  'ondes-sonores': dynamic(
    () => import('./SoundWaveSimulator').then((m) => m.SoundWaveSimulator),
    { ssr: false, loading: Loading }
  ),
  'corde-de-guitare': dynamic(
    () => import('./GuitarStringSimulator').then((m) => m.GuitarStringSimulator),
    { ssr: false, loading: Loading }
  ),
  'ondes-electromagnetiques': dynamic(
    () => import('./ElectromagneticWaveSimulator').then((m) => m.ElectromagneticWaveSimulator),
    { ssr: false, loading: Loading }
  ),

  // Électricité
  'circuits-dc': dynamic(
    () => import('./DCCircuitSimulator').then((m) => m.DCCircuitSimulator),
    { ssr: false, loading: Loading }
  ),
  'electrocardiogramme': dynamic(
    () => import('./ECGSimulator').then((m) => m.ECGSimulator),
    { ssr: false, loading: Loading }
  ),

  // Physique moderne
  'relativite-restreinte': dynamic(
    () => import('./RelativitySimulator').then((m) => m.RelativitySimulator),
    { ssr: false, loading: Loading }
  ),
  'paradoxe-des-jumeaux': dynamic(
    () => import('./TwinParadoxSimulator').then((m) => m.TwinParadoxSimulator),
    { ssr: false, loading: Loading }
  ),
  'physique-quantique': dynamic(
    () => import('./quantum/QuantumPhysicsSimulator').then((m) => m.QuantumPhysicsSimulator),
    { ssr: false, loading: Loading }
  ),
  'physique-atomique': dynamic(
    () => import('./atomic/AtomicPhysicsSimulator').then((m) => m.AtomicPhysicsSimulator),
    { ssr: false, loading: Loading }
  ),

  // Physique nucléaire
  'radioactivite': dynamic(
    () => import('./radioactivity/RadioactivitySimulator').then((m) => m.RadioactivitySimulator),
    { ssr: false, loading: Loading }
  ),

  // Thermodynamique et fluides
  'rayonnement-thermique': dynamic(
    () => import('./ThermalRadiationSimulator').then((m) => m.ThermalRadiationSimulator),
    { ssr: false, loading: Loading }
  ),
  'effet-de-serre': dynamic(
    () => import('./GreenhouseEffectSimulator').then((m) => m.GreenhouseEffectSimulator),
    { ssr: false, loading: Loading }
  ),
  'tube-de-venturi': dynamic(
    () => import('./VenturiTubeSimulator').then((m) => m.VenturiTubeSimulator),
    { ssr: false, loading: Loading }
  ),
};

export function SimulationRenderer({ simId }: { simId: SimulationId }) {
  const Simulator = REGISTRY[simId];

  if (!Simulator) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        Cette simulation n&apos;est pas disponible.
      </div>
    );
  }

  return <Simulator />;
}

export default SimulationRenderer;
