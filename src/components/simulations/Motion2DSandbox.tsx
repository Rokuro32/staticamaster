'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Bac à sable — mouvement accéléré en deux dimensions.
//
// Trois lois d'accélération, et une seule idée pour les relier : on décompose
// toujours l'accélération en une part tangentielle, qui change la vitesse, et
// une part normale, qui courbe la trajectoire.
//   a constante  -> parabole
//   a normale    -> cercle
//   les deux     -> spirale
//
// Les trois modes ont une forme analytique exacte. On ne fait donc aucune
// intégration numérique : la trajectoire est juste à toute date, et le curseur
// de temps peut être déplacé librement.
// ---------------------------------------------------------------------------

type Mode = 'constante' | 'normale' | 'rotation';

interface Kin {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
}

const C_VELOCITY = '#c1964e';   // or
const C_ACCEL = '#c96445';      // brun
const C_TANGENT = '#6d7a38';    // olive
const C_NORMAL = '#556884';     // ardoise
const C_PATH = '#8e6685';       // prune

interface Preset {
  id: string;
  label: string;
  note: string;
  apply: (set: Setters) => void;
}

interface Setters {
  setMode: (m: Mode) => void;
  setX0: (v: number) => void; setY0: (v: number) => void;
  setSpeed: (v: number) => void; setDir: (v: number) => void;
  setAx: (v: number) => void; setAy: (v: number) => void;
  setAn: (v: number) => void; setTurn: (v: 1 | -1) => void;
  setRadius: (v: number) => void; setOmega0: (v: number) => void; setAlpha: (v: number) => void;
  setTMax: (v: number) => void;
}

const PRESETS: Preset[] = [
  {
    id: 'chute',
    label: 'Chute libre',
    note: 'Accélération uniquement vers le bas : la vitesse horizontale ne change jamais, la verticale oui. C’est la parabole du tir balistique.',
    apply: (s) => {
      s.setMode('constante'); s.setX0(-6); s.setY0(0);
      s.setSpeed(9); s.setDir(50); s.setAx(0); s.setAy(-9.81); s.setTMax(2.4);
    },
  },
  {
    id: 'oblique',
    label: 'Accélération oblique',
    note: 'Une accélération qui a une composante en x et une en y. La trajectoire reste une parabole, mais son axe est incliné.',
    apply: (s) => {
      s.setMode('constante'); s.setX0(-6); s.setY0(-2);
      s.setSpeed(7); s.setDir(20); s.setAx(2.5); s.setAy(-6); s.setTMax(3);
    },
  },
  {
    id: 'freinage',
    label: 'Accélération alignée',
    note: 'Accélération exactement opposée à la vitesse : la trajectoire reste une droite, seule la vitesse change. Aucune composante normale, donc aucune courbure.',
    apply: (s) => {
      s.setMode('constante'); s.setX0(-7); s.setY0(0);
      s.setSpeed(10); s.setDir(0); s.setAx(-3.5); s.setAy(0); s.setTMax(5.5);
    },
  },
  {
    id: 'cercle',
    label: 'Cercle uniforme',
    note: 'Accélération toujours perpendiculaire à la vitesse. Le module de la vitesse ne bouge pas, mais sa direction tourne sans arrêt : c’est un cercle parfait.',
    apply: (s) => {
      s.setMode('normale'); s.setX0(0); s.setY0(-4);
      s.setSpeed(8); s.setDir(0); s.setAn(16); s.setTurn(1); s.setTMax(3.2);
    },
  },
  {
    id: 'spirale',
    label: 'Rotation accélérée',
    note: 'Rotation à rayon fixe avec une accélération angulaire. L’accélération a maintenant deux parts : une tangentielle qui accélère le tour, une centripète qui le maintient sur le cercle.',
    apply: (s) => {
      s.setMode('rotation'); s.setRadius(4); s.setOmega0(0.8); s.setAlpha(0.9); s.setTMax(4);
    },
  },
];

