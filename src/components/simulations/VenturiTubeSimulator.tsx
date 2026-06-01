'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// CollapsiblePanel — léger conteneur pour les explications pédagogiques
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
        <span className="text-lg">{open ? '▲' : '▼'}</span>
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
// Particules transportées par le fluide
// ---------------------------------------------------------------------------

interface Particle {
  x: number;          // position horizontale (px)
  yOffset: number;    // décalage vertical [-1, 1] par rapport à l'axe (suivra le profil du tube)
  hue: number;        // teinte pour la coloration
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function VenturiTubeSimulator() {
  // Paramètres physiques contrôlables par l'utilisateur
  const [v1, setV1] = useState(2.0);          // vitesse en entrée (m/s)
  const [rho, setRho] = useState(1000);       // densité du fluide (kg/m³)
  const [areaRatio, setAreaRatio] = useState(0.4); // A2/A1 (resserrement)
  const [p1, setP1] = useState(101325);       // pression statique en amont (Pa)
  const [running, setRunning] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showManometers, setShowManometers] = useState(true);

  // Conservation : A1·v1 = A2·v2  =>  v2 = v1 / (A2/A1)
  const v2 = v1 / areaRatio;

  // Bernoulli (tube horizontal, h1 = h2) : P1 + ½ρv1² = P2 + ½ρv2²
  //   =>  P2 = P1 + ½ρ(v1² − v2²)
  const deltaP = 0.5 * rho * (v1 * v1 - v2 * v2); // P2 − P1, sera négatif
  const p2 = p1 + deltaP;

  // Hauteur des colonnes manométriques (h = P / (ρ_eau · g)) en mm
  // (utilise l'eau comme fluide manométrique pour une lecture intuitive)
  const G = 9.81;
  const RHO_WATER = 1000;
  const h1mm = ((p1 - p1) / (RHO_WATER * G)) * 1000 + 80; // ligne de base = 80 mm de "marge"
  const h2mm = ((p2 - p1) / (RHO_WATER * G)) * 1000 + 80; // sera plus court (P2 < P1)

  // ---------------------------------------------------------------------
  // Géométrie du tube (en coordonnées canvas)
  // ---------------------------------------------------------------------
  const W = 760;
  const H = 420;
  const tubeY = 240;     // centre vertical du tube
  const tubeR1 = 70;     // demi-hauteur d'entrée
  const xEntry = 60;     // début du resserrement
  const xThroatStart = 280;
  const xThroatEnd = 460;
  const xExitEnd = 700;

  // Rayon le long du tube à une position x donnée
  const tubeRadiusAt = useCallback(
    (x: number): number => {
      if (x < xEntry) return tubeR1;
      if (x >= xEntry && x < xThroatStart) {
        // contraction linéaire
        const t = (x - xEntry) / (xThroatStart - xEntry);
        return tubeR1 - (tubeR1 - tubeR1 * Math.sqrt(areaRatio)) * t;
      }
      if (x >= xThroatStart && x <= xThroatEnd) {
        return tubeR1 * Math.sqrt(areaRatio);
      }
      if (x > xThroatEnd && x < xExitEnd) {
        // expansion linéaire
        const t = (x - xThroatEnd) / (xExitEnd - xThroatEnd);
        return tubeR1 * Math.sqrt(areaRatio) + (tubeR1 - tubeR1 * Math.sqrt(areaRatio)) * t;
      }
      return tubeR1;
    },
    [areaRatio]
  );

  // Vitesse locale (par continuité) : v(x) = v1 · A1 / A(x) = v1 · (R1/R(x))²
  const localSpeed = useCallback(
    (x: number): number => {
      const r = tubeRadiusAt(x);
      return v1 * (tubeR1 * tubeR1) / (r * r);
    },
    [v1, tubeRadiusAt]
  );

  // ---------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);

