'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
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

// Component to render the plane formed by two vectors (for cross product)
function PlaneFromVectors({ vectors }: { vectors: VectorData[] }) {
  if (vectors.length < 2) return null;

  const comp1 = vectors[0].components;
  const comp2 = vectors[1].components;

  const v1: [number, number, number] = [comp1.x, comp1.y, comp1.z || 0];
  const v2: [number, number, number] = [comp2.x, comp2.y, comp2.z || 0];

  const scale = 1.2;
  const scaledV1: [number, number, number] = [v1[0] * scale, v1[1] * scale, v1[2] * scale];
  const scaledV2: [number, number, number] = [v2[0] * scale, v2[1] * scale, v2[2] * scale];
  const scaledSum: [number, number, number] = [scaledV1[0] + scaledV2[0], scaledV1[1] + scaledV2[1], scaledV1[2] + scaledV2[2]];

  const positions = new Float32Array([
    0, 0, 0,
    ...scaledV1,
    ...scaledV2,
    ...scaledV1,
    ...scaledSum,
    ...scaledV2
  ]);

  const key = `${comp1.x}-${comp1.y}-${comp1.z}-${comp2.x}-${comp2.y}-${comp2.z}`;

  return (
    <mesh key={key}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={6}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <meshBasicMaterial
        color="#4a9eff"
        transparent
        opacity={0.2}
        side={2}
      />
    </mesh>
  );
}

export default function Canvas3DView({ vectors, result, operation, showComponents, formulaMode }: Canvas3DViewProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [12, 10, 12], fov: 50 }}>
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Grid */}
        <Grid
          args={[20, 20]}
          cellColor="#444"
          sectionColor="#666"
          cellSize={1}
          sectionSize={5}
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
        />

        {/* Axes helper */}
        <axesHelper args={[12]} />

        {/* Axis labels */}
        <Text position={[12, 0, 0]} fontSize={0.5} color="#ff0000">
          X
        </Text>
        <Text position={[0, 12, 0]} fontSize={0.5} color="#00ff00">
          Y
        </Text>
        <Text position={[0, 0, 12]} fontSize={0.5} color="#0000ff">
          Z
        </Text>

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
