'use client';

import { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

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
// Types
// ---------------------------------------------------------------------------

interface Node {
  id: string;
  x: number;
  y: number;
  supportType?: 'pin' | 'roller';
}

interface Member {
  id: string;
  start: string;
  end: string;
}

interface CutDef {
  id: string;
  label: string;
  description: string;
  cutX: number;                            // abscisse de la coupe (ligne verticale)
  cutMembers: string[];                    // barres coupées
  momentNode: string;                      // noeud autour duquel on prend le moment
  targetMember: string;                    // barre dont on déduit F
}

// ---------------------------------------------------------------------------
// Treillis Pratt 6 noeuds — exemple pédagogique
// ---------------------------------------------------------------------------

const SPAN = 360;
const H_TRUSS = 120;
const OX = 80;
const OY = 250;

const NODES: Node[] = [
  { id: 'A', x: OX,              y: OY, supportType: 'pin' },
  { id: 'B', x: OX + SPAN / 3,  y: OY },
  { id: 'C', x: OX + 2 * SPAN / 3, y: OY },
  { id: 'D', x: OX + SPAN,      y: OY, supportType: 'roller' },
  { id: 'E', x: OX + SPAN / 3,  y: OY - H_TRUSS },
  { id: 'F', x: OX + 2 * SPAN / 3, y: OY - H_TRUSS },
];

const MEMBERS: Member[] = [
  // Membrure inférieure
  { id: 'AB', start: 'A', end: 'B' },
  { id: 'BC', start: 'B', end: 'C' },
  { id: 'CD', start: 'C', end: 'D' },
  // Membrure supérieure
  { id: 'EF', start: 'E', end: 'F' },
  // Montants
  { id: 'AE', start: 'A', end: 'E' },
  { id: 'BF', start: 'B', end: 'F' },
  { id: 'CF', start: 'C', end: 'F' },
  { id: 'DF', start: 'D', end: 'F' },
  // Diagonales
  { id: 'BE', start: 'B', end: 'E' },
];

// Coupes disponibles
const CUTS: CutDef[] = [
  {
    id: 'cut1',
    label: 'Coupe I-I (barre EF)',
    description: 'Coupe entre B-E et E-F. Moment autour de B pour isoler F_{EF}.',
    cutX: OX + SPAN / 3 - 20,
    cutMembers: ['AB', 'AE', 'BE'],
    momentNode: 'B',
    targetMember: 'EF',
  },
  {
    id: 'cut2',
    label: 'Coupe II-II (barre BC)',
    description: 'Coupe entre B et C. Moment autour de F pour isoler F_{BC}.',
    cutX: OX + SPAN / 3 + 40,
    cutMembers: ['BC', 'BF', 'EF'],
    momentNode: 'F',
    targetMember: 'BC',
  },
  {
    id: 'cut3',
    label: 'Coupe III-III (barre BF)',
    description: 'Coupe entre B-F et C-F. On projette sur y pour isoler F_{BF}.',
    cutX: OX + SPAN / 2,
    cutMembers: ['BC', 'BF', 'EF'],
    momentNode: 'B',
    targetMember: 'BF',
  },
];

// ---------------------------------------------------------------------------
// Analyse : réactions + forces dans les barres coupées (méthode des sections)
// ---------------------------------------------------------------------------

function analyze(
  Fy: number,
  forceNodeId: string,
) {
  const nodeMap = new Map(NODES.map(n => [n.id, n]));
  const pinNode = NODES.find(n => n.supportType === 'pin')!;
  const rollerNode = NODES.find(n => n.supportType === 'roller')!;
  const forceNode = nodeMap.get(forceNodeId)!;

  const L = rollerNode.x - pinNode.x;
  const dForce = forceNode.x - pinNode.x;

  const Ry_roller = (Fy * dForce) / L;
  const Ry_pin = Fy - Ry_roller;

  // Forces complètes (méthode des noeuds intégrale — pour vérifier les sections)
  // On utilise un solveur simplifié identique à TrussSimulator
  const memberForces = new Map<string, number>();
  const adjacency = new Map<string, { nodeId: string; memberId: string }[]>();
  NODES.forEach(n => adjacency.set(n.id, []));
  MEMBERS.forEach(m => {
    adjacency.get(m.start)?.push({ nodeId: m.end, memberId: m.id });
    adjacency.get(m.end)?.push({ nodeId: m.start, memberId: m.id });
  });
  MEMBERS.forEach(m => memberForces.set(m.id, 0));
  const solved = new Set<string>();
  const reactions = new Map<string, { rx: number; ry: number }>();
  reactions.set(pinNode.id, { rx: 0, ry: Ry_pin });
  reactions.set(rollerNode.id, { rx: 0, ry: Ry_roller });

  for (let iter = 0; iter < 50 && solved.size < MEMBERS.length; iter++) {
    for (const node of NODES) {
      const conn = adjacency.get(node.id) || [];
      const unknowns = conn.filter(cm => !solved.has(cm.memberId));
      if (unknowns.length > 2) continue;

      let sumFx = 0;
      let sumFy = 0;
      if (node.id === forceNodeId) sumFy -= Fy;
      const r = reactions.get(node.id);
      if (r) { sumFx -= r.rx; sumFy -= r.ry; }

      for (const cm of conn) {
        if (!solved.has(cm.memberId)) continue;
        const other = nodeMap.get(cm.nodeId)!;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const f = memberForces.get(cm.memberId) || 0;
        sumFx += f * (dx / len);
        sumFy += f * (dy / len);
      }

      if (unknowns.length === 1) {
        const um = unknowns[0];
        const other = nodeMap.get(um.nodeId)!;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const f = Math.abs(dx) > Math.abs(dy) ? -sumFx * len / dx : -sumFy * len / dy;
        memberForces.set(um.memberId, f);
        solved.add(um.memberId);
      } else if (unknowns.length === 2) {
        const [um1, um2] = unknowns;
        const n1 = nodeMap.get(um1.nodeId)!;
        const n2 = nodeMap.get(um2.nodeId)!;
        const dx1 = n1.x - node.x, dy1 = n1.y - node.y, L1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const dx2 = n2.x - node.x, dy2 = n2.y - node.y, L2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const c1 = dx1 / L1, s1 = dy1 / L1, c2 = dx2 / L2, s2 = dy2 / L2;
        const det = c1 * s2 - c2 * s1;
        if (Math.abs(det) > 0.001) {
          memberForces.set(um1.memberId, (-sumFx * s2 + sumFy * c2) / det);
          memberForces.set(um2.memberId, (-sumFy * c1 + sumFx * s1) / det);
          solved.add(um1.memberId);
          solved.add(um2.memberId);
        }
      }
    }
  }

  return { memberForces, Ry_pin, Ry_roller };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SectionMethodSimulator() {
  const [forceY, setForceY] = useState(1000);
  const [forceNodeId, setForceNodeId] = useState('E');
  const [selectedCut, setSelectedCut] = useState<string>('cut1');

  const cut = CUTS.find(c => c.id === selectedCut)!;
  const { memberForces, Ry_pin, Ry_roller } = useMemo(
    () => analyze(forceY, forceNodeId),
    [forceY, forceNodeId],
  );

  const nodeMap = useMemo(() => new Map(NODES.map(n => [n.id, n])), []);

  const maxForce = useMemo(() => {
    let mx = 0;
    memberForces.forEach(f => { if (Math.abs(f) > mx) mx = Math.abs(f); });
    return mx || 1;
  }, [memberForces]);

  const getColor = (f: number) => {
    if (f > 10) return '#3b82f6';
    if (f < -10) return '#ef4444';
    return '#6b7280';
  };
  const getWidth = (f: number) => 3 + Math.min(Math.abs(f) / maxForce, 1) * 5;

  const forceNode = nodeMap.get(forceNodeId)!;
  const svgW = 600;
  const svgH = 350;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Méthode des sections (Ritter)
        </h2>
        <p className="text-gray-600">
          Déterminer la force dans une barre sans résoudre tout le treillis
        </p>
      </div>

      {/* SVG */}
      <div className="flex flex-col items-center space-y-4">
        <div className="border-2 border-blue-200 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50 to-white w-full max-w-[700px]">
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
            {/* Grid */}
            <defs>
              <pattern id="sGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dbeafe" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sGrid)" />

            {/* Ligne de coupe */}
            <line
              x1={cut.cutX}
              y1={20}
              x2={cut.cutX}
              y2={svgH - 20}
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="8,5"
            />
            <text x={cut.cutX + 6} y={35} className="text-xs fill-amber-600 font-bold">
              {cut.label.split(' ')[1]}
            </text>

            {/* Zone grisée (partie isolée : côté gauche) */}
            <rect
              x={0}
              y={0}
              width={cut.cutX}
              height={svgH}
              fill="#fef3c7"
              fillOpacity={0.20}
            />

            {/* Barres */}
            {MEMBERS.map(m => {
              const sn = nodeMap.get(m.start)!;
              const en = nodeMap.get(m.end)!;
              const f = memberForces.get(m.id) || 0;
              const isCut = cut.cutMembers.includes(m.id) || m.id === cut.targetMember;
              return (
                <g key={m.id}>
                  <line
                    x1={sn.x} y1={sn.y}
                    x2={en.x} y2={en.y}
                    stroke={isCut ? '#f59e0b' : getColor(f)}
                    strokeWidth={isCut ? 5 : getWidth(f)}
                    strokeLinecap="round"
                    opacity={isCut ? 1 : 0.7}
                  />
                  {/* Force label */}
                  <text
                    x={(sn.x + en.x) / 2}
                    y={(sn.y + en.y) / 2 - 8}
                    textAnchor="middle"
                    className="text-xs font-mono font-medium"
                    fill={isCut ? '#b45309' : getColor(f)}
                  >
                    {Math.abs(f) > 5 ? `${Math.abs(f).toFixed(0)} N` : ''}
                  </text>
                  {/* T/C label */}
                  {Math.abs(f) > 5 && (
                    <text
                      x={(sn.x + en.x) / 2}
                      y={(sn.y + en.y) / 2 + 8}
                      textAnchor="middle"
                      className="text-[10px] font-bold"
                      fill={f > 0 ? '#2563eb' : '#dc2626'}
                    >
                      {f > 0 ? '(T)' : '(C)'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Appuis */}
            {NODES.filter(n => n.supportType).map(n => {
              if (n.supportType === 'pin') {
                return (
                  <g key={`sup-${n.id}`} transform={`translate(${n.x},${n.y})`}>
                    <polygon points="0,0 -12,20 12,20" fill="none" stroke="#374151" strokeWidth="2" />
                    <circle cx={0} cy={0} r={5} fill="#4f46e5" />
                    <line x1={-16} y1={23} x2={16} y2={23} stroke="#374151" strokeWidth="2" />
                  </g>
                );
              }
              return (
                <g key={`sup-${n.id}`} transform={`translate(${n.x},${n.y})`}>
                  <polygon points="0,0 -10,16 10,16" fill="none" stroke="#374151" strokeWidth="2" />
                  <circle cx={0} cy={0} r={5} fill="#10b981" />
                  <circle cx={-5} cy={21} r={4} fill="none" stroke="#374151" strokeWidth="1.5" />
                  <circle cx={5} cy={21} r={4} fill="none" stroke="#374151" strokeWidth="1.5" />
                  <line x1={-14} y1={28} x2={14} y2={28} stroke="#374151" strokeWidth="2" />
                </g>
              );
            })}

            {/* Noeuds */}
            {NODES.map(n => (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={7}
                  fill={n.supportType === 'pin' ? '#4f46e5' : n.supportType === 'roller' ? '#10b981' : '#374151'}
                />
                <text x={n.x} y={n.y - 14} textAnchor="middle" className="text-xs font-bold fill-gray-700">
                  {n.id}
                </text>
              </g>
            ))}

            {/* Force appliquée */}
            {forceY > 0 && (
              <g>
                <line
                  x1={forceNode.x} y1={forceNode.y - 12}
                  x2={forceNode.x} y2={forceNode.y - 70}
                  stroke="#dc2626" strokeWidth="3.5"
                />
                <polygon
                  points={`${forceNode.x},${forceNode.y - 12} ${forceNode.x - 7},${forceNode.y - 24} ${forceNode.x + 7},${forceNode.y - 24}`}
                  fill="#dc2626"
                />
                <text x={forceNode.x + 12} y={forceNode.y - 45} className="text-xs font-bold fill-red-600">
                  F = {forceY} N
                </text>
              </g>
            )}

            {/* Réactions */}
            {Ry_pin !== 0 && (
              <g>
                <line x1={NODES[0].x} y1={NODES[0].y + 30} x2={NODES[0].x} y2={NODES[0].y + 30 - 40} stroke="#10b981" strokeWidth="2.5" />
                <polygon
                  points={`${NODES[0].x},${NODES[0].y + 30 - 40} ${NODES[0].x - 5},${NODES[0].y + 30 - 28} ${NODES[0].x + 5},${NODES[0].y + 30 - 28}`}
                  fill="#10b981"
                />
                <text x={NODES[0].x + 10} y={NODES[0].y + 14} className="text-[10px] fill-emerald-600 font-medium">
                  {Ry_pin.toFixed(0)} N
                </text>
              </g>
            )}
            {Ry_roller !== 0 && (
              <g>
                <line x1={NODES[3].x} y1={NODES[3].y + 34} x2={NODES[3].x} y2={NODES[3].y + 34 - 40} stroke="#10b981" strokeWidth="2.5" />
                <polygon
                  points={`${NODES[3].x},${NODES[3].y + 34 - 40} ${NODES[3].x - 5},${NODES[3].y + 34 - 28} ${NODES[3].x + 5},${NODES[3].y + 34 - 28}`}
                  fill="#10b981"
                />
                <text x={NODES[3].x + 10} y={NODES[3].y + 18} className="text-[10px] fill-emerald-600 font-medium">
                  {Ry_roller.toFixed(0)} N
                </text>
              </g>
            )}

            {/* Point du moment */}
            <circle cx={nodeMap.get(cut.momentNode)!.x} cy={nodeMap.get(cut.momentNode)!.y} r={14}
              fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
            <text
              x={nodeMap.get(cut.momentNode)!.x}
              y={nodeMap.get(cut.momentNode)!.y + 28}
              textAnchor="middle"
              className="text-[10px] fill-amber-700 font-bold"
            >
              Moment ici
            </text>

            {/* Légende */}
            <g transform={`translate(10, ${svgH - 50})`}>
              <rect x="0" y="-5" width="200" height="48" rx="4" fill="white" fillOpacity="0.9" stroke="#e5e7eb" />
              <line x1="10" y1="5" x2="35" y2="5" stroke="#3b82f6" strokeWidth="3" />
              <text x="40" y="9" className="text-[10px] fill-gray-600">Tension (+)</text>
              <line x1="10" y1="20" x2="35" y2="20" stroke="#ef4444" strokeWidth="3" />
              <text x="40" y="24" className="text-[10px] fill-gray-600">Compression (-)</text>
              <line x1="100" y1="5" x2="130" y2="5" stroke="#f59e0b" strokeWidth="4" />
              <text x="135" y="9" className="text-[10px] fill-amber-700">Barre coupée</text>
              <line x1="100" y1="20" x2="130" y2="20" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
              <text x="135" y="24" className="text-[10px] fill-amber-700">Ligne de coupe</text>
            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className="w-full max-w-[700px] space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-36">
              Force <InlineMath math="F_y" />
            </label>
            <input
              type="range" min={0} max={5000} step={100}
              value={forceY}
              onChange={(e) => setForceY(Number(e.target.value))}
              className="flex-1 accent-red-500"
            />
            <span className="text-sm font-mono text-gray-900 w-20 text-right">{forceY} N</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-36">
              Noeud d&apos;application
            </label>
            <div className="flex gap-1">
              {NODES.filter(n => !n.supportType).map(n => (
                <button
                  key={n.id}
                  onClick={() => setForceNodeId(n.id)}
                  className={cn(
                    'px-3 py-1 text-sm rounded border font-medium',
                    forceNodeId === n.id
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {n.id}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700 whitespace-nowrap font-medium w-36">
              Coupe
            </label>
            <div className="flex gap-1 flex-wrap">
              {CUTS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCut(c.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded border font-medium',
                    selectedCut === c.id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultat de la coupe */}
        <div className="w-full max-w-[700px] p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-2">{cut.label}</h3>
          <p className="text-sm text-amber-700 mb-3">{cut.description}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Barre cible : </span>
              <span className="font-mono font-bold text-amber-900">{cut.targetMember}</span>
            </div>
            <div>
              <span className="text-gray-600">Force : </span>
              <span className={cn(
                'font-mono font-bold',
                (memberForces.get(cut.targetMember) || 0) > 0 ? 'text-blue-700' : 'text-red-700',
              )}>
                {Math.abs(memberForces.get(cut.targetMember) || 0).toFixed(0)} N
                {' '}
                ({(memberForces.get(cut.targetMember) || 0) > 10 ? 'Tension' : (memberForces.get(cut.targetMember) || 0) < -10 ? 'Compression' : '≈ 0'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panneaux pédagogiques */}
      <div className="space-y-2">
        <CollapsiblePanel
          title="1. Principe de la méthode des sections"
          borderColor="border-amber-500"
          bgColor="bg-amber-50"
          textColor="text-amber-800"
          defaultOpen
        >
          <p className="text-gray-700">
            La <strong>méthode des sections</strong> (ou méthode de Ritter) permet de
            déterminer la force dans <strong>une barre précise</strong> sans devoir
            résoudre tout le treillis noeud par noeud.
          </p>
          <p className="text-gray-700">
            On effectue une <em>coupe fictive</em> qui traverse au plus <strong>3 barres
            </strong> (dont celle recherchée), séparant le treillis en deux parties. On
            isole une des deux parties et on écrit les équations d&apos;équilibre de ce
            corps libre.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\sum F_x = 0, \\quad \\sum F_y = 0, \\quad \\sum M_O = 0`} />
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="2. Équation des moments"
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-800"
        >
          <p className="text-gray-700">
            L&apos;astuce clé : choisir le <strong>point de moment</strong> à
            l&apos;intersection des lignes d&apos;action des deux <em>autres</em> barres
            coupées. Ainsi, seule la force recherchée produit un moment, et on la
            détermine directement :
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto">
            <BlockMath math={`\\sum M_O = 0 \\quad \\Longrightarrow \\quad F_{\\text{cible}} = \\frac{\\text{moments des forces externes}}{d_{\\perp}}`} />
          </div>
          <p className="text-gray-700">
            <InlineMath math={`d_{\\perp}`} /> est le bras de levier de la force dans la
            barre cible par rapport au point de moment.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="3. Comparaison avec la méthode des noeuds"
          borderColor="border-green-500"
          bgColor="bg-green-50"
          textColor="text-green-800"
        >
          <p className="text-gray-700">
            <strong>Méthode des noeuds</strong> : on résout l&apos;équilibre{' '}
            <InlineMath math={`\\sum F_x = \\sum F_y = 0`} /> à chaque noeud,
            en progressant de proche en proche. C&apos;est systématique mais fastidieux
            pour les grands treillis.
          </p>
          <p className="text-gray-700">
            <strong>Méthode des sections</strong> : on va directement à la barre
            d&apos;intérêt. Idéale lorsqu&apos;on ne cherche la force que dans quelques
            barres (cas fréquent en conception et en examen).
          </p>
          <p className="text-gray-700">
            Les deux méthodes s&apos;appuient sur les mêmes hypothèses :{' '}
            articulations parfaites, charges aux noeuds, barres en effort axial pur.
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel
          title="4. Conditions d'application"
          borderColor="border-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-700"
        >
          <p className="text-gray-700">
            La coupe doit traverser <strong>au plus 3 barres</strong> (car on dispose de
            3 équations d&apos;équilibre en 2D). Si la coupe coupe plus de 3 barres, le
            système est indéterminé avec cette seule coupe.
          </p>
          <p className="text-gray-700">
            Le treillis doit être <strong>isostatique</strong> : le nombre de barres{' '}
            <InlineMath math={`b`} /> et de réactions <InlineMath math={`r`} />
            vérifie <InlineMath math={`b + r = 2n`} /> où <InlineMath math={`n`} /> est
            le nombre de noeuds.
          </p>
          <div className="bg-gray-100 rounded p-3 overflow-x-auto text-center">
            <InlineMath math={`b = ${MEMBERS.length}, \\; r = 3, \\; n = ${NODES.length} \\quad \\Rightarrow \\quad ${MEMBERS.length} + 3 = ${MEMBERS.length + 3} = 2 \\times ${NODES.length} = ${2 * NODES.length}`} />
            {MEMBERS.length + 3 === 2 * NODES.length
              ? <span className="block text-green-700 font-medium mt-1">Treillis isostatique ✓</span>
              : <span className="block text-red-700 font-medium mt-1">Treillis non-isostatique</span>
            }
          </div>
        </CollapsiblePanel>
      </div>
    </section>
  );
}
