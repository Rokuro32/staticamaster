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
// Types de rayonnement et matériaux
// ---------------------------------------------------------------------------

interface RadiationType {
  id: string;
  label: string;
  color: string;
  symbol: string;
  // Épaisseurs de pénétration relative dans chaque matériau (px pour la simulation)
  penetration: Record<string, number>;
}

const RADIATIONS: RadiationType[] = [
  {
    id: 'alpha',
    label: 'Alpha (α)',
    color: '#ef4444',
    symbol: '⁴₂He²⁺',
    penetration: { air: 80, paper: 5, aluminium: 0, lead: 0, concrete: 0 },
  },
  {
    id: 'beta',
    label: 'Bêta (β)',
    color: '#3b82f6',
    symbol: 'e⁻ / e⁺',
    penetration: { air: 200, paper: 120, aluminium: 15, lead: 0, concrete: 0 },
  },
  {
    id: 'gamma',
    label: 'Gamma (γ)',
    color: '#a855f7',
    symbol: 'γ',
    penetration: { air: 400, paper: 400, aluminium: 350, lead: 60, concrete: 100 },
  },
  {
    id: 'neutron',
    label: 'Neutron (n)',
    color: '#64748b',
    symbol: 'n',
    penetration: { air: 400, paper: 350, aluminium: 300, lead: 250, concrete: 40 },
  },
];

interface ShieldMaterial {
  id: string;
  label: string;
  color: string;
  thickness: number; // épaisseur en px
}

const SHIELDS: ShieldMaterial[] = [
  { id: 'air',       label: 'Air',          color: '#e0f2fe', thickness: 0 },
  { id: 'paper',     label: 'Papier',       color: '#fef3c7', thickness: 30 },
  { id: 'aluminium', label: 'Aluminium',    color: '#d1d5db', thickness: 40 },
  { id: 'lead',      label: 'Plomb',        color: '#475569', thickness: 50 },
  { id: 'concrete',  label: 'Béton',        color: '#a8a29e', thickness: 60 },
];

