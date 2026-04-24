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
// Matériaux prédéfinis (courbes σ–ε simplifiées)
// ---------------------------------------------------------------------------

interface MaterialDef {
  id: string;
  label: string;
  color: string;
  E: number;          // Module d'Young (GPa)
  sigmaY: number;     // Limite élastique (MPa)
  sigmaU: number;     // Résistance ultime (MPa)
  epsY: number;       // Déformation à la limite élastique
  epsU: number;       // Déformation à la rupture
  epsNeck: number;    // Début striction
  brittle: boolean;   // Fragile (pas de plateau plastique)
}

const MATERIALS: MaterialDef[] = [
  {
    id: 'steel',
    label: 'Acier doux (S235)',
    color: '#3b82f6',
    E: 210,
    sigmaY: 235,
    sigmaU: 400,
    epsY: 0.00112,
    epsU: 0.25,
    epsNeck: 0.18,
    brittle: false,
  },
  {
    id: 'aluminium',
    label: 'Aluminium (6061-T6)',
    color: '#10b981',
    E: 69,
    sigmaY: 276,
    sigmaU: 310,
    epsY: 0.004,
    epsU: 0.12,
    epsNeck: 0.09,
    brittle: false,
  },
  {
    id: 'cast_iron',
    label: 'Fonte grise',
    color: '#6b7280',
    E: 120,
    sigmaY: 150,
    sigmaU: 200,
    epsY: 0.00125,
    epsU: 0.006,
    epsNeck: 0.005,
    brittle: true,
  },
  {
    id: 'copper',
    label: 'Cuivre recuit',
    color: '#f59e0b',
    E: 117,
    sigmaY: 70,
    sigmaU: 220,
    epsY: 0.0006,
    epsU: 0.45,
    epsNeck: 0.35,
    brittle: false,
  },
];

// Générer la courbe σ–ε (points) pour un matériau
function generateCurve(m: MaterialDef): { eps: number; sigma: number }[] {
  const pts: { eps: number; sigma: number }[] = [];

  // Phase 1 : élastique linéaire (0 → epsY)
  const nElastic = 40;
  for (let i = 0; i <= nElastic; i++) {
    const eps = (i / nElastic) * m.epsY;
    pts.push({ eps, sigma: m.E * 1000 * eps }); // E en GPa → MPa
  }

  if (m.brittle) {
    // Fragile : légère montée puis rupture nette
    const nBrittle = 20;
    for (let i = 1; i <= nBrittle; i++) {
      const t = i / nBrittle;
      const eps = m.epsY + t * (m.epsU - m.epsY);
      const sigma = m.sigmaY + t * (m.sigmaU - m.sigmaY);
      pts.push({ eps, sigma });
    }
    // Rupture
    pts.push({ eps: m.epsU, sigma: 0 });
  } else {
    // Phase 2 : plateau de plasticité / écrouissage
    const nPlastic = 80;
    for (let i = 1; i <= nPlastic; i++) {
      const t = i / nPlastic;
      const eps = m.epsY + t * (m.epsNeck - m.epsY);
      // Courbe parabolique montante
      const sigma = m.sigmaY + (m.sigmaU - m.sigmaY) * Math.pow(t, 0.5);
      pts.push({ eps, sigma });
    }
    // Phase 3 : striction (chute)
    const nNeck = 30;
    for (let i = 1; i <= nNeck; i++) {
      const t = i / nNeck;
      const eps = m.epsNeck + t * (m.epsU - m.epsNeck);
      const sigma = m.sigmaU * (1 - 0.6 * t * t);
      pts.push({ eps, sigma });
    }
    // Rupture
    pts.push({ eps: m.epsU, sigma: 0 });
  }

  return pts;
}

// ---------------------------------------------------------------------------
// Main component — Essai de traction interactif
// ---------------------------------------------------------------------------

