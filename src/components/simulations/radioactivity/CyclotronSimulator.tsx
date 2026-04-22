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
// Particules prédéfinies
// ---------------------------------------------------------------------------

interface ParticleDef {
  id: string;
  label: string;
  symbol: string;
  mass: number;   // en unités de masse atomique
  charge: number; // en unités de e
  color: string;
}

const PARTICLES: ParticleDef[] = [
  { id: 'proton',   label: 'Proton',       symbol: 'p',   mass: 1.0,  charge: 1, color: '#ef4444' },
  { id: 'deuteron', label: 'Deutéron',     symbol: 'd',   mass: 2.0,  charge: 1, color: '#3b82f6' },
  { id: 'alpha',    label: 'Alpha (He²⁺)', symbol: 'α',   mass: 4.0,  charge: 2, color: '#f59e0b' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CyclotronSimulator() {
  const [particleIdx, setParticleIdx] = useState(0);
  const [B, setB] = useState(1.5);           // champ magnétique (T)
  const [voltage, setVoltage] = useState(50); // tension accélératrice (kV)
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);

  // État de la particule
  const stateRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    radius: 0,
    turns: 0,
    ejected: false,
    trail: [] as { x: number; y: number }[],
  });

  const W = 700;
  const H = 450;
  const cx = W / 2;
  const cy = H / 2;
  const deeRadius = 160; // rayon max des Dees (pixels)

  const particle = PARTICLES[particleIdx];

  // Facteur de conversion simplifié :
  // rayon cyclotron r = mv / (qB), on normalise pour la visualisation
  // On utilise des unités pixel avec un facteur d'échelle

  const resetSim = useCallback(() => {
    const s = stateRef.current;
    // Départ au centre, vitesse initiale petite vers la droite
    const v0 = 1.5;
    s.x = cx;
    s.y = cy;
    s.vx = v0;
    s.vy = 0;
    s.speed = v0;
    s.radius = 0;
    s.turns = 0;
    s.ejected = false;
    s.trail = [];
  }, [cx, cy]);

  useEffect(() => {
    resetSim();
  }, [particleIdx, B, voltage, resetSim]);

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    if (!s.ejected && running) {
      // Facteur cyclotron : ω = qB/m (normalisé)
      const omega = (particle.charge * B) / (particle.mass * 8); // facteur 8 pour ralentir visuellement
      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      // Force de Lorentz : dv/dt = (q/m)(v × B) avec B selon z (hors du plan)
      // En 2D : ax = ω * vy, ay = -ω * vx
      s.vx += omega * s.vy;
      s.vy -= omega * s.vx;

      // Renormaliser la vitesse (éviter la dérive numérique)
      const newSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (newSpeed > 0) {
        s.vx = (s.vx / newSpeed) * speed;
        s.vy = (s.vy / newSpeed) * speed;
      }

      s.x += s.vx;
      s.y += s.vy;

      // Accélération dans le gap (quand la particule traverse y ≈ cy)
      const prevY = s.y - s.vy;
      const crossedGap = (prevY - cy) * (s.y - cy) < 0;
      if (crossedGap && speed < 20) {
        // Boost de vitesse (simule la tension accélératrice)
        const boost = 1 + (voltage / 500) * (1 / particle.mass);
        s.vx *= boost;
        s.vy *= boost;
        s.turns += 0.5;
      }

      s.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      s.radius = Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2);

      // Trail
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 3000) s.trail.shift();

      // Éjection si dépasse le rayon des Dees
      if (s.radius > deeRadius + 10) {
        s.ejected = true;
      }
    }

    // Continue le mouvement en ligne droite après éjection
    if (s.ejected && running) {
      s.x += s.vx;
      s.y += s.vy;
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 3000) s.trail.shift();
    }

    // --- Dessin ---
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Champ magnétique (symboles × sur fond)
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    for (let gx = 40; gx < W; gx += 50) {
      for (let gy = 40; gy < H; gy += 50) {
        const dist = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);
        if (dist < deeRadius + 30 && dist > 10) {
          ctx.fillText('×', gx, gy + 5);
        }
      }
    }

    // Dees (demi-cercles)
    // Dee supérieur (bleu)
    ctx.beginPath();
    ctx.arc(cx, cy, deeRadius, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dee inférieur (rouge)
    ctx.beginPath();
    ctx.arc(cx, cy, deeRadius, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gap (zone d'accélération)
    ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
    ctx.fillRect(cx - deeRadius, cy - 6, deeRadius * 2, 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx - deeRadius, cy);
    ctx.lineTo(cx + deeRadius, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels Dees
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D₁', cx, cy - deeRadius / 2);
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('D₂', cx, cy + deeRadius / 2 + 6);

    // Gap label
    ctx.fillStyle = '#fde68a';
    ctx.font = '10px sans-serif';
    ctx.fillText('Gap (accélération)', cx, cy - 14);

    // Signes + et -
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('+', cx - deeRadius - 16, cy + 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('−', cx + deeRadius + 12, cy + 5);

    // Trajectoire (trail)
    if (s.trail.length > 1) {
      ctx.lineWidth = 1.5;
      for (let i = 1; i < s.trail.length; i++) {
        const alpha = Math.max(0.05, i / s.trail.length);
        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
        ctx.lineTo(s.trail[i].x, s.trail[i].y);
        ctx.stroke();
      }
    }

    // Particule
    if (s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20) {
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(particle.symbol, s.x, s.y + 3);
    }

    // Flèche B
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B⃗ ⊗ (entrant)', 10, 20);

    // Infos temps réel
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    const Ek = 0.5 * particle.mass * s.speed * s.speed; // unités arbitraires
    ctx.fillText(`Rayon : ${s.radius.toFixed(0)} px`, W - 14, 20);
    ctx.fillText(`Vitesse : ${s.speed.toFixed(1)}`, W - 14, 38);
    ctx.fillText(`Tours : ${Math.floor(s.turns)}`, W - 14, 56);
    ctx.fillText(`Énergie ∝ ${Ek.toFixed(0)}`, W - 14, 74);

    if (s.ejected) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Particule éjectée !', cx, H - 16);
    }

    if (running) {
      animIdRef.current = requestAnimationFrame(step);
    }
  }, [particle, B, voltage, running, cx, cy, deeRadius]);

  useEffect(() => {
    if (running) {
      animIdRef.current = requestAnimationFrame(step);
    }
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [running, step]);

  // Fréquence cyclotron (affichage)
  // f = qB / (2π m) — en unités SI simplifiées
  const amu = 1.661e-27;
  const e = 1.602e-19;
  const fCyclotron = (particle.charge * e * B) / (2 * Math.PI * particle.mass * amu);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Cyclotron</h2>
        <p className="text-gray-600">
          Accélérateur de particules à champ magnétique &mdash; Lawrence, 1932
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Particule */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Particule :</span>
            {PARTICLES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setParticleIdx(i)}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  particleIdx === i
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                style={particleIdx === i ? { backgroundColor: p.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Champ B */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Champ <InlineMath math="B" />
            </label>
            <input
              type="range" min={0.5} max={3.0} step={0.1}
              value={B}
              onChange={(e) => setB(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{B.toFixed(1)} T</span>
          </div>

          {/* Tension */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Tension <InlineMath math="V" />
            </label>
            <input
              type="range" min={10} max={200} step={10}
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{voltage} kV</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRunning(r => !r)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button
              onClick={() => { resetSim(); setRunning(true); }}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              ↺ Réinitialiser
            </button>
          </div>

          {/* Fréquence cyclotron */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm space-y-1">
            <div className="flex gap-6 flex-wrap">
              <div>
                <strong>Fréquence cyclotron :</strong>{' '}
                <span className="font-mono text-blue-700">
                  f = {(fCyclotron / 1e6).toFixed(2)} MHz
                </span>
              </div>
              <div>
                <strong>Période :</strong>{' '}
                <span className="font-mono text-blue-700">
                  T = {(1e9 / fCyclotron).toFixed(1)} ns
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Principe du cyclotron"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Inventé par <strong>Ernest Lawrence</strong> en 1932 (prix Nobel 1939), le
            cyclotron accélère des particules chargées en combinant deux effets :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              Un <strong>champ magnétique uniforme</strong>{' '}
              <InlineMath math="B" /> perpendiculaire au plan des Dees courbe la
              trajectoire en demi-cercles.
            </li>
            <li>
              Un <strong>champ électrique alternatif</strong> dans le gap entre les
              deux Dees accélère la particule à chaque passage.
            </li>
          </ul>
          <p className="text-gray-700">
            La trajectoire est une <strong>spirale</strong> dont le rayon augmente à
            chaque demi-tour.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Fréquence cyclotron"
          borderColor="border-violet-500"
          bgColor="bg-violet-50"
          textColor="text-violet-800"
        >
          <p className="text-gray-700">
            L&apos;équilibre entre la force de Lorentz et la force centrifuge donne le
            rayon cyclotron :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`qvB = \\frac{mv^2}{r} \\quad \\Longrightarrow \\quad r = \\frac{mv}{qB}`} />
          </div>
          <p className="text-gray-700">
            La période de révolution est <strong>indépendante de la vitesse</strong>
            (en régime non-relativiste) :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`T = \\frac{2\\pi m}{qB}, \\qquad f = \\frac{qB}{2\\pi m}`} />
          </div>
          <p className="text-gray-700">
            C&apos;est cette propriété qui permet d&apos;utiliser une tension
            alternative de fréquence <strong>fixe</strong> : la particule arrive
            toujours dans le gap au bon moment.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Énergie cinétique finale"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            À l&apos;éjection (rayon maximal <InlineMath math="R" /> du Dee), l&apos;énergie
            cinétique vaut :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`E_k = \\frac{q^2 B^2 R^2}{2m}`} />
          </div>
          <p className="text-gray-700">
            Elle augmente avec <InlineMath math="B^2" /> et <InlineMath math="R^2" />, mais
            ne dépend pas directement de la tension du gap (qui fixe le nombre de tours
            nécessaires). Pour les protons avec B = 1,5 T et R = 0,5 m :{' '}
            <InlineMath math="E_k \\approx 16\\,\\text{MeV}" />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Limite relativiste et synchrocyclotron"
          borderColor="border-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-800"
        >
          <p className="text-gray-700">
            Lorsque la vitesse approche <InlineMath math="c" />, la masse relativiste{' '}
            <InlineMath math="\gamma m" /> augmente et la fréquence de révolution
            diminue : la particule se désynchronise du champ alternatif.
          </p>
          <p className="text-gray-700">
            Solutions :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong>Synchrocyclotron</strong> : la fréquence RF diminue au cours de
              l&apos;accélération pour compenser <InlineMath math="\gamma" />.
            </li>
            <li>
              <strong>Synchrotron</strong> : le champ magnétique augmente avec l&apos;énergie
              pour maintenir un rayon constant (LHC au CERN : 27 km de circonférence).
            </li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="5. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            <strong>Médecine</strong> : production de radio-isotopes pour le TEP-scan
            (¹⁸F, ¹¹C, ¹³N), protonthérapie (traitement de tumeurs par faisceau de
            protons). <strong>Physique nucléaire</strong> : étude des réactions
            nucléaires, production d&apos;éléments super-lourds.{' '}
            <strong>Industrie</strong> : implantation ionique dans les semi-conducteurs.
          </p>
          <p className="text-gray-700">
            Il existe plus de 1 500 cyclotrons en service dans le monde, la majorité
            dédiés à la médecine nucléaire.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
