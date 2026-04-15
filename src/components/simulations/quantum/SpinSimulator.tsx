'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { hbar, CONSTANTS_INFO } from '@/lib/physics-constants';

// ---------------------------------------------------------------------------
// Collapsible panel (même pattern que les autres simulateurs quantiques)
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
// Constant tooltip
// ---------------------------------------------------------------------------

function ConstantTooltip({ symbol }: { symbol: 'hbar' | 'me' | 'eV' }) {
  const info = CONSTANTS_INFO[symbol];
  return (
    <span className="relative group inline-block cursor-help border-b border-dashed border-gray-500">
      <InlineMath math={info.latex} />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg z-50">
        {info.name}: {info.value} {info.unit}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Atom {
  x: number;          // position horizontale (pixels)
  y: number;          // position verticale (pixels)
  vx: number;         // vitesse horizontale
  vy: number;         // vitesse verticale (acquise dans l'aimant)
  spin: 1 | -1;       // +1/2 ou -1/2 (projection sur z)
  landed: boolean;    // a touché l'écran
  active: boolean;    // encore dans la simulation
}

// ---------------------------------------------------------------------------
// Main component — Expérience de Stern-Gerlach
// ---------------------------------------------------------------------------

export function SpinSimulator() {
  const [gradient, setGradient] = useState(1.0);   // force du gradient ∂B/∂z (sans dimension UI)
  const [mode, setMode] = useState<'classical' | 'quantum'>('quantum');
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atomsRef = useRef<Atom[]>([]);
  const animIdRef = useRef<number | null>(null);
  const spawnCounterRef = useRef(0);
  const hitsRef = useRef<number[]>([]); // positions y des impacts sur l'écran

  // Géométrie (pixels)
  const W = 700;
  const H = 400;
  const sourceX = 60;
  const magnetX0 = 200;
  const magnetX1 = 420;
  const screenX = 640;
  const midY = H / 2;

  // ------ Animation loop ------------------------------------------------
  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Spawn new atoms periodically
    spawnCounterRef.current += 1;
    if (spawnCounterRef.current % 4 === 0 && atomsRef.current.length < 300) {
      // Petite dispersion verticale à la source (jet thermique)
      const y0 = midY + (Math.random() - 0.5) * 8;
      const spin: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      atomsRef.current.push({
        x: sourceX,
        y: y0,
        vx: 2.2,
        vy: 0,
        spin,
        landed: false,
        active: true,
      });
    }

    // Update atoms
    for (const a of atomsRef.current) {
      if (!a.active) continue;
      a.x += a.vx;
      a.y += a.vy;

      // Déflexion à l'intérieur de l'aimant
      if (a.x >= magnetX0 && a.x <= magnetX1) {
        if (mode === 'quantum') {
          // Force proportionnelle à m_s (±1/2) ⇒ deux directions
          a.vy += a.spin * 0.035 * gradient;
        } else {
          // Classique : projection aléatoire uniforme entre -1 et +1
          // On fixe une projection par atome (stockée dans vx via un hack? non, utilisons un champ)
          // Astuce : on réutilise spin stocké comme valeur continue — on le remplace au 1er contact
          if ((a as unknown as { classicalMu?: number }).classicalMu === undefined) {
            (a as unknown as { classicalMu?: number }).classicalMu = (Math.random() * 2 - 1);
          }
          const mu = (a as unknown as { classicalMu?: number }).classicalMu!;
          a.vy += mu * 0.035 * gradient;
        }
      }

      // Collision avec l'écran
      if (a.x >= screenX && !a.landed) {
        a.landed = true;
        a.active = false;
        hitsRef.current.push(a.y);
        if (hitsRef.current.length > 2000) hitsRef.current.shift();
      }

      // Sortie de la zone
      if (a.x > W || a.y < 0 || a.y > H) a.active = false;
    }

    // Nettoyage : garder uniquement les atomes encore en vol
    atomsRef.current = atomsRef.current.filter((a) => a.active);

    // ---- Dessin ----
    // Fond
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Source (four)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(sourceX - 30, midY - 20, 30, 40);
    ctx.fillStyle = '#fde68a';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Four', sourceX - 15, midY + 38);

    // Aimant (gradient B non-uniforme)
    // Pole Nord (haut) en bleu, Pole Sud (bas) en rouge
    const mY0 = midY - 70;
    const mY1 = midY + 70;
    // Pole Nord profilé (forme concave)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(magnetX0, mY0);
    ctx.lineTo(magnetX1, mY0);
    ctx.lineTo(magnetX1, midY - 30);
    ctx.quadraticCurveTo((magnetX0 + magnetX1) / 2, midY - 10, magnetX0, midY - 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('N', (magnetX0 + magnetX1) / 2, mY0 + 22);

    // Pole Sud plat
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(magnetX0, midY + 30, magnetX1 - magnetX0, mY1 - (midY + 30));
    ctx.fillStyle = '#fff';
    ctx.fillText('S', (magnetX0 + magnetX1) / 2, mY1 - 8);

    // Axe z
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(magnetX0 - 20, midY);
    ctx.lineTo(magnetX0 - 20, mY0 - 10);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('z', magnetX0 - 30, mY0 - 12);
    // Flèche
    ctx.beginPath();
    ctx.moveTo(magnetX0 - 24, mY0 - 6);
    ctx.lineTo(magnetX0 - 20, mY0 - 14);
    ctx.lineTo(magnetX0 - 16, mY0 - 6);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    // Écran de détection
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX, 20, 10, H - 40);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(screenX, 20, 10, H - 40);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.font = '11px sans-serif';
    ctx.fillText('Écran', screenX + 5, H - 6);

    // Impacts accumulés
    for (const y of hitsRef.current) {
      ctx.fillStyle = mode === 'quantum' ? '#22c55e' : '#eab308';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(screenX + 5, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Histogramme à droite de l'écran
    const binCount = 40;
    const binH = (H - 40) / binCount;
    const bins = new Array(binCount).fill(0);
    for (const y of hitsRef.current) {
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor((y - 20) / binH)));
      bins[idx]++;
    }
    const maxBin = Math.max(1, ...bins);
    for (let i = 0; i < binCount; i++) {
      const barLen = (bins[i] / maxBin) * 40;
      ctx.fillStyle = mode === 'quantum' ? '#22c55e' : '#eab308';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(screenX + 12, 20 + i * binH, barLen, binH - 0.5);
    }
    ctx.globalAlpha = 1.0;

    // Atomes en vol
    for (const a of atomsRef.current) {
      if (!a.active) continue;
      ctx.fillStyle = a.spin === 1 ? '#60a5fa' : '#f472b6';
      if (mode === 'classical') ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Légende mode
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      mode === 'quantum' ? 'Mode quantique : spin 1/2' : 'Mode classique : moment continu',
      12,
      20,
    );

    if (running) animIdRef.current = requestAnimationFrame(step);
  }, [gradient, mode, running]);

  useEffect(() => {
    if (running) {
      animIdRef.current = requestAnimationFrame(step);
    }
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [running, step]);

  const resetSim = () => {
    atomsRef.current = [];
    hitsRef.current = [];
    spawnCounterRef.current = 0;
  };

  // ------ Render --------------------------------------------------------
  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Le spin de l&apos;électron
        </h2>
        <p className="text-gray-600">
          Expérience de Stern &amp; Gerlach &mdash; 1922
        </p>
      </div>

      {/* Canvas */}
      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        {/* Controls */}
        <div className="w-full max-w-[700px] space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Gradient <InlineMath math={`\\partial B / \\partial z`} />
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={gradient}
              onChange={(e) => setGradient(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">
              {gradient.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                onClick={() => { setMode('quantum'); resetSim(); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'quantum' ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Quantique (spin 1/2)
              </button>
              <button
                onClick={() => { setMode('classical'); resetSim(); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'classical' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Classique
              </button>
            </div>

            <button
              onClick={() => setRunning((r) => !r)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>

            <button
              onClick={resetSim}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              ↺ Réinitialiser
            </button>
          </div>
        </div>

        {/* Constantes */}
        <div className="flex gap-6 text-gray-600 text-sm">
          <span>
            Constantes : <ConstantTooltip symbol="hbar" />,{' '}
            <ConstantTooltip symbol="me" />,{' '}
            <ConstantTooltip symbol="eV" />
          </span>
          <span className="text-xs text-gray-500">
            ℏ/2 = {(hbar / 2).toExponential(2)} J·s
          </span>
        </div>
      </div>

      {/* Collapsible panels */}
      <div className="space-y-2">
        {/* 1. Problématique */}
        <CollapsiblePanel
          title="1. L'énigme du moment magnétique"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
          defaultOpen
        >
          <p className="text-gray-700">
            En 1922, <strong>Otto Stern</strong> et <strong>Walther Gerlach</strong> font passer
            un faisceau d&apos;atomes d&apos;argent à travers un champ magnétique inhomogène.
            La force exercée sur chaque atome dépend de la projection{' '}
            <InlineMath math={`\\mu_z`} /> de son moment magnétique sur l&apos;axe{' '}
            <InlineMath math={`z`} /> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`F_z = \\mu_z \\, \\frac{\\partial B_z}{\\partial z}`} />
          </div>
          <p className="text-gray-700">
            En physique classique, <InlineMath math={`\\mu_z`} /> peut prendre toutes les
            valeurs entre <InlineMath math={`-|\\mu|`} /> et <InlineMath math={`+|\\mu|`} /> :
            on s&apos;attend à une <strong>bande continue</strong> sur l&apos;écran.
          </p>
        </CollapsiblePanel>

        {/* 2. Résultat */}
        <CollapsiblePanel
          title="2. Le résultat : deux taches"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            Le résultat expérimental contredit la prédiction classique : seules{' '}
            <strong>deux taches discrètes</strong> apparaissent, symétriques par rapport
            à la direction initiale. La projection du moment magnétique est{' '}
            <em>quantifiée</em> et ne prend que deux valeurs.
          </p>
          <p className="text-gray-700">
            En 1925, <strong>Uhlenbeck</strong> et <strong>Goudsmit</strong> interprètent ce
            résultat en introduisant une nouvelle propriété intrinsèque de l&apos;électron :
            le <strong>spin</strong>, moment cinétique propre sans équivalent classique.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`S_z = m_s\\,\\hbar, \\qquad m_s = \\pm \\tfrac{1}{2}`} />
          </div>
        </CollapsiblePanel>

        {/* 3. Moment magnétique de spin */}
        <CollapsiblePanel
          title="3. Moment magnétique et facteur de Landé"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            Au moment cinétique de spin est associé un moment magnétique :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\boldsymbol{\\mu}_S = -g_s\\,\\frac{e}{2m_e}\\,\\mathbf{S}, \\qquad g_s \\approx 2`} />
          </div>
          <p className="text-gray-700">
            Le facteur <InlineMath math={`g_s \\approx 2`} /> (et non 1 comme pour le moment
            orbital) est une prédiction naturelle de l&apos;équation de{' '}
            <strong>Dirac</strong> (1928). La projection sur <InlineMath math={`z`} /> vaut :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\mu_{S,z} = \\mp g_s\\,\\mu_B\\,m_s, \\quad \\mu_B = \\frac{e\\hbar}{2m_e}`} />
          </div>
          <p className="text-gray-700">
            <InlineMath math={`\\mu_B`} /> est le <strong>magnéton de Bohr</strong>,
            l&apos;unité naturelle du moment magnétique atomique.
          </p>
        </CollapsiblePanel>

        {/* 4. Superposition et mesure */}
        <CollapsiblePanel
          title="4. Superposition et mesure quantique"
          borderColor="border-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-800"
        >
          <p className="text-gray-700">
            L&apos;état de spin d&apos;un électron est un vecteur à deux composantes
            (spineur) dans la base <InlineMath math={`\\{|\\uparrow\\rangle, |\\downarrow\\rangle\\}`} /> :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`|\\psi\\rangle = \\alpha\\,|\\uparrow\\rangle + \\beta\\,|\\downarrow\\rangle, \\quad |\\alpha|^2 + |\\beta|^2 = 1`} />
          </div>
          <p className="text-gray-700">
            Une mesure de <InlineMath math={`S_z`} /> donne <InlineMath math={`+\\hbar/2`} />{' '}
            avec probabilité <InlineMath math={`|\\alpha|^2`} />, ou{' '}
            <InlineMath math={`-\\hbar/2`} /> avec probabilité <InlineMath math={`|\\beta|^2`} />.
            L&apos;atome est ensuite <strong>projeté</strong> sur l&apos;état correspondant :
            deux Stern-Gerlach successifs selon le même axe donnent toujours le même résultat.
          </p>
        </CollapsiblePanel>

        {/* 5. Contexte historique */}
        <CollapsiblePanel
          title="5. Contexte historique"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            L&apos;expérience est réalisée à Francfort en février 1922. L&apos;argent est
            choisi car son unique électron de valence (5s) porte seul le moment magnétique
            de l&apos;atome. Stern reçoit le prix Nobel en 1943.
          </p>
          <p className="text-gray-700">
            Le spin n&apos;a pas d&apos;analogue classique : ce n&apos;est pas une rotation
            de l&apos;électron sur lui-même (cette image conduirait à une vitesse de surface
            supérieure à <InlineMath math={`c`} />). C&apos;est un degré de liberté
            purement quantique, relativiste, sans équivalent mécanique.
          </p>
          <p className="text-gray-700">
            Le spin est à la base de la <strong>structure fine</strong> des spectres
            atomiques, du <strong>principe de Pauli</strong> (et donc de la chimie), du
            magnétisme, de la <strong>RMN</strong>, de l&apos;<strong>IRM</strong>, et de
            la plupart des technologies quantiques modernes.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