export function TensileTestSimulator() {
  const [materialIdx, setMaterialIdx] = useState(0);
  const [cursorEps, setCursorEps] = useState(0.05); // position du curseur sur ε

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const material = MATERIALS[materialIdx];
  const curve = generateCurve(material);
  const epsMax = material.epsU * 1.15;
  const sigmaMax = material.sigmaU * 1.3;

  // Trouver sigma au curseur
  const findSigma = (eps: number): number => {
    if (eps <= 0) return 0;
    for (let i = 1; i < curve.length; i++) {
      if (curve[i].eps >= eps) {
        const t = (eps - curve[i - 1].eps) / (curve[i].eps - curve[i - 1].eps);
        return curve[i - 1].sigma + t * (curve[i].sigma - curve[i - 1].sigma);
      }
    }
    return 0;
  };

  const cursorSigma = findSigma(cursorEps);

  // Déterminer la zone
  const getZone = (eps: number): string => {
    if (eps <= material.epsY) return 'Domaine élastique';
    if (eps <= material.epsNeck) return 'Écrouissage (plastique)';
    if (eps <= material.epsU) return 'Striction';
    return 'Rupture';
  };

  const getZoneColor = (eps: number): string => {
    if (eps <= material.epsY) return '#22c55e';
    if (eps <= material.epsNeck) return '#f59e0b';
    if (eps <= material.epsU) return '#ef4444';
    return '#6b7280';
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const ml = 70, mr = 30, mt = 30, mb = 60;
    const plotW = W - ml - mr;
    const plotH = H - mt - mb;

    const toX = (eps: number) => ml + (eps / epsMax) * plotW;
    const toY = (sig: number) => mt + plotH - (sig / sigmaMax) * plotH;

    // Grille
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const x = ml + (i / 5) * plotW;
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + plotH); ctx.stroke();
      const y = mt + (i / 5) * plotH;
      ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + plotW, y); ctx.stroke();
    }

    // Zones colorées de fond
    // Élastique
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fillRect(ml, mt, toX(material.epsY) - ml, plotH);
    // Écrouissage
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.fillRect(toX(material.epsY), mt, toX(material.epsNeck) - toX(material.epsY), plotH);
    // Striction
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(toX(material.epsNeck), mt, toX(material.epsU) - toX(material.epsNeck), plotH);

    // Labels zones
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
    if (toX(material.epsY) - ml > 30) {
      ctx.fillText('Élastique', (ml + toX(material.epsY)) / 2, mt + 14);
    }
    ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.fillText('Écrouissage', (toX(material.epsY) + toX(material.epsNeck)) / 2, mt + 14);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.fillText('Striction', (toX(material.epsNeck) + toX(material.epsU)) / 2, mt + 14);

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + plotH);
    ctx.lineTo(ml + plotW, mt + plotH);
    ctx.stroke();

    // Labels axes
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ε (déformation)', ml + plotW / 2, H - 10);
    ctx.save();
    ctx.translate(16, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('σ (MPa)', 0, 0);
    ctx.restore();

    // Graduations
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const eps = (i / 5) * epsMax;
      ctx.fillText(`${(eps * 100).toFixed(1)}%`, toX(eps), mt + plotH + 18);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const sig = (i / 5) * sigmaMax;
      ctx.fillText(`${sig.toFixed(0)}`, ml - 6, toY(sig) + 4);
    }

    // Courbe
    ctx.strokeStyle = material.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const x = toX(curve[i].eps);
      const y = toY(curve[i].sigma);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Ligne σ_Y
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#22c55e80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ml, toY(material.sigmaY));
    ctx.lineTo(ml + plotW, toY(material.sigmaY));
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`σ_Y = ${material.sigmaY} MPa`, ml + plotW - 100, toY(material.sigmaY) - 5);

    // Ligne σ_U
    ctx.strokeStyle = '#ef444480';
    ctx.beginPath();
    ctx.moveTo(ml, toY(material.sigmaU));
    ctx.lineTo(ml + plotW, toY(material.sigmaU));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`σ_U = ${material.sigmaU} MPa`, ml + plotW - 100, toY(material.sigmaU) - 5);

    // Curseur interactif
    const curX = toX(cursorEps);
    const curY = toY(cursorSigma);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, mt + plotH);
    ctx.lineTo(curX, curY);
    ctx.lineTo(ml, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point
    ctx.fillStyle = getZoneColor(cursorEps);
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pente E (droite de décharge)
    if (cursorEps > material.epsY) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const unloadEps = cursorEps - cursorSigma / (material.E * 1000);
      ctx.beginPath();
      ctx.moveTo(toX(unloadEps), toY(0));
      ctx.lineTo(curX, curY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label déformation permanente
      if (unloadEps > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`ε_perm = ${(unloadEps * 100).toFixed(2)}%`, toX(unloadEps), toY(0) + 14);
      }
    }

    // Titre matériau
    ctx.fillStyle = material.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(material.label, ml + 8, mt + plotH - 10);
  }, [material, curve, cursorEps, cursorSigma, epsMax, sigmaMax]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Essai de traction
        </h2>
        <p className="text-gray-600">
          Interpréter une courbe contrainte-déformation <InlineMath math="\sigma" />–<InlineMath math="\varepsilon" />
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={420}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Matériau */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Matériau :</span>
            {MATERIALS.map((m, i) => (
              <button
                key={m.id}
                onClick={() => { setMaterialIdx(i); setCursorEps(m.epsNeck * 0.4); }}
                className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                  materialIdx === i
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                style={materialIdx === i ? { backgroundColor: m.color } : undefined}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Curseur ε */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-28">
              Déformation <InlineMath math="\varepsilon" />
            </label>
            <input type="range" min={0} max={material.epsU} step={material.epsU / 200}
              value={cursorEps}
              onChange={(e) => setCursorEps(Number(e.target.value))}
              className="flex-1 accent-white" />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">
              {(cursorEps * 100).toFixed(2)} %
            </span>
          </div>

          {/* Info point courant */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm flex gap-6 flex-wrap">
            <div>
              <strong>σ =</strong>{' '}
              <span className="font-mono">{cursorSigma.toFixed(1)} MPa</span>
            </div>
            <div>
              <strong>ε =</strong>{' '}
              <span className="font-mono">{(cursorEps * 100).toFixed(3)} %</span>
            </div>
            <div>
              <strong>Zone :</strong>{' '}
              <span className="font-bold" style={{ color: getZoneColor(cursorEps) }}>
                {getZone(cursorEps)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Les zones de la courbe"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
          defaultOpen
        >
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong className="text-green-600">Domaine élastique</strong> :{' '}
              <InlineMath math="\sigma = E \cdot \varepsilon" />. La déformation est
              réversible. La pente donne le module d&apos;Young <InlineMath math="E" />.
            </li>
            <li>
              <strong className="text-yellow-600">Écrouissage</strong> : au-delà de la
              limite élastique <InlineMath math="\sigma_Y" />, la déformation est{' '}
              <strong>permanente</strong> (plastique). Le matériau durcit.
            </li>
            <li>
              <strong className="text-red-600">Striction</strong> : la section se réduit
              localement. La contrainte <em>ingénieur</em> (F/A₀) diminue tandis que la
              contrainte <em>vraie</em> (F/A) continue d&apos;augmenter.
            </li>
            <li>
              <strong>Rupture</strong> à <InlineMath math="\varepsilon_R" />.
            </li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Grandeurs caractéristiques"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`E = \\frac{\\sigma}{\\varepsilon}\\bigg|_{\\text{élast.}}, \\quad \\sigma_Y \\text{ (limite élastique)}, \\quad \\sigma_U \\text{ (résistance ultime)}`} />
          </div>
          <p className="text-gray-700">
            <strong>Allongement à la rupture</strong>{' '}
            <InlineMath math={`A\\% = \\varepsilon_R \\times 100`} /> mesure la{' '}
            <strong>ductilité</strong>. Acier doux : ~25 %, fonte : &lt; 1 %.
          </p>
          <p className="text-gray-700">
            <strong>Résilience</strong> = aire sous la courbe élastique.{' '}
            <strong>Ténacité</strong> = aire totale sous la courbe (énergie absorbée
            avant rupture).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Ductile vs fragile"
          borderColor="border-red-500"
          bgColor="bg-red-50"
          textColor="text-red-800"
        >
          <p className="text-gray-700">
            Un matériau <strong>ductile</strong> (acier, cuivre) se déforme plastiquement
            avant de rompre : la courbe présente un long plateau. Un matériau{' '}
            <strong>fragile</strong> (fonte, verre, céramique) rompt brutalement avec
            très peu de déformation plastique.
          </p>
          <p className="text-gray-700">
            En ingénierie, on choisit souvent un coefficient de sécurité{' '}
            <InlineMath math={`n = \\sigma_Y / \\sigma_{\\text{service}}`} /> pour rester
            dans le domaine élastique (typiquement n = 1,5 à 3).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Droite de décharge"
          borderColor="border-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
        >
          <p className="text-gray-700">
            Si on décharge l&apos;éprouvette après déformation plastique, le retour se
            fait le long d&apos;une droite parallèle à la pente élastique{' '}
            <InlineMath math="E" />. La déformation restante est la{' '}
            <strong>déformation permanente</strong>{' '}
            <InlineMath math="\varepsilon_{\text{perm}}" /> (visible sur le graphique
            en pointillés verts lorsque le curseur est dans le domaine plastique).
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
