'use client';

import { useState } from 'react';
import { PauliExclusionSimulator } from './PauliExclusionSimulator';
import { EnergyBandsSimulator } from './EnergyBandsSimulator';
import { IsotopeNotationSimulator } from './IsotopeNotationSimulator';

type Section = 'isotopes' | 'pauli' | 'bands';

const SECTIONS: { id: Section; label: string; year: string; icon: string }[] = [
  { id: 'isotopes', label: 'Isotopes',            year: 'A,Z',  icon: '⚛️' },
  { id: 'pauli',    label: 'Principe d\'exclusion', year: '1925', icon: '🚫' },
  { id: 'bands',    label: 'Bandes d\'énergie',     year: '1928', icon: '📊' },
];

export function AtomicPhysicsSimulator() {
  const [activeSection, setActiveSection] = useState<Section>('isotopes');

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSection === s.id
                ? 'bg-gold-50 text-gold-700 border-b-2 border-gold-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
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
        {activeSection === 'isotopes' && <IsotopeNotationSimulator />}
        {activeSection === 'pauli' && <PauliExclusionSimulator />}
        {activeSection === 'bands' && <EnergyBandsSimulator />}
      </div>
    </div>
  );
}
