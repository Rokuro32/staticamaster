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
// Configurations prédéfinies
// ---------------------------------------------------------------------------

type LockedPart = 'none' | 'ring' | 'carrier' | 'sun';

interface GearConfig {
  id: string;
  label: string;
  sunTeeth: number;
  planetTeeth: number;
  locked: LockedPart;
  description: string;
}

const CONFIGS: GearConfig[] = [
  {
    id: 'ring_fixed',
    label: 'Couronne fixe',
    sunTeeth: 20,
    planetTeeth: 15,
    locked: 'ring',
    description: 'Réducteur classique : entrée = solaire, sortie = porte-satellites.',
  },
  {
    id: 'carrier_fixed',
    label: 'Porte-satellites fixe',
    sunTeeth: 20,
    planetTeeth: 15,
    locked: 'carrier',
    description: 'Inverseur : le rapport est négatif (sens de rotation inversé).',
  },
  {
    id: 'sun_fixed',
    label: 'Solaire fixe',
    sunTeeth: 20,
    planetTeeth: 15,
    locked: 'sun',
    description: 'Entrée = couronne, sortie = porte-satellites (rapport proche de 1).',
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanetaryGearSimulator() {
  const [configIdx, setConfigIdx] = useState(0);
  const [inputSpeed, setInputSpeed] = useState(60); // tr/min
  const [running, setRunning] = useState(true);
  const [numPlanets, setNumPlanets] = useState(3);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const tRef = useRef(0);

  const W = 700;
  const H = 500;
  const cx = W / 2;
  const cy = H / 2 - 10;

  const config = CONFIGS[configIdx];
  const Zs = config.sunTeeth;
  const Zp = config.planetTeeth;
  const Zr = Zs + 2 * Zp; // couronne = solaire + 2 × satellites

  // Rayons proportionnels aux nombres de dents
  const scale = 2.8;
  const Rs = Zs * scale;         // rayon solaire
  const Rp = Zp * scale;         // rayon satellite
  const Rc = (Zs + Zp) * scale;  // rayon porte-satellites (centre des planètes)
  const Rr = Zr * scale;         // rayon couronne

  // Formule de Willis : ωr - ωc     Zs
  //                     ---------- = - --
  //                     ωs - ωc      Zr
  // Calculer les vitesses selon ce qui est bloqué
  let omegaSun = 0;
  let omegaCarrier = 0;
  let omegaRing = 0;
  let omegaPlanetSelf = 0; // rotation propre du satellite

  const omegaInput = (inputSpeed * Math.PI * 2) / 60; // rad/s

  if (config.locked === 'ring') {
    // Couronne fixe, entrée = solaire
    omegaRing = 0;
    omegaSun = omegaInput;
    // ωc = ωs * Zs / (Zs + Zr)
    omegaCarrier = omegaSun * Zs / (Zs + Zr);
  } else if (config.locked === 'carrier') {
    // Porte-satellites fixe, entrée = solaire
    omegaCarrier = 0;
    omegaSun = omegaInput;
    // ωr = ωs * (-Zs/Zr)
    omegaRing = omegaSun * (-Zs / Zr);
  } else {
    // Solaire fixe, entrée = couronne
    omegaSun = 0;
    omegaRing = omegaInput;
    // ωc = ωr * Zr / (Zs + Zr)
    omegaCarrier = omegaRing * Zr / (Zs + Zr);
  }

  // Rotation propre des satellites (autour de leur propre axe)
  // ωp_self = (ωs - ωc) * Zs / Zp  (engagement avec le solaire)
  omegaPlanetSelf = (omegaSun - omegaCarrier) * Zs / Zp;

  // Rapport de réduction
  let ratio: number;
  let ratioLabel: string;
  if (config.locked === 'ring') {
    ratio = omegaCarrier / omegaSun;
    ratioLabel = 'ω_c / ω_s';
  } else if (config.locked === 'carrier') {
    ratio = omegaRing / omegaSun;
    ratioLabel = 'ω_r / ω_s';
  } else {
    ratio = omegaCarrier / omegaRing;
    ratioLabel = 'ω_c / ω_r';
  }

  const outputSpeed = inputSpeed * ratio;

  // Vitesses pour l'animation (normalisées pour avoir un mouvement visible)
  const animScale = 0.0004;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (running) tRef.current += 1;
    const t = tRef.current;

    const angleSun = omegaSun * animScale * t;
    const angleCarrier = omegaCarrier * animScale * t;
    const anglePlanetSelf = omegaPlanetSelf * animScale * t;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // ---- Couronne (anneau extérieur) ----
    const ringAngle = omegaRing * animScale * t;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ringAngle);

    // Dents intérieures
    ctx.strokeStyle = config.locked === 'ring' ? '#475569' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, Rr, 0, Math.PI * 2);
    ctx.stroke();
    // Dents (petits rectangles)
    for (let i = 0; i < Zr; i++) {
      const a = (Math.PI * 2 * i) / Zr;
      const x1 = (Rr - 6) * Math.cos(a);
      const y1 = (Rr - 6) * Math.sin(a);
      const x2 = (Rr + 2) * Math.cos(a);
      const y2 = (Rr + 2) * Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle = config.locked === 'ring' ? '#64748b' : '#fbbf24';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.restore();

    // Label couronne (fixe dans le canvas)
    ctx.fillStyle = config.locked === 'ring' ? '#64748b' : '#fbbf24';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Couronne Z_r=${Zr}${config.locked === 'ring' ? ' (fixe)' : ''}`,
      cx, cy - Rr - 14,
    );

    // ---- Porte-satellites (bras) ----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleCarrier);

    // Bras du porte-satellites
    ctx.strokeStyle = config.locked === 'carrier' ? '#475569' : '#22c55e';
    ctx.lineWidth = 3;
    for (let i = 0; i < numPlanets; i++) {
      const a = (Math.PI * 2 * i) / numPlanets;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Rc * Math.cos(a), Rc * Math.sin(a));
      ctx.stroke();
    }
    // Centre du porte-satellites
    ctx.fillStyle = config.locked === 'carrier' ? '#475569' : '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // ---- Satellites (planètes) ----
    for (let i = 0; i < numPlanets; i++) {
      const a = (Math.PI * 2 * i) / numPlanets;
      const px = Rc * Math.cos(a);
      const py = Rc * Math.sin(a);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-anglePlanetSelf); // sens opposé (engrènement)

      // Cercle
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, Rp, 0, Math.PI * 2);
      ctx.stroke();

      // Dents
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      for (let j = 0; j < Zp; j++) {
        const da = (Math.PI * 2 * j) / Zp;
        ctx.beginPath();
        ctx.moveTo((Rp - 4) * Math.cos(da), (Rp - 4) * Math.sin(da));
        ctx.lineTo((Rp + 3) * Math.cos(da), (Rp + 3) * Math.sin(da));
        ctx.stroke();
      }

      // Marque radiale (pour voir la rotation propre)
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Rp * 0.8, 0);
      ctx.stroke();

      // Centre
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore(); // fin du repère porte-satellites

    // ---- Solaire (centre) ----
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleSun);

    ctx.strokeStyle = config.locked === 'sun' ? '#475569' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, Rs, 0, Math.PI * 2);
    ctx.stroke();

    // Dents
    for (let i = 0; i < Zs; i++) {
      const a = (Math.PI * 2 * i) / Zs;
      ctx.beginPath();
      ctx.moveTo((Rs - 4) * Math.cos(a), (Rs - 4) * Math.sin(a));
      ctx.lineTo((Rs + 3) * Math.cos(a), (Rs + 3) * Math.sin(a));
      ctx.stroke();
    }

    // Marque radiale
    ctx.strokeStyle = config.locked === 'sun' ? '#64748b' : '#fca5a5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Rs * 0.8, 0);
    ctx.stroke();

    // Centre
    ctx.fillStyle = config.locked === 'sun' ? '#475569' : '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // ---- Labels fixes ----
    ctx.fillStyle = config.locked === 'sun' ? '#64748b' : '#fca5a5';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Solaire Z_s=${Zs}${config.locked === 'sun' ? ' (fixe)' : ''}`,
      cx, cy + Rs + 20,
    );

    ctx.fillStyle = '#c4b5fd';
    ctx.fillText(`Satellites Z_p=${Zp} × ${numPlanets}`, cx + Rr + 25, cy);

    ctx.fillStyle = config.locked === 'carrier' ? '#64748b' : '#86efac';
    ctx.fillText(
      `Porte-sat.${config.locked === 'carrier' ? ' (fixe)' : ''}`,
      cx, cy + 4,
    );

    // ---- Infos temps réel ----
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Entrée : ${inputSpeed.toFixed(0)} tr/min`, 14, 22);
    ctx.fillText(`Sortie : ${outputSpeed.toFixed(1)} tr/min`, 14, 42);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Rapport i = ${ratio.toFixed(4)}`, 14, 62);

    // Couleur selon sens
    ctx.fillStyle = ratio < 0 ? '#ef4444' : '#22c55e';
    ctx.fillText(ratio < 0 ? '↻ Sens inversé' : '↺ Même sens', 14, 82);

    animIdRef.current = requestAnimationFrame(draw);
  }, [
    config, Zs, Zp, Zr, Rs, Rp, Rc, Rr, numPlanets,
    omegaSun, omegaCarrier, omegaRing, omegaPlanetSelf,
    inputSpeed, outputSpeed, ratio, running, animScale,
  ]);

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [draw]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Train planétaire (épicycloïdal)
        </h2>
        <p className="text-gray-600">
          Engrenages planétaires &mdash; rapport de réduction et formule de Willis
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Configuration */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Élément bloqué :</span>
            {CONFIGS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setConfigIdx(i)}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  configIdx === i
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{config.description}</p>

          {/* Vitesse d'entrée */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Vitesse entrée
            </label>
            <input type="range" min={10} max={200} step={5} value={inputSpeed}
              onChange={(e) => setInputSpeed(Number(e.target.value))}
              className="flex-1 accent-red-500" />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">{inputSpeed} tr/min</span>
          </div>

          {/* Nombre de satellites */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-32">
              Nombre de satellites
            </label>
            <input type="range" min={2} max={5} step={1} value={numPlanets}
              onChange={(e) => setNumPlanets(Number(e.target.value))}
              className="flex-1 accent-purple-500" />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">{numPlanets}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRunning(r => !r)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>
          </div>

          {/* Résumé numérique */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm grid grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>Z<sub>s</sub></strong> = {Zs} dents (solaire)</div>
            <div><strong>Z<sub>p</sub></strong> = {Zp} dents (satellites)</div>
            <div><strong>Z<sub>r</sub></strong> = {Zr} dents (couronne)</div>
            <div>
              <strong>Rapport</strong>{' '}
              <InlineMath math={ratioLabel} /> = <span className="font-mono font-bold">{ratio.toFixed(4)}</span>
            </div>
            <div><strong>ω entrée</strong> = {inputSpeed} tr/min</div>
            <div><strong>ω sortie</strong> = <span className="font-mono font-bold">{outputSpeed.toFixed(1)}</span> tr/min</div>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Composition d'un train planétaire"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un train épicycloïdal (ou planétaire) est composé de :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong className="text-red-600">Solaire</strong> (pignon central) : <InlineMath math="Z_s" /> dents.</li>
            <li><strong className="text-purple-600">Satellites</strong> (planètes) : <InlineMath math="Z_p" /> dents, montés sur le porte-satellites.</li>
            <li><strong className="text-yellow-600">Couronne</strong> (anneau externe, denture intérieure) : <InlineMath math="Z_r" /> dents.</li>
            <li><strong className="text-green-600">Porte-satellites</strong> : bras portant les axes des satellites.</li>
          </ul>
          <p className="text-gray-700">
            Condition géométrique :{' '}
            <InlineMath math={`Z_r = Z_s + 2\\,Z_p`} /> (les satellites s&apos;insèrent exactement entre le solaire et la couronne).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Formule de Willis"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            La relation fondamentale (formule de Willis) relie les vitesses angulaires
            des trois composants :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\frac{\\omega_r - \\omega_c}{\\omega_s - \\omega_c} = -\\frac{Z_s}{Z_r}`} />
          </div>
          <p className="text-gray-700">
            En fixant un élément (ω = 0), on obtient le rapport de transmission.
            Le signe négatif indique que le solaire et la couronne tournent en sens
            opposés (vue depuis le porte-satellites).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Trois configurations"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-green-700">Couronne fixe (<InlineMath math="\omega_r = 0" />) :</p>
              <div className="bg-gray-100 rounded p-2 overflow-x-auto">
                <BlockMath math={`\\frac{\\omega_c}{\\omega_s} = \\frac{Z_s}{Z_s + Z_r} = \\frac{${Zs}}{${Zs + Zr}} \\approx ${(Zs / (Zs + Zr)).toFixed(4)}`} />
              </div>
              <p className="text-gray-700 text-xs">Réducteur — rapport toujours &lt; 1, même sens.</p>
            </div>
            <div>
              <p className="font-semibold text-green-700">Porte-satellites fixe (<InlineMath math="\omega_c = 0" />) :</p>
              <div className="bg-gray-100 rounded p-2 overflow-x-auto">
                <BlockMath math={`\\frac{\\omega_r}{\\omega_s} = -\\frac{Z_s}{Z_r} = -\\frac{${Zs}}{${Zr}} \\approx ${(-Zs / Zr).toFixed(4)}`} />
              </div>
              <p className="text-gray-700 text-xs">Inverseur — rapport négatif (sens inversé).</p>
            </div>
            <div>
              <p className="font-semibold text-green-700">Solaire fixe (<InlineMath math="\omega_s = 0" />) :</p>
              <div className="bg-gray-100 rounded p-2 overflow-x-auto">
                <BlockMath math={`\\frac{\\omega_c}{\\omega_r} = \\frac{Z_r}{Z_s + Z_r} = \\frac{${Zr}}{${Zs + Zr}} \\approx ${(Zr / (Zs + Zr)).toFixed(4)}`} />
              </div>
              <p className="text-gray-700 text-xs">Rapport proche de 1, même sens.</p>
            </div>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            Les trains planétaires sont omniprésents :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong>Boîtes de vitesses automatiques</strong> : différents rapports obtenus en bloquant différents éléments via des embrayages.</li>
            <li><strong>Différentiel automobile</strong> : répartit le couple entre les roues gauche et droite.</li>
            <li><strong>Réducteurs industriels</strong> : couple élevé dans un volume compact (éoliennes, robots).</li>
            <li><strong>Tournevis électriques</strong> et perceuses à plusieurs vitesses.</li>
            <li><strong>Aéronautique</strong> : réducteur du turboréacteur à double flux (Pratt &amp; Whitney PW1000G).</li>
          </ul>
          <p className="text-gray-700">
            Avantage clé : la charge est répartie sur <InlineMath math="n" /> satellites
            en parallèle, ce qui permet de transmettre un <strong>couple élevé</strong> dans
            un encombrement réduit.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
