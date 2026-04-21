'use client';

import { useState } from 'react';
import { DecayLawSimulator } from './DecayLawSimulator';
import { RadiationTypesSimulator } from './RadiationTypesSimulator';
import { DecayChainSimulator } from './DecayChainSimulator';
import { FissionSimulator } from './FissionSimulator';
import { FusionSimulator } from './FusionSimulator';

type Section = 'decay' | 'radiation' | 'chain' | 'fission' | 'fusion';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'decay',     label: 'Décroissance',       icon: '📉' },
  { id: 'radiation', label: 'Rayonnements α β γ', icon: '☢️' },
  { id: 'chain',     label: 'Chaînes',            icon: '🔗' },
  { id: 'fission',   label: 'Fission',            icon: '💥' },
  { id: 'fusion',    label: 'Fusion',             icon: '☀️' },
];

export function RadioactivitySimulator() {
  const [activeSection, setActiveSection] = useState<Section>('decay');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSection === s.id
                ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-0">
        {activeSection === 'decay' && <DecayLawSimulator />}
        {activeSection === 'radiation' && <RadiationTypesSimulator />}
        {activeSection === 'chain' && <DecayChainSimulator />}
        {activeSection === 'fission' && <FissionSimulator />}
        {activeSection === 'fusion' && <FusionSimulator />}
      </div>
    </div>
  );
}
