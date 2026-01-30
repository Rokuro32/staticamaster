'use client';

import { useMemo } from 'react';
import { Vector3, Quaternion } from 'three';
import { Text, Line } from '@react-three/drei';

interface VectorArrow3DProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  label: string;
  showComponents?: boolean;
}

export function VectorArrow3D({ start, end, color, label, showComponents = false }: VectorArrow3DProps) {
  // Calculate vector properties
  const direction = useMemo(() => {
    const dir = new Vector3(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2]
    );
    return dir;
  }, [start, end]);

  const length = direction.length();
  const normalizedDir = direction.clone().normalize();

  // Calculate midpoint for label
  const midpoint = useMemo((): [number, number, number] => [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + 0.5,
    (start[2] + end[2]) / 2
  ], [start, end]);

  // Arrow dimensions
  const shaftRadius = 0.05;
  const shaftLength = Math.max(0.1, length - 0.3);
  const coneRadius = 0.15;
  const coneHeight = 0.3;

  // Calculate rotation to align with direction
  const rotation = useMemo(() => {
    const up = new Vector3(0, 1, 0);
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(up, normalizedDir);
    return quaternion;
  }, [normalizedDir]);

  // Position for the shaft
  const shaftPosition = useMemo((): [number, number, number] => [
    start[0] + normalizedDir.x * shaftLength / 2,
    start[1] + normalizedDir.y * shaftLength / 2,
    start[2] + normalizedDir.z * shaftLength / 2
  ], [start, normalizedDir, shaftLength]);

  // Position for the cone
  const conePosition = useMemo((): [number, number, number] => [
    start[0] + normalizedDir.x * (shaftLength + coneHeight / 2),
    start[1] + normalizedDir.y * (shaftLength + coneHeight / 2),
    start[2] + normalizedDir.z * (shaftLength + coneHeight / 2)
  ], [start, normalizedDir, shaftLength, coneHeight]);

  if (length < 0.01) return null;

  return (
    <group>
      {/* Arrow shaft */}
      <mesh position={shaftPosition} quaternion={rotation}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Arrow cone */}
      <mesh position={conePosition} quaternion={rotation}>
        <coneGeometry args={[coneRadius, coneHeight, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Label */}
      <Text
        position={midpoint}
        fontSize={0.4}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {label}
      </Text>

      {/* Component projections */}
      {showComponents && (
        <>
          {Math.abs(end[0] - start[0]) > 0.1 && (
            <Line
              points={[
                [start[0], start[1], start[2]],
                [end[0], start[1], start[2]]
              ]}
              color={color}
              lineWidth={1}
              dashed
              dashSize={0.2}
              gapSize={0.1}
              opacity={0.5}
              transparent
            />
          )}
          {Math.abs(end[1] - start[1]) > 0.1 && (
            <Line
              points={[
                [end[0], start[1], start[2]],
                [end[0], end[1], start[2]]
              ]}
              color={color}
              lineWidth={1}
              dashed
              dashSize={0.2}
              gapSize={0.1}
              opacity={0.5}
              transparent
            />
          )}
          {Math.abs(end[2] - start[2]) > 0.1 && (
            <Line
              points={[
                [end[0], end[1], start[2]],
                [end[0], end[1], end[2]]
              ]}
              color={color}
              lineWidth={1}
              dashed
              dashSize={0.2}
              gapSize={0.1}
              opacity={0.5}
              transparent
            />
          )}
        </>
      )}
    </group>
  );
}

export default VectorArrow3D;
