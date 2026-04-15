'use client';

import { useState, useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// CollapsiblePanel (même pattern que les autres simulateurs)
// ---------------------------------------------------------------------------

function CollapsiblePanel({
  title,
  borderColor,
  bgColor,
  textColor,
  children,
  defaultOpen = false,
}: {
  title: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-l-4 ${borderColor} rounded-lg overflow-hidden mb-4`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left px-4 py-3 font-semibold flex justify-between items-center ${bgColor} ${textColor} hover:brightness-95 transition-all`}
      >
        <span>{title}</span>
        <span className="text-lg">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className={`px-4 py-4 ${bgColor} bg-opacity-30 text-sm leading-relaxed space-y-3`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structure des sous-couches atomiques (ordre énergétique — règle de Klechkowski)
// ---------------------------------------------------------------------------

interface Subshell {
  n: number;     // nombre quantique principal
  l: number;     // nombre quantique azimutal (0=s, 1=p, 2=d, 3=f)
  label: string; // ex. "1s", "2p"
  capacity: number; // 2(2l+1)
}

const SUBSHELLS: Subshell[] = [
  { n: 1, l: 0, label: '1s', capacity: 2 },
  { n: 2, l: 0, label: '2s', capacity: 2 },
  { n: 2, l: 1, label: '2p', capacity: 6 },
  { n: 3, l: 0, label: '3s', capacity: 2 },
  { n: 3, l: 1, label: '3p', capacity: 6 },
  { n: 4, l: 0, label: '4s', capacity: 2 },
  { n: 3, l: 2, label: '3d', capacity: 10 },
  { n: 4, l: 1, label: '4p', capacity: 6 },
  { n: 5, l: 0, label: '5s', capacity: 2 },
  { n: 4, l: 2, label: '4d', capacity: 10 },
  { n: 5, l: 1, label: '5p', capacity: 6 },
];

const ELEMENTS: Record<number, { symbol: string; name: string }> = {
  1: { symbol: 'H', name: 'Hydrogène' },
  2: { symbol: 'He', name: 'Hélium' },
  3: { symbol: 'Li', name: 'Lithium' },
  6: { symbol: 'C', name: 'Carbone' },
  7: { symbol: 'N', name: 'Azote' },
  8: { symbol: 'O', name: 'Oxygène' },
  10: { symbol: 'Ne', name: 'Néon' },
  11: { symbol: 'Na', name: 'Sodium' },
  14: { symbol: 'Si', name: 'Silicium' },
  18: { symbol: 'Ar', name: 'Argon' },
  26: { symbol: 'Fe', name: 'Fer' },
  29: { symbol: 'Cu', name: 'Cuivre' },
  36: { symbol: 'Kr', name: 'Krypton' },
};

// ---------------------------------------------------------------------------
// Main component — remplissage des sous-couches selon Pauli + Hund
// ---------------------------------------------------------------------------

export function PauliExclusionSimulator() {
  const [Z, setZ] = useState(10); // nombre d'électrons

  // Configuration électronique : nombre d'électrons par sous-couche
  const config = useMemo(() => {
    const filling: number[] = SUBSHELLS.map(() => 0);
    let remaining = Z;
    for (let i = 0; i < SUBSHELLS.length && remaining > 0; i++) {
      const take = Math.min(SUBSHELLS[i].capacity, remaining);
      filling[i] = take;
      remaining -= take;
    }
    return filling;
  }, [Z]);

  const configText = useMemo(
    () =>
      SUBSHELLS.map((s, i) => (config[i] > 0 ? `${s.label}${config[i]}` : null))
        .filter(Boolean)
        .join(' '),
    [config],
  );

  const element = ELEMENTS[Z];

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Principe d&apos;exclusion de Pauli
        </h2>
        <p className="text-gray-600">
          Remplissage des sous-couches atomiques &mdash; Pauli, 1925
        </p>
      </div>

      {/* Slider Z */}
      <div className="w-full max-w-[700px] mx-auto space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
            Numéro atomique <InlineMath math={`Z`} />
          </label>
          <input
            type="range"
            min={1}
            max={36}
            step={1}
            value={Z}
            onChange={(e) => setZ(Number(e.target.value))}
            className="flex-1 accent-violet-500"
          />
          <span className="text-sm font-mono text-gray-900 w-24 text-right">
            Z = {Z}
            {element ? ` (${element.symbol})` : ''}
          </span>
        </div>
        {element && (
          <div className="text-center text-gray-600 text-sm">
            <strong>{element.name}</strong> — configuration :{' '}
            <span className="font-mono text-violet-700">{configText}</span>
          </div>
        )}
      </div>

      {/* Diagramme des sous-couches */}
      <div className="bg-slate-900 rounded-lg p-6 space-y-3">
        {SUBSHELLS.map((s, i) => {
          const filled = config[i];
          const orbitals = 2 * s.l + 1; // nombre de cases quantiques m_l
          // Règle de Hund : on remplit d'abord chaque orbitale avec un spin up,
          // puis on complète avec les spins down.
          const upPerOrbital: number[] = new Array(orbitals).fill(0);
          const downPerOrbital: number[] = new Array(orbitals).fill(0);
          for (let e = 0; e < filled; e++) {
            if (e < orbitals) upPerOrbital[e] = 1;
            else downPerOrbital[e - orbitals] = 1;
          }

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 text-right text-sm font-mono text-slate-300">
                {s.label}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: orbitals }).map((_, k) => (
                  <div
                    key={k}
                    className="w-8 h-10 border border-slate-500 rounded bg-slate-800 flex flex-col items-center justify-center text-xs"
                  >
                    <span className={upPerOrbital[k] ? 'text-blue-400' : 'text-slate-700'}>
                      ↑
                    </span>
                    <span className={downPerOrbital[k] ? 'text-pink-400' : 'text-slate-700'}>
                      ↓
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 ml-2">
                {filled}/{s.capacity}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. L'énoncé de Pauli (1925)"
          borderColor="border-violet-500"
          bgColor="bg-violet-50"
          textColor="text-violet-800"
          defaultOpen
        >
          <p className="text-gray-700">
            <strong>Wolfgang Pauli</strong> énonce en 1925 que dans un atome, deux électrons
            ne peuvent occuper le même état quantique. Ils doivent différer par au moins un
            des quatre nombres quantiques :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`(n,\\; \\ell,\\; m_\\ell,\\; m_s)`} />
          </div>
          <p className="text-gray-700">
            Chaque orbitale <InlineMath math={`(n, \\ell, m_\\ell)`} /> peut donc accueillir{' '}
            <strong>au plus 2 électrons</strong>, de spins opposés{' '}
            <InlineMath math={`m_s = \\pm 1/2`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Capacité des sous-couches"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            Une sous-couche caractérisée par <InlineMath math={`\\ell`} /> contient{' '}
            <InlineMath math={`2\\ell + 1`} /> orbitales (les valeurs de{' '}
            <InlineMath math={`m_\\ell`} />
            allant de <InlineMath math={`-\\ell`} /> à <InlineMath math={`+\\ell`} />). Sa
            capacité totale est donc :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`N_\\ell = 2(2\\ell + 1)`} />
          </div>
          <p className="text-gray-700">
            D&apos;où : <InlineMath math={`s : 2`} />, <InlineMath math={`p : 6`} />,{' '}
            <InlineMath math={`d : 10`} />, <InlineMath math={`f : 14`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Règle de Klechkowski et de Hund"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            <strong>Klechkowski :</strong> les sous-couches se remplissent par ordre
            croissant de <InlineMath math={`n + \\ell`} />, et à valeur égale, par ordre
            croissant de <InlineMath math={`n`} />. D&apos;où la succession :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto text-center font-mono text-xs">
            1s → 2s → 2p → 3s → 3p → 4s → 3d → 4p → 5s → 4d → 5p ...
          </div>
          <p className="text-gray-700">
            <strong>Hund :</strong> au sein d&apos;une même sous-couche, les électrons
            occupent d&apos;abord chaque orbitale séparément avec des spins parallèles,
            avant de s&apos;apparier (énergie d&apos;échange minimisée).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Conséquences"
          borderColor="border-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-800"
        >
          <p className="text-gray-700">
            Sans le principe d&apos;exclusion, tous les électrons s&apos;effondreraient dans
            la sous-couche 1s : aucune chimie, aucun tableau périodique, pas de matière
            telle que nous la connaissons.
          </p>
          <p className="text-gray-700">
            Le principe de Pauli s&apos;applique à tous les <strong>fermions</strong>
            (particules de spin demi-entier). Il est à l&apos;origine de la stabilité de la
            matière, de la structure des étoiles (pression de dégénérescence des naines
            blanches et étoiles à neutrons), et de la périodicité des éléments.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
