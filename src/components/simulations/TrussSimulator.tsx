'use client';

import { useState, useMemo, useCallback } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { cn } from '@/lib/utils';

// Types
interface Node {
  id: string;
  x: number;
  y: number;
  supportType?: 'pin' | 'roller' | 'none';
  appliedForce?: { fx: number; fy: number };
}

interface Member {
  id: string;
  startNode: string;
  endNode: string;
}

interface TrussConfig {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  members: Member[];
}

// Predefined truss configurations
const TRUSS_CONFIGS: TrussConfig[] = [
  {
    id: 'simple',
    name: 'Treillis simple',
    description: 'Treillis triangulaire à 3 barres',
    nodes: [
      { id: 'A', x: 100, y: 300, supportType: 'pin' },
      { id: 'B', x: 400, y: 300, supportType: 'roller' },
      { id: 'C', x: 250, y: 150, appliedForce: { fx: 0, fy: 0 } },
    ],
    members: [
      { id: 'AB', startNode: 'A', endNode: 'B' },
      { id: 'AC', startNode: 'A', endNode: 'C' },
      { id: 'BC', startNode: 'B', endNode: 'C' },
    ],
  },
  {
    id: 'warren',
    name: 'Treillis Warren',
    description: 'Treillis à triangles équilatéraux alternés',
    nodes: [
      { id: 'A', x: 80, y: 300, supportType: 'pin' },
      { id: 'B', x: 200, y: 300 },
      { id: 'C', x: 320, y: 300 },
      { id: 'D', x: 440, y: 300, supportType: 'roller' },
      { id: 'E', x: 140, y: 180 },
      { id: 'F', x: 260, y: 180, appliedForce: { fx: 0, fy: 0 } },
      { id: 'G', x: 380, y: 180 },
    ],
    members: [
      { id: 'AB', startNode: 'A', endNode: 'B' },
      { id: 'BC', startNode: 'B', endNode: 'C' },
      { id: 'CD', startNode: 'C', endNode: 'D' },
      { id: 'AE', startNode: 'A', endNode: 'E' },
      { id: 'BE', startNode: 'B', endNode: 'E' },
      { id: 'EF', startNode: 'E', endNode: 'F' },
      { id: 'BF', startNode: 'B', endNode: 'F' },
      { id: 'CF', startNode: 'C', endNode: 'F' },
      { id: 'FG', startNode: 'F', endNode: 'G' },
      { id: 'CG', startNode: 'C', endNode: 'G' },
      { id: 'DG', startNode: 'D', endNode: 'G' },
    ],
  },
  {
    id: 'pratt',
    name: 'Treillis Pratt',
    description: 'Treillis avec diagonales en tension',
    nodes: [
      { id: 'A', x: 80, y: 300, supportType: 'pin' },
      { id: 'B', x: 200, y: 300 },
      { id: 'C', x: 320, y: 300 },
      { id: 'D', x: 440, y: 300, supportType: 'roller' },
      { id: 'E', x: 80, y: 180 },
      { id: 'F', x: 200, y: 180 },
      { id: 'G', x: 320, y: 180, appliedForce: { fx: 0, fy: 0 } },
      { id: 'H', x: 440, y: 180 },
    ],
    members: [
      // Bottom chord
      { id: 'AB', startNode: 'A', endNode: 'B' },
      { id: 'BC', startNode: 'B', endNode: 'C' },
      { id: 'CD', startNode: 'C', endNode: 'D' },
      // Top chord
      { id: 'EF', startNode: 'E', endNode: 'F' },
      { id: 'FG', startNode: 'F', endNode: 'G' },
      { id: 'GH', startNode: 'G', endNode: 'H' },
      // Verticals
      { id: 'AE', startNode: 'A', endNode: 'E' },
      { id: 'BF', startNode: 'B', endNode: 'F' },
      { id: 'CG', startNode: 'C', endNode: 'G' },
      { id: 'DH', startNode: 'D', endNode: 'H' },
      // Diagonals
      { id: 'BE', startNode: 'B', endNode: 'E' },
      { id: 'CF', startNode: 'C', endNode: 'F' },
      { id: 'CG2', startNode: 'C', endNode: 'G' },
      { id: 'DG', startNode: 'D', endNode: 'G' },
    ],
  },
  {
    id: 'howe',
    name: 'Treillis Howe',
    description: 'Treillis avec diagonales en compression',
    nodes: [
      { id: 'A', x: 80, y: 300, supportType: 'pin' },
      { id: 'B', x: 200, y: 300 },
      { id: 'C', x: 320, y: 300, appliedForce: { fx: 0, fy: 0 } },
      { id: 'D', x: 440, y: 300, supportType: 'roller' },
      { id: 'E', x: 80, y: 180 },
      { id: 'F', x: 200, y: 180 },
      { id: 'G', x: 320, y: 180 },
      { id: 'H', x: 440, y: 180 },
    ],
    members: [
      // Bottom chord
      { id: 'AB', startNode: 'A', endNode: 'B' },
      { id: 'BC', startNode: 'B', endNode: 'C' },
      { id: 'CD', startNode: 'C', endNode: 'D' },
      // Top chord
      { id: 'EF', startNode: 'E', endNode: 'F' },
      { id: 'FG', startNode: 'F', endNode: 'G' },
      { id: 'GH', startNode: 'G', endNode: 'H' },
      // Verticals
      { id: 'AE', startNode: 'A', endNode: 'E' },
      { id: 'BF', startNode: 'B', endNode: 'F' },
      { id: 'CG', startNode: 'C', endNode: 'G' },
      { id: 'DH', startNode: 'D', endNode: 'H' },
      // Diagonals (opposite direction from Pratt)
      { id: 'AF', startNode: 'A', endNode: 'F' },
      { id: 'BG', startNode: 'B', endNode: 'G' },
      { id: 'CH', startNode: 'C', endNode: 'H' },
    ],
  },
];

