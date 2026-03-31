'use client';

import { useState } from 'react';
import { BlackbodySimulator } from './BlackbodySimulator';
import { PhotoelectricSimulator } from './PhotoelectricSimulator';
import { BohrModelSimulator } from './BohrModelSimulator';
import { WaveParticleDualitySimulator } from './WaveParticleDualitySimulator';
import { UncertaintyPrincipleSimulator } from './UncertaintyPrincipleSimulator';
import { SchrodingerBoxSimulator } from './SchrodingerBoxSimulator';

type Section =
  | 'blackbody'
  | 'photoelectric'
  | 'bohr'
  | 'duality'
  | 'uncertainty'
  | 'schrodinger';

const SECTIONS: { id: Section; label: string; year: string; icon: string }[] = [
  { id: 'blackbody',    label: 'Corps noir',       year: '1900', icon: '🔥' },
  { id: 'photoelectric', label: 'Photoélectrique', year: '1905', icon: '💡' },
  { id: 'bohr',         label: 'Modèle de Bohr',   year: '1913', icon: '⚛️' },
  { id: 'duality',      label: 'Onde-corpuscule',   year: '1924', icon: '🌊' },
  { id: 'uncertainty',   label: 'Incertitude',      year: '1927', icon: '🎯' },
  { id: 'schrodinger',  label: 'Schrödinger',      year: '1926', icon: '📐' },
];

export function QuantumPhysicsSimulator() {
  const [activeSection, setActiveSection] = useState<Section>('blackbody');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSection === s.id
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
            <span className="text-xs opacity-60">({s.year})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-0">
        {activeSection === 'blackbody' && <BlackbodySimulator />}
        {activeSection === 'photoelectric' && <PhotoelectricSimulator />}
        {activeSection === 'bohr' && <BohrModelSimulator />}
        {activeSection === 'duality' && <WaveParticleDualitySimulator />}
        {activeSection === 'uncertainty' && <UncertaintyPrincipleSimulator />}
        {activeSection === 'schrodinger' && <SchrodingerBoxSimulator />}
      </div>
    </div>
  );
}
