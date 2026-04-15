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
// Main component — Bandes d'énergie dans les solides
// ---------------------------------------------------------------------------
// Idée : N atomes identiques, chacun avec deux niveaux E1, E2. Lorsque les
// atomes se rapprochent (distance d diminue), chaque niveau se scinde en N
// niveaux (hybridation) formant une bande de largeur w(d) ∝ exp(-d/d0).
// ---------------------------------------------------------------------------

export function EnergyBandsSimulator() {
  const [N, setN] = useState(8);                 // nombre d'atomes
  const [distance, setDistance] = useState(1.0); // distance interatomique (unités arbitraires, 0 = très proche, 2 = isolé)
  const [materialType, setMaterialType] = useState<'conductor' | 'semiconductor' | 'insulator'>('semiconductor');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Énergies atomiques isolées (eV — illustratif)
  const E1 = -8; // niveau "valence"
  const E2 = -2; // niveau "conduction"

  // Paramètres dépendant du type de matériau (gap final à d = 0)
  const GAP_BY_MATERIAL: Record<typeof materialType, number> = {
    conductor: -1.5,     // recouvrement (bandes qui se chevauchent)
    semiconductor: 1.0,
    insulator: 3.5,
  };

  const drawBands = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Fond
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Axes
    const ml = 70, mr = 40, mt = 30, mb = 60;
    const plotW = W - ml - mr;
    const plotH = H - mt - mb;

    // Échelle d'énergie
    const eMin = -12, eMax = 2;
    const toY = (e: number) => mt + plotH - ((e - eMin) / (eMax - eMin)) * plotH;

    // Axe vertical
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + plotH);
    ctx.lineTo(ml + plotW, mt + plotH);
    ctx.stroke();

    // Graduations
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let e = eMin; e <= eMax; e += 2) {
      const y = toY(e);
      ctx.beginPath();
      ctx.moveTo(ml - 4, y);
      ctx.lineTo(ml, y);
      ctx.stroke();
      ctx.fillText(`${e}`, ml - 7, y + 4);
    }
    ctx.save();
    ctx.translate(18, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Énergie (eV)', 0, 0);
    ctx.restore();

    // Largeur de bande : croît lorsque d diminue (rapprochement)
    // distance ∈ [0.05, 2], à d=2 bande ≈ 0, à d=0.05 largeur max
    const bandWidthMax = 4.0; // eV
    const width = bandWidthMax * Math.exp(-distance * 2.0);

    // Gap final (à d=0) piloté par le type de matériau
    // Le gap effectif = E2 - E1 - width_adjustment
    const gapFinal = GAP_BY_MATERIAL[materialType];
    // À distance = 2 (isolés), gap ≈ E2 - E1 = 6 eV
    // À distance = 0.05, gap → gapFinal
    const t = Math.exp(-distance * 2.0); // 0 → 1 quand distance diminue
    const currentGap = (E2 - E1) * (1 - t) + gapFinal * t;

    const centerLow = E1 + ((E2 - E1) - currentGap) / 2 - 0; // centre bande valence
    const centerHigh = centerLow + (E2 - E1 - ((E2 - E1) - currentGap));
    // Simplification : on recalcule proprement
    const lowCenter = E1;
    const highCenter = E1 + currentGap + (width);

    // Bornes bandes
    const lowMin = lowCenter - width / 2;
    const lowMax = lowCenter + width / 2;
    const highMin = highCenter - width / 2;
    const highMax = highCenter + width / 2;

    // Abscisse "distance" — on dessine les N niveaux sur 2 colonnes
    const x0 = ml + plotW * 0.35;
    const colW = plotW * 0.35;

    // Bande basse (valence)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.fillRect(x0, toY(lowMax), colW, toY(lowMin) - toY(lowMax));
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, toY(lowMax), colW, toY(lowMin) - toY(lowMax));

    // Bande haute (conduction)
    const bandHighColor = materialType === 'conductor' ? 'rgba(234, 179, 8, 0.30)' : 'rgba(239, 68, 68, 0.25)';
    const bandHighStroke = materialType === 'conductor' ? '#eab308' : '#ef4444';
    ctx.fillStyle = bandHighColor;
    ctx.fillRect(x0, toY(highMax), colW, toY(highMin) - toY(highMax));
    ctx.strokeStyle = bandHighStroke;
    ctx.strokeRect(x0, toY(highMax), colW, toY(highMin) - toY(highMax));

    // N niveaux discrets dans chaque bande
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      const frac = N === 1 ? 0.5 : i / (N - 1);
      const eLow = lowMin + frac * (lowMax - lowMin);
      const eHigh = highMin + frac * (highMax - highMin);
      ctx.beginPath();
      ctx.moveTo(x0 + 4, toY(eLow));
      ctx.lineTo(x0 + colW - 4, toY(eLow));
      ctx.stroke();
      ctx.strokeStyle = bandHighStroke;
      ctx.beginPath();
      ctx.moveTo(x0 + 4, toY(eHigh));
      ctx.lineTo(x0 + colW - 4, toY(eHigh));
      ctx.stroke();
      ctx.strokeStyle = '#60a5fa';
    }

    // Annotations bandes
    ctx.fillStyle = '#bfdbfe';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bande de valence', x0 + colW + 10, toY((lowMin + lowMax) / 2) + 4);
    ctx.fillStyle = materialType === 'conductor' ? '#fde68a' : '#fca5a5';
    ctx.fillText('Bande de conduction', x0 + colW + 10, toY((highMin + highMax) / 2) + 4);

    // Flèche gap
    if (currentGap > 0 && highMin > lowMax) {
      const gapX = x0 + colW / 2;
      ctx.strokeStyle = '#f8fafc';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(gapX, toY(lowMax));
      ctx.lineTo(gapX, toY(highMin));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Eg = ${(highMin - lowMax).toFixed(2)} eV`,
        gapX,
        (toY(lowMax) + toY(highMin)) / 2 + 4,
      );
    } else if (highMin <= lowMax) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Recouvrement (conducteur)', x0 + colW / 2, toY(lowMax) - 8);
    }

    // Axe horizontal : distance interatomique
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Distance interatomique d = ${distance.toFixed(2)}  (atomes ${distance < 0.4 ? 'très proches' : distance > 1.5 ? 'isolés' : 'couplés'})`,
      ml + plotW / 2,
      H - 20,
    );

    // Titre type
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    const title =
      materialType === 'conductor' ? 'Conducteur' :
      materialType === 'semiconductor' ? 'Semi-conducteur' : 'Isolant';
    ctx.fillText(`Matériau : ${title}   |   N = ${N} atomes`, ml + 10, mt + 18);
  }, [N, distance, materialType]);

  useEffect(() => {
    drawBands();
  }, [drawBands]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Bandes d&apos;énergie dans les solides
        </h2>
        <p className="text-gray-600">
          Du niveau atomique isolé à la structure de bandes &mdash; Bloch, 1928
        </p>
      </div>

      {/* Canvas */}
      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Nombre d&apos;atomes <InlineMath math={`N`} />
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={N}
              onChange={(e) => setN(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{N}</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium">
              Distance <InlineMath math={`d`} />
            </label>
            <input
              type="range"
              min={0.05}
              max={2.0}
              step={0.05}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">
              {distance.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Type :</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              {(['conductor', 'semiconductor', 'insulator'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterialType(m)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    materialType === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m === 'conductor' ? 'Conducteur' : m === 'semiconductor' ? 'Semi-cond.' : 'Isolant'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Du niveau discret à la bande"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Un atome isolé possède des niveaux d&apos;énergie <strong>discrets</strong>.
            Lorsque <InlineMath math={`N`} /> atomes identiques se rapprochent pour former
            un solide, le principe de Pauli interdit que leurs électrons occupent les
            mêmes états. Chaque niveau atomique se scinde donc en{' '}
            <InlineMath math={`N`} /> niveaux très proches qui forment, pour{' '}
            <InlineMath math={`N \\sim 10^{23}`} />, une <strong>bande continue</strong>.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`w(d) \\sim w_0\\,e^{-d/d_0}`} />
          </div>
          <p className="text-gray-700">
            La largeur <InlineMath math={`w`} /> de chaque bande croît avec le
            recouvrement des orbitales, donc décroît exponentiellement avec la distance
            interatomique.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Théorème de Bloch"
          borderColor="border-violet-500"
          bgColor="bg-violet-50"
          textColor="text-violet-800"
        >
          <p className="text-gray-700">
            Dans un potentiel périodique de période <InlineMath math={`\\mathbf{R}`} />,
            les états électroniques sont de la forme (<strong>Bloch, 1928</strong>) :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\psi_{n\\mathbf{k}}(\\mathbf{r}) = e^{i\\mathbf{k}\\cdot\\mathbf{r}}\\,u_{n\\mathbf{k}}(\\mathbf{r})`} />
          </div>
          <p className="text-gray-700">
            <InlineMath math={`u_{n\\mathbf{k}}`} /> est périodique comme le réseau, et{' '}
            <InlineMath math={`\\mathbf{k}`} /> parcourt la première zone de Brillouin.
            Les énergies <InlineMath math={`E_n(\\mathbf{k})`} /> forment la{' '}
            <strong>structure de bandes</strong>.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Bande de valence, bande de conduction, gap"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            À T = 0 K, les électrons remplissent les bandes en respectant Pauli. La
            dernière bande pleine est la <strong>bande de valence</strong>, la première
            vide (ou partiellement remplie) est la <strong>bande de conduction</strong>.
            L&apos;écart entre elles est la <strong>bande interdite</strong> ou gap{' '}
            <InlineMath math={`E_g`} />.
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              <strong className="text-yellow-700">Conducteur</strong> : bandes se
              recouvrent, électrons libres de circuler (ex. Cu, Na).
            </li>
            <li>
              <strong className="text-red-700">Isolant</strong> : gap large (
              <InlineMath math={`E_g > 3`} /> eV), aucun porteur thermique (ex. diamant).
            </li>
            <li>
              <strong className="text-blue-700">Semi-conducteur</strong> : gap modéré
              (<InlineMath math={`E_g \\sim 0.5 - 2`} /> eV), conduction activée
              thermiquement ou par dopage (Si, Ge, GaAs).
            </li>
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-800"
        >
          <p className="text-gray-700">
            La théorie des bandes explique la conductivité électrique, la couleur des
            matériaux, l&apos;effet photoélectrique dans les solides, et surtout fonde
            toute l&apos;électronique moderne : diode, transistor, LED, cellule
            photovoltaïque, laser à semi-conducteur. Le dopage d&apos;un semi-conducteur
            (type n ou p) permet d&apos;injecter volontairement des porteurs dans le gap.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
