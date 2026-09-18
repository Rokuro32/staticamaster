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
// Types de sollicitation
// ---------------------------------------------------------------------------

type LoadType = 'tension' | 'compression' | 'shear';

// ---------------------------------------------------------------------------
// Main component — Contraintes normales, cisaillement et déformation
// ---------------------------------------------------------------------------

export function StressStrainSimulator() {
  const [loadType, setLoadType] = useState<LoadType>('tension');
  const [force, setForce] = useState(50);         // kN
  const [area, setArea] = useState(500);           // mm²
  const [length, setLength] = useState(200);       // mm (longueur initiale)
  const [E, setE] = useState(210);                 // GPa (module d'Young)

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculs
  const sigma = (force * 1000) / area;             // MPa (N/mm²)
  const tau = loadType === 'shear' ? sigma : 0;
  const epsilon = sigma / (E * 1000);              // sans dimension (E en GPa → MPa = E*1000)
  const deltaL = epsilon * length;                 // mm

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#1e1d1b';
    ctx.fillRect(0, 0, W, H);

    const midX = W / 2;
    const midY = H / 2;

    // Dimensions de la pièce
    const pieceW = 200;
    const pieceH = 80;
    const deformScale = 150; // facteur de visualisation

    // Déformation visible
    const dxVis = Math.min(epsilon * deformScale * pieceW, 60);
    const shearVis = loadType === 'shear' ? Math.min(epsilon * deformScale * 40, 40) : 0;

    // Mur (encastrement à gauche)
    ctx.fillStyle = '#5d5853';
    ctx.fillRect(midX - pieceW / 2 - 20, midY - pieceH / 2 - 20, 20, pieceH + 40);
    // Hachures
    ctx.strokeStyle = '#aba6a1';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = midY - pieceH / 2 - 15 + i * 15;
      ctx.beginPath();
      ctx.moveTo(midX - pieceW / 2 - 20, y);
      ctx.lineTo(midX - pieceW / 2 - 8, y + 12);
      ctx.stroke();
    }

    // Pièce — déformée
    ctx.save();
    if (loadType === 'tension') {
      // Étiré vers la droite
      const x0 = midX - pieceW / 2;
      const x1 = midX + pieceW / 2 + dxVis;
      const y0 = midY - pieceH / 2;
      const y1 = midY + pieceH / 2;
      // Légère contraction latérale (Poisson)
      const contract = dxVis * 0.15;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0 + contract);
      ctx.lineTo(x1, y1 - contract);
      ctx.lineTo(x0, y1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(194, 152, 81, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#c29851';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pièce originale en pointillés
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#7e7871';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, pieceW, pieceH);
      ctx.setLineDash([]);

    } else if (loadType === 'compression') {
      const x0 = midX - pieceW / 2;
      const x1 = midX + pieceW / 2 - dxVis;
      const y0 = midY - pieceH / 2;
      const y1 = midY + pieceH / 2;
      const expand = dxVis * 0.15;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0 - expand);
      ctx.lineTo(x1, y1 + expand);
      ctx.lineTo(x0, y1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(202, 104, 74, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#ca684a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#7e7871';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, pieceW, pieceH);
      ctx.setLineDash([]);

    } else {
      // Cisaillement — parallélogramme
      const x0 = midX - pieceW / 2;
      const y0 = midY - pieceH / 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + pieceH);          // bas gauche (fixé)
      ctx.lineTo(x0 + pieceW, y0 + pieceH); // bas droit (fixé)
      ctx.lineTo(x0 + pieceW + shearVis, y0); // haut droit (déplacé)
      ctx.lineTo(x0 + shearVis, y0);          // haut gauche (déplacé)
      ctx.closePath();
      ctx.fillStyle = 'rgba(179, 120, 149, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#b37895';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#7e7871';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, pieceW, pieceH);
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Flèches de force
    const arrowColor = loadType === 'tension' ? '#c29851' : loadType === 'compression' ? '#ca684a' : '#b37895';
    const arrowLen = 50;

    if (loadType === 'tension') {
      // Flèche vers la droite
      const ax = midX + pieceW / 2 + dxVis + 10;
      const ay = midY;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + arrowLen, ay);
      ctx.stroke();
      ctx.fillStyle = arrowColor;
      ctx.beginPath();
      ctx.moveTo(ax + arrowLen, ay);
      ctx.lineTo(ax + arrowLen - 10, ay - 6);
      ctx.lineTo(ax + arrowLen - 10, ay + 6);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`F = ${force} kN`, ax + arrowLen / 2, ay - 14);
    } else if (loadType === 'compression') {
      const ax = midX + pieceW / 2 - dxVis + 10 + arrowLen;
      const ay = midY;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowLen, ay);
      ctx.stroke();
      ctx.fillStyle = arrowColor;
      ctx.beginPath();
      ctx.moveTo(ax - arrowLen, ay);
      ctx.lineTo(ax - arrowLen + 10, ay - 6);
      ctx.lineTo(ax - arrowLen + 10, ay + 6);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`F = ${force} kN`, ax - arrowLen / 2, ay - 14);
    } else {
      // Cisaillement : flèche vers la droite en haut
      const ax = midX + pieceW / 2 + shearVis + 10;
      const ay = midY - pieceH / 2;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax - 20, ay);
      ctx.lineTo(ax + arrowLen - 20, ay);
      ctx.stroke();
      ctx.fillStyle = arrowColor;
      ctx.beginPath();
      ctx.moveTo(ax + arrowLen - 20, ay);
      ctx.lineTo(ax + arrowLen - 30, ay - 6);
      ctx.lineTo(ax + arrowLen - 30, ay + 6);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`V = ${force} kN`, ax + arrowLen / 2 - 20, ay - 12);
    }

    // Cotation ΔL
    if (loadType !== 'shear' && dxVis > 3) {
      const cotY = midY + pieceH / 2 + 30;
      const x1 = midX + pieceW / 2;
      const x2 = midX + pieceW / 2 + (loadType === 'tension' ? dxVis : -dxVis);
      ctx.strokeStyle = '#e8c61a';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(x1, midY + pieceH / 2);
      ctx.lineTo(x1, cotY + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, midY + pieceH / 2);
      ctx.lineTo(x2, cotY + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      // Ligne de cotation
      ctx.beginPath();
      ctx.moveTo(x1, cotY);
      ctx.lineTo(x2, cotY);
      ctx.stroke();
      ctx.fillStyle = '#e8c61a';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ΔL = ${deltaL.toFixed(3)} mm`, (x1 + x2) / 2, cotY - 6);
    }

    // Infos en temps réel
    ctx.fillStyle = '#eae9e8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const stressLabel = loadType === 'shear' ? 'τ' : 'σ';
    const stressColor = loadType === 'tension' ? '#d8be90' : loadType === 'compression' ? '#e1a897' : '#d4b3c3';
    ctx.fillStyle = stressColor;
    ctx.fillText(`${stressLabel} = ${sigma.toFixed(1)} MPa`, 14, 24);
    ctx.fillStyle = '#f1db6f';
    ctx.fillText(`ε = ${(epsilon * 100).toFixed(4)} %`, 14, 44);
    ctx.fillStyle = '#becc83';
    ctx.fillText(`ΔL = ${deltaL.toFixed(3)} mm`, 14, 64);

    // Type de sollicitation
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    const label = loadType === 'tension' ? 'Traction' : loadType === 'compression' ? 'Compression' : 'Cisaillement';
    ctx.fillText(label, W - 14, 24);
  }, [loadType, force, area, length, E, sigma, epsilon, deltaL]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-stone-900">
          Contraintes et déformations
        </h2>
        <p className="text-stone-600">
          Contrainte normale, cisaillement et loi de Hooke
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={700}
          height={350}
          className="w-full max-w-[700px] mx-auto rounded-lg border border-stone-300"
        />

        <div className="w-full max-w-[700px] space-y-3">
          {/* Type */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-stone-700 font-medium">Sollicitation :</span>
            <div className="flex rounded-lg overflow-hidden border border-stone-300">
              {([
                { id: 'tension' as const, label: 'Traction', color: 'bg-gold-600' },
                { id: 'compression' as const, label: 'Compression', color: 'bg-brun-600' },
                { id: 'shear' as const, label: 'Cisaillement', color: 'bg-prune-600' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setLoadType(t.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    loadType === t.id
                      ? `${t.color} text-white`
                      : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Force */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-stone-700 whitespace-nowrap font-medium w-28">
              Force <InlineMath math="F" />
            </label>
            <input type="range" min={1} max={200} step={1} value={force}
              onChange={(e) => setForce(Number(e.target.value))}
              className="flex-1 accent-gold-500" />
            <span className="text-sm font-mono text-stone-900 w-20 text-right">{force} kN</span>
          </div>

          {/* Section */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-stone-700 whitespace-nowrap font-medium w-28">
              Section <InlineMath math="A" />
            </label>
            <input type="range" min={50} max={2000} step={10} value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="flex-1 accent-olive-500" />
            <span className="text-sm font-mono text-stone-900 w-20 text-right">{area} mm²</span>
          </div>

          {/* Module Young */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-stone-700 whitespace-nowrap font-medium w-28">
              Module <InlineMath math="E" />
            </label>
            <input type="range" min={1} max={400} step={1} value={E}
              onChange={(e) => setE(Number(e.target.value))}
              className="flex-1 accent-prune-500" />
            <span className="text-sm font-mono text-stone-900 w-20 text-right">{E} GPa</span>
          </div>
        </div>
      </div>

      {/* Panneaux */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Contrainte normale σ"
          borderColor="border-gold-500"
          bgColor="bg-gold-50"
          textColor="text-gold-800"
          defaultOpen
        >
          <p className="text-stone-700">
            La <strong>contrainte normale</strong> mesure la force par unité de surface
            perpendiculaire à la section :
          </p>
          <div className="bg-stone-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\sigma = \\frac{F}{A} \\quad [\\text{Pa} = \\text{N/m}^2]`} />
          </div>
          <p className="text-stone-700">
            <InlineMath math="\sigma > 0" /> en <strong>traction</strong> (allongement),{' '}
            <InlineMath math="\sigma < 0" /> en <strong>compression</strong> (raccourcissement).
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Contrainte de cisaillement τ"
          borderColor="border-prune-500"
          bgColor="bg-prune-50"
          textColor="text-prune-800"
        >
          <p className="text-stone-700">
            La <strong>contrainte tangentielle</strong> (cisaillement) agit parallèlement
            à la section :
          </p>
          <div className="bg-stone-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\tau = \\frac{V}{A}`} />
          </div>
          <p className="text-stone-700">
            Elle provoque une <strong>distorsion angulaire</strong>{' '}
            <InlineMath math="\gamma" /> (angle de cisaillement). Le module de cisaillement
            relie les deux : <InlineMath math="\tau = G \cdot \gamma" /> avec{' '}
            <InlineMath math={`G = \\frac{E}{2(1+\\nu)}`} />.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Loi de Hooke et déformation"
          borderColor="border-olive-500"
          bgColor="bg-olive-50"
          textColor="text-olive-800"
        >
          <p className="text-stone-700">
            Dans le domaine <strong>élastique linéaire</strong>, la déformation est
            proportionnelle à la contrainte :
          </p>
          <div className="bg-stone-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\sigma = E \\cdot \\varepsilon \\qquad \\varepsilon = \\frac{\\Delta L}{L_0}`} />
          </div>
          <p className="text-stone-700">
            <InlineMath math="E" /> est le <strong>module d&apos;Young</strong> (rigidité du
            matériau). Acier : ~210 GPa, aluminium : ~70 GPa, bois : ~10 GPa,
            caoutchouc : ~0,01 GPa.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Coefficient de Poisson"
          borderColor="border-terre-500"
          bgColor="bg-terre-50"
          textColor="text-terre-800"
        >
          <p className="text-stone-700">
            Lorsqu&apos;un matériau s&apos;allonge dans une direction, il se contracte
            dans les directions transversales :
          </p>
          <div className="bg-stone-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\nu = -\\frac{\\varepsilon_{\\text{transv}}}{\\varepsilon_{\\text{long}}} \\quad (0 < \\nu < 0{,}5)`} />
          </div>
          <p className="text-stone-700">
            Pour l&apos;acier, <InlineMath math="\nu \approx 0{,}3" />. La visualisation
            ci-dessus montre cet effet de contraction/dilatation latérale.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
