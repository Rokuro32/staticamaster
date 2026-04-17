'use client';

import { useState } from 'react';
import { TrussSimulator } from '../TrussSimulator';
import { SectionMethodSimulator } from './SectionMethodSimulator';

type Section = 'joints' | 'sections';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'joints',   label: 'Méthode des noeuds',    icon: '🔩' },
  { id: 'sections', label: 'Méthode des sections',   icon: '✂️' },
];

export function TrussAnalysisSimulator() {
  const [activeSection, setActiveSection] = useState<Section>('joints');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeSection === s.id
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-0">
        {activeSection === 'joints' && <TrussSimulator />}
        {activeSection === 'sections' && <SectionMethodSimulator />}
      </div>
    </div>
  );
}