export function Motion2DSandbox() {
  const [mode, setMode] = useState<Mode>('constante');

  // conditions initiales communes aux modes « constante » et « normale »
  const [x0, setX0] = useState(-6);
  const [y0, setY0] = useState(0);
  const [speed, setSpeed] = useState(9);
  const [dir, setDir] = useState(50);        // degrés

  const [ax, setAx] = useState(0);
  const [ay, setAy] = useState(-9.81);

  const [an, setAn] = useState(16);          // accélération normale, m/s²
  const [turn, setTurn] = useState<1 | -1>(1);

  const [radius, setRadius] = useState(4);
  const [omega0, setOmega0] = useState(0.8);
  const [alpha, setAlpha] = useState(0.9);

  const [tMax, setTMax] = useState(2.4);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('chute');

  const [showPath, setShowPath] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [showOsculating, setShowOsculating] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>();

  // ------------------------------------------------------------- cinématique
  const kin = useCallback((time: number): Kin => {
    if (mode === 'constante') {
      const rad = (dir * Math.PI) / 180;
      const vx0 = speed * Math.cos(rad);
      const vy0 = speed * Math.sin(rad);
      return {
        x: x0 + vx0 * time + 0.5 * ax * time * time,
        y: y0 + vy0 * time + 0.5 * ay * time * time,
        vx: vx0 + ax * time,
        vy: vy0 + ay * time,
        ax, ay,
      };
    }

    if (mode === 'normale') {
      const rad = (dir * Math.PI) / 180;
      const vx0 = speed * Math.cos(rad);
      const vy0 = speed * Math.sin(rad);
      if (an < 1e-6 || speed < 1e-6) {
        // sans accélération normale, il ne reste qu'un mouvement rectiligne uniforme
        return { x: x0 + vx0 * time, y: y0 + vy0 * time, vx: vx0, vy: vy0, ax: 0, ay: 0 };
      }
      // Cercle exact : rayon v²/a, centre du côté vers lequel pointe l'accélération
      const R = (speed * speed) / an;
      const nx = (-vy0 / speed) * turn;
      const ny = (vx0 / speed) * turn;
      const cx = x0 + R * nx;
      const cy = y0 + R * ny;
      const phi0 = Math.atan2(y0 - cy, x0 - cx);
      const omega = (turn * speed) / R;
      const phi = phi0 + omega * time;
      return {
        x: cx + R * Math.cos(phi),
        y: cy + R * Math.sin(phi),
        vx: -R * omega * Math.sin(phi),
        vy: R * omega * Math.cos(phi),
        ax: -R * omega * omega * Math.cos(phi),
        ay: -R * omega * omega * Math.sin(phi),
      };
    }

    // rotation : rayon fixe, vitesse angulaire qui varie linéairement
    const phi = omega0 * time + 0.5 * alpha * time * time;
    const om = omega0 + alpha * time;
    return {
      x: radius * Math.cos(phi),
      y: radius * Math.sin(phi),
      vx: -radius * om * Math.sin(phi),
      vy: radius * om * Math.cos(phi),
      ax: -radius * alpha * Math.sin(phi) - radius * om * om * Math.cos(phi),
      ay: radius * alpha * Math.cos(phi) - radius * om * om * Math.sin(phi),
    };
  }, [mode, x0, y0, speed, dir, ax, ay, an, turn, radius, omega0, alpha]);

  const current = kin(t);
  const vMag = Math.hypot(current.vx, current.vy);
  const aMag = Math.hypot(current.ax, current.ay);
  // Décomposition : ce qui change le module de la vitesse, et ce qui la courbe
  const aTangential = vMag > 1e-6 ? (current.ax * current.vx + current.ay * current.vy) / vMag : 0;
  const aNormal = Math.sqrt(Math.max(0, aMag * aMag - aTangential * aTangential));
  const curvature = aNormal > 1e-6 ? (vMag * vMag) / aNormal : Infinity;

  // --------------------------------------------------------------- animation
  useEffect(() => {
    if (!running) { lastRef.current = undefined; return; }
    const tick = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;
      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.05);
        setT((prev) => (prev + dt >= tMax ? 0 : prev + dt));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, tMax]);

  // cadrage automatique sur toute la trajectoire
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const { x, y } = kin((tMax * i) / 200);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const padX = Math.max((maxX - minX) * 0.18, 1.5);
    const padY = Math.max((maxY - minY) * 0.18, 1.5);
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }, [kin, tMax]);

  // ------------------------------------------------------------------ dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    // une seule échelle pour x et y : sinon un cercle deviendrait une ellipse
    const scale = Math.min(
      W / (bounds.maxX - bounds.minX),
      H / (bounds.maxY - bounds.minY)
    );
    const cx0 = (bounds.minX + bounds.maxX) / 2;
    const cy0 = (bounds.minY + bounds.maxY) / 2;
    const toX = (x: number) => W / 2 + (x - cx0) * scale;
    const toY = (y: number) => H / 2 - (y - cy0) * scale;

    // Pas de grille : on vise des carreaux d'environ 80 px, arrondis à une
    // valeur ronde (1, 2, 5 × 10^k) pour que l'étiquette reste lisible.
    const rawStep = 80 / scale;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    const stepWorld =
      (normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10) * magnitude;
    ctx.strokeStyle = '#eae9e8';
    ctx.lineWidth = 1;
    for (let gx = Math.ceil(bounds.minX / stepWorld) * stepWorld; gx < bounds.maxX; gx += stepWorld) {
      ctx.beginPath(); ctx.moveTo(toX(gx), 0); ctx.lineTo(toX(gx), H); ctx.stroke();
    }
    for (let gy = Math.ceil(bounds.minY / stepWorld) * stepWorld; gy < bounds.maxY; gy += stepWorld) {
      ctx.beginPath(); ctx.moveTo(0, toY(gy)); ctx.lineTo(W, toY(gy)); ctx.stroke();
    }

    // axes
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0));
    ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), H);
    ctx.stroke();

    // trajectoire entière
    if (showPath) {
      ctx.strokeStyle = C_PATH;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const p = kin((tMax * i) / 400);
        if (i === 0) ctx.moveTo(toX(p.x), toY(p.y));
        else ctx.lineTo(toX(p.x), toY(p.y));
      }
      ctx.stroke();
    }

    // portion déjà parcourue, plus épaisse
    ctx.strokeStyle = 'rgba(142, 102, 133, .9)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    const steps = Math.max(2, Math.round((t / tMax) * 400));
    for (let i = 0; i <= steps; i++) {
      const p = kin((t * i) / steps);
      if (i === 0) ctx.moveTo(toX(p.x), toY(p.y));
      else ctx.lineTo(toX(p.x), toY(p.y));
    }
    ctx.stroke();

    const px = toX(current.x);
    const py = toY(current.y);

    const arrow = (dx: number, dy: number, color: string, w: number, label?: string) => {
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) return;
      const ex = px + dx;
      const ey = py - dy;
      const a = Math.atan2(-dy, dx);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
      const hs = 5 + w * 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hs * Math.cos(a - Math.PI / 6), ey - hs * Math.sin(a - Math.PI / 6));
      ctx.lineTo(ex - hs * Math.cos(a + Math.PI / 6), ey - hs * Math.sin(a + Math.PI / 6));
      ctx.closePath(); ctx.fill();
      if (label) {
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(label, ex + 5, ey - 5);
      }
    };

    // cercle osculateur : le cercle que suivrait l'objet si rien ne changeait
    if (showOsculating && Number.isFinite(curvature) && curvature < 1e4 && vMag > 1e-6) {
      const ux = current.vx / vMag;
      const uy = current.vy / vMag;
      // normale orientée du côté vers lequel l'accélération pousse
      let nx = -uy;
      let ny = ux;
      if (current.ax * nx + current.ay * ny < 0) { nx = -nx; ny = -ny; }
      const ccx = toX(current.x + curvature * nx);
      const ccy = toY(current.y + curvature * ny);
      ctx.strokeStyle = 'rgba(85, 104, 132, .45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(ccx, ccy, curvature * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(ccx, ccy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#556884';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`ρ = ${curvature.toFixed(2)} m`, (px + ccx) / 2, (py + ccy) / 2 - 6);
    }

    // décomposition de l'accélération
    if (showComponents && vMag > 1e-6 && aMag > 1e-6) {
      const ux = current.vx / vMag;
      const uy = current.vy / vMag;
      const aS = 8;
      const tx = aTangential * ux * aS;
      const ty = aTangential * uy * aS;
      arrow(tx, ty, C_TANGENT, 2.5, 'a∥');

      const nxC = current.ax - aTangential * ux;
      const nyC = current.ay - aTangential * uy;
      arrow(nxC * aS, nyC * aS, C_NORMAL, 2.5, 'a⊥');
    }

    // vitesse et accélération
    if (showVectors) {
      arrow(current.vx * 9, current.vy * 9, C_VELOCITY, 3.5, 'v');
      arrow(current.ax * 8, current.ay * 8, C_ACCEL, 3, 'a');
    }

    // l'objet
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // bandeau
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${t.toFixed(2)} s`, 12, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`1 carreau = ${stepWorld >= 1 ? stepWorld : stepWorld.toFixed(2)} m`, W - 12, 20);
  }, [t, tMax, kin, bounds, current, vMag, aMag, aTangential, curvature,
      showPath, showVectors, showComponents, showOsculating]);

  const setters: Setters = {
    setMode, setX0, setY0, setSpeed, setDir, setAx, setAy,
    setAn, setTurn, setRadius, setOmega0, setAlpha, setTMax,
  };

  const loadPreset = (p: Preset) => {
    p.apply(setters);
    setActivePreset(p.id);
    setT(0);
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'rotation') return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(
      canvas.width / (bounds.maxX - bounds.minX),
      canvas.height / (bounds.maxY - bounds.minY)
    );
    const cx0 = (bounds.minX + bounds.maxX) / 2;
    const cy0 = (bounds.minY + bounds.maxY) / 2;
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    setX0(Number((cx0 + (mx - canvas.width / 2) / scale).toFixed(2)));
    setY0(Number((cy0 - (my - canvas.height / 2) / scale).toFixed(2)));
    setT(0);
    setActivePreset(null);
  };

  const preset = PRESETS.find((p) => p.id === activePreset);
  const touched = () => setActivePreset(null);

  const slider = (
    label: string, value: number, min: number, max: number, step: number,
    set: (v: number) => void, unit: string, accent = 'accent-gold-600'
  ) => (
    <div key={label}>
      <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
        <span>{label}</span>
        <span className="font-mono text-stone-900">{value.toFixed(step < 1 ? 2 : 0)} {unit}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => { set(Number(e.target.value)); touched(); setT(0); }}
        className={`w-full ${accent}`} />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Mouvement accéléré en 2D — bac à sable
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Réglez l&apos;accélération et regardez ce qu&apos;elle fait à la
          trajectoire. La clé est la décomposition : la part parallèle à la
          vitesse change sa valeur, la part perpendiculaire la fait tourner.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => loadPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-stone-700 bg-stone-50 border-l-4 border-stone-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1.5">
              Loi d&apos;accélération
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {([
                ['constante', 'Constante (aₓ, a_y)'],
                ['normale', 'Perpendiculaire à v'],
                ['rotation', 'Rotation (ω, α)'],
              ] as [Mode, string][]).map(([id, label]) => (
                <button key={id}
                  onClick={() => { setMode(id); setT(0); touched(); }}
                  className={`py-1.5 px-3 rounded-lg text-sm font-medium text-left transition-colors ${
                    mode === id ? 'bg-prune-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode !== 'rotation' && (
            <>
              {slider('Vitesse initiale v₀', speed, 0, 20, 0.5, setSpeed, 'm/s')}
              {slider('Direction de v₀', dir, -180, 180, 5, setDir, '°')}
            </>
          )}

          {mode === 'constante' && (
            <>
              {slider('Accélération aₓ', ax, -12, 12, 0.5, setAx, 'm/s²', 'accent-brun-600')}
              {slider('Accélération a_y', ay, -12, 12, 0.5, setAy, 'm/s²', 'accent-brun-600')}
            </>
          )}

          {mode === 'normale' && (
            <>
              {slider('Accélération normale |a|', an, 0, 40, 0.5, setAn, 'm/s²', 'accent-ardoise-600')}
              <div>
                <span className="block text-sm font-medium text-stone-700 mb-1.5">Sens du virage</span>
                <div className="grid grid-cols-2 gap-2">
                  {([[1, 'À gauche'], [-1, 'À droite']] as [1 | -1, string][]).map(([v, l]) => (
                    <button key={l} onClick={() => { setTurn(v); setT(0); touched(); }}
                      className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        turn === v ? 'bg-ardoise-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Rayon du cercle : v²/a = {(an > 0 ? (speed * speed) / an : 0).toFixed(2)} m.
                Doublez la vitesse et il quadruple.
              </p>
            </>
          )}

          {mode === 'rotation' && (
            <>
              {slider('Rayon R', radius, 1, 8, 0.5, setRadius, 'm')}
              {slider('Vitesse angulaire ω₀', omega0, -3, 3, 0.1, setOmega0, 'rad/s', 'accent-ardoise-600')}
              {slider('Accélération angulaire α', alpha, -2, 2, 0.1, setAlpha, 'rad/s²', 'accent-brun-600')}
            </>
          )}

          {slider('Durée observée', tMax, 0.5, 10, 0.1, setTMax, 's', 'accent-stone-600')}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-prune-600 text-white hover:bg-prune-700 transition-colors">
              {running ? '⏸ Pause' : '▶ Lecture'}
            </button>
            <button onClick={() => { setT(0); setRunning(false); }}
              className="py-2 px-3 rounded-lg font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
              ↺ Début
            </button>
          </div>

          <div className="space-y-1.5">
            {([
              ['Trajectoire complète', showPath, setShowPath],
              ['Vecteurs v et a', showVectors, setShowVectors],
              ['Décomposition a∥ / a⊥', showComponents, setShowComponents],
              ['Cercle osculateur', showOsculating, setShowOsculating],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, value, set]) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="w-4 h-4 accent-prune-600" />
                <span className="text-sm text-stone-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Scène */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={720} height={430}
              onClick={onCanvasClick}
              className={`w-full ${mode !== 'rotation' ? 'cursor-crosshair' : ''}`} />
          </div>
          {mode !== 'rotation' && (
            <p className="text-xs text-stone-500 -mt-2">
              Cliquez dans la scène pour déplacer le point de départ.
            </p>
          )}

          <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>t = 0</span>
              <span className="font-mono">{t.toFixed(2)} s</span>
              <span>{tMax.toFixed(1)} s</span>
            </div>
            <input type="range" min={0} max={tMax} step={tMax / 400} value={t}
              onChange={(e) => { setT(Number(e.target.value)); setRunning(false); }}
              className="w-full accent-prune-600" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-stone-500 mb-1">Position et vitesse</div>
              {[
                ['Position', `(${current.x.toFixed(2)} ; ${current.y.toFixed(2)}) m`],
                ['vₓ', `${current.vx.toFixed(2)} m/s`],
                ['v_y', `${current.vy.toFixed(2)} m/s`],
                ['|v|', `${vMag.toFixed(2)} m/s`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-stone-500">{k}</span>
                  <span className="font-mono text-stone-900">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-xs text-stone-500 mb-1">Accélération, décomposée</div>
              {[
                ['|a|', `${aMag.toFixed(2)} m/s²`, 'text-stone-900'],
                ['a∥ (change |v|)', `${aTangential.toFixed(2)} m/s²`, 'text-olive-700'],
                ['a⊥ (courbe)', `${aNormal.toFixed(2)} m/s²`, 'text-ardoise-700'],
                ['Rayon de courbure ρ', Number.isFinite(curvature) && curvature < 1e4
                  ? `${curvature.toFixed(2)} m` : 'infini (droite)', 'text-stone-900'],
              ].map(([k, v, cls]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-stone-500">{k}</span>
                  <span className={`font-mono ${cls}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Accélération en deux dimensions
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">MRUA en 2D</h4>
            <BlockMath math="\vec{r}(t) = \vec{r_0} + \vec{v_0}t + \tfrac{1}{2}\vec{a}t^2" />
            <p className="text-gold-700 mt-2">
              Une équation vectorielle, donc deux équations indépendantes — une
              par axe. Chacune est un MRUA à une dimension.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Composante tangentielle</h4>
            <BlockMath math="a_\parallel = \frac{d|\vec{v}|}{dt} = \vec{a}\cdot\hat{v}" />
            <p className="text-olive-700 mt-2">
              C&apos;est la seule part qui change la valeur de la vitesse. Si
              elle est nulle, l&apos;objet garde son module quoi qu&apos;il
              arrive à sa direction.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Composante normale</h4>
            <BlockMath math="a_\perp = \frac{v^2}{\rho}" />
            <p className="text-ardoise-700 mt-2">
              Celle-ci ne change que la direction : elle courbe la trajectoire,
              avec un rayon de courbure ρ d&apos;autant plus petit qu&apos;elle
              est grande.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Le cercle comme cas limite</h4>
            <BlockMath math="a_\parallel = 0,\ a_\perp = \text{cte} \;\Rightarrow\; \rho = \frac{v^2}{a} = \text{cte}" />
            <p className="text-prune-700 mt-2">
              Une accélération constante en module et toujours perpendiculaire à
              la vitesse donne exactement un cercle. C&apos;est le mouvement
              circulaire uniforme, obtenu sans jamais parler de cercle.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Rotation accélérée</h4>
            <BlockMath math="a_\parallel = R\alpha \qquad a_\perp = R\omega^2" />
            <p className="text-brun-700 mt-2">
              À rayon fixe avec une accélération angulaire, les deux parts
              coexistent : l&apos;une accélère le tour, l&apos;autre maintient
              sur le cercle. Et comme ω grandit, la part centripète grandit en
              carré.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Cercle osculateur</h4>
            <p className="text-stone-700">
              À chaque instant, la trajectoire se confond localement avec un
              cercle de rayon ρ. Sur une parabole, ce cercle change de taille en
              permanence — il est le plus petit au sommet, là où la vitesse est
              la plus faible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Motion2DSandbox;
