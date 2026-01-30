'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BlockMath } from 'react-katex';
import dynamic from 'next/dynamic';

// Dynamic import for 3D components to avoid SSR issues
const Canvas3DView = dynamic(() => import('./Canvas3DView'), { ssr: false });

type Operation = 'add' | 'subtract' | 'dot' | 'cross';
type Dimension = '2D' | '3D';

interface Vector {
  id: string;
  label: string;
  magnitude: number;
  angle: number;      // θ (azimuthal, in XY plane)
  phi: number;        // φ (polar, from Z axis) - only for 3D
  color: string;
}

interface VectorComponents {
  x: number;
  y: number;
  z?: number;
}

interface DotProductResult {
  scalar: number;
  magA: number;
  magB: number;
  angle: number;
}

const VECTOR_COLORS = [
  '#3b82f6',  // Bleu (A)
  '#22c55e',  // Vert (B)
  '#a855f7',  // Violet (C)
  '#ef4444',  // Rouge (D)
  '#f59e0b',  // Orange (E)
  '#06b6d4'   // Cyan (F)
];

export function VectorSimulator() {
  // Dimension mode
  const [dimension, setDimension] = useState<Dimension>('2D');

  // Tableau de vecteurs (2 à 6 vecteurs)
  const [vectors, setVectors] = useState<Vector[]>([
    { id: 'A', label: 'A', magnitude: 5, angle: 45, phi: 90, color: VECTOR_COLORS[0] },
    { id: 'B', label: 'B', magnitude: 4, angle: 120, phi: 90, color: VECTOR_COLORS[1] }
  ]);

  // Mode d'entrée: 'polar' ou 'cartesian'
  const [inputMode, setInputMode] = useState<'polar' | 'cartesian'>('cartesian');

  // Opération
  const [operation, setOperation] = useState<Operation>('add');

  // Affichage des composantes
  const [showComponents, setShowComponents] = useState(true);

  // Mode formule
  const [formulaMode, setFormulaMode] = useState(false);
  const [formula, setFormula] = useState('');
  const [formulaResult, setFormulaResult] = useState<VectorComponents & { isScalar?: boolean; scalar?: number } | null>(null);
  const [formulaError, setFormulaError] = useState('');
  const [selectedVectors, setSelectedVectors] = useState<string[]>(['A', 'B']);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Conversion degrés -> radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  // Calcul des composantes 2D
  const getComponents = useCallback((vec: Vector): VectorComponents => ({
    x: vec.magnitude * Math.cos(toRad(vec.angle)),
    y: vec.magnitude * Math.sin(toRad(vec.angle))
  }), []);

  // Calcul des composantes 3D (coordonnées sphériques)
  const getComponents3D = useCallback((vec: Vector): VectorComponents => {
    const theta = toRad(vec.angle);
    const phi = toRad(vec.phi);
    return {
      x: vec.magnitude * Math.sin(phi) * Math.cos(theta),
      y: vec.magnitude * Math.sin(phi) * Math.sin(theta),
      z: vec.magnitude * Math.cos(phi)
    };
  }, []);

  // Get components based on dimension
  const getVectorComponents = useCallback((vec: Vector): VectorComponents => {
    return dimension === '3D' ? getComponents3D(vec) : getComponents(vec);
  }, [dimension, getComponents, getComponents3D]);

  // Si on a plus ou moins de 2 vecteurs et qu'on est en mode dot ou cross, revenir à add
  useEffect(() => {
    if ((operation === 'dot' || operation === 'cross') && vectors.length !== 2) {
      setOperation('add');
    }
  }, [vectors.length, operation]);

  // Synchroniser les vecteurs sélectionnés
  useEffect(() => {
    const currentLabels = vectors.map(v => v.label);
    const newLabels = currentLabels.filter(label => !selectedVectors.includes(label));
    if (newLabels.length > 0) {
      setSelectedVectors([...selectedVectors, ...newLabels]);
    }
    const validSelection = selectedVectors.filter(label => currentLabels.includes(label));
    if (validSelection.length !== selectedVectors.length) {
      setSelectedVectors(validSelection);
    }
  }, [vectors, selectedVectors]);

  // Calculer le vecteur résultant
  const computeResult = useCallback((): VectorComponents | DotProductResult => {
    const components = vectors.map(v => getVectorComponents(v));

    if (operation === 'add') {
      return components.reduce((acc, comp) => ({
        x: acc.x + comp.x,
        y: acc.y + comp.y,
        z: (acc.z || 0) + (comp.z || 0)
      }), { x: 0, y: 0, z: 0 });
    } else if (operation === 'subtract') {
      return components.reduce((acc, comp, idx) => {
        if (idx === 0) return { ...comp, z: comp.z || 0 };
        return { x: acc.x - comp.x, y: acc.y - comp.y, z: (acc.z || 0) - (comp.z || 0) };
      }, { x: 0, y: 0, z: 0 });
    } else if (operation === 'dot') {
      if (components.length >= 2) {
        const [A, B] = components;
        const dotProduct = A.x * B.x + A.y * B.y + (A.z || 0) * (B.z || 0);
        const magA = Math.sqrt(A.x * A.x + A.y * A.y + (A.z || 0) ** 2);
        const magB = Math.sqrt(B.x * B.x + B.y * B.y + (B.z || 0) ** 2);
        let angleBetween = 0;
        if (magA > 0.0001 && magB > 0.0001) {
          const cosTheta = dotProduct / (magA * magB);
          const clampedCos = Math.max(-1, Math.min(1, cosTheta));
          angleBetween = toDeg(Math.acos(clampedCos));
        }
        return { scalar: dotProduct, magA, magB, angle: angleBetween };
      }
      return { scalar: 0, magA: 0, magB: 0, angle: 0 };
    } else if (operation === 'cross') {
      if (components.length >= 2) {
        const [A, B] = components;
        const az = A.z || 0;
        const bz = B.z || 0;
        return {
          x: A.y * bz - az * B.y,
          y: az * B.x - A.x * bz,
          z: A.x * B.y - A.y * B.x
        };
      }
      return { x: 0, y: 0, z: 0 };
    }
    return { x: 0, y: 0, z: 0 };
  }, [vectors, operation, getVectorComponents]);

  const resultComp = computeResult();
  const isScalarResult = operation === 'dot';
  const resultMagnitude = isScalarResult ? null : Math.sqrt(
    (resultComp as VectorComponents).x ** 2 +
    (resultComp as VectorComponents).y ** 2 +
    ((resultComp as VectorComponents).z || 0) ** 2
  );
  const resultAngle = isScalarResult ? null : toDeg(Math.atan2((resultComp as VectorComponents).y, (resultComp as VectorComponents).x));

  // Ajouter un vecteur
  const addVector = () => {
    if (vectors.length >= 6) return;
    const nextLabel = String.fromCharCode(65 + vectors.length);
    const newVector: Vector = {
      id: nextLabel,
      label: nextLabel,
      magnitude: 3,
      angle: 0,
      phi: 90,
      color: VECTOR_COLORS[vectors.length]
    };
    setVectors([...vectors, newVector]);
  };

  // Retirer un vecteur
  const removeVector = (id: string) => {
    if (vectors.length <= 2) return;
    setVectors(vectors.filter(v => v.id !== id));
  };

  // Mettre à jour un vecteur
  const updateVector = (id: string, updates: Partial<Vector>) => {
    setVectors(vectors.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  // Mise à jour depuis composantes cartésiennes
  const updateFromCartesian = (id: string, comp: VectorComponents, axis: 'x' | 'y' | 'z', value: number) => {
    const newComp = { ...comp, [axis]: value };
    const newMagnitude = Math.sqrt(newComp.x ** 2 + newComp.y ** 2 + (newComp.z || 0) ** 2);
    const newAngle = toDeg(Math.atan2(newComp.y, newComp.x));
    const newPhi = newMagnitude > 0.0001 ? toDeg(Math.acos((newComp.z || 0) / newMagnitude)) : 90;
    updateVector(id, { magnitude: newMagnitude, angle: newAngle, phi: newPhi });
  };

  // Fonction pour insérer du texte à la position du curseur
  const insertAtCursor = (text: string) => {
    const input = formulaInputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newValue = formula.substring(0, start) + text + formula.substring(end);
    setFormula(newValue);
    setTimeout(() => {
      input.focus();
      const newPosition = start + text.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Évaluer la formule vectorielle
  const evaluateFormula = useCallback((formulaText: string) => {
    try {
      const vectorDict: Record<string, VectorComponents> = {};
      vectors.forEach(vec => {
        if (selectedVectors.includes(vec.label)) {
          vectorDict[vec.label] = getVectorComponents(vec);
        }
      });

      let expr = formulaText.trim();
      if (!expr) {
        setFormulaError('');
        setFormulaResult(null);
        return;
      }

      expr = expr.replace(/·/g, ' dot ').replace(/×/g, ' cross ');
      const tokens = expr.split(/\s+/);

      let result: VectorComponents | { scalar: number } | null = null;
      let currentOp: string | null = null;
      let isScalar = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === '+' || token === '-') {
          currentOp = token;
        } else if (token === 'dot') {
          currentOp = 'dot';
        } else if (token === 'cross') {
          currentOp = 'cross';
        } else if (token === '*') {
          continue;
        } else {
          let scalar = 1;
          let vectorLabel = token;

          const multMatch = token.match(/^([\d.]+)\*([A-F])$/);
          if (multMatch) {
            scalar = parseFloat(multMatch[1]);
            vectorLabel = multMatch[2];
          } else if (i > 0 && tokens[i-1] === '*') {
            scalar = parseFloat(tokens[i-2]);
            vectorLabel = token;
          }

          if (!vectorDict[vectorLabel]) {
            throw new Error(`Vecteur ${vectorLabel} non défini`);
          }

          const vec = vectorDict[vectorLabel];
          const scaledVec = { x: vec.x * scalar, y: vec.y * scalar, z: (vec.z || 0) * scalar };

          if (result === null) {
            result = scaledVec;
          } else if (currentOp === '+') {
            result = { x: (result as VectorComponents).x + scaledVec.x, y: (result as VectorComponents).y + scaledVec.y, z: ((result as VectorComponents).z || 0) + scaledVec.z };
          } else if (currentOp === '-') {
            result = { x: (result as VectorComponents).x - scaledVec.x, y: (result as VectorComponents).y - scaledVec.y, z: ((result as VectorComponents).z || 0) - scaledVec.z };
          } else if (currentOp === 'dot') {
            const r = result as VectorComponents;
            const dotProduct = r.x * scaledVec.x + r.y * scaledVec.y + (r.z || 0) * scaledVec.z;
            result = { scalar: dotProduct } as { scalar: number };
            isScalar = true;
          } else if (currentOp === 'cross') {
            const r = result as VectorComponents;
            result = {
              x: r.y * scaledVec.z - (r.z || 0) * scaledVec.y,
              y: (r.z || 0) * scaledVec.x - r.x * scaledVec.z,
              z: r.x * scaledVec.y - r.y * scaledVec.x
            };
          }
        }
      }

      if (result) {
        setFormulaResult({ ...result as VectorComponents, isScalar });
        setFormulaError('');
      } else {
        setFormulaError('Expression invalide');
        setFormulaResult(null);
      }
    } catch (error) {
      setFormulaError((error as Error).message);
      setFormulaResult(null);
    }
  }, [vectors, selectedVectors, getVectorComponents]);

  // Évaluer la formule quand elle change
  useEffect(() => {
    if (formulaMode) {
      evaluateFormula(formula);
    }
  }, [formula, vectors, formulaMode, selectedVectors, evaluateFormula]);

  // Dessiner le canvas 2D
  useEffect(() => {
    if (dimension === '3D') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Effacer le canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Échelle
    const displayVectors = formulaMode ? vectors.filter(v => selectedVectors.includes(v.label)) : vectors;
    const allMagnitudes = [
      ...displayVectors.map(v => v.magnitude),
      ...(resultMagnitude !== null ? [resultMagnitude] : []),
      1
    ];
    const maxMag = Math.max(...allMagnitudes) * 1.5;
    const scale = Math.min(width, height) / 2 / maxMag * 0.8;

    // Dessiner la grille
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    const gridStep = Math.ceil(maxMag / 5);
    for (let i = -Math.ceil(maxMag); i <= Math.ceil(maxMag); i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * scale, 0);
      ctx.lineTo(centerX + i * scale, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, centerY - i * scale);
      ctx.lineTo(width, centerY - i * scale);
      ctx.stroke();
    }

    // Dessiner les axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Labels des axes
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('x', width - 15, centerY + 20);
    ctx.fillText('y', centerX + 15, 15);

    // Origine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Fonction pour dessiner un vecteur
    const drawVector = (startX: number, startY: number, comp: VectorComponents, color: string, label: string, showComp: boolean = true) => {
      const endX = startX + comp.x * scale;
      const endY = startY - comp.y * scale;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const dx = endX - startX;
      const dy = endY - startY;
      const angle = Math.atan2(dy, dx);
      const arrowSize = 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      const labelX = startX + comp.x * scale / 2 + 15;
      const labelY = startY - comp.y * scale / 2 - 10;
      ctx.fillText(label, labelX, labelY);

      const textWidth = ctx.measureText(label).width;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(labelX, labelY - 12);
      ctx.lineTo(labelX + textWidth, labelY - 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(labelX + textWidth, labelY - 12);
      ctx.lineTo(labelX + textWidth - 4, labelY - 15);
      ctx.moveTo(labelX + textWidth, labelY - 12);
      ctx.lineTo(labelX + textWidth - 4, labelY - 9);
      ctx.stroke();

      if (showComp && showComponents && (Math.abs(comp.x) > 0.1 || Math.abs(comp.y) > 0.1)) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + comp.x * scale, startY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX + comp.x * scale, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    // Dessiner tous les vecteurs
    if (operation === 'add' && !formulaMode) {
      let currentX = centerX;
      let currentY = centerY;
      displayVectors.forEach((vec, idx) => {
        const comp = getComponents(vec);
        drawVector(currentX, currentY, comp, vec.color, vec.label, idx === displayVectors.length - 1);
        currentX += comp.x * scale;
        currentY -= comp.y * scale;
      });
    } else {
      displayVectors.forEach(vec => {
        const comp = getComponents(vec);
        drawVector(centerX, centerY, comp, vec.color, vec.label, true);
      });
    }

    // Dessiner le parallélogramme pour le produit vectoriel
    if (operation === 'cross' && displayVectors.length >= 2) {
      const vecA = getComponents(displayVectors[0]);
      const vecB = getComponents(displayVectors[1]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + vecA.x * scale, centerY - vecA.y * scale);
      ctx.lineTo(centerX + (vecA.x + vecB.x) * scale, centerY - (vecA.y + vecB.y) * scale);
      ctx.lineTo(centerX + vecB.x * scale, centerY - vecB.y * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Dessiner le vecteur résultant
    const finalResult = formulaMode && formulaResult ? formulaResult : resultComp;
    if (operation !== 'dot' && !('scalar' in finalResult)) {
      const label = operation === 'cross' ? 'C' : 'R';
      drawVector(centerX, centerY, finalResult as VectorComponents, '#f97316', label, false);
    }

    // Arc pour l'angle entre les vecteurs (produit scalaire)
    if (operation === 'dot' && displayVectors.length >= 2 && 'angle' in resultComp) {
      const vecA = getComponents(displayVectors[0]);
      const vecB = getComponents(displayVectors[1]);
      const angleA = Math.atan2(vecA.y, vecA.x);
      const angleB = Math.atan2(vecB.y, vecB.x);
      let angleDiff = angleB - angleA;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const arcRadius = 40;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, -angleA, -angleB, angleDiff > 0);
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 13px system-ui';
      const midAngle = angleA + angleDiff / 2;
      const labelRadius = arcRadius + 20;
      ctx.fillText(`θ = ${(resultComp as DotProductResult).angle.toFixed(1)}°`, centerX + labelRadius * Math.cos(midAngle), centerY - labelRadius * Math.sin(midAngle));
    }

    // Légende
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    const legendY = height - 20 - (displayVectors.length + 1) * 25;
    displayVectors.forEach((vec, idx) => {
      ctx.fillStyle = vec.color;
      ctx.fillRect(20, legendY + idx * 25, 20, 3);
      ctx.fillText(`Vecteur ${vec.label}`, 50, legendY + idx * 25 + 5);
    });
    const resultY = legendY + displayVectors.length * 25;
    ctx.fillStyle = '#f97316';
    ctx.fillRect(20, resultY, 20, 3);
    ctx.fillText(operation === 'dot' ? 'Résultat (scalaire)' : operation === 'cross' ? 'C (produit vectoriel)' : 'R (résultant)', 50, resultY + 5);

  }, [vectors, operation, showComponents, formulaMode, formulaResult, selectedVectors, resultComp, resultMagnitude, getComponents, dimension]);

  // Prepare 3D data
  const vectors3DData = useMemo(() => {
    const displayVectors = formulaMode ? vectors.filter(v => selectedVectors.includes(v.label)) : vectors;
    return displayVectors.map(vec => ({
      ...vec,
      components: getComponents3D(vec)
    }));
  }, [vectors, formulaMode, selectedVectors, getComponents3D]);

  const result3D = useMemo(() => {
    if (isScalarResult) return null;
    return resultComp as VectorComponents;
  }, [resultComp, isScalarResult]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Titre */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Calculatrice de Vecteurs</h2>
        <p className="text-gray-600">Addition, soustraction, produit scalaire et produit vectoriel</p>
      </div>

      {/* Sélecteur de dimension */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setDimension('2D')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${dimension === '2D' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-violet-300'}`}
        >
          2D
        </button>
        <button
          onClick={() => setDimension('3D')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${dimension === '3D' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-violet-300'}`}
        >
          3D
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panneau de contrôle */}
        <div className="space-y-4">
          {/* Mode formule */}
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formulaMode}
                onChange={(e) => {
                  setFormulaMode(e.target.checked);
                  if (!e.target.checked) {
                    setFormula('');
                    setFormulaResult(null);
                    setFormulaError('');
                  }
                }}
                className="w-5 h-5 accent-violet-600"
              />
              <span className="font-medium text-violet-800">Mode formule</span>
            </label>
          </div>

          {formulaMode && (
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-violet-700 mb-2">Vecteurs disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {vectors.map(vec => (
                    <label key={vec.id} className="flex items-center gap-1 px-2 py-1 bg-white rounded border cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVectors.includes(vec.label)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVectors([...selectedVectors, vec.label]);
                          } else {
                            setSelectedVectors(selectedVectors.filter(l => l !== vec.label));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span style={{ color: vec.color }} className="font-bold">{vec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-700 mb-1">Formule vectorielle</label>
                <input
                  ref={formulaInputRef}
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg font-mono ${formulaError ? 'border-red-500' : 'border-violet-300'} focus:outline-none focus:border-violet-500`}
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Ex: 2*A + B, A · B, A × B"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedVectors.map(label => (
                  <button
                    key={label}
                    onClick={() => insertAtCursor(label)}
                    className="px-3 py-1 bg-white border-2 rounded font-bold hover:bg-gray-50"
                    style={{ borderColor: vectors.find(v => v.label === label)?.color }}
                  >
                    {label}
                  </button>
                ))}
                <button onClick={() => insertAtCursor(' + ')} className="px-3 py-1 bg-green-100 border border-green-300 rounded hover:bg-green-200">+</button>
                <button onClick={() => insertAtCursor(' - ')} className="px-3 py-1 bg-green-100 border border-green-300 rounded hover:bg-green-200">−</button>
                <button onClick={() => insertAtCursor('*')} className="px-3 py-1 bg-green-100 border border-green-300 rounded hover:bg-green-200">×</button>
                <button onClick={() => insertAtCursor(' · ')} className="px-3 py-1 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 text-xs">Scal.</button>
                <button onClick={() => insertAtCursor(' × ')} className="px-3 py-1 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 text-xs">Vect.</button>
                <button onClick={() => setFormula('')} className="px-3 py-1 bg-red-100 border border-red-300 rounded hover:bg-red-200 text-xs">Effacer</button>
              </div>

              {formulaError && <p className="text-sm text-red-600">{formulaError}</p>}
              {formulaResult && !formulaError && <p className="text-sm text-green-600">✓ Formule valide</p>}
            </div>
          )}

          {!formulaMode && (
            <>
              {/* Gestion du nombre de vecteurs */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Vecteurs: {vectors.length}</span>
                <button
                  onClick={addVector}
                  disabled={vectors.length >= 6}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Ajouter
                </button>
              </div>

              {/* Mode de saisie */}
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode('polar')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${inputMode === 'polar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {dimension === '3D' ? 'Sphérique' : 'Polaire'}
                </button>
                <button
                  onClick={() => setInputMode('cartesian')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${inputMode === 'cartesian' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cartésien
                </button>
              </div>

              {/* Contrôles pour chaque vecteur */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vectors.map((vec) => {
                  const comp = getVectorComponents(vec);
                  return (
                    <div key={vec.id} className="p-3 rounded-lg border-l-4" style={{ borderLeftColor: vec.color, backgroundColor: `${vec.color}10` }}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold" style={{ color: vec.color }}>Vecteur {vec.label}</h4>
                        {vectors.length > 2 && (
                          <button onClick={() => removeVector(vec.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                        )}
                      </div>
                      {inputMode === 'polar' ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600">Module |{vec.label}|: <strong>{vec.magnitude.toFixed(2)}</strong></label>
                            <input
                              type="range" min="0" max="10" step="0.1" value={vec.magnitude}
                              onChange={(e) => updateVector(vec.id, { magnitude: parseFloat(e.target.value) })}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{ accentColor: vec.color }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Angle θ: <strong>{vec.angle.toFixed(1)}°</strong></label>
                            <input
                              type="range" min="0" max="360" step="1" value={vec.angle}
                              onChange={(e) => updateVector(vec.id, { angle: parseFloat(e.target.value) })}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{ accentColor: vec.color }}
                            />
                          </div>
                          {dimension === '3D' && (
                            <div>
                              <label className="text-xs text-gray-600">Angle φ (vertical): <strong>{vec.phi.toFixed(1)}°</strong></label>
                              <input
                                type="range" min="0" max="180" step="1" value={vec.phi}
                                onChange={(e) => updateVector(vec.id, { phi: parseFloat(e.target.value) })}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: vec.color }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600">{vec.label}x: <strong>{comp.x.toFixed(2)}</strong></label>
                            <input
                              type="range" min="-10" max="10" step="0.1" value={comp.x}
                              onChange={(e) => updateFromCartesian(vec.id, comp, 'x', parseFloat(e.target.value))}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{ accentColor: vec.color }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">{vec.label}y: <strong>{comp.y.toFixed(2)}</strong></label>
                            <input
                              type="range" min="-10" max="10" step="0.1" value={comp.y}
                              onChange={(e) => updateFromCartesian(vec.id, comp, 'y', parseFloat(e.target.value))}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                              style={{ accentColor: vec.color }}
                            />
                          </div>
                          {dimension === '3D' && (
                            <div>
                              <label className="text-xs text-gray-600">{vec.label}z: <strong>{(comp.z || 0).toFixed(2)}</strong></label>
                              <input
                                type="range" min="-10" max="10" step="0.1" value={comp.z || 0}
                                onChange={(e) => updateFromCartesian(vec.id, comp, 'z', parseFloat(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: vec.color }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showComponents}
                  onChange={(e) => setShowComponents(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Afficher les composantes</span>
              </label>
            </>
          )}
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-slate-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            {dimension === '2D' ? (
              <canvas ref={canvasRef} width={600} height={500} className="w-full h-full" />
            ) : (
              <Canvas3DView
                vectors={vectors3DData}
                result={result3D}
                operation={operation}
                showComponents={showComponents}
                formulaMode={formulaMode}
              />
            )}
          </div>

          {/* Sélection de l'opération */}
          {!formulaMode && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setOperation('add')}
                className={`py-2 px-3 rounded-lg font-medium transition-colors ${operation === 'add' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Σ Addition
              </button>
              <button
                onClick={() => setOperation('subtract')}
                className={`py-2 px-3 rounded-lg font-medium transition-colors ${operation === 'subtract' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Soustraction
              </button>
              <button
                onClick={() => setOperation('dot')}
                disabled={vectors.length !== 2}
                className={`py-2 px-3 rounded-lg font-medium transition-colors ${operation === 'dot' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
              >
                A · B
              </button>
              <button
                onClick={() => setOperation('cross')}
                disabled={vectors.length !== 2}
                className={`py-2 px-3 rounded-lg font-medium transition-colors ${operation === 'cross' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
              >
                A × B
              </button>
            </div>
          )}

          {/* Résultat */}
          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <h3 className="font-semibold text-orange-800 mb-2">
              {formulaMode ? `Résultat: ${formula}` : operation === 'dot' ? 'Produit scalaire' : operation === 'cross' ? 'Produit vectoriel' : 'Résultant R'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {(formulaMode ? (formulaResult?.isScalar || false) : operation === 'dot') ? (
                <>
                  {'magA' in resultComp && (
                    <>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">|A|:</span> <strong>{(resultComp as DotProductResult).magA.toFixed(2)}</strong></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">|B|:</span> <strong>{(resultComp as DotProductResult).magB.toFixed(2)}</strong></div>
                      <div className="bg-white p-2 rounded"><span className="text-gray-500">θ:</span> <strong>{(resultComp as DotProductResult).angle.toFixed(1)}°</strong></div>
                      <div className="bg-orange-100 p-2 rounded"><span className="text-gray-500">A·B:</span> <strong className="text-orange-700">{(resultComp as DotProductResult).scalar.toFixed(2)}</strong></div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-white p-2 rounded"><span className="text-gray-500">{operation === 'cross' ? 'Cx' : 'Rx'}:</span> <strong>{((formulaMode && formulaResult) || resultComp as VectorComponents).x.toFixed(2)}</strong></div>
                  <div className="bg-white p-2 rounded"><span className="text-gray-500">{operation === 'cross' ? 'Cy' : 'Ry'}:</span> <strong>{((formulaMode && formulaResult) || resultComp as VectorComponents).y.toFixed(2)}</strong></div>
                  {(dimension === '3D' || operation === 'cross') && (
                    <div className="bg-white p-2 rounded"><span className="text-gray-500">{operation === 'cross' ? 'Cz' : 'Rz'}:</span> <strong>{(((formulaMode && formulaResult) || resultComp as VectorComponents).z || 0).toFixed(2)}</strong></div>
                  )}
                  <div className="bg-orange-100 p-2 rounded"><span className="text-gray-500">|{operation === 'cross' ? 'C' : 'R'}|:</span> <strong className="text-orange-700">{resultMagnitude?.toFixed(2)}</strong></div>
                  {operation !== 'cross' && dimension === '2D' && (
                    <div className="bg-orange-100 p-2 rounded"><span className="text-gray-500">θ:</span> <strong className="text-orange-700">{resultAngle?.toFixed(1)}°</strong></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section théorie */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Théorie - Opérations vectorielles</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Addition vectorielle</h4>
            <BlockMath math="\vec{R} = \vec{A} + \vec{B} = (A_x + B_x, A_y + B_y, A_z + B_z)" />
            <p className="text-blue-700 mt-2">Méthode du parallélogramme ou tête-à-queue.</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Soustraction</h4>
            <BlockMath math="\vec{A} - \vec{B} = \vec{A} + (-\vec{B})" />
            <p className="text-green-700 mt-2">Inverser B puis additionner.</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">Produit scalaire</h4>
            <BlockMath math="\vec{A} \cdot \vec{B} = |\vec{A}||\vec{B}|\cos\theta" />
            <p className="text-purple-700 mt-2">Résultat = nombre. Mesure l'alignement.</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">Produit vectoriel</h4>
            <BlockMath math="|\vec{A} \times \vec{B}| = |\vec{A}||\vec{B}|\sin\theta" />
            <p className="text-amber-700 mt-2">Résultat ⊥ au plan. Aire du parallélogramme.</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4">
            <h4 className="font-medium text-cyan-800 mb-2">Moment de force</h4>
            <BlockMath math="\vec{M} = \vec{r} \times \vec{F}" />
            <p className="text-cyan-700 mt-2">Application importante en statique.</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-4">
            <h4 className="font-medium text-rose-800 mb-2">Conversion</h4>
            <p className="text-rose-700">Polaire → Cartésien:</p>
            <BlockMath math="x = r\cos\theta, \quad y = r\sin\theta" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VectorSimulator;
