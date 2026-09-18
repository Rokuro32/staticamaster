'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type ReferenceFrame = 'barn' | 'pole';

export function RelativitySimulator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(0.8); // fraction of c
  const [referenceFrame, setReferenceFrame] = useState<ReferenceFrame>('barn');
  const [poleRestLength, setPoleRestLength] = useState(10); // meters
  const [barnRestLength, setBarnRestLength] = useState(8); // meters
  const [showEvents, setShowEvents] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Lorentz factor
  const gamma = 1 / Math.sqrt(1 - speed * speed);

  // Contracted lengths
  const poleInBarnFrame = poleRestLength / gamma;
  const barnInPoleFrame = barnRestLength / gamma;

  // In barn frame: pole is contracted
  // In pole frame: barn is contracted

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      setTime(prev => {
        const newTime = prev + deltaTime * animationSpeed;
        // Reset when pole has passed through
        if (newTime > 3) return -2;
        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animationSpeed]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const scale = 25; // pixels per meter

    // Clear canvas
    ctx.fillStyle = '#1e1d1b';
    ctx.fillRect(0, 0, width, height);

    // Draw ground
    ctx.fillStyle = '#5d4620';
    ctx.fillRect(0, centerY + 60, width, height - centerY - 60);

    // Grass texture
    ctx.strokeStyle = '#556027';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, centerY + 60);
      ctx.lineTo(i + 5, centerY + 70);
      ctx.stroke();
    }

    const barnCenterX = width / 2;

    if (referenceFrame === 'barn') {
      // BARN REFERENCE FRAME
      // Barn is stationary, pole is moving and contracted

      const barnWidth = barnRestLength * scale;
      const poleWidth = poleInBarnFrame * scale;
      const poleX = barnCenterX + time * speed * 100 - poleWidth / 2;

      // Draw barn (stationary)
      drawBarn(ctx, barnCenterX - barnWidth / 2, centerY, barnWidth, '#864f18', '#ae661f');

      // Draw pole (moving, contracted)
      const poleY = centerY + 10;
      drawPole(ctx, poleX, poleY, poleWidth, '#be9347');

      // Draw runner
      drawRunner(ctx, poleX + poleWidth / 2, poleY + 20, speed > 0);

      // Velocity arrow
      ctx.fillStyle = '#e8c61a';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`v = ${(speed * 100).toFixed(0)}% c →`, poleX + poleWidth / 2, centerY - 50);

      // Length labels
      ctx.fillStyle = '#be9347';
      ctx.font = '12px Inter';
      ctx.fillText(`Perche: L = ${poleInBarnFrame.toFixed(2)} m (contractée)`, poleX + poleWidth / 2, centerY - 30);

      ctx.fillStyle = '#ae661f';
      ctx.fillText(`Grange: L₀ = ${barnRestLength.toFixed(1)} m (repos)`, barnCenterX, centerY + 100);

      // Events
      if (showEvents) {
        const barnLeft = barnCenterX - barnWidth / 2;
        const barnRight = barnCenterX + barnWidth / 2;
        const poleFront = poleX + poleWidth;
        const poleBack = poleX;

        // Check if pole fits inside barn
        if (poleBack >= barnLeft && poleFront <= barnRight) {
          ctx.fillStyle = 'rgba(145, 164, 67, 0.3)';
          ctx.fillRect(barnLeft, centerY - 40, barnWidth, 100);
          ctx.fillStyle = '#91a443';
          ctx.font = 'bold 16px Inter';
          ctx.fillText('✓ La perche tient dans la grange!', barnCenterX, 50);
        }

        // Front door event
        if (Math.abs(poleFront - barnRight) < 10) {
          ctx.fillStyle = '#ca684a';
          ctx.beginPath();
          ctx.arc(barnRight, centerY + 30, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px Inter';
          ctx.fillText('E₂', barnRight, centerY + 33);
        }

        // Back door event
        if (Math.abs(poleBack - barnLeft) < 10) {
          ctx.fillStyle = '#c29851';
          ctx.beginPath();
          ctx.arc(barnLeft, centerY + 30, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.fillText('E₁', barnLeft, centerY + 33);
        }
      }

      // Frame label
      ctx.fillStyle = '#aba6a1';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('Référentiel de la GRANGE (observateur au repos)', 20, 30);

    } else {
      // POLE REFERENCE FRAME
      // Pole is stationary, barn is moving and contracted

      const poleWidth = poleRestLength * scale;
      const barnWidth = barnInPoleFrame * scale;
      const barnX = barnCenterX - time * speed * 100 - barnWidth / 2;

      // Draw pole (stationary)
      const poleY = centerY + 10;
      drawPole(ctx, barnCenterX - poleWidth / 2, poleY, poleWidth, '#be9347');

      // Draw runner (stationary with pole)
      drawRunner(ctx, barnCenterX, poleY + 20, false);

      // Draw barn (moving, contracted)
      drawBarn(ctx, barnX, centerY, barnWidth, '#864f18', '#ae661f');

      // Velocity arrow on barn
      ctx.fillStyle = '#e8c61a';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`← v = ${(speed * 100).toFixed(0)}% c`, barnX + barnWidth / 2, centerY - 50);

      // Length labels
      ctx.fillStyle = '#be9347';
      ctx.font = '12px Inter';
      ctx.fillText(`Perche: L₀ = ${poleRestLength.toFixed(1)} m (repos)`, barnCenterX, centerY - 30);

      ctx.fillStyle = '#ae661f';
      ctx.fillText(`Grange: L = ${barnInPoleFrame.toFixed(2)} m (contractée)`, barnX + barnWidth / 2, centerY + 100);

      // Events - in pole frame, barn is too small!
      if (showEvents) {
        const barnLeft = barnX;
        const barnRight = barnX + barnWidth;
        const poleFront = barnCenterX + poleWidth / 2;
        const poleBack = barnCenterX - poleWidth / 2;

        // Pole never fits - show this
        if (barnLeft < poleFront && barnRight > poleBack) {
          ctx.fillStyle = 'rgba(202, 104, 74, 0.2)';
          ctx.fillRect(Math.max(barnLeft, poleBack - 20), centerY - 40,
                       Math.min(barnRight, poleFront + 20) - Math.max(barnLeft, poleBack - 20), 100);
          ctx.fillStyle = '#ca684a';
          ctx.font = 'bold 16px Inter';
          ctx.fillText('✗ La perche ne tient PAS dans la grange!', barnCenterX, 50);
        }

        // Events occur at different times in this frame
        if (Math.abs(barnRight - poleBack) < 10) {
          ctx.fillStyle = '#c29851';
          ctx.beginPath();
          ctx.arc(barnRight, centerY + 30, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px Inter';
          ctx.fillText('E₁', barnRight, centerY + 33);
        }

        if (Math.abs(barnLeft - poleFront) < 10) {
          ctx.fillStyle = '#ca684a';
          ctx.beginPath();
          ctx.arc(barnLeft, centerY + 30, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.fillText('E₂', barnLeft, centerY + 33);
        }
      }

      // Frame label
      ctx.fillStyle = '#aba6a1';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'left';
      ctx.fillText('Référentiel de la PERCHE (coureur au repos)', 20, 30);
    }

    // Draw Lorentz factor indicator
    ctx.fillStyle = '#b57b98';
    ctx.font = '14px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`γ = ${gamma.toFixed(3)}`, width - 20, 30);
    ctx.fillText(`Contraction: ${((1 - 1/gamma) * 100).toFixed(1)}%`, width - 20, 50);

  }, [time, speed, referenceFrame, poleRestLength, barnRestLength, gamma,
      poleInBarnFrame, barnInPoleFrame, showEvents]);

  const handleReset = () => {
    setTime(-2);
    lastTimeRef.current = 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Relativité restreinte: Le paradoxe de la perche et la grange
        </h2>
        <p className="text-stone-600">
          Explorez la contraction des longueurs et la relativité de la simultanéité
        </p>
      </div>

      {/* Reference Frame Selection */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setReferenceFrame('barn')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            referenceFrame === 'barn'
              ? 'bg-ocre-600 text-white'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          🏠 Référentiel Grange
        </button>
        <button
          onClick={() => setReferenceFrame('pole')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            referenceFrame === 'pole'
              ? 'bg-gold-600 text-white'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          🏃 Référentiel Perche
        </button>
      </div>

      {/* Mathematical Equations */}
      <div className="bg-prune-50 rounded-lg p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-prune-600 mb-2 font-medium">Facteur de Lorentz</p>
            <BlockMath math={`\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}} = \\frac{1}{\\sqrt{1 - ${speed.toFixed(2)}^2}} = ${gamma.toFixed(3)}`} />
          </div>
          <div className="text-center">
            <p className="text-sm text-prune-600 mb-2 font-medium">Contraction des longueurs</p>
            <BlockMath math={`L = \\frac{L_0}{\\gamma} = \\frac{L_0}{${gamma.toFixed(3)}}`} />
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          <div className={`p-3 rounded ${referenceFrame === 'barn' ? 'bg-ocre-100' : 'bg-white'}`}>
            <p className="font-medium text-ocre-800">Dans le référentiel de la grange:</p>
            <p className="text-ocre-700">
              Perche: <InlineMath math={`L = ${poleRestLength}/${gamma.toFixed(2)} = ${poleInBarnFrame.toFixed(2)}`} /> m
            </p>
            <p className="text-ocre-700">
              Grange: <InlineMath math={`L_0 = ${barnRestLength}`} /> m (au repos)
            </p>
            {poleInBarnFrame < barnRestLength && (
              <p className="text-olive-600 font-medium mt-1">→ La perche tient!</p>
            )}
          </div>
          <div className={`p-3 rounded ${referenceFrame === 'pole' ? 'bg-gold-100' : 'bg-white'}`}>
            <p className="font-medium text-gold-800">Dans le référentiel de la perche:</p>
            <p className="text-gold-700">
              Perche: <InlineMath math={`L_0 = ${poleRestLength}`} /> m (au repos)
            </p>
            <p className="text-gold-700">
              Grange: <InlineMath math={`L = ${barnRestLength}/${gamma.toFixed(2)} = ${barnInPoleFrame.toFixed(2)}`} /> m
            </p>
            {barnInPoleFrame < poleRestLength && (
              <p className="text-brun-600 font-medium mt-1">→ La perche ne tient pas!</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-stone-700">Vitesse (% de c)</span>
            <span className="text-prune-600 font-mono">{(speed * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="0.99"
            step="0.01"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-prune-200 rounded-lg appearance-none cursor-pointer accent-prune-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-stone-700">Longueur perche (repos)</span>
            <span className="text-prune-600 font-mono">{poleRestLength} m</span>
          </label>
          <input
            type="range"
            min="5"
            max="20"
            step="1"
            value={poleRestLength}
            onChange={(e) => setPoleRestLength(parseInt(e.target.value))}
            className="w-full h-2 bg-prune-200 rounded-lg appearance-none cursor-pointer accent-prune-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-stone-700">Longueur grange (repos)</span>
            <span className="text-prune-600 font-mono">{barnRestLength} m</span>
          </label>
          <input
            type="range"
            min="5"
            max="15"
            step="1"
            value={barnRestLength}
            onChange={(e) => setBarnRestLength(parseInt(e.target.value))}
            className="w-full h-2 bg-prune-200 rounded-lg appearance-none cursor-pointer accent-prune-600"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="font-medium text-stone-700">Vitesse animation</span>
            <span className="text-prune-600 font-mono">{animationSpeed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-prune-200 rounded-lg appearance-none cursor-pointer accent-prune-600"
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full rounded-lg border border-stone-200"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isPlaying
              ? 'bg-brun-100 text-brun-700 hover:bg-brun-200'
              : 'bg-olive-100 text-olive-700 hover:bg-olive-200'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
        >
          ↺ Réinitialiser
        </button>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100">
          <input
            type="checkbox"
            checked={showEvents}
            onChange={(e) => setShowEvents(e.target.checked)}
            className="rounded text-prune-600"
          />
          <span className="text-sm text-stone-700">Montrer événements</span>
        </label>
      </div>

      {/* Paradox Explanation */}
      <div className="bg-ocre-50 border border-ocre-200 rounded-lg p-4">
        <h3 className="font-semibold text-ocre-900 mb-2">Résolution du paradoxe</h3>
        <p className="text-ocre-800 text-sm">
          Le "paradoxe" n'en est pas vraiment un! La clé est la <strong>relativité de la simultanéité</strong>:
        </p>
        <ul className="text-ocre-700 text-sm mt-2 space-y-1 list-disc list-inside">
          <li>Dans le référentiel de la grange: les deux portes se ferment <em>simultanément</em> quand la perche est à l'intérieur.</li>
          <li>Dans le référentiel de la perche: les portes ne se ferment <em>pas simultanément</em> - la porte arrière se ferme avant que la porte avant ne soit atteinte.</li>
          <li>Les deux observations sont correctes dans leur propre référentiel!</li>
        </ul>
      </div>

      {/* Educational Notes */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">Concepts clés</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Contraction des longueurs</h4>
            <p className="text-prune-700">
              Un objet en mouvement apparaît contracté dans la direction du mouvement.
              <InlineMath math="L = L_0/\gamma" /> où <InlineMath math="\gamma > 1" />.
            </p>
          </div>
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Relativité de la simultanéité</h4>
            <p className="text-gold-700">
              Deux événements simultanés dans un référentiel ne le sont pas nécessairement
              dans un autre référentiel en mouvement.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Pas de contradiction</h4>
            <p className="text-olive-700">
              La perche n'est jamais "cassée" - chaque observateur voit une réalité cohérente
              avec les lois de la physique relativiste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to draw the barn
function drawBarn(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, wallColor: string, roofColor: string) {
  const wallHeight = 50;
  const roofHeight = 30;

  // Walls
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y, 15, wallHeight);
  ctx.fillRect(x + width - 15, y, 15, wallHeight);

  // Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + width / 2, y - roofHeight);
  ctx.lineTo(x + width + 10, y);
  ctx.closePath();
  ctx.fill();

  // Door openings (empty space)
  ctx.fillStyle = '#1e1d1b';
  ctx.fillRect(x + 15, y, width - 30, wallHeight);

  // Door frames
  ctx.strokeStyle = '#653c12';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 15, wallHeight);
  ctx.strokeRect(x + width - 15, y, 15, wallHeight);
}

// Helper function to draw the pole
function drawPole(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) {
  const height = 8;

  // Main pole
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  // End caps
  ctx.fillStyle = '#c1974f';
  ctx.beginPath();
  ctx.arc(x, y + height / 2, height / 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + width, y + height / 2, height / 2, 0, 2 * Math.PI);
  ctx.fill();

  // Shine effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x + 5, y + 1, width - 10, 2);
}

// Helper function to draw the runner
function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, running: boolean) {
  // Body
  ctx.fillStyle = '#ca684a';
  ctx.beginPath();
  ctx.arc(x, y - 15, 8, 0, 2 * Math.PI);
  ctx.fill();

  // Head
  ctx.fillStyle = '#eccf3c';
  ctx.beginPath();
  ctx.arc(x, y - 30, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#987435';
  ctx.lineWidth = 3;
  if (running) {
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 8, y + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 8, y + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 4, y + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 4, y + 5);
    ctx.stroke();
  }
}

export default RelativitySimulator;
