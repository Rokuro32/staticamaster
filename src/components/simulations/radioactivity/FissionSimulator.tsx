'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// CollapsiblePanel
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
// Types
// ---------------------------------------------------------------------------

interface Nucleon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  proton: boolean;
}

interface Fragment {
  nucleons: Nucleon[];
  cx: number;
  cy: number;
  vx: number;
  vy: number;
}

interface Neutron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

interface Flash {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

type Phase = 'idle' | 'incoming' | 'fission' | 'chain';

// ---------------------------------------------------------------------------
// Réactions de fission prédéfinies
// ---------------------------------------------------------------------------

interface FissionReaction {
  id: string;
  label: string;
  target: { symbol: string; A: number; Z: number };
  frag1: { symbol: string; A: number; Z: number };
  frag2: { symbol: string; A: number; Z: number };
  neutrons: number;
  energy: string;
  latex: string;
}

const REACTIONS: FissionReaction[] = [
  {
    id: 'u235_kr_ba',
    label: 'U-235 → Kr + Ba',
    target: { symbol: '²³⁵U', A: 235, Z: 92 },
    frag1: { symbol: '⁹²Kr', A: 92, Z: 36 },
    frag2: { symbol: '¹⁴¹Ba', A: 141, Z: 56 },
    neutrons: 3,
    energy: '~200 MeV',
    latex: '^{235}_{\\,92}\\text{U} + n \\to {}^{92}_{36}\\text{Kr} + {}^{141}_{\\,56}\\text{Ba} + 3n + \\text{énergie}',
  },
  {
    id: 'u235_sr_xe',
    label: 'U-235 → Sr + Xe',
    target: { symbol: '²³⁵U', A: 235, Z: 92 },
    frag1: { symbol: '⁹⁴Sr', A: 94, Z: 38 },
    frag2: { symbol: '¹⁴⁰Xe', A: 140, Z: 54 },
    neutrons: 2,
    energy: '~200 MeV',
    latex: '^{235}_{\\,92}\\text{U} + n \\to {}^{94}_{38}\\text{Sr} + {}^{140}_{\\,54}\\text{Xe} + 2n + \\text{énergie}',
  },
  {
    id: 'pu239',
    label: 'Pu-239 → Sr + Ba',
    target: { symbol: '²³⁹Pu', A: 239, Z: 94 },
    frag1: { symbol: '⁹⁰Sr', A: 90, Z: 38 },
    frag2: { symbol: '¹⁴⁷Ba', A: 147, Z: 56 },
    neutrons: 3,
    energy: '~210 MeV',
    latex: '^{239}_{\\,94}\\text{Pu} + n \\to {}^{90}_{38}\\text{Sr} + {}^{147}_{\\,56}\\text{Ba} + 3n + \\text{énergie}',
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FissionSimulator() {
  const [reactionIdx, setReactionIdx] = useState(0);
  const [chainMode, setChainMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>('idle');
  const animIdRef = useRef<number | null>(null);
  const tRef = useRef(0);

  // Objets de la simulation
  const nucleusRef = useRef<Nucleon[]>([]);
  const fragmentsRef = useRef<Fragment[]>([]);
  const neutronsRef = useRef<Neutron[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  const incomingRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const W = 700;
  const H = 400;
  const cx = W / 2;
  const cy = H / 2;

  const reaction = REACTIONS[reactionIdx];

  // Construire le noyau cible (position aléatoire dans un disque)
  const buildNucleus = useCallback(() => {
    const total = reaction.target.A;
    const Z = reaction.target.Z;
    const R = 8 + Math.sqrt(total) * 2.5;
    const nucs: Nucleon[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i++) {
      const r = R * Math.sqrt(i / Math.max(1, total - 1));
      const theta = i * golden;
      nucs.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        proton: i < Z,
      });
    }
    return nucs;
  }, [reaction, cx, cy]);

  const reset = useCallback(() => {
    nucleusRef.current = buildNucleus();
    fragmentsRef.current = [];
    neutronsRef.current = [];
    flashesRef.current = [];
    phaseRef.current = 'idle';
    tRef.current = 0;
  }, [buildNucleus]);

  const fireFission = useCallback(() => {
    reset();
    phaseRef.current = 'incoming';
    incomingRef.current = { x: 30, y: cy + (Math.random() - 0.5) * 10, vx: 4, vy: 0 };
  }, [reset, cy]);

  // Animation
  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    tRef.current++;
    const t = tRef.current;

    const phase = phaseRef.current;

    // --- Update ---

    if (phase === 'incoming') {
      incomingRef.current.x += incomingRef.current.vx;
      // Collision avec le noyau ?
      const dx = incomingRef.current.x - cx;
      const dy = incomingRef.current.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 45) {
        // Déclencher la fission
        phaseRef.current = 'fission';
        tRef.current = 0;

        // Flash
        flashesRef.current.push({ x: cx, y: cy, r: 10, opacity: 1 });

        // Séparer le noyau en 2 fragments
        const nucs = nucleusRef.current;
        const half = Math.floor(nucs.length * 0.4);
        const f1Nucs = nucs.slice(0, half).map(n => ({ ...n, vx: -2 - Math.random(), vy: (Math.random() - 0.5) * 2 }));
        const f2Nucs = nucs.slice(half).map(n => ({ ...n, vx: 2 + Math.random(), vy: (Math.random() - 0.5) * 2 }));

        fragmentsRef.current = [
          { nucleons: f1Nucs, cx: cx - 20, cy, vx: -1.8, vy: -0.5 },
          { nucleons: f2Nucs, cx: cx + 20, cy, vx: 1.8, vy: 0.5 },
        ];
        nucleusRef.current = [];

        // Neutrons émis
        for (let i = 0; i < reaction.neutrons; i++) {
          const angle = (Math.PI * 2 * i) / reaction.neutrons + Math.random() * 0.5;
          neutronsRef.current.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * (3 + Math.random() * 2),
            vy: Math.sin(angle) * (3 + Math.random() * 2),
            active: true,
          });
        }
      }
    }