// Truss analysis using method of joints
function analyzeTruss(
  nodes: Node[],
  members: Member[],
  appliedForceNode: string,
  appliedForce: { fx: number; fy: number }
): { memberForces: Map<string, number>; reactions: Map<string, { rx: number; ry: number }> } {
  const memberForces = new Map<string, number>();
  const reactions = new Map<string, { rx: number; ry: number }>();

  // Create node map for quick lookup
  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Find support nodes
  const pinNode = nodes.find(n => n.supportType === 'pin');
  const rollerNode = nodes.find(n => n.supportType === 'roller');

  if (!pinNode || !rollerNode) {
    return { memberForces, reactions };
  }

  // Calculate reactions using equilibrium equations
  // Sum of moments about pin = 0
  const forceNode = nodeMap.get(appliedForceNode);
  if (!forceNode) {
    return { memberForces, reactions };
  }

  // Distance from pin to roller (horizontal)
  const L = rollerNode.x - pinNode.x;

  // Distance from pin to applied force
  const dForce = forceNode.x - pinNode.x;

  // Sum of moments about A (pin): Ry_B * L - Fy * dForce - Fx * (forceNode.y - pinNode.y) = 0
  // For simplicity, assume roller only has vertical reaction
  const Ry_roller = (appliedForce.fy * dForce + appliedForce.fx * (forceNode.y - pinNode.y)) / L;

  // Sum of Fy = 0: Ry_pin + Ry_roller - Fy = 0
  const Ry_pin = appliedForce.fy - Ry_roller;

  // Sum of Fx = 0: Rx_pin - Fx = 0
  const Rx_pin = -appliedForce.fx;

  reactions.set(pinNode.id, { rx: Rx_pin, ry: Ry_pin });
  reactions.set(rollerNode.id, { rx: 0, ry: Ry_roller });

  // Now solve for member forces using method of joints
  // Build adjacency list
  const adjacency = new Map<string, { nodeId: string; memberId: string }[]>();
  nodes.forEach(n => adjacency.set(n.id, []));

  members.forEach(m => {
    adjacency.get(m.startNode)?.push({ nodeId: m.endNode, memberId: m.id });
    adjacency.get(m.endNode)?.push({ nodeId: m.startNode, memberId: m.id });
  });

  // Solve iteratively (simplified approach)
  const solved = new Set<string>();
  const maxIterations = 50;
  let iteration = 0;

  // Initialize all member forces to 0
  members.forEach(m => memberForces.set(m.id, 0));

  while (solved.size < members.length && iteration < maxIterations) {
    iteration++;

    for (const node of nodes) {
      const connectedMembers = adjacency.get(node.id) || [];
      const unknownMembers = connectedMembers.filter(cm => !solved.has(cm.memberId));

      // Can only solve if 2 or fewer unknowns
      if (unknownMembers.length > 2) continue;

      // Build equilibrium equations
      let sumFx = 0;
      let sumFy = 0;

      // Add applied force if this is the force node
      if (node.id === appliedForceNode) {
        sumFx -= appliedForce.fx;
        sumFy -= appliedForce.fy;
      }

      // Add reactions if this is a support node
      const reaction = reactions.get(node.id);
      if (reaction) {
        sumFx -= reaction.rx;
        sumFy -= reaction.ry;
      }

      // Add known member forces
      for (const cm of connectedMembers) {
        if (solved.has(cm.memberId)) {
          const otherNode = nodeMap.get(cm.nodeId)!;
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const force = memberForces.get(cm.memberId) || 0;
          sumFx += force * (dx / length);
          sumFy += force * (dy / length);
        }
      }

      // Solve for unknowns
      if (unknownMembers.length === 1) {
        const um = unknownMembers[0];
        const otherNode = nodeMap.get(um.nodeId)!;
        const dx = otherNode.x - node.x;
        const dy = otherNode.y - node.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Check which component gives better solution
        let force: number;
        if (Math.abs(dx) > Math.abs(dy)) {
          force = -sumFx * length / dx;
        } else {
          force = -sumFy * length / dy;
        }

        memberForces.set(um.memberId, force);
        solved.add(um.memberId);
      } else if (unknownMembers.length === 2) {
        const um1 = unknownMembers[0];
        const um2 = unknownMembers[1];

        const node1 = nodeMap.get(um1.nodeId)!;
        const node2 = nodeMap.get(um2.nodeId)!;

        const dx1 = node1.x - node.x;
        const dy1 = node1.y - node.y;
        const L1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

        const dx2 = node2.x - node.x;
        const dy2 = node2.y - node.y;
        const L2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        // Solve 2x2 system: [cos1 cos2][F1] = [-sumFx]
        //                    [sin1 sin2][F2]   [-sumFy]
        const cos1 = dx1 / L1;
        const sin1 = dy1 / L1;
        const cos2 = dx2 / L2;
        const sin2 = dy2 / L2;

        const det = cos1 * sin2 - cos2 * sin1;

        if (Math.abs(det) > 0.001) {
          const F1 = (-sumFx * sin2 + sumFy * cos2) / det;
          const F2 = (-sumFy * cos1 + sumFx * sin1) / det;

          memberForces.set(um1.memberId, F1);
          memberForces.set(um2.memberId, F2);
          solved.add(um1.memberId);
          solved.add(um2.memberId);
        }
      }
    }
  }

  return { memberForces, reactions };
}

