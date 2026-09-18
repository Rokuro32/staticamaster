'use client';

import { useState } from 'react';
import { DecayLawSimulator } from './DecayLawSimulator';
import { RadiationTypesSimulator } from './RadiationTypesSimulator';
import { DecayChainSimulator } from './DecayChainSimulator';
import { FissionSimulator } from './FissionSimulator';
import { FusionSimulator } from './FusionSimulator';
import { CyclotronSimulator } from './CyclotronSimulator';

type Section = 'decay' | 'radiation' | 'chain' | 'fission' | 'fusion' | 'cyclotron';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'decay',     label: 'Décroissance',       icon: '📉' },
  { id: 'radiation', label: 'Rayonnements α β γ', icon: '☢️' },
  { id: 'chain',     label: 'Chaînes',            icon: '🔗' },
  { id: 'fission',   label: 'Fission',            icon: '💥' },
  { id: 'fusion',    label: 'Fusion',             icon: '☀️' },
  { id: 'cyclotron', label: 'Cyclotron',          icon: '🌀' },
];

export function RadioactivitySimulator() {
  const [activeSection, setActiveSection] = useState<Section>('decay');

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSection === s.id
                ? 'bg-terre-50 text-terre-700 border-b-2 border-terre-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
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
        {activeSection === 'cyclotron' && <CyclotronSimulator />}
      </div>
    </div>
  );
}