// ---------------------------------------------------------------------------
// Particule animée
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  type: string;
  color: string;
  active: boolean;
  maxX: number; // limite de pénétration
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RadiationTypesSimulator() {
  const [shieldId, setShieldId] = useState('paper');
  const [activeRadiations, setActiveRadiations] = useState<Set<string>>(
    new Set(['alpha', 'beta', 'gamma']),
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animIdRef = useRef<number | null>(null);
  const spawnRef = useRef(0);

  const W = 700;
  const H = 400;
  const sourceX = 80;
  const shieldX = 320;
  const shield = SHIELDS.find(s => s.id === shieldId)!;

  const toggleRadiation = (id: string) => {
    setActiveRadiations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    particlesRef.current = [];
  };

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    spawnRef.current++;

    // Spawn
    if (spawnRef.current % 3 === 0) {
      for (const rad of RADIATIONS) {
        if (!activeRadiations.has(rad.id)) continue;
        const pen = rad.penetration[shieldId];
        const maxX = shield.thickness > 0 ? shieldX + pen : sourceX + pen;
        particlesRef.current.push({
          x: sourceX + 20,
          y: 100 + RADIATIONS.indexOf(rad) * 70 + (Math.random() - 0.5) * 20,
          vx: 2.5 + Math.random() * 1.5,
          type: rad.id,
          color: rad.color,
          active: true,
          maxX,
        });
      }
    }

    // Update
    for (const p of particlesRef.current) {
      if (!p.active) continue;
      p.x += p.vx;
      if (p.x >= p.maxX || p.x > W) {
        p.active = false;
      }
    }
    // Cleanup
    if (particlesRef.current.length > 500) {
      particlesRef.current = particlesRef.current.filter(p => p.active);
    }

    // Draw
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(sourceX, H / 2, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☢', sourceX, H / 2 + 6);
    ctx.fillStyle = '#fde68a';
    ctx.font = '10px sans-serif';
    ctx.fillText('Source', sourceX, H / 2 + 44);

    // Bouclier
    if (shield.thickness > 0) {
      ctx.fillStyle = shield.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(shieldX, 20, shield.thickness, H - 40);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(shieldX, 20, shield.thickness, H - 40);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shield.label, shieldX + shield.thickness / 2, H - 8);
    }

    // Détecteur
    const detX = shield.thickness > 0 ? shieldX + shield.thickness + 100 : 550;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(detX, 40, 12, H - 80);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(detX, 40, 12, H - 80);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Détecteur', detX + 6, H - 8);

    // Particules
    for (const p of particlesRef.current) {
      if (!p.active) continue;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
      const size = p.type === 'alpha' ? 3.5 : p.type === 'neutron' ? 3 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Labels radiations actives
    let ly = 30;
    for (const rad of RADIATIONS) {
      if (!activeRadiations.has(rad.id)) continue;
      ctx.fillStyle = rad.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${rad.label}`, W - 14, ly);
      ly += 18;
    }

    animIdRef.current = requestAnimationFrame(step);
  }, [shieldId, activeRadiations, shield]);

  useEffect(() => {
    particlesRef.current = [];
    animIdRef.current = requestAnimationFrame(step);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [step]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Types de rayonnements ionisants
        </h2>
        <p className="text-gray-600">
          Pouvoir de pénétration alpha, bêta, gamma et neutrons
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Rayonnements */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Rayonnements :</span>
            {RADIATIONS.map(r => (
              <button
                key={r.id}
                onClick={() => toggleRadiation(r.id)}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  activeRadiations.has(r.id)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
                style={activeRadiations.has(r.id) ? { backgroundColor: r.color } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Matériau */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Blindage :</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              {SHIELDS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setShieldId(s.id); particlesRef.current = []; }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    shieldId === s.id
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Rayonnement alpha (α)"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un noyau <InlineMath math="^4_2\\text{He}" /> (2 protons + 2 neutrons) est éjecté :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`^A_Z\\text{X} \\to {}^{A-4}_{Z-2}\\text{Y} + {}^4_2\\text{He}`} />
          </div>
          <p className="text-gray-700">
            Particule lourde et chargée : <strong>très ionisante</strong> mais{' '}
            <strong>très peu pénétrante</strong>. Arrêtée par une feuille de papier ou
            quelques centimètres d&apos;air. Dangereuse en cas d&apos;ingestion ou
            d&apos;inhalation (irradiation interne).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Rayonnement bêta (β)"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            <strong>β⁻</strong> : un neutron se transforme en proton avec émission
            d&apos;un électron et d&apos;un antineutrino :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`^A_Z\\text{X} \\to {}^{A}_{Z+1}\\text{Y} + e^- + \\bar{\\nu}_e`} />
          </div>
          <p className="text-gray-700">
            <strong>β⁺</strong> : un proton se transforme en neutron avec émission d&apos;un
            positron. Le rayonnement β est arrêté par quelques millimètres d&apos;aluminium.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Rayonnement gamma (γ)"
          borderColor="border-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-800"
        >
          <p className="text-gray-700">
            Photon de haute énergie émis lors de la <strong>désexcitation</strong> d&apos;un
            noyau (souvent après une désintégration α ou β). Pas de changement de{' '}
            <InlineMath math="Z" /> ni de <InlineMath math="A" /> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`^A_Z\\text{X}^* \\to {}^{A}_{Z}\\text{X} + \\gamma`} />
          </div>
          <p className="text-gray-700">
            <strong>Très pénétrant</strong> (onde électromagnétique sans masse ni charge).
            Atténué exponentiellement par la matière dense : plomb, béton épais.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Synthèse : pouvoir de pénétration"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1 px-2 text-left">Rayonnement</th>
                  <th className="py-1 px-2">Papier</th>
                  <th className="py-1 px-2">Aluminium</th>
                  <th className="py-1 px-2">Plomb</th>
                  <th className="py-1 px-2">Béton</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1 px-2 text-left font-medium text-red-600">α</td>
                  <td>✓ arrêté</td><td>✓</td><td>✓</td><td>✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1 px-2 text-left font-medium text-blue-600">β</td>
                  <td>traverse</td><td>✓ arrêté</td><td>✓</td><td>✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1 px-2 text-left font-medium text-purple-600">γ</td>
                  <td>traverse</td><td>traverse</td><td>atténué</td><td>atténué</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-left font-medium text-gray-600">n</td>
                  <td>traverse</td><td>traverse</td><td>traverse</td><td>atténué</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
