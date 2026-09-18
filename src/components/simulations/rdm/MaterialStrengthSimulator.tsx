'use client';

import { useState } from 'react';
import { StressStrainSimulator } from './StressStrainSimulator';
import { TensileTestSimulator } from './TensileTestSimulator';

type Section = 'stress' | 'tensile';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'stress',  label: 'Contraintes & déformations', icon: '📐' },
  { id: 'tensile', label: 'Essai de traction',          icon: '📈' },
];

export function MaterialStrengthSimulator() {
  const [activeSection, setActiveSection] = useState<Section>('stress');

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeSection === s.id
                ? 'bg-ardoise-50 text-ardoise-700 border-b-2 border-ardoise-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-0">
        {activeSection === 'stress' && <StressStrainSimulator />}
        {activeSection === 'tensile' && <TensileTestSimulator />}
      </div>
    </div>
  );
}
