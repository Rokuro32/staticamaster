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
// Réactions de fusion
// ---------------------------------------------------------------------------

interface FusionReaction {
  id: string;
  label: string;
  nuc1: { symbol: string; Z: number; N: number; color: string };
  nuc2: { symbol: string; Z: number; N: number; color: string };
  product: { symbol: string; Z: number; N: number };
  byproduct: string;       // particule émise (neutron, γ, etc.)
  energy: string;
  latex: string;
  tempMin: string;          // température minimale
}

const REACTIONS: FusionReaction[] = [
  {
    id: 'dd',
    label: 'D + D',
    nuc1: { symbol: 'D', Z: 1, N: 1, color: '#3b82f6' },
    nuc2: { symbol: 'D', Z: 1, N: 1, color: '#60a5fa' },
    product: { symbol: '³He', Z: 2, N: 1 },
    byproduct: 'n (2,45 MeV)',
    energy: '3,27 MeV',
    latex: '^2_1\\text{D} + {}^2_1\\text{D} \\to {}^3_2\\text{He} + n + 3{,}27\\,\\text{MeV}',
    tempMin: '~40 keV (~4×10⁸ K)',
  },
  {
    id: 'dt',
    label: 'D + T',
    nuc1: { symbol: 'D', Z: 1, N: 1, color: '#3b82f6' },
    nuc2: { symbol: 'T', Z: 1, N: 2, color: '#f472b6' },
    product: { symbol: '⁴He', Z: 2, N: 2 },
    byproduct: 'n (14,1 MeV)',
    energy: '17,6 MeV',
    latex: '^2_1\\text{D} + {}^3_1\\text{T} \\to {}^4_2\\text{He} + n + 17{,}6\\,\\text{MeV}',
    tempMin: '~10 keV (~10⁸ K)',
  },
  {
    id: 'pp',
    label: 'p + p (Soleil)',
    nuc1: { symbol: 'p', Z: 1, N: 0, color: '#ef4444' },
    nuc2: { symbol: 'p', Z: 1, N: 0, color: '#f87171' },
    product: { symbol: 'D', Z: 1, N: 1 },
    byproduct: 'e⁺ + νₑ',
    energy: '0,42 MeV',
    latex: 'p + p \\to {}^2_1\\text{D} + e^+ + \\nu_e + 0{,}42\\,\\text{MeV}',
    tempMin: '~15 × 10⁶ K (cœur solaire)',
  },
];

// ---------------------------------------------------------------------------
// Types animation
// ---------------------------------------------------------------------------

type Phase = 'approach' | 'barrier' | 'fusion' | 'done';

interface Nucleon {
  x: number;
  y: number;
  proton: boolean;
}

interface Flash {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FusionSimulator() {
  const [reactionIdx, setReactionIdx] = useState(1); // D+T par défaut
  const [temperature, setTemperature] = useState(1.0); // facteur 0..2

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const phaseRef = useRef<Phase>('approach');
  const flashesRef = useRef<Flash[]>([]);
  const productRef = useRef<Nucleon[]>([]);
  const neutronRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const W = 700;
  const H = 400;
  const midX = W / 2;
  const midY = H / 2;

  const reaction = REACTIONS[reactionIdx];

  // Positions de départ des deux noyaux
  const startX1 = 120;
  const startX2 = W - 120;

  const resetSim = useCallback(() => {
    tRef.current = 0;
    phaseRef.current = 'approach';
    flashesRef.current = [];
    productRef.current = [];
    neutronRef.current = null;
  }, []);

  useEffect(() => {
    resetSim();
  }, [reactionIdx, resetSim]);

