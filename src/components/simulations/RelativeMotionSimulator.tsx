'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

type Scenario = 'train' | 'river' | 'cars' | 'custom';

interface ScenarioConfig {
  id: Scenario;
  name: string;
  description: string;
  emoji: string;
}

const SCENARIOS: ScenarioConfig[] = [
  { id: 'train', name: 'Train', description: 'Une personne marche dans un train en mouvement', emoji: '🚂' },
  { id: 'river', name: 'Rivière', description: 'Un bateau traverse une rivière avec courant', emoji: '🚤' },
  { id: 'cars', name: 'Voitures', description: 'Deux voitures se déplacent sur une route', emoji: '🚗' },
  { id: 'custom', name: 'Personnalisé', description: 'Définissez vos propres vitesses', emoji: '⚙️' },
];

type ReferenceFrame = 'ground' | 'moving';

export function RelativeMotionSimulator() {
  const [scenario, setScenario] = useState<Scenario>('train');
  const [referenceFrame, setReferenceFrame] = useState<ReferenceFrame>('ground');

  // Train scenario: person walking in train
  const [trainSpeed, setTrainSpeed] = useState(20); // m/s
  const [personSpeedInTrain, setPersonSpeedInTrain] = useState(2); // m/s relative to train
  const [personDirection, setPersonDirection] = useState<'same' | 'opposite'>('same');

  // River scenario: boat crossing river
  const [boatSpeedInWater, setBoatSpeedInWater] = useState(5); // m/s relative to water
  const [riverCurrentSpeed, setRiverCurrentSpeed] = useState(3); // m/s
  const [boatAngle, setBoatAngle] = useState(90); // degrees from downstream

  // Cars scenario
  const [car1Speed, setCar1Speed] = useState(25); // m/s
  const [car2Speed, setCar2Speed] = useState(15); // m/s
  const [carsDirection, setCarsDirection] = useState<'same' | 'opposite'>('same');

  // Custom scenario
  const [customVax, setCustomVax] = useState(5);
  const [customVay, setCustomVay] = useState(0);
  const [customVbx, setCustomVbx] = useState(10);
  const [customVby, setCustomVby] = useState(0);

  // Animation
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Canvas refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasWidth = 700;
  const canvasHeight = 300;
  const vectorCanvasWidth = 300;
  const vectorCanvasHeight = 200;

  // Calculate velocities based on scenario
  const getVelocities = useCallback(() => {
    switch (scenario) {
      case 'train': {
        const vPersonInTrain = personDirection === 'same' ? personSpeedInTrain : -personSpeedInTrain;
        const vPersonGround = trainSpeed + vPersonInTrain;
        return {
          vAx: vPersonGround, // Person velocity relative to ground
          vAy: 0,
          vBx: trainSpeed, // Train velocity relative to ground
          vBy: 0,
          vABx: vPersonInTrain, // Person velocity relative to train
          vABy: 0,
          labels: {
            A: 'Personne',
            B: 'Train',
            C: 'Sol',
          }
        };
      }
      case 'river': {
        const angleRad = boatAngle * Math.PI / 180;
        const vBoatWaterX = boatSpeedInWater * Math.cos(angleRad);
        const vBoatWaterY = boatSpeedInWater * Math.sin(angleRad);
        const vBoatGroundX = vBoatWaterX + riverCurrentSpeed;
        const vBoatGroundY = vBoatWaterY;
        return {
          vAx: vBoatGroundX, // Boat velocity relative to ground
          vAy: vBoatGroundY,
          vBx: riverCurrentSpeed, // Water velocity relative to ground
          vBy: 0,
          vABx: vBoatWaterX, // Boat velocity relative to water
          vABy: vBoatWaterY,
          labels: {
            A: 'Bateau',
            B: 'Eau',
            C: 'Rive',
          }
        };
      }
      case 'cars': {
        const v2 = carsDirection === 'same' ? car2Speed : -car2Speed;
        const vRelative = car1Speed - v2;
        return {
          vAx: car1Speed, // Car 1 velocity relative to ground
          vAy: 0,
          vBx: v2, // Car 2 velocity relative to ground
          vBy: 0,
          vABx: vRelative, // Car 1 velocity relative to car 2
          vABy: 0,
          labels: {
            A: 'Voiture 1',
            B: 'Voiture 2',
            C: 'Sol',
          }
        };
      }
      case 'custom':
      default:
        return {
          vAx: customVax + customVbx,
          vAy: customVay + customVby,
          vBx: customVbx,
          vBy: customVby,
          vABx: customVax,
          vABy: customVay,
          labels: {
            A: 'Objet A',
            B: 'Référentiel B',
            C: 'Sol',
          }
        };
    }
  }, [scenario, trainSpeed, personSpeedInTrain, personDirection, boatSpeedInWater, riverCurrentSpeed, boatAngle, car1Speed, car2Speed, carsDirection, customVax, customVay, customVbx, customVby]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const animate = (currentTime: number) => {
        const dt = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;
        setTime(prev => (prev + dt) % 20); // Loop every 20 seconds
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Draw main canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const velocities = getVelocities();
    const { vAx, vAy, vBx, vBy, labels } = velocities;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (scenario === 'train') {
      // Draw train scenario
      const trainWidth = 300;
      const trainHeight = 80;
      const trainBaseX = (time * trainSpeed * 3) % (canvasWidth + trainWidth) - trainWidth;
      const trainY = canvasHeight / 2;

      // Ground
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(0, trainY + trainHeight / 2 + 20, canvasWidth, 30);

      // Rails
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(0, trainY + trainHeight / 2 + 15, canvasWidth, 8);

      // Train body
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(trainBaseX, trainY - trainHeight / 2, trainWidth, trainHeight);

      // Windows
      ctx.fillStyle = '#bfdbfe';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(trainBaseX + 30 + i * 65, trainY - trainHeight / 2 + 15, 40, 30);
      }

      // Wheels
      ctx.fillStyle = '#1f2937';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(trainBaseX + 50 + i * 100, trainY + trainHeight / 2 + 10, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Person inside train
      const personRelativeX = personDirection === 'same' ? (time * personSpeedInTrain * 3) % 200 : 200 - (time * personSpeedInTrain * 3) % 200;
      const personX = trainBaseX + 50 + personRelativeX;
      const personY = trainY - 5;

      // Person body
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(personX, personY - 25, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(personX - 8, personY - 13, 16, 30);

      // Arrow showing person's velocity relative to ground
      if (referenceFrame === 'ground') {
        const vScale = 2;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(personX, personY - 40);
        ctx.lineTo(personX + vAx * vScale, personY - 40);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        const arrowDir = vAx > 0 ? 1 : -1;
        ctx.moveTo(personX + vAx * vScale, personY - 40);
        ctx.lineTo(personX + vAx * vScale - 8 * arrowDir, personY - 45);
        ctx.lineTo(personX + vAx * vScale - 8 * arrowDir, personY - 35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`v = ${vAx.toFixed(1)} m/s`, personX + vAx * vScale / 2, personY - 50);
      } else {
        // Velocity relative to train
        const vRel = personDirection === 'same' ? personSpeedInTrain : -personSpeedInTrain;
        const vScale = 5;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(personX, personY - 40);
        ctx.lineTo(personX + vRel * vScale, personY - 40);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        const arrowDir = vRel > 0 ? 1 : -1;
        ctx.moveTo(personX + vRel * vScale, personY - 40);
        ctx.lineTo(personX + vRel * vScale - 8 * arrowDir, personY - 45);
        ctx.lineTo(personX + vRel * vScale - 8 * arrowDir, personY - 35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`v = ${vRel.toFixed(1)} m/s`, personX + vRel * vScale / 2, personY - 50);
      }

      // Train velocity arrow
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      const trainArrowX = trainBaseX + trainWidth / 2;
      ctx.beginPath();
      ctx.moveTo(trainArrowX, trainY + trainHeight / 2 + 45);
      ctx.lineTo(trainArrowX + trainSpeed * 2, trainY + trainHeight / 2 + 45);
      ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(trainArrowX + trainSpeed * 2, trainY + trainHeight / 2 + 45);
      ctx.lineTo(trainArrowX + trainSpeed * 2 - 8, trainY + trainHeight / 2 + 40);
      ctx.lineTo(trainArrowX + trainSpeed * 2 - 8, trainY + trainHeight / 2 + 50);
      ctx.closePath();
      ctx.fill();
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`v_train = ${trainSpeed} m/s`, trainArrowX + trainSpeed, trainY + trainHeight / 2 + 60);

    } else if (scenario === 'river') {
      // Draw river scenario
      const riverY = canvasHeight / 2;
      const riverHeight = 150;

      // Banks
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, 0, canvasWidth, riverY - riverHeight / 2);
      ctx.fillRect(0, riverY + riverHeight / 2, canvasWidth, canvasHeight - riverY - riverHeight / 2);

      // River
      const riverGradient = ctx.createLinearGradient(0, riverY - riverHeight / 2, 0, riverY + riverHeight / 2);
      riverGradient.addColorStop(0, '#38bdf8');
      riverGradient.addColorStop(0.5, '#0ea5e9');
      riverGradient.addColorStop(1, '#0284c7');
      ctx.fillStyle = riverGradient;
      ctx.fillRect(0, riverY - riverHeight / 2, canvasWidth, riverHeight);

      // Water flow arrows
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 8; i++) {
        const arrowX = ((time * riverCurrentSpeed * 10 + i * 100) % (canvasWidth + 50)) - 25;
        ctx.beginPath();
        ctx.moveTo(arrowX, riverY);
        ctx.lineTo(arrowX - 15, riverY - 8);
        ctx.lineTo(arrowX - 15, riverY + 8);
        ctx.closePath();
        ctx.fill();
      }

      // Boat
      const angleRad = boatAngle * Math.PI / 180;
      const vBoatWaterX = boatSpeedInWater * Math.cos(angleRad);
      const vBoatWaterY = boatSpeedInWater * Math.sin(angleRad);
      const vBoatGroundX = vBoatWaterX + riverCurrentSpeed;
      const vBoatGroundY = vBoatWaterY;

      // Boat position (wrapping)
      const boatX = ((time * vBoatGroundX * 5 + 100) % (canvasWidth + 100)) - 50;
      const boatY = riverY - ((time * vBoatGroundY * 5) % riverHeight) + riverHeight / 2 - 40;

      ctx.save();
      ctx.translate(boatX, boatY);

      // Boat hull
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(-20, 10);
      ctx.lineTo(20, 10);
      ctx.lineTo(25, 0);
      ctx.lineTo(20, -10);
      ctx.lineTo(-20, -10);
      ctx.lineTo(-25, 0);
      ctx.closePath();
      ctx.fill();

      // Person in boat
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, -5, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Velocity arrows
      const vScale = 4;
      if (referenceFrame === 'ground') {
        // Resultant velocity
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boatX, boatY);
        ctx.lineTo(boatX + vBoatGroundX * vScale, boatY - vBoatGroundY * vScale);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        const mag = Math.sqrt(vBoatGroundX ** 2 + vBoatGroundY ** 2);
        ctx.font = 'bold 11px system-ui';
        ctx.fillText(`v = ${mag.toFixed(1)} m/s`, boatX + vBoatGroundX * vScale / 2 + 20, boatY - vBoatGroundY * vScale / 2);
      } else {
        // Velocity relative to water
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boatX, boatY);
        ctx.lineTo(boatX + vBoatWaterX * vScale, boatY - vBoatWaterY * vScale);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px system-ui';
        ctx.fillText(`v = ${boatSpeedInWater.toFixed(1)} m/s`, boatX + vBoatWaterX * vScale / 2 + 20, boatY - vBoatWaterY * vScale / 2);
      }

      // Current arrow
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, riverY + riverHeight / 2 - 20);
      ctx.lineTo(50 + riverCurrentSpeed * 8, riverY + riverHeight / 2 - 20);
      ctx.stroke();
      ctx.fillStyle = '#0ea5e9';
      ctx.font = '11px system-ui';
      ctx.fillText(`Courant: ${riverCurrentSpeed} m/s`, 50 + riverCurrentSpeed * 4, riverY + riverHeight / 2 - 5);

    } else if (scenario === 'cars') {
      // Draw cars scenario
      const roadY = canvasHeight / 2;
      const roadHeight = 80;

      // Sky
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, canvasWidth, roadY - roadHeight / 2);

      // Road
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, roadY - roadHeight / 2, canvasWidth, roadHeight);

      // Road markings
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([30, 20]);
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(canvasWidth, roadY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grass
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, roadY + roadHeight / 2, canvasWidth, canvasHeight - roadY - roadHeight / 2);

      // Car 1 (red)
      const car1X = ((time * car1Speed * 3) % (canvasWidth + 100)) - 50;
      const car1Y = roadY - 25;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(car1X - 30, car1Y - 15, 60, 25, 5);
      ctx.fill();
      ctx.fillStyle = '#fecaca';
      ctx.fillRect(car1X - 20, car1Y - 12, 15, 12);
      ctx.fillRect(car1X + 5, car1Y - 12, 15, 12);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(car1X - 15, car1Y + 12, 8, 0, Math.PI * 2);
      ctx.arc(car1X + 15, car1Y + 12, 8, 0, Math.PI * 2);
      ctx.fill();

      // Car 2 (blue)
      const car2Dir = carsDirection === 'same' ? 1 : -1;
      const car2X = carsDirection === 'same'
        ? ((time * car2Speed * 3 + 200) % (canvasWidth + 100)) - 50
        : canvasWidth - ((time * car2Speed * 3) % (canvasWidth + 100)) + 50;
      const car2Y = roadY + 25;

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(car2X - 30, car2Y - 15, 60, 25, 5);
      ctx.fill();
      ctx.fillStyle = '#bfdbfe';
      ctx.fillRect(car2X - 20, car2Y - 12, 15, 12);
      ctx.fillRect(car2X + 5, car2Y - 12, 15, 12);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(car2X - 15, car2Y + 12, 8, 0, Math.PI * 2);
      ctx.arc(car2X + 15, car2Y + 12, 8, 0, Math.PI * 2);
      ctx.fill();

      // Velocity arrows
      const vScale = 1.5;
      if (referenceFrame === 'ground') {
        // Car 1 velocity
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(car1X, car1Y - 30);
        ctx.lineTo(car1X + car1Speed * vScale, car1Y - 30);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = '11px system-ui';
        ctx.fillText(`v₁ = ${car1Speed} m/s`, car1X + car1Speed * vScale / 2, car1Y - 40);

        // Car 2 velocity
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(car2X, car2Y + 35);
        ctx.lineTo(car2X + car2Speed * car2Dir * vScale, car2Y + 35);
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`v₂ = ${car2Speed * car2Dir} m/s`, car2X + car2Speed * car2Dir * vScale / 2, car2Y + 50);
      } else {
        // Relative velocity of car 1 seen from car 2
        const vRel = car1Speed - car2Speed * car2Dir;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(car1X, car1Y - 30);
        ctx.lineTo(car1X + vRel * vScale, car1Y - 30);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px system-ui';
        ctx.fillText(`v₁/₂ = ${vRel} m/s`, car1X + vRel * vScale / 2, car1Y - 40);
      }

    } else {
      // Custom scenario - abstract representation
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      // Grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y < canvasHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      // Moving reference frame B
      const bX = (time * customVbx * 5 + 200) % canvasWidth;
      const bY = centerY + (time * customVby * 5) % 100 - 50;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(bX - 60, bY - 40, 120, 80);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(bX - 60, bY - 40, 120, 80);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Référentiel B', bX, bY - 50);

      // Object A inside B
      const aRelX = (time * customVax * 3) % 80 - 40;
      const aRelY = (time * customVay * 3) % 60 - 30;
      const aX = bX + aRelX;
      const aY = bY + aRelY;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(aX, aY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText('A', aX, aY + 4);

      // Velocity vectors
      const vScale = 3;
      if (referenceFrame === 'ground') {
        const vTotalX = customVax + customVbx;
        const vTotalY = customVay + customVby;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(aX, aY);
        ctx.lineTo(aX + vTotalX * vScale, aY + vTotalY * vScale);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.font = '11px system-ui';
        const mag = Math.sqrt(vTotalX ** 2 + vTotalY ** 2);
        ctx.fillText(`v_A/Sol = ${mag.toFixed(1)} m/s`, aX + vTotalX * vScale + 10, aY + vTotalY * vScale);
      } else {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(aX, aY);
        ctx.lineTo(aX + customVax * vScale, aY + customVay * vScale);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = '11px system-ui';
        const mag = Math.sqrt(customVax ** 2 + customVay ** 2);
        ctx.fillText(`v_A/B = ${mag.toFixed(1)} m/s`, aX + customVax * vScale + 10, aY + customVay * vScale);
      }
    }

    // Reference frame indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Référentiel: ${referenceFrame === 'ground' ? labels.C : labels.B}`, 20, 30);

  }, [scenario, time, referenceFrame, getVelocities, trainSpeed, personSpeedInTrain, personDirection,
      boatSpeedInWater, riverCurrentSpeed, boatAngle, car1Speed, car2Speed, carsDirection,
      customVax, customVay, customVbx, customVby, canvasWidth, canvasHeight]);

  // Draw vector addition diagram
  const drawVectorDiagram = useCallback(() => {
    const canvas = vectorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const velocities = getVelocities();
    const { vAx, vAy, vBx, vBy, vABx, vABy, labels } = velocities;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, vectorCanvasWidth, vectorCanvasHeight);

    const centerX = vectorCanvasWidth / 2;
    const centerY = vectorCanvasHeight / 2 + 10;

    // Calculate scale
    const maxV = Math.max(
      Math.sqrt(vAx ** 2 + vAy ** 2),
      Math.sqrt(vBx ** 2 + vBy ** 2),
      Math.sqrt(vABx ** 2 + vABy ** 2)
    );
    const scale = maxV > 0 ? Math.min(50 / maxV, 8) : 1;

    // Draw axes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(vectorCanvasWidth - 20, centerY);
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, vectorCanvasHeight - 20);
    ctx.stroke();

    // Origin
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw v_B (reference frame velocity) - blue
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + vBx * scale, centerY - vBy * scale);
    ctx.stroke();

    // Arrow head
    const bAngle = Math.atan2(-vBy, vBx);
    const bEndX = centerX + vBx * scale;
    const bEndY = centerY - vBy * scale;
    if (Math.sqrt(vBx ** 2 + vBy ** 2) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(bEndX, bEndY);
      ctx.lineTo(bEndX - 8 * Math.cos(bAngle - 0.4), bEndY - 8 * Math.sin(bAngle - 0.4));
      ctx.lineTo(bEndX - 8 * Math.cos(bAngle + 0.4), bEndY - 8 * Math.sin(bAngle + 0.4));
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '10px system-ui';
    ctx.fillText(`v_${labels.B}`, bEndX + 5, bEndY - 5);

    // Draw v_A/B (relative velocity) - orange, starting from end of v_B
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bEndX, bEndY);
    ctx.lineTo(bEndX + vABx * scale, bEndY - vABy * scale);
    ctx.stroke();

    const abAngle = Math.atan2(-vABy, vABx);
    const abEndX = bEndX + vABx * scale;
    const abEndY = bEndY - vABy * scale;
    if (Math.sqrt(vABx ** 2 + vABy ** 2) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(abEndX, abEndY);
      ctx.lineTo(abEndX - 8 * Math.cos(abAngle - 0.4), abEndY - 8 * Math.sin(abAngle - 0.4));
      ctx.lineTo(abEndX - 8 * Math.cos(abAngle + 0.4), abEndY - 8 * Math.sin(abAngle + 0.4));
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '10px system-ui';
    ctx.fillText(`v_${labels.A}/${labels.B}`, abEndX + 5, abEndY - 5);

    // Draw v_A (resultant) - green, from origin
    ctx.strokeStyle = '#22c55e';
    ctx.fillStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + vAx * scale, centerY - vAy * scale);
    ctx.stroke();

    const aAngle = Math.atan2(-vAy, vAx);
    const aEndX = centerX + vAx * scale;
    const aEndY = centerY - vAy * scale;
    if (Math.sqrt(vAx ** 2 + vAy ** 2) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(aEndX, aEndY);
      ctx.lineTo(aEndX - 8 * Math.cos(aAngle - 0.4), aEndY - 8 * Math.sin(aAngle - 0.4));
      ctx.lineTo(aEndX - 8 * Math.cos(aAngle + 0.4), aEndY - 8 * Math.sin(aAngle + 0.4));
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '10px system-ui';
    ctx.fillText(`v_${labels.A}/${labels.C}`, aEndX + 5, aEndY + 15);

    // Title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Addition des vitesses', vectorCanvasWidth / 2, 15);

  }, [getVelocities, vectorCanvasWidth, vectorCanvasHeight]);

  // Draw all
  useEffect(() => {
    drawMainCanvas();
    drawVectorDiagram();
  }, [drawMainCanvas, drawVectorDiagram]);

  const handleReset = () => {
    setTime(0);
  };

  const velocities = getVelocities();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with scenario selector */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setScenario(s.id); handleReset(); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                scenario === s.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              )}
            >
              <span>{s.emoji}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600">{SCENARIOS.find(s => s.id === scenario)?.description}</p>
      </div>

      <div className="p-4">
        {/* Reference frame toggle */}
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Observer depuis:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setReferenceFrame('ground')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                referenceFrame === 'ground'
                  ? "bg-white shadow text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {velocities.labels.C} (fixe)
            </button>
            <button
              onClick={() => setReferenceFrame('moving')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                referenceFrame === 'moving'
                  ? "bg-white shadow text-orange-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {velocities.labels.B} (mobile)
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main animation */}
          <div className="flex-1">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={mainCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full"
              />
            </div>

            {/* Controls */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                  isPlaying ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                )}
              >
                {isPlaying ? '⏸ Pause' : '▶ Lecture'}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Vector diagram */}
          <div className="lg:w-80">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={vectorCanvasRef}
                width={vectorCanvasWidth}
                height={vectorCanvasHeight}
                className="w-full"
              />
            </div>

            {/* Velocity values */}
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-600 font-medium">v_{velocities.labels.B}/{velocities.labels.C}</span>
                  <span className="font-mono">{Math.sqrt(velocities.vBx ** 2 + velocities.vBy ** 2).toFixed(1)} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600 font-medium">v_{velocities.labels.A}/{velocities.labels.B}</span>
                  <span className="font-mono">{Math.sqrt(velocities.vABx ** 2 + velocities.vABy ** 2).toFixed(1)} m/s</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-green-600 font-bold">v_{velocities.labels.A}/{velocities.labels.C}</span>
                  <span className="font-mono font-bold">{Math.sqrt(velocities.vAx ** 2 + velocities.vAy ** 2).toFixed(1)} m/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Paramètres</h4>

          {scenario === 'train' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vitesse du train: {trainSpeed} m/s
                </label>
                <input
                  type="range" min="5" max="40" step="1"
                  value={trainSpeed}
                  onChange={(e) => setTrainSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vitesse de la personne (dans le train): {personSpeedInTrain} m/s
                </label>
                <input
                  type="range" min="0.5" max="5" step="0.5"
                  value={personSpeedInTrain}
                  onChange={(e) => setPersonSpeedInTrain(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
                <select
                  value={personDirection}
                  onChange={(e) => setPersonDirection(e.target.value as 'same' | 'opposite')}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="same">Même sens que le train</option>
                  <option value="opposite">Sens opposé</option>
                </select>
              </div>
            </div>
          )}

          {scenario === 'river' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vitesse du bateau (dans l'eau): {boatSpeedInWater} m/s
                </label>
                <input
                  type="range" min="1" max="10" step="0.5"
                  value={boatSpeedInWater}
                  onChange={(e) => setBoatSpeedInWater(parseFloat(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vitesse du courant: {riverCurrentSpeed} m/s
                </label>
                <input
                  type="range" min="0" max="8" step="0.5"
                  value={riverCurrentSpeed}
                  onChange={(e) => setRiverCurrentSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Angle du bateau: {boatAngle}°
                </label>
                <input
                  type="range" min="0" max="180" step="5"
                  value={boatAngle}
                  onChange={(e) => setBoatAngle(parseFloat(e.target.value))}
                  className="w-full accent-green-600"
                />
              </div>
            </div>
          )}

          {scenario === 'cars' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-red-600 mb-1">
                  Voiture 1: {car1Speed} m/s
                </label>
                <input
                  type="range" min="5" max="40" step="1"
                  value={car1Speed}
                  onChange={(e) => setCar1Speed(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-1">
                  Voiture 2: {car2Speed} m/s
                </label>
                <input
                  type="range" min="5" max="40" step="1"
                  value={car2Speed}
                  onChange={(e) => setCar2Speed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
                <select
                  value={carsDirection}
                  onChange={(e) => setCarsDirection(e.target.value as 'same' | 'opposite')}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="same">Même direction</option>
                  <option value="opposite">Directions opposées</option>
                </select>
              </div>
            </div>
          )}

          {scenario === 'custom' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-orange-600 mb-1">
                  v_Ax (A/B): {customVax} m/s
                </label>
                <input
                  type="range" min="-10" max="10" step="0.5"
                  value={customVax}
                  onChange={(e) => setCustomVax(parseFloat(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-600 mb-1">
                  v_Ay (A/B): {customVay} m/s
                </label>
                <input
                  type="range" min="-10" max="10" step="0.5"
                  value={customVay}
                  onChange={(e) => setCustomVay(parseFloat(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-1">
                  v_Bx (B/Sol): {customVbx} m/s
                </label>
                <input
                  type="range" min="-10" max="20" step="0.5"
                  value={customVbx}
                  onChange={(e) => setCustomVbx(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-1">
                  v_By (B/Sol): {customVby} m/s
                </label>
                <input
                  type="range" min="-10" max="10" step="0.5"
                  value={customVby}
                  onChange={(e) => setCustomVby(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Formula section */}
        <div className="mt-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Loi de composition des vitesses</h4>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/80 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Formule générale</p>
              <BlockMath math="\vec{v}_{A/C} = \vec{v}_{A/B} + \vec{v}_{B/C}" />
              <p className="text-xs text-gray-500 mt-2">
                La vitesse de A par rapport à C = vitesse de A par rapport à B + vitesse de B par rapport à C
              </p>
            </div>

            <div className="bg-white/80 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Application actuelle</p>
              <div className="text-sm space-y-1">
                <p><InlineMath math={`\\vec{v}_{${velocities.labels.A}/${velocities.labels.C}} = \\vec{v}_{${velocities.labels.A}/${velocities.labels.B}} + \\vec{v}_{${velocities.labels.B}/${velocities.labels.C}}`} /></p>
                <p className="text-xs text-gray-600 mt-2">
                  <span className="text-green-600 font-medium">{Math.sqrt(velocities.vAx ** 2 + velocities.vAy ** 2).toFixed(1)}</span> =
                  <span className="text-orange-600 font-medium"> {Math.sqrt(velocities.vABx ** 2 + velocities.vABy ** 2).toFixed(1)}</span> +
                  <span className="text-blue-600 font-medium"> {Math.sqrt(velocities.vBx ** 2 + velocities.vBy ** 2).toFixed(1)}</span>
                  {scenario !== 'river' && ' (1D)'}
                </p>
              </div>
            </div>
          </div>

          {scenario === 'river' && (
            <div className="mt-3 bg-white/80 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Composantes vectorielles</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <BlockMath math={`v_x = v_{bateau} \\cos\\theta + v_{courant}`} />
                  <p className="text-xs text-gray-500">= {velocities.vAx.toFixed(2)} m/s</p>
                </div>
                <div>
                  <BlockMath math={`v_y = v_{bateau} \\sin\\theta`} />
                  <p className="text-xs text-gray-500">= {velocities.vAy.toFixed(2)} m/s</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RelativeMotionSimulator;