  // (re)peuplement des particules à chaque changement de géométrie / vitesse
  useEffect(() => {
    const N = 220;
    const arr: Particle[] = [];
    for (let i = 0; i < N; i++) {
      arr.push({
        x: Math.random() * W,
        yOffset: (Math.random() - 0.5) * 1.7, // remplit la section
        hue: 195 + Math.random() * 25,        // bleus/cyans
      });
    }
    particlesRef.current = arr;
  }, []);

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dt = lastTimeRef.current === 0 ? 0 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Fond
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, W, H);

      // ---- Profil du tube (deux courbes : haut et bas) ----
      ctx.beginPath();
      ctx.moveTo(0, tubeY - tubeR1);
      for (let x = 0; x <= W; x += 4) {
        const r = tubeRadiusAt(x);
        ctx.lineTo(x, tubeY - r);
      }
      for (let x = W; x >= 0; x -= 4) {
        const r = tubeRadiusAt(x);
        ctx.lineTo(x, tubeY + r);
      }
      ctx.closePath();

      // Remplissage du fluide
      const grad = ctx.createLinearGradient(0, tubeY - tubeR1, 0, tubeY + tubeR1);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.55)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Bordure du tube
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, tubeY - tubeR1);
      for (let x = 0; x <= W; x += 2) {
        const r = tubeRadiusAt(x);
        ctx.lineTo(x, tubeY - r);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, tubeY + tubeR1);
      for (let x = 0; x <= W; x += 2) {
        const r = tubeRadiusAt(x);
        ctx.lineTo(x, tubeY + r);
      }
      ctx.stroke();

      // ---- Lignes de courant (streamlines) ----
      if (showStreamlines) {
        ctx.strokeStyle = 'rgba(148, 197, 250, 0.35)';
        ctx.lineWidth = 1;
        const nLines = 5;
        for (let i = 1; i < nLines; i++) {
          const frac = i / nLines - 0.5; // [-0.5..+0.5]
          ctx.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const r = tubeRadiusAt(x);
            const y = tubeY + frac * 2 * r;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // ---- Particules (visualisent la vitesse locale) ----
      if (running && dt > 0) {
        const pixelsPerMeter = 80; // facteur d'échelle pour visualiser la vitesse
        for (const p of particlesRef.current) {
          const speed = localSpeed(p.x);
          p.x += speed * pixelsPerMeter * dt;
          if (p.x > W + 10) {
            p.x = -10;
            p.yOffset = (Math.random() - 0.5) * 1.7;
            p.hue = 195 + Math.random() * 25;
          }
        }
      }

      for (const p of particlesRef.current) {
        const r = tubeRadiusAt(p.x);
        const y = tubeY + (p.yOffset * 0.85) * r;
        const speed = localSpeed(p.x);
        // Couleur selon vitesse : bleu lent -> jaune rapide
        const t = Math.min(1, (speed - v1) / Math.max(0.001, v2 - v1));
        const hue = 200 - t * 160;             // 200 (bleu) → 40 (jaune)
        const sat = 90;
        const light = 55 + t * 15;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.beginPath();
        ctx.arc(p.x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- Manomètres : tubes verticaux ouverts vers le haut ----
      if (showManometers) {
        const drawManometer = (
          xPos: number,
          colHeightMm: number,
          colorTube: string,
          colorFluid: string,
          label: string,
          pressure: number
        ) => {
          // Hauteur en pixels (1 mm <-> 0.6 px)
          const colHeightPx = Math.max(0, colHeightMm * 0.6);
          const tubeWidth = 14;
          const yBase = tubeY - tubeRadiusAt(xPos) - 4;
          const yTop = yBase - 160; // sommet du tube manométrique

          // Tube en verre
          ctx.strokeStyle = colorTube;
          ctx.lineWidth = 2;
          ctx.strokeRect(xPos - tubeWidth / 2, yTop, tubeWidth, yBase - yTop);

          // Niveau d'eau dans le manomètre (depuis yBase vers le haut)
          const yFluidTop = yBase - colHeightPx;
          const fluidGrad = ctx.createLinearGradient(0, yFluidTop, 0, yBase);
          fluidGrad.addColorStop(0, colorFluid);
          fluidGrad.addColorStop(1, '#1e40af');
          ctx.fillStyle = fluidGrad;
          ctx.fillRect(xPos - tubeWidth / 2 + 2, yFluidTop, tubeWidth - 4, yBase - yFluidTop);

          // Méniscus
          ctx.strokeStyle = '#dbeafe';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xPos - tubeWidth / 2 + 2, yFluidTop);
          ctx.lineTo(xPos + tubeWidth / 2 - 2, yFluidTop);
          ctx.stroke();

          // Étiquette
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, xPos, yTop - 8);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.fillText(`${(pressure / 1000).toFixed(2)} kPa`, xPos, yTop - 24);
        };

        // Point 1 : amont (entrée large)
        drawManometer(170, h1mm, '#cbd5e1', '#60a5fa', 'P₁', p1);
        // Point 2 : col (rétrécissement) — pression plus faible, colonne plus basse
        drawManometer(370, h2mm, '#fca5a5', '#3b82f6', 'P₂', p2);
        // Point 3 : aval (retour à A1) — pression ≈ P1 (fluide idéal, sans pertes)
        drawManometer(600, h1mm, '#cbd5e1', '#60a5fa', 'P₃', p1);
      }

      // ---- Étiquettes sur le tube ----
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`A₁, v₁ = ${v1.toFixed(2)} m/s`, 130, tubeY + tubeR1 + 28);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`A₂, v₂ = ${v2.toFixed(2)} m/s`, 370, tubeY + tubeRadiusAt(370) + 32);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`A₃ = A₁, v₃ = ${v1.toFixed(2)} m/s`, 640, tubeY + tubeR1 + 28);

      // Flèche d'écoulement
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 30);
      ctx.lineTo(120, 30);
      ctx.lineTo(110, 24);
      ctx.moveTo(120, 30);
      ctx.lineTo(110, 36);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Écoulement', 24, 22);

      animIdRef.current = requestAnimationFrame(draw);
    },
    [
      areaRatio, v1, v2, p1, p2, rho, h1mm, h2mm, running,
      showStreamlines, showManometers, tubeRadiusAt, localSpeed,
    ]
  );

  useEffect(() => {
    animIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animIdRef.current !== null) cancelAnimationFrame(animIdRef.current);
    };
  }, [draw]);

  // Cavitation : la pression peut-elle devenir négative ?
  const cavitation = p2 < 0;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Tube de Venturi
        </h2>
        <p className="text-gray-600">
          Conservation de la masse et équation de Bernoulli &mdash; quand le tube
          se rétrécit, le fluide accélère et sa pression chute.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full max-w-[760px] mx-auto rounded-lg border border-gray-300 bg-slate-900"
        />

        <div className="w-full max-w-[760px] space-y-3">
          {/* Vitesse d'entrée */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-44">
              Vitesse à l&apos;entrée v₁
            </label>
            <input
              type="range" min={0.5} max={6} step={0.1}
              value={v1}
              onChange={(e) => setV1(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">
              {v1.toFixed(2)} m/s
            </span>
          </div>

          {/* Rapport des aires */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-44">
              Rapport A₂ / A₁
            </label>
            <input
              type="range" min={0.15} max={0.9} step={0.05}
              value={areaRatio}
              onChange={(e) => setAreaRatio(Number(e.target.value))}
              className="flex-1 accent-rose-500"
            />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">
              {areaRatio.toFixed(2)}
            </span>
          </div>

          {/* Densité du fluide */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-44">
              Densité ρ
            </label>
            <input
              type="range" min={200} max={1500} step={50}
              value={rho}
              onChange={(e) => setRho(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">
              {rho} kg/m³
            </span>
          </div>

          {/* Pression amont */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-44">
              Pression amont P₁
            </label>
            <input
              type="range" min={50000} max={300000} step={1000}
              value={p1}
              onChange={(e) => setP1(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-sm font-mono text-gray-900 w-24 text-right">
              {(p1 / 1000).toFixed(1)} kPa
            </span>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setRunning(r => !r)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
            >
              {running ? '⏸ Pause' : '▶ Reprendre'}
            </button>
            <button
              onClick={() => setShowStreamlines(s => !s)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                showStreamlines
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Lignes de courant
            </button>
            <button
              onClick={() => setShowManometers(s => !s)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                showManometers
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Manomètres
            </button>
          </div>

          {/* Résumé numérique */}
          <div className="p-3 bg-slate-100 rounded-lg border text-sm grid grid-cols-2 gap-x-6 gap-y-1">
            <div><strong>v₁</strong> = {v1.toFixed(2)} m/s</div>
            <div>
              <strong>v₂</strong> ={' '}
              <span className="font-mono font-bold">{v2.toFixed(2)} m/s</span>
            </div>
            <div><strong>P₁</strong> = {(p1 / 1000).toFixed(2)} kPa</div>
            <div>
              <strong>P₂</strong> ={' '}
              <span className={`font-mono font-bold ${p2 < 0 ? 'text-red-600' : ''}`}>
                {(p2 / 1000).toFixed(2)} kPa
              </span>
            </div>
            <div>
              <strong>ΔP = P₂ − P₁</strong> ={' '}
              <span className="font-mono">{(deltaP / 1000).toFixed(2)} kPa</span>
            </div>
            <div>
              <strong>A₂ / A₁</strong> = {areaRatio.toFixed(2)} →{' '}
              <strong>v₂ / v₁</strong> = {(1 / areaRatio).toFixed(2)}
            </div>
          </div>

          {cavitation && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              ⚠️ <strong>Pression négative au col !</strong> En pratique, le
              liquide se vaporiserait : c&apos;est le phénomène de <em>cavitation</em>.
              Réduisez le rétrécissement ou la vitesse pour rester dans un régime
              physiquement réaliste.
            </div>
          )}
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Conservation de la masse (équation de continuité)"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
          defaultOpen
        >
          <p className="text-gray-700">
            Pour un fluide incompressible en régime permanent, le débit volumique
            <InlineMath math="\,Q = A\,v\," />est constant le long du tube :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`A_1\\,v_1 = A_2\\,v_2`} />
          </div>
          <p className="text-gray-700">
            Quand la section diminue (<InlineMath math="A_2 < A_1" />), la vitesse
            augmente proportionnellement :{' '}
            <InlineMath math={`v_2 = v_1 \\cdot \\dfrac{A_1}{A_2}`} />.
          </p>
          <p className="text-gray-700">
            Dans la simulation, on visualise cette accélération : les particules
            roulent plus vite et changent de couleur (bleu → jaune) en traversant le col.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Équation de Bernoulli"
          borderColor="border-rose-500"
          bgColor="bg-rose-50"
          textColor="text-rose-800"
        >
          <p className="text-gray-700">
            Pour un fluide parfait (incompressible, non visqueux, écoulement
            stationnaire), l&apos;énergie mécanique par unité de volume se conserve
            le long d&apos;une ligne de courant :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`P + \\tfrac{1}{2}\\rho v^{2} + \\rho g h = \\text{constante}`} />
          </div>
          <p className="text-gray-700">
            Pour un tube horizontal (<InlineMath math="h_1 = h_2" />) :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`P_1 + \\tfrac{1}{2}\\rho v_1^{2} = P_2 + \\tfrac{1}{2}\\rho v_2^{2}`} />
          </div>
          <p className="text-gray-700">
            On obtient directement la chute de pression :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\Delta P = P_2 - P_1 = \\tfrac{1}{2}\\rho (v_1^{2} - v_2^{2}) < 0`} />
          </div>
          <p className="text-gray-700">
            <strong>Résultat clé :</strong> là où le fluide va plus vite, la pression
            est <em>plus basse</em>. C&apos;est ce que montrent les manomètres : la
            colonne au col est plus courte que celle en amont.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Le venturimètre comme débitmètre"
          borderColor="border-emerald-500"
          bgColor="bg-emerald-50"
          textColor="text-emerald-800"
        >
          <p className="text-gray-700">
            En combinant continuité et Bernoulli, on peut déduire la vitesse à partir
            de la différence de pression mesurée :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath
              math={`v_1 = \\sqrt{\\dfrac{2\\,(P_1 - P_2)}{\\rho\\,\\left[(A_1/A_2)^{2} - 1\\right]}}`}
            />
          </div>
          <p className="text-gray-700">
            Et donc le débit :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`Q = A_1\\,v_1`} />
          </div>
          <p className="text-gray-700">
            Le tube de Venturi est ainsi un instrument de mesure du débit qui
            n&apos;a aucune pièce mobile.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Applications"
          borderColor="border-amber-500"
          bgColor="bg-amber-50"
          textColor="text-amber-800"
        >
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li><strong>Carburateurs</strong> automobiles : l&apos;air accélère dans le col, aspirant l&apos;essence par dépression.</li>
            <li><strong>Trompes à eau</strong> de laboratoire : produisent un vide partiel.</li>
            <li><strong>Pulvérisateurs</strong> de peinture, parfum, aérographes.</li>
            <li><strong>Tubes de Pitot-Venturi</strong> pour mesurer la vitesse d&apos;un avion.</li>
            <li><strong>Compteurs de débit</strong> industriels (gaz, vapeur, eau).</li>
            <li><strong>Cheminées</strong> et systèmes de ventilation.</li>
          </ul>
          <p className="text-gray-700 mt-2">
            ⚠️ Si la pression au col devient inférieure à la pression de vapeur du
            liquide, des bulles de vapeur apparaissent : c&apos;est la
            <strong> cavitation</strong>, destructrice pour les pompes et les hélices.
          </p>
        </CollapsiblePanel>
      </div>
    </section>
  );
}

export default VenturiTubeSimulator;
