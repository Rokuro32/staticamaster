'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Charge {
  id: number;
  position: THREE.Vector3;
  q: number;
  velocity: THREE.Vector3;
  oscillating: boolean;
  oscillationAmplitude: number;
  oscillationFrequency: number;
  baseY: number;
}

interface MaxwellSandbox3DProps {
  isPlaying: boolean;
  chargeMode: 'dipole' | 'moving' | 'static';
  showEField: boolean;
  showBField: boolean;
}

// Electric field arrow component
function FieldArrow({
  start,
  direction,
  magnitude,
  color
}: {
  start: THREE.Vector3;
  direction: THREE.Vector3;
  magnitude: number;
  color: string;
}) {
  const normalizedMag = Math.min(magnitude, 1);
  const length = 0.3 + normalizedMag * 0.7;
  const end = start.clone().add(direction.clone().multiplyScalar(length));

  const opacity = 0.3 + normalizedMag * 0.7;

  return (
    <group>
      <Line
        points={[start.toArray(), end.toArray()]}
        color={color}
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      {/* Arrow head */}
      <mesh position={end.toArray()} scale={[0.08, 0.15, 0.08]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

// Magnetic field ring component
function MagneticRing({
  center,
  radius,
  velocity,
  charge,
  opacity
}: {
  center: THREE.Vector3;
  radius: number;
  velocity: THREE.Vector3;
  charge: number;
  opacity: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  // Orient ring perpendicular to velocity
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    if (velocity.length() > 0.01) {
      const up = new THREE.Vector3(0, 1, 0);
      q.setFromUnitVectors(up, velocity.clone().normalize());
    }
    return q;
  }, [velocity]);

  return (
    <mesh position={center.toArray()} quaternion={quaternion}>
      <torusGeometry args={[radius, 0.02, 8, 32]} />
      <meshStandardMaterial
        color="#3b82f6"
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// 3D Charge sphere
function Charge3D({
  charge,
  isSelected,
  onSelect,
  time,
  chargeMode
}: {
  charge: Charge;
  isSelected: boolean;
  onSelect: (id: number) => void;
  time: number;
  chargeMode: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate current position based on mode
  const currentPosition = useMemo(() => {
    const pos = charge.position.clone();
    if (charge.oscillating && chargeMode === 'dipole') {
      pos.y = charge.baseY + charge.oscillationAmplitude * Math.sin(2 * Math.PI * charge.oscillationFrequency * time);
    }
    return pos;
  }, [charge, time, chargeMode]);

  return (
    <group position={currentPosition.toArray()}>
      {/* Glow effect */}
      <mesh scale={[1.5, 1.5, 1.5]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={charge.q > 0 ? '#ef4444' : '#3b82f6'}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Main charge sphere */}
      <mesh
        ref={meshRef}
        onClick={() => onSelect(charge.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color={charge.q > 0 ? '#ef4444' : '#3b82f6'}
          emissive={charge.q > 0 ? '#ef4444' : '#3b82f6'}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.03, 8, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Charge symbol */}
      <Html center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          textShadow: '0 0 5px black'
        }}>
          {charge.q > 0 ? '+' : '−'}
        </div>
      </Html>
    </group>
  );
}

// Electric field visualization
function ElectricField({
  charges,
  time,
  chargeMode
}: {
  charges: Charge[];
  time: number;
  chargeMode: string;
}) {
  const arrows = useMemo(() => {
    const result: { start: THREE.Vector3; direction: THREE.Vector3; magnitude: number }[] = [];
    const gridSize = 1.2;
    const range = 5;

    // Get current charge positions
    const chargePositions = charges.map(charge => {
      const pos = charge.position.clone();
      if (charge.oscillating && chargeMode === 'dipole') {
        pos.y = charge.baseY + charge.oscillationAmplitude * Math.sin(2 * Math.PI * charge.oscillationFrequency * time);
      }
      return { ...charge, currentPos: pos };
    });

    for (let x = -range; x <= range; x += gridSize) {
      for (let y = -range; y <= range; y += gridSize) {
        for (let z = -range; z <= range; z += gridSize) {
          const point = new THREE.Vector3(x, y, z);
          const E = new THREE.Vector3(0, 0, 0);

          chargePositions.forEach(charge => {
            const r = point.clone().sub(charge.currentPos);
            const rMag = r.length();

            if (rMag > 0.8) {
              const k = 2;
              const eMag = k * Math.abs(charge.q) / (rMag * rMag);
              const eDir = r.clone().normalize().multiplyScalar(charge.q > 0 ? eMag : -eMag);
              E.add(eDir);
            }
          });

          const magnitude = E.length();
          if (magnitude > 0.05) {
            result.push({
              start: point,
              direction: E.clone().normalize(),
              magnitude: Math.min(magnitude / 2, 1)
            });
          }
        }
      }
    }

    return result;
  }, [charges, time, chargeMode]);

  return (
    <group>
      {arrows.map((arrow, idx) => (
        <FieldArrow
          key={idx}
          start={arrow.start}
          direction={arrow.direction}
          magnitude={arrow.magnitude}
          color="#ef4444"
        />
      ))}
    </group>
  );
}

// Magnetic field visualization
function MagneticField({
  charges,
  time,
  chargeMode
}: {
  charges: Charge[];
  time: number;
  chargeMode: string;
}) {
  const rings = useMemo(() => {
    const result: { center: THREE.Vector3; radius: number; velocity: THREE.Vector3; charge: number; opacity: number }[] = [];

    charges.forEach(charge => {
      let velocity = charge.velocity.clone();
      let currentPos = charge.position.clone();

      if (charge.oscillating && chargeMode === 'dipole') {
        currentPos.y = charge.baseY + charge.oscillationAmplitude * Math.sin(2 * Math.PI * charge.oscillationFrequency * time);
        // Velocity from oscillation
        const vy = charge.oscillationAmplitude * 2 * Math.PI * charge.oscillationFrequency *
                   Math.cos(2 * Math.PI * charge.oscillationFrequency * time);
        velocity = new THREE.Vector3(0, vy, 0);
      } else if (chargeMode === 'moving') {
        velocity = charge.velocity.clone().multiplyScalar(2);
      }

      const speed = velocity.length();
      if (speed > 0.1) {
        // Create concentric rings
        for (let i = 1; i <= 4; i++) {
          result.push({
            center: currentPos.clone(),
            radius: i * 0.6,
            velocity: velocity,
            charge: charge.q,
            opacity: 0.4 - i * 0.08
          });
        }
      }
    });

    return result;
  }, [charges, time, chargeMode]);

  return (
    <group>
      {rings.map((ring, idx) => (
        <MagneticRing
          key={idx}
          center={ring.center}
          radius={ring.radius}
          velocity={ring.velocity}
          charge={ring.charge}
          opacity={ring.opacity}
        />
      ))}
    </group>
  );
}

// Radiation waves for oscillating dipole
function RadiationWaves({
  charges,
  time,
  chargeMode
}: {
  charges: Charge[];
  time: number;
  chargeMode: string;
}) {
  if (chargeMode !== 'dipole') return null;

  const waves = useMemo(() => {
    const result: { center: THREE.Vector3; radius: number; opacity: number }[] = [];

    charges.forEach(charge => {
      if (charge.oscillating) {
        const currentPos = charge.position.clone();
        currentPos.y = charge.baseY;

        for (let i = 0; i < 5; i++) {
          const phase = (time * charge.oscillationFrequency + i * 0.2) % 1;
          const radius = phase * 8;
          const opacity = 0.3 * (1 - phase);

          if (opacity > 0.02) {
            result.push({
              center: currentPos,
              radius,
              opacity
            });
          }
        }
      }
    });

    return result;
  }, [charges, time, chargeMode]);

  return (
    <group>
      {waves.map((wave, idx) => (
        <mesh key={idx} position={wave.center.toArray()}>
          <sphereGeometry args={[wave.radius, 32, 32]} />
          <meshStandardMaterial
            color="#a855f7"
            transparent
            opacity={wave.opacity}
            side={THREE.BackSide}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

// Grid helper
function Grid3D() {
  return (
    <group>
      {/* XZ plane grid */}
      <gridHelper args={[12, 12, '#333', '#222']} />

      {/* Axes */}
      <Line points={[[0, 0, 0], [6, 0, 0]]} color="#ef4444" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 6, 0]]} color="#22c55e" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, 6]]} color="#3b82f6" lineWidth={2} />

      {/* Axis labels */}
      <Html position={[6.3, 0, 0]} center>
        <div style={{ color: '#ef4444', fontWeight: 'bold' }}>X</div>
      </Html>
      <Html position={[0, 6.3, 0]} center>
        <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Y</div>
      </Html>
      <Html position={[0, 0, 6.3]} center>
        <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>Z</div>
      </Html>
    </group>
  );
}

// Animation controller
function AnimationController({
  isPlaying,
  timeRef
}: {
  isPlaying: boolean;
  timeRef: React.MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta;
    }
  });
  return null;
}

// Main scene component
function Scene({
  charges,
  setCharges,
  selectedChargeId,
  setSelectedChargeId,
  isPlaying,
  chargeMode,
  showEField,
  showBField,
  timeRef
}: {
  charges: Charge[];
  setCharges: React.Dispatch<React.SetStateAction<Charge[]>>;
  selectedChargeId: number | null;
  setSelectedChargeId: React.Dispatch<React.SetStateAction<number | null>>;
  isPlaying: boolean;
  chargeMode: string;
  showEField: boolean;
  showBField: boolean;
  timeRef: React.MutableRefObject<number>;
}) {
  const [time, setTime] = useState(0);

  useFrame(() => {
    setTime(timeRef.current);
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <AnimationController isPlaying={isPlaying} timeRef={timeRef} />

      <Grid3D />

      {/* Electric field */}
      {showEField && (
        <ElectricField charges={charges} time={time} chargeMode={chargeMode} />
      )}

      {/* Magnetic field */}
      {showBField && (
        <MagneticField charges={charges} time={time} chargeMode={chargeMode} />
      )}

      {/* Radiation waves */}
      <RadiationWaves charges={charges} time={time} chargeMode={chargeMode} />

      {/* Charges */}
      {charges.map(charge => (
        <Charge3D
          key={charge.id}
          charge={charge}
          isSelected={selectedChargeId === charge.id}
          onSelect={setSelectedChargeId}
          time={time}
          chargeMode={chargeMode}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
      />
    </>
  );
}

// Main component
export default function MaxwellSandbox3D({
  isPlaying,
  chargeMode,
  showEField,
  showBField
}: MaxwellSandbox3DProps) {
  const [mounted, setMounted] = useState(false);
  const timeRef = useRef(0);

  const [charges, setCharges] = useState<Charge[]>([
    {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      q: 1,
      velocity: new THREE.Vector3(0, 0, 0),
      oscillating: true,
      oscillationAmplitude: 1.5,
      oscillationFrequency: 0.5,
      baseY: 0
    }
  ]);

  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update charges when mode changes
  useEffect(() => {
    setCharges(prev => prev.map(charge => ({
      ...charge,
      oscillating: chargeMode === 'dipole',
      velocity: chargeMode === 'moving'
        ? new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
        : new THREE.Vector3(0, 0, 0)
    })));
  }, [chargeMode]);

  const addCharge = useCallback((positive: boolean) => {
    const newId = Math.max(0, ...charges.map(c => c.id)) + 1;
    const newPos = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    setCharges(prev => [...prev, {
      id: newId,
      position: newPos,
      q: positive ? 1 : -1,
      velocity: chargeMode === 'moving'
        ? new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
        : new THREE.Vector3(0, 0, 0),
      oscillating: chargeMode === 'dipole',
      oscillationAmplitude: 1 + Math.random() * 0.5,
      oscillationFrequency: 0.4 + Math.random() * 0.3,
      baseY: newPos.y
    }]);
  }, [charges, chargeMode]);

  const removeCharge = useCallback(() => {
    if (selectedChargeId !== null) {
      setCharges(prev => prev.filter(c => c.id !== selectedChargeId));
      setSelectedChargeId(null);
    }
  }, [selectedChargeId]);

  const clearCharges = useCallback(() => {
    setCharges([]);
    setSelectedChargeId(null);
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
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}
      >
        <Scene
          charges={charges}
          setCharges={setCharges}
          selectedChargeId={selectedChargeId}
          setSelectedChargeId={setSelectedChargeId}
          isPlaying={isPlaying}
          chargeMode={chargeMode}
          showEField={showEField}
          showBField={showBField}
          timeRef={timeRef}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => addCharge(true)}
          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-lg"
        >
          + Charge +
        </button>
        <button
          onClick={() => addCharge(false)}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-lg"
        >
          + Charge −
        </button>
        {selectedChargeId !== null && (
          <button
            onClick={removeCharge}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shadow-lg"
          >
            Supprimer
          </button>
        )}
        <button
          onClick={clearCharges}
          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium shadow-lg"
        >
          Effacer tout
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/50 rounded-lg p-3 text-white text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Champ E</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Champ B</span>
        </div>
        {chargeMode === 'dipole' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Rayonnement</span>
          </div>
        )}
      </div>
    </div>
  );
}
