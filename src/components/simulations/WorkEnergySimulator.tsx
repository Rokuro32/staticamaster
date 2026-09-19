'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Travail et énergie, en deux volets.
//
// 1. Le travail d'une force : W = F·d·cos θ. L'angle est le curseur qui compte,
//    parce que c'est lui qui rend le travail moteur, nul, puis résistant.
// 2. La conservation de l'énergie mécanique : un bloc lâché sur une piste.
//    Ec + Ep reste constant sans frottement ; avec frottement, ce qui manque
//    est passé dans un troisième bac, et la somme des trois ne bouge pas.
// ---------------------------------------------------------------------------

const G = 9.81;

const C_KINETIC = '#c1964e';   // or       — énergie cinétique
const C_POTENTIAL = '#6d7a38'; // olive    — énergie potentielle
const C_DISSIPATED = '#c96445';// brun     — énergie dissipée
const C_TRACK = '#78716c';

// ===========================================================================
// Volet 1 — le travail d'une force
// ===========================================================================

interface PushState {
  x: number;      // position parcourue, en m
  v: number;      // vitesse, en m/s
  done: boolean;
}

function WorkOfAForce() {
  const [mass, setMass] = useState(4);
  const [force, setForce] = useState(30);
  const [angle, setAngle] = useState(30);      // degrés, au-dessus de l'horizontale
  const [mu, setMu] = useState(0.15);
  const [distance, setDistance] = useState(4); // m
  const [v0, setV0] = useState(1);
  const [running, setRunning] = useState(true);

  const [block, setBlock] = useState<PushState>({ x: 0, v: 1, done: false });

  const sceneRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>();

  // ---------------------------------------------------------------- physique
  const rad = (angle * Math.PI) / 180;
  const fx = force * Math.cos(rad);
  const fy = force * Math.sin(rad);
  // La composante verticale allège le bloc, donc réduit le frottement
  const normal = Math.max(0, mass * G - fy);
  const friction = mu * normal;

  const netForce = fx - friction;
  const accel = netForce / mass;
  const ke0 = 0.5 * mass * v0 * v0;

  // Si la force nette freine, le bloc peut s'immobiliser avant d'avoir couvert
  // d. Le travail s'exerce alors sur la distance réellement parcourue, pas sur
  // celle qu'on avait demandée — sans quoi le théorème de l'énergie cinétique
  // ne tomberait plus juste.
  const stopDistance = accel < 0 ? (v0 * v0) / (2 * -accel) : Infinity;
  const travelled = Math.min(distance, stopDistance);
  const stopsEarly = travelled < distance - 1e-9;

  const workForce = fx * travelled;
  const workFriction = -friction * travelled;
  const workWeight = 0;   // déplacement horizontal : le poids ne travaille pas
  const workNormal = 0;   // la normale est perpendiculaire au déplacement
  const workNet = workForce + workFriction;

  const keFinal = Math.max(0, ke0 + workNet);
  const vFinal = Math.sqrt((2 * keFinal) / mass);

  const reset = useCallback(() => {
    setBlock({ x: 0, v: v0, done: false });
    lastRef.current = undefined;
  }, [v0]);

  useEffect(() => { reset(); }, [reset, force, angle, mu, mass, distance]);

  // -------------------------------------------------------------- animation
  useEffect(() => {
    if (!running) { lastRef.current = undefined; return; }

    const tick = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;
      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.05) * 0.7;
        setBlock((prev) => {
          if (prev.done) return prev;
          const v = Math.max(0, prev.v + accel * dt);
          const x = prev.x + v * dt;
          if (x >= travelled || v <= 0) {
            setTimeout(() => setBlock({ x: 0, v: v0, done: false }), 1100);
            return { x: travelled, v: vFinal, done: true };
          }
          return { x, v, done: false };
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, accel, travelled, vFinal, v0]);

  // ------------------------------------------------------------------ scène
  useEffect(() => {
    const canvas = sceneRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const padL = 70;
    const padR = 70;
    const ground = H - 152;
    const scale = (W - padL - padR) / Math.max(distance, 0.5);
    const bx = padL + block.x * scale;
    const size = 26 + Math.sqrt(mass) * 7;

    // sol
    ctx.strokeStyle = C_TRACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, ground);
    ctx.lineTo(W - 20, ground);
    ctx.stroke();
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1;
    for (let i = 20; i < W - 20; i += 11) {
      ctx.beginPath();
      ctx.moveTo(i, ground);
      ctx.lineTo(i - 7, ground + 8);
      ctx.stroke();
    }

    // repère du déplacement demandé, et de celui réellement parcouru
    ctx.strokeStyle = '#d6d3d1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, ground + 96);
    ctx.lineTo(padL + distance * scale, ground + 96);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`d demandé = ${distance.toFixed(1)} m`, padL + (distance * scale) / 2, ground + 112);

    if (stopsEarly) {
      ctx.strokeStyle = C_DISSIPATED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padL, ground + 96);
      ctx.lineTo(padL + travelled * scale, ground + 96);
      ctx.stroke();
      ctx.fillStyle = C_DISSIPATED;
      ctx.textAlign = 'left';
      ctx.fillText(
        `le bloc s'arrête après ${travelled.toFixed(2)} m`,
        padL + travelled * scale + 8,
        ground + 92
      );
    }

    // le bloc
    ctx.fillStyle = C_KINETIC;
    ctx.beginPath();
    ctx.roundRect(bx - size / 2, ground - size, size, size, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText(`${mass} kg`, bx, ground - size / 2 + 4);

    const cx = bx;
    const cy = ground - size / 2;

    const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, w = 3) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(a - Math.PI / 6), y2 - 10 * Math.sin(a - Math.PI / 6));
      ctx.lineTo(x2 - 10 * Math.cos(a + Math.PI / 6), y2 - 10 * Math.sin(a + Math.PI / 6));
      ctx.closePath(); ctx.fill();
    };

    const fScale = 1.7;
    // F, telle qu'elle est appliquée
    arrow(cx, cy, cx + fx * fScale, cy - fy * fScale, '#8e5270');
    ctx.fillStyle = '#8e5270';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`F = ${force} N`, cx + fx * fScale + 6, cy - fy * fScale - 4);

    // sa composante utile : celle qui est le long du déplacement
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#8e5270';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + fx * fScale, cy - fy * fScale);
    ctx.lineTo(cx + fx * fScale, cy);
    ctx.stroke();
    ctx.restore();

    // Bilan des forces horizontales, sur deux lignes sous le sol : c'est la
    // seule façon de garder les étiquettes lisibles quand la force bascule.
    const lineA = ground + 30;
    const lineB = ground + 64;

    arrow(cx, lineA, cx + fx * fScale, lineA, '#c1964e', 4);
    ctx.fillStyle = '#9c8349';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`F cos θ = ${fx.toFixed(1)} N`, cx + (fx * fScale) / 2, lineA - 8);

    if (friction > 0.05) {
      arrow(cx, lineB, cx - friction * fScale, lineB, C_DISSIPATED, 4);
      ctx.fillStyle = C_DISSIPATED;
      ctx.fillText(`f = ${friction.toFixed(1)} N`, cx - (friction * fScale) / 2, lineB - 8);
    }

    // arc de l'angle
    if (Math.abs(fy) > 0.5) {
      ctx.strokeStyle = '#8e5270';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, -rad, 0, rad < 0);
      ctx.stroke();
      ctx.fillStyle = '#8e5270';
      ctx.textAlign = 'left';
      ctx.fillText(`θ = ${angle}°`, cx + 32, cy - 10);
    }

    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`v = ${block.v.toFixed(2)} m/s`, 14, 22);
    ctx.textAlign = 'right';
    ctx.fillText(
      workNet >= 0 ? 'travail moteur : le bloc accélère' : 'travail résistant : le bloc ralentit',
      W - 14, 22
    );
  }, [block, mass, force, angle, mu, distance, travelled, stopsEarly, fx, fy, friction, rad, workNet]);

  // ----------------------------------------- le travail comme aire sous F(x)
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const pad = 34;
    const zero = H - pad - (H - 2 * pad) / 2;
    const fMax = Math.max(Math.abs(fx), friction, 10) * 1.25;
    const toY = (f: number) => zero - (f / fMax) * ((H - 2 * pad) / 2);
    const toX = (x: number) => pad + (x / Math.max(distance, 0.5)) * (W - 2 * pad);
    const dEnd = travelled;

    // axes
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, zero); ctx.lineTo(W - pad, zero);
    ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad);
    ctx.stroke();

    // aire de la force motrice
    ctx.fillStyle = 'rgba(193, 150, 78, .35)';
    ctx.fillRect(toX(0), Math.min(zero, toY(fx)), toX(dEnd) - toX(0), Math.abs(toY(fx) - zero));
    ctx.strokeStyle = C_KINETIC;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(fx)); ctx.lineTo(toX(dEnd), toY(fx));
    ctx.stroke();

    // aire du frottement, sous l'axe
    if (friction > 0.05) {
      ctx.fillStyle = 'rgba(201, 100, 69, .3)';
      ctx.fillRect(toX(0), zero, toX(dEnd) - toX(0), Math.abs(toY(-friction) - zero));
      ctx.strokeStyle = C_DISSIPATED;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(-friction)); ctx.lineTo(toX(dEnd), toY(-friction));
      ctx.stroke();
    }

    // position courante
    ctx.strokeStyle = '#57534e';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(block.x), pad); ctx.lineTo(toX(block.x), H - pad);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#78716c';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('F (N)', 6, pad - 6);
    ctx.textAlign = 'right';
    ctx.fillText('x (m)', W - 8, zero + 14);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9c8349';
    ctx.fillText(`aire = W = ${workForce.toFixed(0)} J`, W / 2, toY(fx) - 8);
  }, [fx, friction, distance, travelled, block.x, workForce]);

  const bar = (label: string, value: number, max: number, color: string) => (
    <div key={label}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{label}</span>
        <span className="font-mono text-stone-900">{value.toFixed(1)} J</span>
      </div>
      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden flex">
        {value >= 0 ? (
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
        ) : (
          <div className="h-full rounded-full ml-auto" style={{ width: `${Math.min(100, (-value / max) * 100)}%`, background: color }} />
        )}
      </div>
    </div>
  );

  const barMax = Math.max(Math.abs(workForce), Math.abs(workFriction), Math.abs(workNet), keFinal, 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">Le travail d&apos;une force</h3>
        <p className="text-sm text-stone-600 mt-1">
          Une force ne travaille que par sa composante le long du déplacement.
          Faites tourner l&apos;angle : le travail passe de moteur à nul, puis à
          résistant.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Angle θ de la force</span>
              <span className="font-mono text-stone-900">{angle}°</span>
            </label>
            <input type="range" min={-60} max={150} step={5} value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full accent-prune-600" />
            <p className="text-xs text-stone-500 mt-1">
              À 90°, cos θ = 0 : la force ne travaille pas du tout. Au-delà, elle
              s&apos;oppose au mouvement.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Intensité F</span>
              <span className="font-mono text-stone-900">{force} N</span>
            </label>
            <input type="range" min={0} max={80} step={1} value={force}
              onChange={(e) => setForce(Number(e.target.value))}
              className="w-full accent-prune-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Déplacement d</span>
              <span className="font-mono text-stone-900">{distance.toFixed(1)} m</span>
            </label>
            <input type="range" min={1} max={8} step={0.5} value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full accent-gold-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Masse m</span>
              <span className="font-mono text-stone-900">{mass} kg</span>
            </label>
            <input type="range" min={1} max={12} step={0.5} value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full accent-gold-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Frottement μ</span>
              <span className="font-mono text-stone-900">{mu.toFixed(2)}</span>
            </label>
            <input type="range" min={0} max={0.6} step={0.01} value={mu}
              onChange={(e) => setMu(Number(e.target.value))}
              className="w-full accent-brun-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Vitesse initiale v₀</span>
              <span className="font-mono text-stone-900">{v0.toFixed(1)} m/s</span>
            </label>
            <input type="range" min={0} max={6} step={0.5} value={v0}
              onChange={(e) => setV0(Number(e.target.value))}
              className="w-full accent-gold-600" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-gold-600 text-white hover:bg-gold-700 transition-colors">
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
              ↺ Rejouer
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={sceneRef} width={720} height={390} className="w-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-stone-500 mb-1">
                Le travail est l&apos;aire sous la courbe F(x)
              </div>
              <canvas ref={graphRef} width={340} height={190}
                className="w-full border border-stone-200 rounded-lg" />
            </div>

            <div className="space-y-3">
              {bar('Travail de F', workForce, barMax, C_KINETIC)}
              {bar('Travail du frottement', workFriction, barMax, C_DISSIPATED)}
              <div className="pt-2 border-t border-stone-200 space-y-3">
                {bar('Travail net', workNet, barMax, workNet >= 0 ? C_KINETIC : C_DISSIPATED)}
                {bar('Variation d’énergie cinétique', keFinal - ke0, barMax, C_POTENTIAL)}
              </div>
              <p className="text-xs text-stone-500">
                Les deux dernières barres sont toujours identiques : c&apos;est
                le théorème de l&apos;énergie cinétique.
              </p>
              {stopsEarly && (
                <p className="text-xs text-brun-700 bg-brun-50 rounded-lg px-3 py-2">
                  La force nette freine le bloc : il s&apos;immobilise après{' '}
                  {travelled.toFixed(2)} m au lieu des {distance.toFixed(1)} m
                  demandés. Les travaux sont calculés sur cette distance-là.
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Poids', `${workWeight} J`, 'perpendiculaire au déplacement'],
              ['Normale', `${workNormal} J`, 'perpendiculaire aussi'],
              ['Vitesse finale', `${vFinal.toFixed(2)} m/s`, `depuis ${v0.toFixed(1)} m/s`],
              ['Puissance moyenne', `${(vFinal + v0) / 2 > 0.01 ? (workNet / (distance / ((vFinal + v0) / 2))).toFixed(0) : '0'} W`, 'W / Δt'],
            ].map(([k, v, note]) => (
              <div key={k} className="bg-stone-50 rounded-lg p-3">
                <span className="text-stone-500 block text-xs">{k}</span>
                <strong className="text-stone-900 font-mono">{v}</strong>
                <p className="text-xs text-stone-500 mt-1">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Volet 2 — conservation de l'énergie mécanique
// ===========================================================================

interface SlideState {
  x: number;   // position le long de la piste, en m
  v: number;   // vitesse tangentielle, en m/s
  diss: number; // énergie déjà dissipée, en J
}

/** Profil de la piste : colline, vallée, colline, avec des raccords lisses */
function trackHeight(x: number, h1: number, h2: number): number {
  if (x < 0) return h1 + 0.8 * x * x;
  if (x <= 3) return h1 * 0.5 * (1 + Math.cos((Math.PI * x) / 3));
  if (x <= 5) return 0;
  if (x <= 7) return h2 * 0.5 * (1 - Math.cos((Math.PI * (x - 5)) / 2));
  return h2 + 0.8 * (x - 7) * (x - 7);
}

// On relâche le bloc un peu en contrebas du sommet, et non pile dessus : au
// sommet exact la pente est nulle, donc rien ne démarrerait jamais. C'est un
// équilibre instable, pas un bug de la simulation.
const RELEASE_X = 0.35;

function trackSlope(x: number, h1: number, h2: number): number {
  if (x < 0) return 1.6 * x;
  if (x <= 3) return -h1 * 0.5 * (Math.PI / 3) * Math.sin((Math.PI * x) / 3);
  if (x <= 5) return 0;
  if (x <= 7) return h2 * 0.5 * (Math.PI / 2) * Math.sin((Math.PI * (x - 5)) / 2);
  return 1.6 * (x - 7);
}

function EnergyConservation() {
  const [mass, setMass] = useState(2);
  const [h1, setH1] = useState(4);
  const [h2, setH2] = useState(2.5);
  const [mu, setMu] = useState(0);
  const [running, setRunning] = useState(true);

  const [state, setState] = useState<SlideState>({ x: RELEASE_X, v: 0, diss: 0 });

  const sceneRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>();
  const historyRef = useRef<{ ke: number; pe: number; diss: number }[]>([]);

  const height = trackHeight(state.x, h1, h2);
  const releaseHeight = trackHeight(RELEASE_X, h1, h2);
  const ke = 0.5 * mass * state.v * state.v;
  const pe = mass * G * height;
  const total = ke + pe + state.diss;
  const e0 = mass * G * releaseHeight;

  const reset = useCallback(() => {
    setState({ x: RELEASE_X, v: 0, diss: 0 });
    historyRef.current = [];
    lastRef.current = undefined;
  }, []);

  useEffect(() => { reset(); }, [reset, mass, h1, h2, mu]);

  useEffect(() => {
    if (!running) { lastRef.current = undefined; return; }

    const tick = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;
      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.03) * 0.8;
        setState((prev) => {
          const slope = trackSlope(prev.x, h1, h2);
          const phi = Math.atan(slope);
          // Le long de la piste : la pente tire, le frottement résiste.
          // On prend N = mg·cos φ, c'est-à-dire qu'on néglige la correction
          // centripète due à la courbure — l'approximation habituelle.
          const sign = Math.sign(prev.v) || 0;
          const aTangential = -G * Math.sin(phi) - mu * G * Math.cos(phi) * sign;
          let v = prev.v + aTangential * dt;
          // Le frottement ne peut pas relancer un bloc à l'arrêt en sens inverse
          if (sign !== 0 && Math.sign(v) !== sign && Math.abs(slope) < mu) v = 0;

          const ds = v * dt;                       // le long de la piste
          const dx = ds * Math.cos(phi);           // projeté sur l'horizontale
          const diss = prev.diss + mu * mass * G * Math.cos(phi) * Math.abs(ds);
          return { x: prev.x + dx, v, diss };
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, mu, mass, h1, h2]);

  // historique pour le graphique
  useEffect(() => {
    historyRef.current.push({ ke, pe, diss: state.diss });
    if (historyRef.current.length > 420) historyRef.current.shift();
  }, [ke, pe, state.diss]);

  // ------------------------------------------------------------------ scène
  useEffect(() => {
    const canvas = sceneRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const xMin = -1.2;
    const xMax = 8.6;
    const hMax = Math.max(h1, h2) * 1.35 + 1;
    const toX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * (W - 80);
    const toY = (h: number) => H - 48 - (h / hMax) * (H - 100);

    // la piste
    ctx.strokeStyle = C_TRACK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 260; i++) {
      const x = xMin + ((xMax - xMin) * i) / 260;
      const y = toY(trackHeight(x, h1, h2));
      if (i === 0) ctx.moveTo(toX(x), y); else ctx.lineTo(toX(x), y);
    }
    ctx.stroke();

    // hachures sous la piste
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 260; i += 4) {
      const x = xMin + ((xMax - xMin) * i) / 260;
      ctx.beginPath();
      ctx.moveTo(toX(x), toY(trackHeight(x, h1, h2)));
      ctx.lineTo(toX(x), H - 48);
      ctx.stroke();
    }

    // repère de la hauteur de départ
    ctx.strokeStyle = '#d6d3d1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, toY(releaseHeight)); ctx.lineTo(W - 40, toY(releaseHeight));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`h₀ = ${releaseHeight.toFixed(2)} m`, 44, toY(releaseHeight) - 6);

    // le bloc
    const bx = toX(state.x);
    const by = toY(height);
    const slope = trackSlope(state.x, h1, h2);
    const phi = Math.atan(slope);
    const size = 16 + Math.sqrt(mass) * 5;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-phi);
    ctx.fillStyle = C_KINETIC;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size, size, size, 3);
    ctx.fill();
    ctx.restore();

    // vecteur vitesse, tangent à la piste
    if (Math.abs(state.v) > 0.05) {
      const len = Math.min(Math.abs(state.v) * 11, 78) * Math.sign(state.v);
      const ux = Math.cos(phi) * len;
      const uy = -Math.sin(phi) * len;
      ctx.strokeStyle = '#9c8349'; ctx.fillStyle = '#9c8349'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - size / 2);
      ctx.lineTo(bx + ux, by - size / 2 + uy);
      ctx.stroke();
      const a = Math.atan2(uy, ux);
      ctx.beginPath();
      ctx.moveTo(bx + ux, by - size / 2 + uy);
      ctx.lineTo(bx + ux - 9 * Math.cos(a - Math.PI / 6), by - size / 2 + uy - 9 * Math.sin(a - Math.PI / 6));
      ctx.lineTo(bx + ux - 9 * Math.cos(a + Math.PI / 6), by - size / 2 + uy - 9 * Math.sin(a + Math.PI / 6));
      ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = '#78716c';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`h = ${height.toFixed(2)} m · v = ${Math.abs(state.v).toFixed(2)} m/s`, 14, 22);
    ctx.textAlign = 'right';
    ctx.fillText(mu === 0 ? 'piste sans frottement' : `μ = ${mu.toFixed(2)}`, W - 14, 22);
  }, [state, height, releaseHeight, mass, h1, h2, mu]);

  // ------------------------------------------- graphique des trois énergies
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const hist = historyRef.current;
    if (hist.length < 2) return;
    const pad = 26;
    const eMax = Math.max(e0, 1) * 1.08;
    const toY = (e: number) => H - pad - (e / eMax) * (H - 2 * pad);
    const toX = (i: number) => pad + (i / Math.max(hist.length - 1, 1)) * (W - 2 * pad);

    // aires empilées : cinétique, puis potentielle, puis dissipée
    const layer = (getTop: (p: typeof hist[0]) => number, getBottom: (p: typeof hist[0]) => number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      hist.forEach((p, i) => {
        const y = toY(getTop(p));
        if (i === 0) ctx.moveTo(toX(i), y); else ctx.lineTo(toX(i), y);
      });
      for (let i = hist.length - 1; i >= 0; i--) ctx.lineTo(toX(i), toY(getBottom(hist[i])));
      ctx.closePath();
      ctx.fill();
    };

    layer((p) => p.ke, () => 0, 'rgba(193, 150, 78, .75)');
    layer((p) => p.ke + p.pe, (p) => p.ke, 'rgba(109, 122, 56, .75)');
    layer((p) => p.ke + p.pe + p.diss, (p) => p.ke + p.pe, 'rgba(201, 100, 69, .7)');

    // le total, qui ne doit pas bouger
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, toY(e0));
    ctx.lineTo(W - pad, toY(e0));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#57534e';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`E totale = ${e0.toFixed(1)} J`, pad + 4, toY(e0) - 6);
    ctx.fillText('temps →', pad, H - 8);
  }, [state, e0]);

  const barRow = (label: string, value: number, color: string) => (
    <div key={label}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{label}</span>
        <span className="font-mono text-stone-900">{value.toFixed(1)} J</span>
      </div>
      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-none"
          style={{ width: `${Math.min(100, (value / Math.max(e0, 1)) * 100)}%`, background: color }} />
      </div>
    </div>
  );

  const canPass = releaseHeight > h2;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Conservation de l&apos;énergie mécanique
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Un bloc lâché sans vitesse en haut de la première colline. Sans
          frottement, l&apos;énergie passe indéfiniment d&apos;une forme à
          l&apos;autre. Avec frottement, une part se transfère dans un troisième
          bac — mais la somme des trois ne bouge jamais.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Hauteur de départ h₀</span>
              <span className="font-mono text-stone-900">{h1.toFixed(1)} m</span>
            </label>
            <input type="range" min={1} max={6} step={0.1} value={h1}
              onChange={(e) => setH1(Number(e.target.value))}
              className="w-full accent-olive-600" />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Hauteur de la 2ᵉ colline</span>
              <span className="font-mono text-stone-900">{h2.toFixed(1)} m</span>
            </label>
            <input type="range" min={0.5} max={6} step={0.1} value={h2}
              onChange={(e) => setH2(Number(e.target.value))}
              className="w-full accent-olive-600" />
            <p className="text-xs text-stone-500 mt-1">
              {canPass
                ? 'Plus basse que le départ : sans frottement, le bloc passe.'
                : 'Plus haute que le départ : le bloc ne pourra jamais passer, quelle que soit sa masse.'}
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Masse m</span>
              <span className="font-mono text-stone-900">{mass.toFixed(1)} kg</span>
            </label>
            <input type="range" min={0.5} max={8} step={0.5} value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full accent-gold-600" />
            <p className="text-xs text-stone-500 mt-1">
              Sans frottement, la masse ne change rien au mouvement : elle
              s&apos;élimine des deux côtés.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Frottement μ</span>
              <span className="font-mono text-stone-900">{mu.toFixed(2)}</span>
            </label>
            <input type="range" min={0} max={0.3} step={0.01} value={mu}
              onChange={(e) => setMu(Number(e.target.value))}
              className="w-full accent-brun-600" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-olive-600 text-white hover:bg-olive-700 transition-colors">
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
              ↺ Relâcher
            </button>
          </div>

          <div className="space-y-3 pt-2 border-t border-stone-200">
            {barRow('Énergie cinétique', ke, C_KINETIC)}
            {barRow('Énergie potentielle', pe, C_POTENTIAL)}
            {barRow('Dissipée par frottement', state.diss, C_DISSIPATED)}
            <div className="flex justify-between text-sm pt-2 border-t border-stone-200">
              <span className="font-medium text-stone-700">Somme</span>
              <span className="font-mono font-semibold text-stone-900">
                {total.toFixed(1)} J
              </span>
            </div>
            <p className="text-xs text-stone-500">
              À comparer avec l&apos;énergie de départ : {e0.toFixed(1)} J.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={sceneRef} width={720} height={390} className="w-full" />
          </div>
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Les trois énergies empilées au fil du temps — le plafond reste plat
            </div>
            <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
              <canvas ref={chartRef} width={720} height={190} className="w-full" />
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {[['Cinétique', C_KINETIC], ['Potentielle', C_POTENTIAL], ['Dissipée', C_DISSIPATED]].map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1.5 text-stone-600">
                  <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================

export function WorkEnergySimulator() {
  const [mode, setMode] = useState<'travail' | 'energie'>('travail');

  const tabs: { id: 'travail' | 'energie'; label: string }[] = [
    { id: 'travail', label: "Travail d'une force" },
    { id: 'energie', label: "Conservation de l'énergie" },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              mode === tab.id
                ? 'bg-gold-50 text-gold-800 border-b-2 border-gold-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>{mode === 'travail' ? <WorkOfAForce /> : <EnergyConservation />}</div>

      {/* Théorie */}
      <div className="border-t border-stone-200 p-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Travail et énergie
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Travail d&apos;une force</h4>
            <BlockMath math="W = \vec{F} \cdot \vec{d} = F\,d\cos\theta" />
            <p className="text-gold-700 mt-2">
              Seule la composante dans le sens du déplacement compte. Une force
              perpendiculaire ne travaille pas : c&apos;est le cas de la normale
              et de la tension d&apos;un pendule.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Force variable</h4>
            <BlockMath math="W = \int_{x_1}^{x_2} F(x)\,dx" />
            <p className="text-stone-700 mt-2">
              Le travail est l&apos;aire sous la courbe F(x). Pour une force
              constante, l&apos;aire est un rectangle — d&apos;où F·d.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Théorème de l&apos;énergie cinétique</h4>
            <BlockMath math="W_{\text{net}} = \Delta E_c = \tfrac{1}{2}mv_f^2 - \tfrac{1}{2}mv_i^2" />
            <p className="text-olive-700 mt-2">
              Le travail total de toutes les forces égale la variation
              d&apos;énergie cinétique. Toujours, quel que soit le chemin.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Forces conservatives</h4>
            <BlockMath math="E_p = mgh \qquad E_p = \tfrac{1}{2}kx^2" />
            <p className="text-ardoise-700 mt-2">
              Le poids ne dépend pas du chemin suivi : on peut lui associer une
              énergie potentielle. Le frottement, lui, dépend du chemin — aucune
              énergie potentielle n&apos;existe pour lui.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Conservation</h4>
            <BlockMath math="E_c + E_p + E_{\text{diss}} = \text{constante}" />
            <p className="text-brun-700 mt-2">
              L&apos;énergie ne disparaît pas quand il y a du frottement : elle
              change de forme, en chaleur et en déformation. C&apos;est la somme
              des trois qui se conserve.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Puissance</h4>
            <BlockMath math="P = \frac{dW}{dt} = \vec{F} \cdot \vec{v}" />
            <p className="text-prune-700 mt-2">
              Le même travail fourni deux fois plus vite demande deux fois plus
              de puissance. C&apos;est ce qui distingue un moteur d&apos;un
              autre, à énergie égale.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          Sur la piste, la force normale est prise égale à mg cos φ : on néglige
          la correction centripète liée à la courbure. C&apos;est
          l&apos;approximation habituelle, et elle n&apos;affecte que le calcul
          du frottement, pas la conservation elle-même.
        </p>
      </div>
    </div>
  );
}

export default WorkEnergySimulator;
