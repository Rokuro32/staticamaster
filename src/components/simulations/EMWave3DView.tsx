'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface EMWave3DViewProps {
  amplitude: number;
  frequency: number;
  wavelength: number;
  showEField: boolean;
  showBField: boolean;
  showPoynting: boolean;
  showWavefronts: boolean;
  isPlaying: boolean;
}

// Animated E-field wave component
function EFieldWave({
  amplitude,
  wavelength,
  timeRef,
  color = '#ef4444'
}: {
  amplitude: number;
  wavelength: number;
  timeRef: React.MutableRefObject<number>;
  color?: string;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const arrowsRef = useRef<THREE.Group>(null);

  const numPoints = 200;
  const waveLength = 8; // Visual wavelength in 3D units
  const zRange = 16;

  // Create geometry for the wave curve
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * zRange - zRange / 2;
      pts.push(new THREE.Vector3(0, 0, z));
    }
    return pts;
  }, [numPoints, zRange]);

  // Update wave animation
  useFrame(() => {
    if (!lineRef.current) return;

    const positions = lineRef.current.geometry.attributes.position;
    const time = timeRef.current;

    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * zRange - zRange / 2;
      const phase = (z / waveLength) * 2 * Math.PI - time * 2;
      const y = amplitude * 2 * Math.sin(phase);

      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  });

  // Create field vectors
  const arrows = useMemo(() => {
    const arrowPositions: number[] = [];
    for (let z = -zRange / 2; z <= zRange / 2; z += 1) {
      arrowPositions.push(z);
    }
    return arrowPositions;
  }, [zRange]);

  return (
    <group>
      {/* Main wave curve */}
      <line ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>

      {/* Field vectors */}
      <group ref={arrowsRef}>
        {arrows.map((z, idx) => (
          <EFieldArrow
            key={idx}
            z={z}
            amplitude={amplitude}
            waveLength={waveLength}
            timeRef={timeRef}
            color={color}
          />
        ))}
      </group>

      {/* Label */}
      <Html position={[0, amplitude * 2.5, -zRange / 2]} center>
        <div style={{
          color: color,
          fontWeight: 'bold',
          fontSize: '16px',
          textShadow: '1px 1px 2px black'
        }}>
          E
        </div>
      </Html>
    </group>
  );
}

// Individual E-field arrow
function EFieldArrow({
  z,
  amplitude,
  waveLength,
  timeRef,
  color
}: {
  z: number;
  amplitude: number;
  waveLength: number;
  timeRef: React.MutableRefObject<number>;
  color: string;
}) {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowRef.current) return;

    const time = timeRef.current;
    const phase = (z / waveLength) * 2 * Math.PI - time * 2;
    const value = amplitude * 2 * Math.sin(phase);

    // Scale the arrow based on field value
    arrowRef.current.scale.y = Math.abs(value) > 0.1 ? value / (amplitude * 2) : 0.01;
    arrowRef.current.position.y = value / 2;
  });

  return (
    <group ref={arrowRef} position={[0, 0, z]}>
      {/* Arrow shaft */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, amplitude * 2, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, amplitude, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Animated B-field wave component (perpendicular to E)
function BFieldWave({
  amplitude,
  wavelength,
  timeRef,
  color = '#3b82f6'
}: {
  amplitude: number;
  wavelength: number;
  timeRef: React.MutableRefObject<number>;
  color?: string;
}) {
  const lineRef = useRef<THREE.Line>(null);

  const numPoints = 200;
  const waveLength = 8;
  const zRange = 16;

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * zRange - zRange / 2;
      pts.push(new THREE.Vector3(0, 0, z));
    }
    return pts;
  }, [numPoints, zRange]);

  useFrame(() => {
    if (!lineRef.current) return;

    const positions = lineRef.current.geometry.attributes.position;
    const time = timeRef.current;

    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * zRange - zRange / 2;
      const phase = (z / waveLength) * 2 * Math.PI - time * 2;
      const x = amplitude * 1.5 * Math.sin(phase); // B field in X direction

      positions.setX(i, x);
    }
    positions.needsUpdate = true;
  });

  const arrows = useMemo(() => {
    const arrowPositions: number[] = [];
    for (let z = -zRange / 2; z <= zRange / 2; z += 1) {
      arrowPositions.push(z);
    }
    return arrowPositions;
  }, [zRange]);

  return (
    <group>
      {/* Main wave curve */}
      <line ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>

      {/* Field vectors */}
      <group>
        {arrows.map((z, idx) => (
          <BFieldArrow
            key={idx}
            z={z}
            amplitude={amplitude}
            waveLength={waveLength}
            timeRef={timeRef}
            color={color}
          />
        ))}
      </group>

      {/* Label */}
      <Html position={[amplitude * 2, 0, -zRange / 2]} center>
        <div style={{
          color: color,
          fontWeight: 'bold',
          fontSize: '16px',
          textShadow: '1px 1px 2px black'
        }}>
          B
        </div>
      </Html>
    </group>
  );
}

