'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type ViewMode = 'animation' | 'spacetime' | 'clocks';

const VIEW_LABELS: Record<ViewMode, string> = {
  animation: 'Animation',
  spacetime: 'Diagramme espace-temps',
  clocks: 'Horloges comparées',
};

export function TwinParadoxSimulator() {
  const [mode, setMode] = useState<ViewMode>('animation');
  const [speed, setSpeed] = useState(0.8);
  const [tripDistance, setTripDistance] = useState(4); // light-years
  const [animSpeed, setAnimSpeed] = useState(1);

  const gamma = 1 / Math.sqrt(1 - speed * speed);
  const tripTimeEarth = 2 * tripDistance / speed; // years (round trip, Earth frame)
  const tripTimeTraveler = tripTimeEarth / gamma;  // years (traveler proper time)
  const ageDifference = tripTimeEarth - tripTimeTraveler;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Le paradoxe des jumeaux
        </h2>
        <p className="text-gray-600">
          Un jumeau voyage à vitesse relativiste puis revient sur Terre. Qui a vieilli le plus?
        </p>
      </div>

      {/* View tabs */}
      <div className="flex justify-center border-b border-gray-200">
        {(Object.keys(VIEW_LABELS) as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              mode === m
                ? 'text-violet-700 border-b-2 border-violet-500 bg-violet-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {VIEW_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Vitesse (% de c)</span>
            <span className="text-violet-600 font-mono">{(speed * 100).toFixed(0)}%</span>
          </label>
          <input type="range" min={0.1} max={0.99} step={0.01} value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Distance (années-lumière)</span>
            <span className="text-violet-600 font-mono">{tripDistance.toFixed(1)} al</span>
          </label>
          <input type="range" min={1} max={20} step={0.5} value={tripDistance}
            onChange={e => setTripDistance(+e.target.value)}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Vitesse animation</span>
            <span className="text-violet-600 font-mono">{animSpeed.toFixed(1)}x</span>
          </label>
          <input type="range" min={0.2} max={3} step={0.1} value={animSpeed}
            onChange={e => setAnimSpeed(+e.target.value)}
            className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
        </div>
      </div>

      {/* Simulation */}
      {mode === 'animation' && (
        <AnimationView speed={speed} tripDistance={tripDistance} gamma={gamma}
          tripTimeEarth={tripTimeEarth} tripTimeTraveler={tripTimeTraveler} animSpeed={animSpeed} />
      )}
      {mode === 'spacetime' && (
        <SpacetimeView speed={speed} tripDistance={tripDistance} gamma={gamma}
          tripTimeEarth={tripTimeEarth} tripTimeTraveler={tripTimeTraveler} animSpeed={animSpeed} />
      )}
      {mode === 'clocks' && (
        <ClocksView speed={speed} tripDistance={tripDistance} gamma={gamma}
          tripTimeEarth={tripTimeEarth} tripTimeTraveler={tripTimeTraveler} animSpeed={animSpeed} />
      )}

      {/* Math panel */}
      <div className="bg-violet-50 rounded-lg p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-violet-600 mb-2 font-medium">Dilatation du temps</p>
            <BlockMath math={`\\Delta t = \\gamma \\, \\Delta t' = ${gamma.toFixed(3)} \\times ${tripTimeTraveler.toFixed(2)} = ${tripTimeEarth.toFixed(2)} \\text{ ans}`} />
          </div>
          <div className="text-center">
            <p className="text-sm text-violet-600 mb-2 font-medium">Temps propre du voyageur</p>
            <BlockMath math={`\\Delta t' = \\frac{\\Delta t}{\\gamma} = \\frac{${tripTimeEarth.toFixed(2)}}{${gamma.toFixed(3)}} = ${tripTimeTraveler.toFixed(2)} \\text{ ans}`} />
          </div>
        </div>
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm text-center">
          <div className="bg-white rounded p-2">
            <span className="font-medium text-gray-700">Facteur de Lorentz</span>
            <p className="text-violet-700 font-mono text-lg">{`γ = ${gamma.toFixed(3)}`}</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium text-gray-700">Durée totale (Terre)</span>
            <p className="text-blue-700 font-mono text-lg">{tripTimeEarth.toFixed(2)} ans</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium text-gray-700">Durée totale (voyageur)</span>
            <p className="text-red-700 font-mono text-lg">{tripTimeTraveler.toFixed(2)} ans</p>
          </div>
        </div>
      </div>

      {/* Paradox explanation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Résolution du paradoxe</h3>
        <p className="text-amber-800 text-sm mb-2">
          Le paradoxe apparent : si le mouvement est relatif, pourquoi le voyageur vieillit-il moins?
          Chaque jumeau ne voit-il pas l'autre en mouvement?
        </p>
        <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
          <li>La situation n'est <strong>pas symétrique</strong>. Le jumeau voyageur doit <strong>accélérer</strong> pour faire demi-tour — il change de référentiel inertiel.</li>
          <li>Le jumeau resté sur Terre reste dans un <strong>seul référentiel inertiel</strong> pendant tout le voyage.</li>
          <li>Le temps propre (mesuré le long de la ligne d'univers) est toujours <strong>maximal pour la trajectoire inertielle</strong> (ligne droite dans l'espace-temps).</li>
          <li>Avec v = {(speed * 100).toFixed(0)}% c et d = {tripDistance} al, le voyageur revient <strong>{ageDifference.toFixed(2)} ans plus jeune</strong> que son jumeau.</li>
        </ul>
      </div>

      {/* Concepts */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="font-medium text-blue-800 mb-1">Temps propre</h4>
            <p className="text-blue-700">
              Le temps mesuré par une horloge qui accompagne l'observateur. C'est l'intervalle <InlineMath math="\Delta\tau" /> le long de sa ligne d'univers.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <h4 className="font-medium text-green-800 mb-1">Asymétrie</h4>
            <p className="text-green-700">
              L'accélération au demi-tour brise la symétrie. Le voyageur ressent une force; le sédentaire, non.
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <h4 className="font-medium text-purple-800 mb-1">Vérifié expérimentalement</h4>
            <p className="text-purple-700">
              Des horloges atomiques embarquées en avion (Hafele-Keating, 1971) ont confirmé la dilatation du temps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared props ────────────────────────────────────────────────
interface ViewProps {
  speed: number;
  tripDistance: number;
  gamma: number;
  tripTimeEarth: number;
  tripTimeTraveler: number;
  animSpeed: number;
}

// ─── Animation View ──────────────────────────────────────────────
function AnimationView({ speed, tripDistance, gamma, tripTimeEarth, tripTimeTraveler, animSpeed }: ViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'outbound' | 'return' | 'done'>('outbound');

  const handleReset = () => {
    timeRef.current = 0;
    setPhase('outbound');
    setIsPlaying(false);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Background - space
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Stars
    const starSeed = 42;
    for (let i = 0; i < 60; i++) {
      const sx = ((starSeed * (i + 1) * 7) % W);
      const sy = ((starSeed * (i + 1) * 13) % (H - 80)) + 10;
      const brightness = 0.3 + ((i * 17) % 7) / 10;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }

    const earthX = 100;
    const destX = W - 120;
    const trackY = H * 0.5;
    const t = timeRef.current;
    const halfTrip = tripTimeEarth / 2;

    // Fraction of journey complete
    let fraction: number;
    let currentPhase: 'outbound' | 'return' | 'done';
    if (t <= halfTrip) {
      fraction = t / halfTrip;
      currentPhase = 'outbound';
    } else if (t <= tripTimeEarth) {
      fraction = 1 - (t - halfTrip) / halfTrip;
      currentPhase = 'return';
    } else {
      fraction = 0;
      currentPhase = 'done';
    }
    setPhase(currentPhase);

    const shipX = earthX + fraction * (destX - earthX);

    // Distance scale line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(earthX, trackY + 60);
    ctx.lineTo(destX, trackY + 60);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tripDistance} années-lumière`, (earthX + destX) / 2, trackY + 75);

    // Earth
    drawEarth(ctx, earthX, trackY, 28);

    // Destination star
    drawStar(ctx, destX, trackY, 16);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Destination', destX, trackY + 45);

    // Rocket trail
    if (currentPhase !== 'done') {
      const trailDir = currentPhase === 'outbound' ? -1 : 1;
      for (let i = 1; i <= 12; i++) {
        const tx = shipX + trailDir * i * 6;
        const alpha = 0.5 - i * 0.04;
        if (alpha > 0) {
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
          ctx.beginPath();
          ctx.arc(tx, trackY, 3 - i * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Spaceship
    if (currentPhase !== 'done') {
      drawRocket(ctx, shipX, trackY, currentPhase === 'return');
    }

    // Turnaround indicator
    if (currentPhase === 'return' && t - halfTrip < 0.3) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Demi-tour! (accélération)', shipX, trackY - 45);
    }

    // Twin on Earth
    const earthTwinAge = 30 + t;
    const travelerAge = 30 + (t <= tripTimeEarth ? t / gamma : tripTimeTraveler);

    // Earth twin
    drawPerson(ctx, earthX - 40, trackY + 15, '#3b82f6', false);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Jumeau Terre', earthX - 40, trackY + 50);
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`${earthTwinAge.toFixed(1)} ans`, earthX - 40, trackY + 64);

    // Traveler twin (on ship or back)
    if (currentPhase === 'done') {
      drawPerson(ctx, earthX + 40, trackY + 15, '#ef4444', false);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Jumeau voyageur', earthX + 40, trackY + 50);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(`${travelerAge.toFixed(1)} ans`, earthX + 40, trackY + 64);

      // Age difference highlight
      const diff = earthTwinAge - travelerAge;
      if (diff > 0.1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Δâge = ${diff.toFixed(1)} ans!`, W / 2, 40);
      }
    } else {
      // Traveler age near rocket
      ctx.fillStyle = '#fca5a5';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Voyageur', shipX, trackY - 32);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(`${travelerAge.toFixed(1)} ans`, shipX, trackY - 18);
    }

    // Clock displays at top
    const clockY = 25;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Temps Terre: ${t.toFixed(2)} ans`, 20, clockY);
    ctx.fillText(`Temps voyageur: ${(t <= tripTimeEarth ? t / gamma : tripTimeTraveler).toFixed(2)} ans`, 20, clockY + 18);
    ctx.fillText(`v = ${(speed * 100).toFixed(0)}% c   γ = ${gamma.toFixed(3)}`, 20, clockY + 36);

    // Progress bar
    const progress = Math.min(t / tripTimeEarth, 1);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, H - 25, W - 40, 10);
    ctx.fillStyle = progress < 0.5 ? '#3b82f6' : progress < 1 ? '#f59e0b' : '#22c55e';
    ctx.fillRect(20, H - 25, (W - 40) * progress, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${(progress * 100).toFixed(0)}% du voyage`, W / 2, H - 28);
  }, [speed, tripDistance, gamma, tripTimeEarth, tripTimeTraveler]);

  useEffect(() => {
    const lastTime = { current: performance.now() };
    const animate = (now: number) => {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      if (isPlaying && timeRef.current <= tripTimeEarth + 0.5) {
        timeRef.current += dt * animSpeed;
      } else if (timeRef.current > tripTimeEarth + 0.5) {
        setIsPlaying(false);
      }
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw, animSpeed, tripTimeEarth]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={800} height={320} className="w-full max-w-[800px] mx-auto rounded-lg border border-gray-700" />
      <div className="flex justify-center gap-4">
        <button onClick={() => setIsPlaying(!isPlaying)}
          className={`px-5 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button onClick={handleReset}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          ↺ Réinitialiser
        </button>
        <span className={`px-3 py-2 rounded-lg text-xs font-medium ${
          phase === 'outbound' ? 'bg-blue-100 text-blue-700' :
          phase === 'return' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {phase === 'outbound' ? '→ Aller' : phase === 'return' ? '← Retour' : 'Arrivée'}
        </span>
      </div>
    </div>
  );
}

// ─── Spacetime Diagram View ──────────────────────────────────────
function SpacetimeView({ speed, tripDistance, gamma, tripTimeEarth, tripTimeTraveler, animSpeed }: ViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleReset = () => { timeRef.current = 0; setIsPlaying(false); };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 40, bottom: 50, left: 70, right: 40 };
    const gW = W - padding.left - padding.right;
    const gH = H - padding.top - padding.bottom;

    // Axes
    const tMax = tripTimeEarth * 1.15;
    const xMax = tripDistance * 1.3;

    const toCanvasX = (x: number) => padding.left + (x / xMax) * gW;
    const toCanvasY = (t: number) => padding.top + gH - (t / tMax) * gH;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let t = 0; t <= tMax; t += Math.ceil(tMax / 8)) {
      const y = toCanvasY(t);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + gW, y); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(`${t.toFixed(1)}`, padding.left - 8, y + 4);
    }
    for (let x = 0; x <= xMax; x += Math.ceil(xMax / 6)) {
      const cx = toCanvasX(x);
      ctx.beginPath(); ctx.moveTo(cx, padding.top); ctx.lineTo(cx, padding.top + gH); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`${x.toFixed(1)}`, cx, padding.top + gH + 16);
    }

    // Axes lines
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + gH);
    ctx.lineTo(padding.left + gW, padding.top + gH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#374151'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('x (années-lumière)', padding.left + gW / 2, H - 8);
    ctx.save();
    ctx.translate(16, padding.top + gH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('t (années)', 0, 0);
    ctx.restore();

    // Light cone (45° lines from origin)
    ctx.strokeStyle = '#fbbf2440';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Future light cone
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(Math.min(tMax, xMax)), toCanvasY(Math.min(tMax, xMax)));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fbbf2480';
    ctx.font = '10px Inter'; ctx.textAlign = 'left';
    const lcx = toCanvasX(Math.min(tMax * 0.4, xMax * 0.4));
    const lcy = toCanvasY(Math.min(tMax * 0.4, xMax * 0.4));
    ctx.fillText('cône de lumière', lcx + 5, lcy + 12);

    // Earth worldline (x=0, vertical)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(0), toCanvasY(tMax));
    ctx.stroke();

    ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Terre', toCanvasX(0) + 8, toCanvasY(tMax) + 15);

    // Traveler worldline (two segments)
    const halfTime = tripTimeEarth / 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    // Outbound: (0,0) → (d, T/2)
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(tripDistance), toCanvasY(halfTime));
    ctx.stroke();
    // Return: (d, T/2) → (0, T)
    ctx.beginPath();
    ctx.moveTo(toCanvasX(tripDistance), toCanvasY(halfTime));
    ctx.lineTo(toCanvasX(0), toCanvasY(tripTimeEarth));
    ctx.stroke();

    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Voyageur', toCanvasX(tripDistance) + 8, toCanvasY(halfTime));

    // Turnaround point
    ctx.beginPath();
    ctx.arc(toCanvasX(tripDistance), toCanvasY(halfTime), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Demi-tour', toCanvasX(tripDistance) + 10, toCanvasY(halfTime) + 4);

    // Reunion point
    ctx.beginPath();
    ctx.arc(toCanvasX(0), toCanvasY(tripTimeEarth), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.fillStyle = '#22c55e'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`Retrouvailles (t=${tripTimeEarth.toFixed(1)} ans)`, toCanvasX(0) + 10, toCanvasY(tripTimeEarth) + 4);

    // Animated marker
    const t = timeRef.current;
    if (t <= tripTimeEarth) {
      let markerX: number, markerT: number;
      if (t <= halfTime) {
        markerX = tripDistance * (t / halfTime);
        markerT = t;
      } else {
        markerX = tripDistance * (1 - (t - halfTime) / halfTime);
        markerT = t;
      }
      // Earth twin marker
      ctx.beginPath();
      ctx.arc(toCanvasX(0), toCanvasY(t), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

      // Traveler marker
      ctx.beginPath();
      ctx.arc(toCanvasX(markerX), toCanvasY(markerT), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Proper time annotations
    ctx.fillStyle = '#3b82f6'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
    ctx.fillText(`τ_Terre = ${tripTimeEarth.toFixed(2)} ans`, W - padding.right - 5, padding.top + 20);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`τ_voyageur = ${tripTimeTraveler.toFixed(2)} ans`, W - padding.right - 5, padding.top + 38);

    // Title
    ctx.fillStyle = '#374151'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Diagramme de Minkowski', W / 2, 22);
  }, [speed, tripDistance, gamma, tripTimeEarth, tripTimeTraveler]);

  useEffect(() => {
    const lastTime = { current: performance.now() };
    const animate = (now: number) => {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      if (isPlaying && timeRef.current <= tripTimeEarth + 0.2) {
        timeRef.current += dt * animSpeed;
      }
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw, animSpeed, tripTimeEarth]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={700} height={450} className="w-full max-w-[700px] mx-auto bg-white rounded-lg border border-gray-200" />
      <div className="flex justify-center gap-4">
        <button onClick={() => setIsPlaying(!isPlaying)}
          className={`px-5 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isPlaying ? '⏸ Pause' : '▶ Animer'}
        </button>
        <button onClick={handleReset}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          ↺ Réinitialiser
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center">
        La ligne d'univers du voyageur (rouge) est <strong>plus courte</strong> en temps propre que celle de la Terre (bleue),
        car le temps propre est maximal le long d'une géodésique (trajectoire inertielle = ligne droite).
      </p>
    </div>
  );
}

// ─── Clocks Comparison View ──────────────────────────────────────
function ClocksView({ speed, tripDistance, gamma, tripTimeEarth, tripTimeTraveler, animSpeed }: ViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleReset = () => { timeRef.current = 0; setIsPlaying(false); };

  const drawClock = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, timeYears: number, color: string, label: string) => {
    // Clock face
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hour markers
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = radius - 10;
      const outer = radius - 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Numbers at 12, 3, 6, 9
    ctx.fillStyle = '#475569';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('12', cx, cy - radius + 20);
    ctx.fillText('3', cx + radius - 20, cy);
    ctx.fillText('6', cx, cy + radius - 20);
    ctx.fillText('9', cx - radius + 20, cy);

    // Hour hand (years as hours)
    const hourAngle = ((timeYears % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourAngle) * (radius * 0.5), cy + Math.sin(hourAngle) * (radius * 0.5));
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Minute hand (fractional year * 12)
    const minuteAngle = ((timeYears * 12) % 12 / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minuteAngle) * (radius * 0.7), cy + Math.sin(minuteAngle) * (radius * 0.7));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, cx, cy + radius + 25);

    // Time display
    ctx.font = 'bold 18px Inter';
    ctx.fillText(`${timeYears.toFixed(2)} ans`, cx, cy + radius + 48);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const t = timeRef.current;
    const earthTime = t;
    const travelerTime = t <= tripTimeEarth ? t / gamma : tripTimeTraveler;

    // Title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Comparaison des horloges', W / 2, 30);

    // Draw two clocks
    const clockR = 80;
    drawClock(ctx, W * 0.3, H * 0.42, clockR, earthTime, '#3b82f6', 'Horloge Terre');
    drawClock(ctx, W * 0.7, H * 0.42, clockR, travelerTime, '#ef4444', 'Horloge Voyageur');

    // Ratio indicator between clocks
    const ratio = earthTime > 0.01 ? travelerTime / earthTime : 1;
    ctx.fillStyle = '#7c3aed';
    ctx.font = '13px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`Rapport: ${ratio.toFixed(3)}`, W * 0.5, H * 0.42 - 10);
    ctx.fillText(`(1/γ = ${(1/gamma).toFixed(3)})`, W * 0.5, H * 0.42 + 8);

    // Arrow between clocks
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(W * 0.3 + clockR + 15, H * 0.42);
    ctx.lineTo(W * 0.7 - clockR - 15, H * 0.42);
    ctx.stroke();
    ctx.setLineDash([]);

    // Age bar comparison at bottom
    const barY = H - 60;
    const barH = 25;
    const maxBarW = W * 0.7;
    const barX = W * 0.15;

    // Earth bar
    const earthBarW = maxBarW * Math.min(earthTime / tripTimeEarth, 1);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(barX, barY - barH - 5, maxBarW, barH);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(barX, barY - barH - 5, earthBarW, barH);
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY - barH - 5, maxBarW, barH);

    ctx.fillStyle = '#1e40af'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`Terre: ${earthTime.toFixed(2)} ans`, barX + maxBarW + 8, barY - barH + 12);

    // Traveler bar
    const travBarW = maxBarW * Math.min(travelerTime / tripTimeEarth, 1);
    ctx.fillStyle = '#fee2e2';
    ctx.fillRect(barX, barY + 5, maxBarW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY + 5, travBarW, barH);
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY + 5, maxBarW, barH);

    ctx.fillStyle = '#991b1b'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`Voyageur: ${travelerTime.toFixed(2)} ans`, barX + maxBarW + 8, barY + 22);

    // Tick rate visualization
    if (t <= tripTimeEarth && t > 0.01) {
      const tickPhrase = `L'horloge du voyageur tourne ${gamma.toFixed(1)}× plus lentement`;
      ctx.fillStyle = '#6b7280'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
      ctx.fillText(tickPhrase, W / 2, barY + barH + 30);
    }

    if (t > tripTimeEarth) {
      const diff = earthTime - travelerTime;
      ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`Le voyageur est ${diff.toFixed(2)} ans plus jeune!`, W / 2, barY + barH + 30);
    }
  }, [gamma, tripTimeEarth, tripTimeTraveler, drawClock]);

  useEffect(() => {
    const lastTime = { current: performance.now() };
    const animate = (now: number) => {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      if (isPlaying && timeRef.current <= tripTimeEarth + 0.5) {
        timeRef.current += dt * animSpeed;
      }
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, draw, animSpeed, tripTimeEarth]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={700} height={400} className="w-full max-w-[700px] mx-auto rounded-lg border border-gray-200" />
      <div className="flex justify-center gap-4">
        <button onClick={() => setIsPlaying(!isPlaying)}
          className={`px-5 py-2 rounded-lg text-sm font-medium ${isPlaying ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button onClick={handleReset}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
          ↺ Réinitialiser
        </button>
      </div>
    </div>
  );
}

// ─── Drawing Helpers ─────────────────────────────────────────────
function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Ocean
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1d4ed8';
  ctx.fill();

  // Continents (simplified)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 5, r * 0.3, r * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 2, r * 0.2, r * 0.25, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#93c5fd';
  ctx.font = '12px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Terre', x, y + r + 15);
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const spikes = 5;
  const outerR = r;
  const innerR = r * 0.5;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const sx = x + Math.cos(angle) * radius;
    const sy = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = '#fbbf24';
  ctx.fill();

  // Glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, facingLeft: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();

  // Window
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(6, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Fins
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.lineTo(-14, -10);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.lineTo(-14, 10);
  ctx.lineTo(-8, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, _waving: boolean) {
  // Head
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(x, y - 18, 5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - 13, 8, 14);

  // Legs
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 2, y + 1); ctx.lineTo(x - 4, y + 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y + 1); ctx.lineTo(x + 4, y + 10); ctx.stroke();
}

export default TwinParadoxSimulator;