    if (phase === 'fission' || phase === 'chain') {
      // Fragments s'éloignent
      for (const f of fragmentsRef.current) {
        f.cx += f.vx;
        f.cy += f.vy;
        for (const n of f.nucleons) {
          n.x += f.vx + n.vx * 0.1;
          n.y += f.vy + n.vy * 0.1;
        }
      }

      // Neutrons
      for (const n of neutronsRef.current) {
        if (!n.active) continue;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20 || n.x > W + 20 || n.y < -20 || n.y > H + 20) {
          n.active = false;
        }
      }

      // Flashes
      for (const f of flashesRef.current) {
        f.r += 3;
        f.opacity -= 0.025;
      }
      flashesRef.current = flashesRef.current.filter(f => f.opacity > 0);
    }

    // Jiggle nucleus
    if (phase === 'idle') {
      for (const n of nucleusRef.current) {
        n.x += n.vx;
        n.y += n.vy;
        // Confiner
        const dx = n.x - cx;
        const dy = n.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const R = 8 + Math.sqrt(reaction.target.A) * 2.5;
        if (dist > R) {
          n.vx -= dx * 0.01;
          n.vy -= dy * 0.01;
        }
        n.vx += (Math.random() - 0.5) * 0.1;
        n.vy += (Math.random() - 0.5) * 0.1;
        n.vx *= 0.95;
        n.vy *= 0.95;
      }
    }

    // --- Draw ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Flashes
    for (const f of flashesRef.current) {
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grad.addColorStop(0, `rgba(253, 224, 71, ${f.opacity})`);
      grad.addColorStop(0.5, `rgba(251, 146, 60, ${f.opacity * 0.5})`);
      grad.addColorStop(1, `rgba(239, 68, 68, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Noyau cible
    for (const n of nucleusRef.current) {
      ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fragments
    for (const frag of fragmentsRef.current) {
      for (const n of frag.nucleons) {
        ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Neutron incident
    if (phase === 'incoming') {
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(incomingRef.current.x, incomingRef.current.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cffafe';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('n', incomingRef.current.x + 8, incomingRef.current.y + 3);
    }

    // Neutrons émis
    for (const n of neutronsRef.current) {
      if (!n.active) continue;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    if (phase === 'idle') {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(reaction.target.symbol, cx, cy + 55);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Cliquez « Lancer » pour envoyer un neutron', cx, H - 20);
    }

    if ((phase === 'fission' || phase === 'chain') && t > 30 && fragmentsRef.current.length >= 2) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const f1 = fragmentsRef.current[0];
      const f2 = fragmentsRef.current[1];
      ctx.fillText(reaction.frag1.symbol, f1.cx, f1.cy + 40);
      ctx.fillText(reaction.frag2.symbol, f2.cx, f2.cy + 40);

      // Énergie
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Énergie libérée : ${reaction.energy}`, cx, 28);
    }

    // Légende
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(14, 16, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Proton', 24, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(14, 34, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Neutron', 24, 38);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(14, 52, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('n incident/émis', 24, 56);

    animIdRef.current = requestAnimationFrame(step);
  }, [reaction, cx, cy, chainMode]);

  useEffect(() => {
    reset();
    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [step, reset]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Fission nucléaire</h2>
        <p className="text-gray-600">
          Capture d&apos;un neutron et fragmentation du noyau lourd
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Réaction */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Réaction :</span>
            {REACTIONS.map((r, i) => (
              <button
                key={r.id}
                onClick={() => { setReactionIdx(i); }}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  reactionIdx === i
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fireFission}
              className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Lancer un neutron
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              ↺ Réinitialiser
            </button>
          </div>

          {/* Équation */}
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={reaction.latex} />
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Principe de la fission"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un neutron lent (<strong>thermique</strong>, ~0,025 eV) est capturé par un noyau
            lourd fissile (²³⁵U, ²³⁹Pu). Le noyau composé formé est instable : il se
            déforme et se scinde en <strong>deux fragments</strong> de masse intermédiaire,
            tout en libérant 2 à 3 neutrons et une énergie cinétique considérable.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`^{235}_{\\,92}\\text{U} + n \\to \\text{Fragments} + 2\\text{-}3\\,n + \\sim 200\\,\\text{MeV}`} />
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Bilan énergétique"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
        >
          <p className="text-gray-700">
            L&apos;énergie libérée provient du <strong>défaut de masse</strong>{' '}
            (<InlineMath math="E = \Delta m \cdot c^2" />). L&apos;énergie de liaison par
            nucléon est plus grande pour les fragments (~8,5 MeV/A) que pour l&apos;uranium
            (~7,6 MeV/A). La différence est convertie en énergie cinétique des fragments,
            des neutrons et des rayonnements γ.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\Delta E = \\left[m(\\text{U}) + m(n) - m(\\text{frag}_1) - m(\\text{frag}_2) - k\\,m(n)\\right]\\,c^2`} />
          </div>
          <p className="text-gray-700">
            1 g d&apos;²³⁵U fissionné libère environ <strong>82 TJ</strong>, soit
            l&apos;équivalent de 20 tonnes de TNT.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Réaction en chaîne"
          borderColor="border-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-800"
        >
          <p className="text-gray-700">
            Chaque fission libère 2 à 3 neutrons. Si au moins un de ces neutrons provoque
            une nouvelle fission, la réaction s&apos;auto-entretient : c&apos;est la{' '}
            <strong>réaction en chaîne</strong>. Le facteur de multiplication est :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`k = \\frac{\\text{neutrons génération } n+1}{\\text{neutrons génération } n}`} />
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><InlineMath math="k < 1" /> : réaction sous-critique (s&apos;éteint)</li>
            <li><InlineMath math="k = 1" /> : réaction critique (régime stationnaire — <strong>réacteur</strong>)</li>
            <li><InlineMath math="k > 1" /> : réaction surcritique (emballement — <strong>bombe</strong>)</li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            <strong>Centrales nucléaires</strong> : fission contrôlée (k = 1) avec modérateur
            (eau, graphite) et barres de contrôle (cadmium, bore) pour absorber les neutrons
            en excès. ~440 réacteurs dans le monde, ~10 % de l&apos;électricité mondiale.
          </p>
          <p className="text-gray-700">
            <strong>Sous-marins et porte-avions</strong> : propulsion nucléaire compacte.
            <strong> Médecine</strong> : production de radio-isotopes (⁹⁹Mo → ⁹⁹ᵐTc) dans
            les réacteurs de recherche.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