// Individual B-field arrow
function BFieldArrow({
  z,
  amplitude,
  waveLength,
  timeRef,
  color
}: {
  z: number;
  amplitude: number;
  waveLength: number;
  timeRef: React.MutableRefObject<number>;
  color: string;
}) {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowRef.current) return;

    const time = timeRef.current;
    const phase = (z / waveLength) * 2 * Math.PI - time * 2;
    const value = amplitude * 1.5 * Math.sin(phase);

    arrowRef.current.scale.x = Math.abs(value) > 0.1 ? value / (amplitude * 1.5) : 0.01;
    arrowRef.current.position.x = value / 2;
  });

  return (
    <group ref={arrowRef} position={[0, 0, z]} rotation={[0, 0, -Math.PI / 2]}>
      {/* Arrow shaft */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, amplitude * 1.5, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, amplitude * 0.75, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Poynting vector (propagation direction)
function PoyntingVector({ color = '#22c55e' }: { color?: string }) {
  return (
    <group position={[0, -3, 0]}>
      {/* Main arrow shaft */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 14, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0, 7.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.5, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Label */}
      <Html position={[0.5, 0, 4]} center>
        <div style={{
          color: color,
          fontWeight: 'bold',
          fontSize: '14px',
          textShadow: '1px 1px 2px black'
        }}>
          S = E × B
        </div>
      </Html>
    </group>
  );
}

// Wavefront planes
function Wavefronts({ timeRef, amplitude }: { timeRef: React.MutableRefObject<number>; amplitude: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const waveLength = 8;
  const zRange = 16;

  const planes = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 4; i++) {
      positions.push(i * waveLength / 2);
    }
    return positions;
  }, [waveLength]);

  useFrame(() => {
    if (!groupRef.current) return;
    const time = timeRef.current;

    groupRef.current.children.forEach((child, idx) => {
      const baseZ = planes[idx];
      let z = baseZ - (time * waveLength / Math.PI) % waveLength;
      if (z < -zRange / 2) z += zRange;
      child.position.z = z;
    });
  });

  return (
    <group ref={groupRef}>
      {planes.map((_, idx) => (
        <mesh key={idx} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <planeGeometry args={[amplitude * 4, amplitude * 5]} />
          <meshStandardMaterial
            color="#8b5cf6"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Coordinate axes
function Axes() {
  const axisLength = 4;

  return (
    <group position={[-6, -2, -8]}>
      {/* X axis */}
      <Line points={[[0, 0, 0], [axisLength, 0, 0]]} color="#ef4444" lineWidth={2} />
      <Html position={[axisLength + 0.3, 0, 0]} center>
        <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>x</div>
      </Html>

      {/* Y axis */}
      <Line points={[[0, 0, 0], [0, axisLength, 0]]} color="#22c55e" lineWidth={2} />
      <Html position={[0, axisLength + 0.3, 0]} center>
        <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px' }}>y</div>
      </Html>

      {/* Z axis */}
      <Line points={[[0, 0, 0], [0, 0, axisLength]]} color="#3b82f6" lineWidth={2} />
      <Html position={[0, 0, axisLength + 0.3]} center>
        <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}>z</div>
      </Html>
    </group>
  );
}

// Animation controller
function AnimationController({
  isPlaying,
  frequency,
  timeRef
}: {
  isPlaying: boolean;
  frequency: number;
  timeRef: React.MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * frequency;
    }
  });

  return null;
}

// Main 3D scene
function EMWaveScene({
  amplitude,
  frequency,
  wavelength,
  showEField,
  showBField,
  showPoynting,
  showWavefronts,
  isPlaying,
}: EMWave3DViewProps) {
  const timeRef = useRef(0);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Animation controller */}
      <AnimationController isPlaying={isPlaying} frequency={frequency} timeRef={timeRef} />

      {/* Coordinate axes */}
      <Axes />

      {/* E-field wave (oscillates in Y direction) */}
      {showEField && (
        <EFieldWave
          amplitude={amplitude}
          wavelength={wavelength}
          timeRef={timeRef}
        />
      )}

      {/* B-field wave (oscillates in X direction, perpendicular to E) */}
      {showBField && (
        <BFieldWave
          amplitude={amplitude}
          wavelength={wavelength}
          timeRef={timeRef}
        />
      )}

      {/* Poynting vector (propagation direction) */}
      {showPoynting && <PoyntingVector />}

      {/* Wavefront planes */}
      {showWavefronts && <Wavefronts timeRef={timeRef} amplitude={amplitude} />}

      {/* Propagation axis (Z) */}
      <Line
        points={[[-8, 0, 0], [8, 0, 0]].map(p => [0, 0, p[0]] as [number, number, number])}
        color="#94a3b8"
        lineWidth={1}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={40}
        target={[0, 0, 0]}
      />
    </>
  );
}

// Main component with client-side rendering
export default function EMWave3DView(props: EMWave3DViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 rounded-xl">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Chargement de la vue 3D...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}
      >
        <EMWaveScene {...props} />
      </Canvas>
    </div>
  );
}
