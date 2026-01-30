'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { VectorArrow3D } from './VectorArrow3D';

interface VectorComponents {
  x: number;
  y: number;
  z?: number;
}

interface VectorData {
  id: string;
  label: string;
  color: string;
  components: VectorComponents;
}

interface Canvas3DViewProps {
  vectors: VectorData[];
  result: VectorComponents | null;
  operation: 'add' | 'subtract' | 'dot' | 'cross';
  showComponents: boolean;
  formulaMode: boolean;
}

// Simple grid on XY plane
function SimpleGrid() {
  const lines: JSX.Element[] = [];
  const size = 10;
  const step = 1;

  for (let i = -size; i <= size; i += step) {
    // Lines parallel to X axis
    lines.push(
      <Line
        key={`x-${i}`}
        points={[[-size, i, 0], [size, i, 0]]}
        color="#444444"
        lineWidth={0.5}
      />
    );
    // Lines parallel to Y axis
    lines.push(
      <Line
        key={`y-${i}`}
        points={[[i, -size, 0], [i, size, 0]]}
        color="#444444"
        lineWidth={0.5}
      />
    );
  }

  return <>{lines}</>;
}

// Simple axes with colored lines
function SimpleAxes() {
  return (
    <>
      {/* X axis - Red */}
      <Line points={[[0, 0, 0], [10, 0, 0]]} color="#ff0000" lineWidth={2} />
      {/* Y axis - Green */}
      <Line points={[[0, 0, 0], [0, 10, 0]]} color="#00ff00" lineWidth={2} />
      {/* Z axis - Blue */}
      <Line points={[[0, 0, 0], [0, 0, 10]]} color="#0000ff" lineWidth={2} />
    </>
  );
}

// Component to render vectors tip-to-tail (for addition)
function TipToTailVectors({ vectors, showComponents }: { vectors: VectorData[]; showComponents: boolean }) {
  let currentPos: [number, number, number] = [0, 0, 0];
  const arrows: JSX.Element[] = [];

  vectors.forEach((vec, idx) => {
    const comp = vec.components;
    const startPos: [number, number, number] = [...currentPos];
    const endPos: [number, number, number] = [
      currentPos[0] + comp.x,
      currentPos[1] + comp.y,
      currentPos[2] + (comp.z || 0)
    ];

    arrows.push(
      <VectorArrow3D
        key={vec.id}
        start={startPos}
        end={endPos}
        color={vec.color}
        label={vec.label}
        showComponents={showComponents && idx === vectors.length - 1}
      />
    );

    currentPos = endPos;
  });

  return <>{arrows}</>;
}

// Component to render vectors from origin
function FromOriginVectors({ vectors, showComponents }: { vectors: VectorData[]; showComponents: boolean }) {
  return (
    <>
      {vectors.map((vec) => {
        const comp = vec.components;
        return (
          <VectorArrow3D
            key={vec.id}
            start={[0, 0, 0]}
            end={[comp.x, comp.y, comp.z || 0]}
            color={vec.color}
            label={vec.label}
            showComponents={showComponents}
          />
        );
      })}
    </>
  );
}

// Simple plane using Line instead of bufferGeometry
function PlaneFromVectors({ vectors }: { vectors: VectorData[] }) {
  if (vectors.length < 2) return null;

  const comp1 = vectors[0].components;
  const comp2 = vectors[1].components;

  const v1: [number, number, number] = [comp1.x, comp1.y, comp1.z || 0];
  const v2: [number, number, number] = [comp2.x, comp2.y, comp2.z || 0];
  const sum: [number, number, number] = [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];

  return (
    <>
      {/* Parallelogram outline */}
      <Line
        points={[[0, 0, 0], v1, sum, v2, [0, 0, 0]]}
        color="#4a9eff"
        lineWidth={1}
        opacity={0.5}
        transparent
      />
    </>
  );
}

export default function Canvas3DView({ vectors, result, operation, showComponents, formulaMode }: Canvas3DViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', color: '#94a3b8' }}>
        Chargement 3D...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [12, 10, 12], fov: 50 }}>
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Grid */}
        <SimpleGrid />

        {/* Axes */}
        <SimpleAxes />

        {/* Render vectors according to operation */}
        {operation === 'add' && !formulaMode ? (
          <TipToTailVectors vectors={vectors} showComponents={showComponents} />
        ) : (
          <FromOriginVectors vectors={vectors} showComponents={showComponents} />
        )}

        {/* Plane formed by two vectors (for cross product) */}
        {operation === 'cross' && <PlaneFromVectors vectors={vectors} />}

        {/* Resultant vector - not shown for dot product */}
        {result && operation !== 'dot' && (
          <VectorArrow3D
            start={[0, 0, 0]}
            end={[result.x, result.y, result.z || 0]}
            color="#f97316"
            label={operation === 'cross' ? 'C' : 'R'}
            showComponents={false}
          />
        )}

        {/* Origin marker */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}