  const buildNucleons = (cx: number, cy: number, Z: number, N: number): Nucleon[] => {
    const total = Z + N;
    const nucs: Nucleon[] = [];
    const R = 4 + Math.sqrt(total) * 6;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i++) {
      const r = total === 1 ? 0 : R * Math.sqrt(i / (total - 1));
      const theta = i * golden + tRef.current * 0.02;
      nucs.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
        proton: i < Z,
      });
    }
    return nucs;
  };

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    tRef.current++;
    const t = tRef.current;
    const phase = phaseRef.current;

    // Vitesse d'approche proportionnelle à la "température"
    const speed = 0.8 + temperature * 1.2;

    // Positions des deux noyaux pendant l'approche
    const progress = Math.min(1, (t * speed) / 250);
    const x1 = startX1 + progress * (midX - 20 - startX1);
    const x2 = startX2 - progress * (startX2 - midX - 20);

    // Barrière coulombienne
    const dist = x2 - x1;

    if (phase === 'approach' && dist < 50) {
      phaseRef.current = 'barrier';
    }

    if (phase === 'barrier') {
      // Si température suffisante → fusion, sinon rebond
      if (temperature > 0.5 && dist < 30) {
        phaseRef.current = 'fusion';
        tRef.current = 0;
        flashesRef.current.push({ x: midX, y: midY, r: 5, opacity: 1 });

        // Construire le produit
        const pZ = reaction.product.Z;
        const pN = reaction.product.N;
        productRef.current = buildNucleons(midX, midY, pZ, pN);

        // Neutron/byproduct émis
        const angle = Math.random() * Math.PI * 2;
        neutronRef.current = {
          x: midX, y: midY,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5,
        };
      } else if (temperature <= 0.5 && t > 300) {
        // Rebond : reset
        resetSim();
      }
    }

    if (phase === 'fusion') {
      // Flashes
      for (const f of flashesRef.current) {
        f.r += 2.5;
        f.opacity -= 0.015;
      }
      flashesRef.current = flashesRef.current.filter(f => f.opacity > 0);

      // Neutron
      if (neutronRef.current) {
        neutronRef.current.x += neutronRef.current.vx;
        neutronRef.current.y += neutronRef.current.vy;
      }

      if (t > 200) phaseRef.current = 'done';
    }

    // --- Draw ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Fond plasma
    if (temperature > 0.3) {
      const grad = ctx.createRadialGradient(midX, midY, 20, midX, midY, 250);
      const alpha = Math.min(0.15, temperature * 0.08);
      grad.addColorStop(0, `rgba(251, 146, 60, ${alpha})`);
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Flashes
    for (const f of flashesRef.current) {
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grad.addColorStop(0, `rgba(253, 224, 71, ${f.opacity})`);
      grad.addColorStop(0.4, `rgba(251, 146, 60, ${f.opacity * 0.6})`);
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Noyaux pendant l'approche / barrière
    if (phase === 'approach' || phase === 'barrier') {
      const n1 = reaction.nuc1;
      const n2 = reaction.nuc2;

      // Barrière coulombienne (arc répulsif)
      if (dist < 120) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 1 - dist / 120)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc((x1 + x2) / 2, midY, dist / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `rgba(239, 68, 68, ${Math.max(0, 0.6 - dist / 120)})`;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Barrière coulombienne', (x1 + x2) / 2, midY - dist / 2 - 10);
      }

      // Noyau 1
      const nucs1 = buildNucleons(x1, midY, n1.Z, n1.N);
      for (const n of nucs1) {
        ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n1.symbol, x1, midY + 40);

      // Noyau 2
      const nucs2 = buildNucleons(x2, midY, n2.Z, n2.N);
      for (const n of nucs2) {
        ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(n2.symbol, x2, midY + 40);

      // Température basse → label "trop froid"
      if (temperature <= 0.5 && phase === 'barrier') {
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('Température insuffisante — les noyaux se repoussent', midX, 30);
      }
    }

    // Produit de fusion
    if (phase === 'fusion' || phase === 'done') {
      for (const n of productRef.current) {
        ctx.fillStyle = n.proton ? '#ef4444' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(reaction.product.symbol, midX, midY + 45);

      // Neutron / sous-produit
      if (neutronRef.current) {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(neutronRef.current.x, neutronRef.current.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cffafe';
        ctx.font = '11px sans-serif';
        ctx.fillText(reaction.byproduct, neutronRef.current.x, neutronRef.current.y - 12);
      }

      // Énergie
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`Énergie libérée : ${reaction.energy}`, midX, 28);
    }

    // Température jauge
    ctx.fillStyle = '#334155';
    ctx.fillRect(W - 40, 40, 14, H - 80);
    const tH = (H - 80) * Math.min(1, temperature / 2);
    const tGrad = ctx.createLinearGradient(0, H - 40, 0, H - 40 - tH);
    tGrad.addColorStop(0, '#22c55e');
    tGrad.addColorStop(0.5, '#f59e0b');
    tGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = tGrad;
    ctx.fillRect(W - 40, H - 40 - tH, 14, tH);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('T', W - 33, H - 20);

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

    animIdRef.current = requestAnimationFrame(step);
  }, [reaction, temperature, midX, midY, startX1, startX2, resetSim]);

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [step]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Fusion nucléaire</h2>
        <p className="text-gray-600">
          Assemblage de noyaux légers &mdash; source d&apos;énergie des étoiles
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
                onClick={() => setReactionIdx(i)}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  reactionIdx === i
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Température */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Température <InlineMath math="T" />
            </label>
            <input
              type="range" min={0} max={2} step={0.05}
              value={temperature}
              onChange={(e) => { setTemperature(Number(e.target.value)); resetSim(); }}
              className="flex-1 accent-orange-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">
              {temperature < 0.5 ? 'Froid' : temperature < 1 ? 'Chaud' : 'Plasma'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetSim}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              ↺ Relancer
            </button>
          </div>

          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={reaction.latex} />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Température minimale requise : {reaction.tempMin}
          </p>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Principe de la fusion"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Deux noyaux légers, portés à <strong>très haute température</strong>
            (≥ 10⁷ K), acquièrent assez d&apos;énergie cinétique pour vaincre
            la <strong>répulsion coulombienne</strong> et fusionner en un noyau plus
            lourd. L&apos;énergie de liaison par nucléon augmente (courbe d&apos;Aston) :
            la masse du produit est inférieure à la somme des masses des réactifs.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\Delta E = \\left[m_1 + m_2 - m_{\\text{produit}} - m_{\\text{sous-produit}}\\right] c^2 > 0`} />
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Barrière coulombienne"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
        >
          <p className="text-gray-700">
            Les noyaux, de charges <InlineMath math="Z_1 e" /> et{' '}
            <InlineMath math="Z_2 e" />, se repoussent électriquement. L&apos;énergie
            potentielle coulombienne à surmonter vaut :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`E_C = \\frac{Z_1 Z_2 e^2}{4\\pi\\varepsilon_0 \\, r_0} \\sim \\text{MeV}`} />
          </div>
          <p className="text-gray-700">
            D&apos;où la nécessité de températures extrêmes (plasma) ou de
            l&apos;effet tunnel quantique (qui permet à la réaction p+p de se
            produire même à « seulement » 15 × 10⁶ K au cœur du Soleil).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Fusion dans les étoiles"
          borderColor="border-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-800"
        >
          <p className="text-gray-700">
            Le Soleil convertit 4 protons en un noyau d&apos;hélium-4 via la{' '}
            <strong>chaîne proton-proton</strong> (pp). Le bilan net est :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`4\\,p \\to {}^4_2\\text{He} + 2\\,e^+ + 2\\,\\nu_e + 26{,}7\\,\\text{MeV}`} />
          </div>
          <p className="text-gray-700">
            Le Soleil fusionne ~620 millions de tonnes d&apos;hydrogène par seconde,
            convertissant ~4,3 Mt en énergie pure (<InlineMath math="E = mc^2" />).
            Les étoiles massives utilisent aussi le <strong>cycle CNO</strong>.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Fusion contrôlée sur Terre"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            La réaction <strong>D + T</strong> est la plus accessible car elle a la
            section efficace la plus élevée et la barrière coulombienne la plus basse.
            Deux approches :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>Confinement magnétique</strong> (tokamak) : plasma piégé par des
              champs magnétiques intenses. Projet <strong>ITER</strong> (France, 2035).
            </li>
            <li>
              <strong>Confinement inertiel</strong> : compression d&apos;une microbille
              de DT par lasers puissants (NIF, USA — ignition démontrée en 2022).
            </li>
          </ul>
          <p className="text-gray-700">
            La fusion ne produit pas de déchets à longue vie et utilise un combustible
            quasi-illimité (deutérium de l&apos;eau de mer).
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
