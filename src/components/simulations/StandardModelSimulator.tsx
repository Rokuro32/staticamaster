'use client';

import { useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Le Modèle standard, disposé dans son tableau habituel : trois générations de
// fermions à gauche, bosons de jauge et boson scalaire à droite.
//
// Les valeurs de masse suivent les moyennes du Particle Data Group. Pour les
// neutrinos on ne connaît qu'une limite supérieure : on sait qu'elles ne sont
// pas nulles (les oscillations l'imposent) sans savoir combien elles valent.
// ---------------------------------------------------------------------------

type Family = 'quark' | 'lepton' | 'gauge' | 'scalar';
type Force = 'forte' | 'faible' | 'electromagnetique' | 'gravitation';
type Mode = 'famille' | 'charge' | 'couleur' | 'spin' | 'masse' | 'interactions';

interface Particle {
  id: string;
  symbol: string;
  name: string;
  family: Family;
  generation?: 1 | 2 | 3;
  /** Masse lisible, telle qu'on la cite */
  mass: string;
  /** Masse en eV/c², pour l'échelle logarithmique. 0 = sans masse. */
  massEv: number;
  /** Charge électrique en unités de e */
  charge: string;
  chargeValue: number;
  /** Porte-t-elle une charge de couleur ? */
  color: boolean;
  colorNote: string;
  spin: string;
  forces: Force[];
  antiparticle: string;
  discovered: string;
  note: string;
}

const PARTICLES: Particle[] = [
  // ------------------------------------------------------------- quarks
  {
    id: 'up', symbol: 'u', name: 'Quark up', family: 'quark', generation: 1,
    mass: '2,2 MeV/c²', massEv: 2.2e6, charge: '+2/3', chargeValue: 2 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-up (ū)', discovered: 'proposé en 1964, confirmé en 1968 au SLAC',
    note: 'Avec le down, il compose les protons (uud) et les neutrons (udd) : presque toute la matière ordinaire.',
  },
  {
    id: 'down', symbol: 'd', name: 'Quark down', family: 'quark', generation: 1,
    mass: '4,7 MeV/c²', massEv: 4.7e6, charge: '−1/3', chargeValue: -1 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-down (d̄)', discovered: 'proposé en 1964, confirmé en 1968 au SLAC',
    note: 'Un down qui se transforme en up, c’est la désintégration bêta : d’où la radioactivité β⁻.',
  },
  {
    id: 'charm', symbol: 'c', name: 'Quark charm', family: 'quark', generation: 2,
    mass: '1,27 GeV/c²', massEv: 1.27e9, charge: '+2/3', chargeValue: 2 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-charm (c̄)', discovered: '1974, via le méson J/ψ',
    note: 'Sa découverte simultanée à Brookhaven et au SLAC a valu le nom de « révolution de novembre ».',
  },
  {
    id: 'strange', symbol: 's', name: 'Quark strange', family: 'quark', generation: 2,
    mass: '93 MeV/c²', massEv: 9.3e7, charge: '−1/3', chargeValue: -1 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-strange (s̄)', discovered: 'déduit dès les années 1950 des particules « étranges »',
    note: 'Baptisé ainsi parce que les particules qui le contiennent vivaient bien plus longtemps que prévu.',
  },
  {
    id: 'top', symbol: 't', name: 'Quark top', family: 'quark', generation: 3,
    mass: '173 GeV/c²', massEv: 1.73e11, charge: '+2/3', chargeValue: 2 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-top (t̄)', discovered: '1995, au Tevatron',
    note: 'La particule élémentaire la plus lourde connue : à peu près la masse d’un atome d’or entier. Il se désintègre si vite qu’il n’a pas le temps de s’assembler en hadron.',
  },
  {
    id: 'bottom', symbol: 'b', name: 'Quark bottom', family: 'quark', generation: 3,
    mass: '4,18 GeV/c²', massEv: 4.18e9, charge: '−1/3', chargeValue: -1 / 3,
    color: true, colorNote: 'rouge, vert ou bleu', spin: '1/2',
    forces: ['forte', 'faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'anti-bottom (b̄)', discovered: '1977, au Fermilab',
    note: 'Sa relative longévité en fait l’outil privilégié pour étudier l’asymétrie entre matière et antimatière.',
  },
  // ------------------------------------------------------------ leptons
  {
    id: 'electron', symbol: 'e⁻', name: 'Électron', family: 'lepton', generation: 1,
    mass: '0,511 MeV/c²', massEv: 5.11e5, charge: '−1', chargeValue: -1,
    color: false, colorNote: 'aucune : il ignore l’interaction forte', spin: '1/2',
    forces: ['faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'positron (e⁺)', discovered: '1897, par J. J. Thomson',
    note: 'La première particule élémentaire découverte. Toute la chimie, tout le courant électrique tiennent à son comportement.',
  },
  {
    id: 'nu-e', symbol: 'νe', name: 'Neutrino électronique', family: 'lepton', generation: 1,
    mass: '< 1 eV/c²', massEv: 1, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '1/2',
    forces: ['faible', 'gravitation'],
    antiparticle: 'antineutrino électronique (ν̄e)', discovered: '1956, par Cowan et Reines',
    note: 'Sans charge et presque sans masse, il ne ressent que l’interaction faible : des milliards traversent votre main chaque seconde sans rien toucher.',
  },
  {
    id: 'muon', symbol: 'μ⁻', name: 'Muon', family: 'lepton', generation: 2,
    mass: '105,7 MeV/c²', massEv: 1.057e8, charge: '−1', chargeValue: -1,
    color: false, colorNote: 'aucune', spin: '1/2',
    forces: ['faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'antimuon (μ⁺)', discovered: '1936, dans les rayons cosmiques',
    note: 'Un électron 207 fois plus lourd, et rien d’autre. « Qui a commandé ça ? » a demandé le physicien Isidor Rabi.',
  },
  {
    id: 'nu-mu', symbol: 'νμ', name: 'Neutrino muonique', family: 'lepton', generation: 2,
    mass: '< 1 eV/c²', massEv: 1, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '1/2',
    forces: ['faible', 'gravitation'],
    antiparticle: 'antineutrino muonique (ν̄μ)', discovered: '1962, à Brookhaven',
    note: 'Sa découverte a prouvé qu’il existe plusieurs saveurs de neutrinos, et non une seule.',
  },
  {
    id: 'tau', symbol: 'τ⁻', name: 'Tau', family: 'lepton', generation: 3,
    mass: '1,777 GeV/c²', massEv: 1.777e9, charge: '−1', chargeValue: -1,
    color: false, colorNote: 'aucune', spin: '1/2',
    forces: ['faible', 'electromagnetique', 'gravitation'],
    antiparticle: 'antitau (τ⁺)', discovered: '1975, au SLAC',
    note: 'Assez lourd pour se désintégrer en hadrons : le seul lepton qui puisse le faire.',
  },
  {
    id: 'nu-tau', symbol: 'ντ', name: 'Neutrino tauique', family: 'lepton', generation: 3,
    mass: '< 1 eV/c²', massEv: 1, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '1/2',
    forces: ['faible', 'gravitation'],
    antiparticle: 'antineutrino tauique (ν̄τ)', discovered: '2000, expérience DONUT au Fermilab',
    note: 'Le dernier fermion du tableau à avoir été observé directement.',
  },
  // ---------------------------------------------------- bosons de jauge
  {
    id: 'gluon', symbol: 'g', name: 'Gluon', family: 'gauge',
    mass: '0', massEv: 0, charge: '0', chargeValue: 0,
    color: true, colorNote: 'oui — et c’est unique : il porte lui-même la charge qu’il transmet', spin: '1',
    forces: ['forte'],
    antiparticle: 'lui-même (les 8 gluons forment un ensemble fermé)', discovered: '1979, au collisionneur PETRA',
    note: 'Il transmet l’interaction forte. Comme il porte de la couleur, les gluons interagissent entre eux : c’est pourquoi on ne peut jamais isoler un quark.',
  },
  {
    id: 'photon', symbol: 'γ', name: 'Photon', family: 'gauge',
    mass: '0', massEv: 0, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '1',
    forces: ['electromagnetique'],
    antiparticle: 'lui-même', discovered: '1905 (Einstein), confirmé en 1923 par Compton',
    note: 'Sans masse, il voyage exactement à c. Il transmet l’électromagnétisme : toute la lumière, tous les liens chimiques.',
  },
  {
    id: 'z', symbol: 'Z⁰', name: 'Boson Z', family: 'gauge',
    mass: '91,19 GeV/c²', massEv: 9.119e10, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '1',
    forces: ['faible'],
    antiparticle: 'lui-même', discovered: '1983, au CERN',
    note: 'Sa masse énorme explique pourquoi l’interaction faible est faible : un médiateur aussi lourd ne porte qu’à très courte distance.',
  },
  {
    id: 'w', symbol: 'W±', name: 'Boson W', family: 'gauge',
    mass: '80,4 GeV/c²', massEv: 8.04e10, charge: '±1', chargeValue: 1,
    color: false, colorNote: 'aucune', spin: '1',
    forces: ['faible', 'electromagnetique'],
    antiparticle: 'W⁻ est l’antiparticule de W⁺', discovered: '1983, au CERN',
    note: 'Le seul médiateur chargé : c’est lui qui change la saveur d’un quark ou d’un lepton, donc lui qui rend la désintégration bêta possible.',
  },
  // ------------------------------------------------------ boson scalaire
  {
    id: 'higgs', symbol: 'H', name: 'Boson de Higgs', family: 'scalar',
    mass: '125,25 GeV/c²', massEv: 1.2525e11, charge: '0', chargeValue: 0,
    color: false, colorNote: 'aucune', spin: '0',
    forces: ['faible', 'gravitation'],
    antiparticle: 'lui-même', discovered: '2012, par ATLAS et CMS au LHC',
    note: 'Le seul boson de spin 0. Ce n’est pas lui qui donne la masse, mais le champ dont il est l’excitation : plus une particule s’y couple fort, plus elle est lourde.',
  },
];

const FAMILY_LABEL: Record<Family, string> = {
  quark: 'Quark',
  lepton: 'Lepton',
  gauge: 'Boson de jauge',
  scalar: 'Boson scalaire',
};

const FAMILY_STYLE: Record<Family, { chip: string; tile: string; text: string }> = {
  quark:  { chip: 'bg-gold-100 text-gold-800',    tile: 'bg-gold-50 border-gold-300',       text: 'text-gold-800' },
  lepton: { chip: 'bg-ardoise-100 text-ardoise-800', tile: 'bg-ardoise-50 border-ardoise-300', text: 'text-ardoise-800' },
  gauge:  { chip: 'bg-terre-100 text-terre-800',  tile: 'bg-terre-50 border-terre-300',     text: 'text-terre-800' },
  scalar: { chip: 'bg-prune-100 text-prune-800',  tile: 'bg-prune-50 border-prune-300',     text: 'text-prune-800' },
};

const FORCE_LABEL: Record<Force, string> = {
  forte: 'Interaction forte',
  faible: 'Interaction faible',
  electromagnetique: 'Électromagnétisme',
  gravitation: 'Gravitation',
};

const MODES: { id: Mode; label: string; legend: string }[] = [
  { id: 'famille', label: 'Familles', legend: 'Les fermions composent la matière ; les bosons transmettent les interactions.' },
  { id: 'charge', label: 'Charge électrique', legend: 'Seules les particules chargées ressentent l’électromagnétisme. Les quarks ont des charges fractionnaires — on ne les observe jamais seuls.' },
  { id: 'couleur', label: 'Charge de couleur', legend: 'La charge de l’interaction forte. Seuls les quarks et les gluons en portent, et rien de coloré ne peut exister isolément.' },
  { id: 'spin', label: 'Spin', legend: 'Spin demi-entier : fermion, soumis au principe d’exclusion. Spin entier : boson, plusieurs peuvent occuper le même état.' },
  { id: 'masse', label: 'Masse', legend: 'Échelle logarithmique. Du neutrino au quark top, il y a onze ordres de grandeur.' },
  { id: 'interactions', label: 'Interactions', legend: 'Choisissez une interaction : les particules qui la ressentent restent en évidence.' },
];

const GEN_LABEL: Record<1 | 2 | 3, string> = { 1: 'Ire', 2: 'IIe', 3: 'IIIe' };

const LOG_MAX = Math.log10(2e11);

function massFraction(p: Particle): number {
  if (p.massEv <= 0) return 0;
  return Math.max(0.04, Math.log10(p.massEv) / LOG_MAX);
}

function isBoson(p: Particle): boolean {
  return p.family === 'gauge' || p.family === 'scalar';
}

function byId(id: string): Particle {
  return PARTICLES.find((p) => p.id === id)!;
}

export function StandardModelSimulator() {
  const [mode, setMode] = useState<Mode>('famille');
  const [force, setForce] = useState<Force>('forte');
  const [selectedId, setSelectedId] = useState<string>('up');

  const selected = byId(selectedId);
  const activeMode = MODES.find((m) => m.id === mode)!;

  /** La particule est-elle mise en évidence dans le mode courant ? */
  const isHighlighted = (p: Particle): boolean => {
    switch (mode) {
      case 'couleur': return p.color;
      case 'interactions': return p.forces.includes(force);
      default: return true;
    }
  };

  const cell = (p: Particle) => {
    const style = FAMILY_STYLE[p.family];
    const dim = !isHighlighted(p);
    const isSelected = p.id === selectedId;

    return (
      <button
        key={p.id}
        onClick={() => setSelectedId(p.id)}
        aria-pressed={isSelected}
        className={[
          'relative w-full rounded-lg border px-2 py-2.5 text-left transition-all',
          style.tile,
          isSelected ? 'ring-2 ring-offset-1 ring-stone-800 shadow-md' : 'hover:shadow-sm',
          dim ? 'opacity-25' : 'opacity-100',
        ].join(' ')}
      >
        <div className="flex items-baseline justify-between gap-1">
          <span className={`text-xl font-semibold leading-none ${style.text}`}>
            {p.symbol}
          </span>
          {mode === 'charge' && (
            <span className="text-[11px] font-mono text-stone-600">{p.charge}</span>
          )}
          {mode === 'spin' && (
            <span className="text-[11px] font-mono text-stone-600">{p.spin}</span>
          )}
          {mode === 'couleur' && p.color && (
            <span className="flex gap-0.5" aria-label="porte une charge de couleur">
              <span className="w-1.5 h-1.5 rounded-full bg-brun-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-olive-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-ardoise-500" />
            </span>
          )}
        </div>

        <div className="text-[10px] text-stone-600 mt-1 leading-tight truncate">
          {p.name}
        </div>

        {mode === 'masse' && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-stone-700"
                style={{ width: `${massFraction(p) * 100}%` }}
              />
            </div>
            <div className="text-[9px] font-mono text-stone-500 mt-0.5">{p.mass}</div>
          </div>
        )}
      </button>
    );
  };

  // Position de chaque particule dans le tableau. On place tout explicitement
  // plutôt que de compter sur le placement automatique de la grille : avec des
  // cellules qui couvrent plusieurs rangées, le résultat devient vite fragile.
  const PLACEMENT: Record<string, string> = {
    up: 'col-start-2 row-start-1',    charm: 'col-start-3 row-start-1',   top: 'col-start-4 row-start-1',
    down: 'col-start-2 row-start-2',  strange: 'col-start-3 row-start-2', bottom: 'col-start-4 row-start-2',
    electron: 'col-start-2 row-start-3', muon: 'col-start-3 row-start-3', tau: 'col-start-4 row-start-3',
    'nu-e': 'col-start-2 row-start-4',   'nu-mu': 'col-start-3 row-start-4', 'nu-tau': 'col-start-4 row-start-4',
    gluon: 'col-start-5 row-start-1', photon: 'col-start-5 row-start-2',
    z: 'col-start-5 row-start-3',     w: 'col-start-5 row-start-4',
    higgs: 'col-start-6 row-start-2 row-span-2 self-center',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Le Modèle standard des particules
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Dix-sept particules élémentaires, et tout ce qui existe en découle.
          Cliquez sur l&apos;une d&apos;elles pour ses propriétés ; changez de
          mode pour voir ce qui sépare vraiment les familles.
        </p>
      </div>

      {/* Modes de lecture */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'interactions' && (
        <div className="flex flex-wrap gap-2 -mt-2">
          {(['forte', 'electromagnetique', 'faible', 'gravitation'] as Force[]).map((f) => (
            <button
              key={f}
              onClick={() => setForce(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                force === f
                  ? 'bg-ocre-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {FORCE_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-stone-700 bg-stone-50 border-l-4 border-stone-400 rounded-r-lg px-4 py-2">
        {activeMode.legend}
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Le tableau */}
        <div className="lg:col-span-2 overflow-x-auto">
          <div className="min-w-[540px]">
            {/* En-têtes de colonnes */}
            <div className="grid grid-cols-[auto_repeat(3,1fr)_1fr_1fr] gap-2 mb-2 items-end">
              <div />
              {(['Ire', 'IIe', 'IIIe'] as const).map((g) => (
                <div key={g} className="text-center text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {g} génération
                </div>
              ))}
              <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-terre-700">
                Bosons de jauge
              </div>
              <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-prune-700">
                Scalaire
              </div>
            </div>

            <div className="grid grid-cols-[auto_repeat(3,1fr)_1fr_1fr] gap-2">
              <div className="col-start-1 row-start-1 row-span-2 flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-700 [writing-mode:vertical-rl] rotate-180">
                  Quarks
                </span>
              </div>
              <div className="col-start-1 row-start-3 row-span-2 flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ardoise-700 [writing-mode:vertical-rl] rotate-180">
                  Leptons
                </span>
              </div>

              {PARTICLES.map((p) => (
                <div key={p.id} className={PLACEMENT[p.id]}>
                  {cell(p)}
                </div>
              ))}
            </div>

            {/* Légende des familles */}
            <div className="flex flex-wrap gap-2 mt-4">
              {(Object.keys(FAMILY_LABEL) as Family[]).map((f) => (
                <span
                  key={f}
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${FAMILY_STYLE[f].chip}`}
                >
                  {FAMILY_LABEL[f]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Fiche de la particule sélectionnée */}
        <div className="space-y-3">
          <div className={`rounded-xl border-2 p-4 ${FAMILY_STYLE[selected.family].tile}`}>
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-semibold ${FAMILY_STYLE[selected.family].text}`}>
                {selected.symbol}
              </span>
              <div>
                <div className="font-semibold text-stone-800">{selected.name}</div>
                <div className="text-xs text-stone-600">
                  {FAMILY_LABEL[selected.family]}
                  {selected.generation && ` · ${GEN_LABEL[selected.generation]} génération`}
                </div>
              </div>
            </div>
          </div>

          <dl className="text-sm divide-y divide-stone-100">
            {[
              ['Masse', selected.mass],
              ['Charge électrique', `${selected.charge} e`],
              ['Charge de couleur', selected.color ? `Oui — ${selected.colorNote}` : 'Aucune'],
              ['Spin', `${selected.spin} — ${isBoson(selected) ? 'boson' : 'fermion'}`],
              ['Antiparticule', selected.antiparticle],
              ['Découverte', selected.discovered],
            ].map(([k, v]) => (
              <div key={k} className="py-2 flex gap-3 justify-between">
                <dt className="text-stone-500 shrink-0">{k}</dt>
                <dd className="text-stone-900 text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <div className="text-stone-500 text-sm mb-1.5">Interactions ressenties</div>
            <div className="flex flex-wrap gap-1.5">
              {(['forte', 'electromagnetique', 'faible', 'gravitation'] as Force[]).map((f) => {
                const felt = selected.forces.includes(f);
                return (
                  <span
                    key={f}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      felt
                        ? 'bg-olive-100 text-olive-800'
                        : 'bg-stone-100 text-stone-400 line-through'
                    }`}
                  >
                    {FORCE_LABEL[f]}
                  </span>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 rounded-lg p-3">
            {selected.note}
          </p>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Ce qui distingue les familles
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Fermions et bosons</h4>
            <BlockMath math="s = \tfrac{1}{2},\tfrac{3}{2},\dots \;\text{vs}\; s = 0,1,2,\dots" />
            <p className="text-gold-700 mt-2">
              Le spin décide de tout : les fermions obéissent au principe
              d&apos;exclusion et s&apos;empilent, ce qui donne de la matière
              solide. Les bosons s&apos;entassent dans le même état, ce qui
              donne des champs.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Quarks et leptons</h4>
            <p className="text-ardoise-700">
              Les deux sont des fermions. La différence tient à un seul point :
              les quarks portent une charge de couleur, les leptons non. C&apos;est
              pourquoi les quarks sont toujours prisonniers d&apos;un hadron,
              alors qu&apos;un électron se promène seul.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Charge de couleur</h4>
            <p className="text-brun-700">
              Rien à voir avec la couleur visible : c&apos;est la charge de
              l&apos;interaction forte, en trois valeurs. Seules les combinaisons
              neutres — trois couleurs, ou couleur plus anticouleur — peuvent
              exister librement.
            </p>
          </div>
          <div className="bg-terre-50 rounded-lg p-4">
            <h4 className="font-medium text-terre-800 mb-2">Portée et masse du médiateur</h4>
            <BlockMath math="R \sim \frac{\hbar}{m c}" />
            <p className="text-terre-700 mt-2">
              Photon et gluon sont sans masse ; W et Z pèsent près de cent fois
              le proton. D&apos;où une interaction faible confinée à l&apos;intérieur
              du noyau, et un électromagnétisme de portée infinie.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Les trois générations</h4>
            <p className="text-prune-700">
              Les deuxième et troisième générations copient la première, en plus
              lourd, et se désintègrent aussitôt. Toute la matière stable tient
              dans la première colonne. Pourquoi il y en a exactement trois reste
              sans réponse.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Ce qui manque</h4>
            <p className="text-olive-700">
              Le Modèle standard n&apos;inclut pas la gravitation, ne dit rien de
              la matière noire et n&apos;explique pas pourquoi les neutrinos ont
              une masse. C&apos;est la théorie la mieux vérifiée de la physique,
              et on sait qu&apos;elle est incomplète.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Masses et propriétés d&apos;après les valeurs moyennes du{' '}
          <InlineMath math="\text{Particle Data Group}" />. Pour les neutrinos,
          seules des limites supérieures sont connues.
        </p>
      </div>
    </div>
  );
}

export default StandardModelSimulator;