export function TrussSimulator() {
  const [selectedConfig, setSelectedConfig] = useState<string>('simple');
  const [appliedForceX, setAppliedForceX] = useState(0);
  const [appliedForceY, setAppliedForceY] = useState(1000); // N, pointing down
  const [showForceValues, setShowForceValues] = useState(true);
  const [showReactions, setShowReactions] = useState(true);
  const [scale, setScale] = useState(1);

  const canvasSize = { width: 550, height: 400 };

  const config = TRUSS_CONFIGS.find(c => c.id === selectedConfig)!;

  // Find the node with applied force
  const forceNodeId = config.nodes.find(n => n.appliedForce !== undefined)?.id || config.nodes[2]?.id;

  // Analyze the truss
  const { memberForces, reactions } = useMemo(() => {
    return analyzeTruss(
      config.nodes,
      config.members,
      forceNodeId,
      { fx: appliedForceX, fy: appliedForceY }
    );
  }, [config, forceNodeId, appliedForceX, appliedForceY]);

  // Create node map for rendering
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    config.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [config]);

  // Get max force for color scaling
  const maxForce = useMemo(() => {
    let max = 0;
    memberForces.forEach(f => {
      if (Math.abs(f) > max) max = Math.abs(f);
    });
    return max || 1;
  }, [memberForces]);

  // Get color for member based on force
  const getMemberColor = (force: number) => {
    const intensity = Math.min(Math.abs(force) / maxForce, 1);
    if (force > 10) {
      // Tension - blue
      return `rgb(${Math.round(59 - intensity * 59)}, ${Math.round(130 - intensity * 30)}, ${Math.round(246)})`;
    } else if (force < -10) {
      // Compression - red
      return `rgb(${Math.round(220)}, ${Math.round(38 + intensity * 20)}, ${Math.round(38)})`;
    }
    return '#6b7280'; // Neutral gray for zero force
  };

  const getMemberWidth = (force: number) => {
    const intensity = Math.min(Math.abs(force) / maxForce, 1);
    return 4 + intensity * 6;
  };

  // Render support symbol
  const renderSupport = (node: Node) => {
    if (node.supportType === 'pin') {
      return (
        <g key={`support-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
          <polygon points="0,0 -15,25 15,25" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="#4f46e5" />
          <line x1="-20" y1="28" x2="20" y2="28" stroke="#374151" strokeWidth="2" />
          {[-12, -4, 4, 12].map((x, i) => (
            <line key={i} x1={x} y1="28" x2={x - 6} y2="38" stroke="#374151" strokeWidth="1.5" />
          ))}
        </g>
      );
    } else if (node.supportType === 'roller') {
      return (
        <g key={`support-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
          <polygon points="0,0 -12,20 12,20" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="#10b981" />
          <circle cx="-6" cy="26" r="5" fill="none" stroke="#374151" strokeWidth="2" />
          <circle cx="6" cy="26" r="5" fill="none" stroke="#374151" strokeWidth="2" />
          <line x1="-18" y1="34" x2="18" y2="34" stroke="#374151" strokeWidth="2" />
        </g>
      );
    }
    return null;
  };

  // Render reaction forces
  const renderReaction = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    const reaction = reactions.get(nodeId);
    if (!node || !reaction || !showReactions) return null;

    const arrowLength = 50;
    const elements = [];

    // Vertical reaction
    if (Math.abs(reaction.ry) > 1) {
      const direction = reaction.ry > 0 ? -1 : 1;
      elements.push(
        <g key={`ry-${nodeId}`}>
          <line
            x1={node.x}
            y1={node.y + 40}
            x2={node.x}
            y2={node.y + 40 + direction * arrowLength}
            stroke="#10b981"
            strokeWidth="3"
          />
          <polygon
            points={direction < 0
              ? `${node.x},${node.y + 40 + direction * arrowLength} ${node.x - 6},${node.y + 40 + direction * (arrowLength - 12)} ${node.x + 6},${node.y + 40 + direction * (arrowLength - 12)}`
              : `${node.x},${node.y + 40 + direction * arrowLength} ${node.x - 6},${node.y + 40 + direction * (arrowLength - 12)} ${node.x + 6},${node.y + 40 + direction * (arrowLength - 12)}`
            }
            fill="#10b981"
          />
          {showForceValues && (
            <text
              x={node.x + 10}
              y={node.y + 40 + direction * arrowLength / 2}
              className="text-xs fill-emerald-600 font-medium"
            >
              {Math.abs(reaction.ry).toFixed(0)} N
            </text>
          )}
        </g>
      );
    }

    // Horizontal reaction
    if (Math.abs(reaction.rx) > 1) {
      const direction = reaction.rx > 0 ? 1 : -1;
      elements.push(
        <g key={`rx-${nodeId}`}>
          <line
            x1={node.x - 30}
            y1={node.y}
            x2={node.x - 30 + direction * arrowLength}
            y2={node.y}
            stroke="#3b82f6"
            strokeWidth="3"
          />
          <polygon
            points={`${node.x - 30 + direction * arrowLength},${node.y} ${node.x - 30 + direction * (arrowLength - 12)},${node.y - 6} ${node.x - 30 + direction * (arrowLength - 12)},${node.y + 6}`}
            fill="#3b82f6"
          />
          {showForceValues && (
            <text
              x={node.x - 30 + direction * arrowLength / 2}
              y={node.y - 10}
              textAnchor="middle"
              className="text-xs fill-blue-600 font-medium"
            >
              {Math.abs(reaction.rx).toFixed(0)} N
            </text>
          )}
        </g>
      );
    }

    return elements;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {TRUSS_CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedConfig(c.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                selectedConfig === c.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Canvas */}
          <div className="border-2 border-blue-200 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50 to-white">
            <svg width={canvasSize.width} height={canvasSize.height}>
              {/* Grid */}
              <defs>
                <pattern id="trussGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dbeafe" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#trussGrid)" />

              {/* Members */}
              {config.members.map((member) => {
                const startNode = nodeMap.get(member.startNode)!;
                const endNode = nodeMap.get(member.endNode)!;
                const force = memberForces.get(member.id) || 0;
                const midX = (startNode.x + endNode.x) / 2;
                const midY = (startNode.y + endNode.y) / 2;

                return (
                  <g key={member.id}>
                    <line
                      x1={startNode.x}
                      y1={startNode.y}
                      x2={endNode.x}
                      y2={endNode.y}
                      stroke={getMemberColor(force)}
                      strokeWidth={getMemberWidth(force)}
                      strokeLinecap="round"
                    />
                    {showForceValues && Math.abs(force) > 10 && (
                      <g>
                        <rect
                          x={midX - 25}
                          y={midY - 10}
                          width="50"
                          height="20"
                          rx="4"
                          fill="white"
                          fillOpacity="0.9"
                          stroke={getMemberColor(force)}
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          className="text-xs font-mono font-medium"
                          fill={getMemberColor(force)}
                        >
                          {Math.abs(force).toFixed(0)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Supports */}
              {config.nodes.map(renderSupport)}

              {/* Nodes */}
              {config.nodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="8"
                    fill={node.supportType ? (node.supportType === 'pin' ? '#4f46e5' : '#10b981') : '#374151'}
                  />
                  <text
                    x={node.x}
                    y={node.y - 15}
                    textAnchor="middle"
                    className="text-sm font-bold fill-gray-700"
                  >
                    {node.id}
                  </text>
                </g>
              ))}

              {/* Applied force */}
              {forceNodeId && (appliedForceX !== 0 || appliedForceY !== 0) && (
                <g>
                  {appliedForceY !== 0 && (
                    <>
                      <line
                        x1={nodeMap.get(forceNodeId)!.x}
                        y1={nodeMap.get(forceNodeId)!.y - 10}
                        x2={nodeMap.get(forceNodeId)!.x}
                        y2={nodeMap.get(forceNodeId)!.y - 70}
                        stroke="#dc2626"
                        strokeWidth="4"
                      />
                      <polygon
                        points={`${nodeMap.get(forceNodeId)!.x},${nodeMap.get(forceNodeId)!.y - 10} ${nodeMap.get(forceNodeId)!.x - 8},${nodeMap.get(forceNodeId)!.y - 25} ${nodeMap.get(forceNodeId)!.x + 8},${nodeMap.get(forceNodeId)!.y - 25}`}
                        fill="#dc2626"
                      />
                      <text
                        x={nodeMap.get(forceNodeId)!.x + 15}
                        y={nodeMap.get(forceNodeId)!.y - 40}
                        className="text-sm font-bold fill-red-600"
                      >
                        F = {appliedForceY} N
                      </text>
                    </>
                  )}
                  {appliedForceX !== 0 && (
                    <>
                      <line
                        x1={nodeMap.get(forceNodeId)!.x + 10}
                        y1={nodeMap.get(forceNodeId)!.y}
                        x2={nodeMap.get(forceNodeId)!.x + 70}
                        y2={nodeMap.get(forceNodeId)!.y}
                        stroke="#dc2626"
                        strokeWidth="4"
                      />
                      <polygon
                        points={`${nodeMap.get(forceNodeId)!.x + 70},${nodeMap.get(forceNodeId)!.y} ${nodeMap.get(forceNodeId)!.x + 55},${nodeMap.get(forceNodeId)!.y - 8} ${nodeMap.get(forceNodeId)!.x + 55},${nodeMap.get(forceNodeId)!.y + 8}`}
                        fill="#dc2626"
                      />
                      <text
                        x={nodeMap.get(forceNodeId)!.x + 40}
                        y={nodeMap.get(forceNodeId)!.y - 10}
                        textAnchor="middle"
                        className="text-sm font-bold fill-red-600"
                      >
                        Fx = {appliedForceX} N
                      </text>
                    </>
                  )}
                </g>
              )}

              {/* Reactions */}
              {config.nodes
                .filter(n => n.supportType)
                .map(n => renderReaction(n.id))}

              {/* Legend */}
              <g transform="translate(10, 360)">
                <rect x="0" y="-5" width="140" height="35" rx="4" fill="white" fillOpacity="0.9" stroke="#e5e7eb" />
                <line x1="10" y1="5" x2="40" y2="5" stroke="#3b82f6" strokeWidth="4" />
                <text x="45" y="9" className="text-xs fill-gray-600">Tension (+)</text>
                <line x1="10" y1="20" x2="40" y2="20" stroke="#dc2626" strokeWidth="4" />
                <text x="45" y="24" className="text-xs fill-gray-600">Compression (-)</text>
              </g>
            </svg>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Applied Force */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">Force appliquée</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-red-700 mb-1">
                    Force verticale Fy: {appliedForceY} N
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={appliedForceY}
                    onChange={(e) => setAppliedForceY(parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-red-700 mb-1">
                    Force horizontale Fx: {appliedForceX} N
                  </label>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="100"
                    value={appliedForceX}
                    onChange={(e) => setAppliedForceX(parseInt(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
              </div>
            </div>

            {/* Display options */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Affichage</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showForceValues}
                    onChange={(e) => setShowForceValues(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Valeurs des forces internes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReactions}
                    onChange={(e) => setShowReactions(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Réactions aux appuis</span>
                </label>
              </div>
            </div>

            {/* Reactions summary */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="font-semibold text-emerald-800 mb-2">Réactions aux appuis</h3>
              <div className="space-y-2 text-sm">
                {Array.from(reactions.entries()).map(([nodeId, r]) => (
                  <div key={nodeId} className="flex justify-between">
                    <span className="text-emerald-700">Noeud {nodeId}:</span>
                    <span className="font-mono text-emerald-800">
                      {Math.abs(r.rx) > 1 && `Rx=${r.rx.toFixed(0)}N `}
                      Ry={r.ry.toFixed(0)}N
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Member forces table */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Forces internes</h3>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-blue-100">
                    <tr>
                      <th className="text-left py-1 px-2">Barre</th>
                      <th className="text-right py-1 px-2">Force (N)</th>
                      <th className="text-center py-1 px-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.members.map((m) => {
                      const force = memberForces.get(m.id) || 0;
                      return (
                        <tr key={m.id} className="border-t border-blue-200">
                          <td className="py-1 px-2 font-mono">{m.startNode}-{m.endNode}</td>
                          <td className="py-1 px-2 text-right font-mono">
                            {Math.abs(force).toFixed(0)}
                          </td>
                          <td className={cn(
                            "py-1 px-2 text-center text-xs font-medium",
                            force > 10 ? "text-blue-600" : force < -10 ? "text-red-600" : "text-gray-500"
                          )}>
                            {force > 10 ? 'T' : force < -10 ? 'C' : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-600 mt-2">T = Tension, C = Compression</p>
            </div>
          </div>
        </div>

        {/* Theory section */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Analyse des treillis</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Hypothèses simplificatrices:</p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Les barres sont connectées par des articulations parfaites</li>
                <li>Les charges sont appliquées uniquement aux noeuds</li>
                <li>Le poids propre des barres est négligeable</li>
                <li>Les barres ne subissent que des efforts axiaux (traction ou compression)</li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Méthode des noeuds:</p>
              <BlockMath math="\sum F_x = 0 \quad \sum F_y = 0" />
              <p className="text-sm text-gray-600 mt-2">
                À chaque noeud, l'équilibre des forces permet de déterminer les forces internes dans les barres.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Convention de signe:</strong> Une force positive indique une <span className="text-blue-600 font-semibold">tension</span> (la barre est étirée),
              une force négative indique une <span className="text-red-600 font-semibold">compression</span> (la barre est comprimée).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrussSimulator;
