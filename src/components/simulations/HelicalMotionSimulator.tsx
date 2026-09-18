'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Mouvement hélicoïdal : la rotation autour d'un axe entraîne une translation
// le long de ce même axe. Le lien entre les deux est le pas p : une révolution
// complète fait avancer d'exactement un pas.
// ---------------------------------------------------------------------------

interface Preset {
  id: string;
  label: string;
  note: string;
  radius: number; // mm
  pitch: number; // mm / tour
  rpm: number; // tr/min
  turns: number;
}

const PRESETS: Preset[] = [
  {
    id: 'vis-mere',
    label: 'Vis-mère de tour',
    note: 'Pas fin : beaucoup de tours pour une petite avance. C’est ce qui donne la précision du filetage.',
    radius: 12,
    pitch: 4,
    rpm: 60,
    turns: 5,
  },
  {
    id: 'ressort',
    label: 'Ressort hélicoïdal',
    note: 'Grand rayon, pas moyen : l’hélice est peu inclinée et les spires restent bien séparées.',
    radius: 26,
    pitch: 14,
    rpm: 40,
    turns: 6,
  },
  {
    id: 'foret',
    label: 'Foret hélicoïdal',
    note: 'Petit rayon et grand pas : l’hélice devient très raide, l’avance domine la rotation.',
    radius: 7,
    pitch: 26,
    rpm: 180,
    turns: 4,
  },
  {
    id: 'archimede',
    label: 'Vis d’Archimède',
    note: 'Gros diamètre et grand pas, tournant lentement : conçue pour déplacer du volume, pas pour la précision.',
    radius: 55,
    pitch: 110,
    rpm: 20,
    turns: 3,
  },
];

const SLOWDOWN_OPTIONS = [
  { value: 1, label: 'Temps réel' },
  { value: 0.5, label: '1/2' },
  { value: 0.2, label: '1/5' },
  { value: 0.1, label: '1/10' },
];

const COLOR_TANGENTIAL = '#2563eb';
const COLOR_AXIAL = '#16a34a';
const COLOR_TOTAL = '#f97316';
const COLOR_HELIX = '#6366f1';

/** Flèche 2D sur un canvas */
function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3,
  head = 10
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export function HelicalMotionSimulator() {
  const [radius, setRadius] = useState(20); // R, mm
  const [pitch, setPitch] = useState(15); // p, mm par tour
  const [rpm, setRpm] = useState(45); // N, tr/min
  const [turns, setTurns] = useState(5); // spires affichées
  const [clockwise, setClockwise] = useState(true); // sens de rotation
  const [slowdown, setSlowdown] = useState(0.5);
  const [running, setRunning] = useState(true);
  const [showVelocities, setShowVelocities] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Angle parcouru depuis le départ, en radians (signé)
  const [theta, setTheta] = useState(0);

  const helixCanvasRef = useRef<HTMLCanvasElement>(null);
  const unrolledCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // ----------------------------------------------------------------- Physique
  const sign = clockwise ? 1 : -1;
  const omega = (2 * Math.PI * rpm) / 60; // rad/s
  const vTangential = omega * radius; // mm/s
  const vAxial = (pitch * rpm) / 60; // mm/s
  const vTotal = Math.sqrt(vTangential ** 2 + vAxial ** 2);
  // Angle d'hélice, mesuré depuis le plan de rotation
  const helixAngle = (Math.atan2(pitch, 2 * Math.PI * radius) * 180) / Math.PI;
  const turnLength = Math.sqrt((2 * Math.PI * radius) ** 2 + pitch ** 2); // mm par spire

  const totalAngle = turns * 2 * Math.PI; // course affichée
  const progress = totalAngle > 0 ? Math.abs(theta) / totalAngle : 0;
  const turnsDone = Math.abs(theta) / (2 * Math.PI);
  const advance = (pitch / (2 * Math.PI)) * theta; // mm, signé
  const pathLength = (turnLength / (2 * Math.PI)) * Math.abs(theta); // mm

  const reset = useCallback(() => {
    setTheta(0);
    lastTimeRef.current = undefined;
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setRadius(preset.radius);
    setPitch(preset.pitch);
    setRpm(preset.rpm);
    setTurns(preset.turns);
    setActivePreset(preset.id);
    setTheta(0);
    lastTimeRef.current = undefined;
  }, []);

  // ---------------------------------------------------------------- Animation
  useEffect(() => {
    if (!running) {
      lastTimeRef.current = undefined;
      return;
    }

    const tick = (now: number) => {
      const last = lastTimeRef.current;
      lastTimeRef.current = now;

      if (last !== undefined) {
        const dt = Math.min((now - last) / 1000, 0.05); // s, borné si l'onglet a dormi
        const dTheta = sign * omega * slowdown * dt;
        setTheta((prev) => {
          const next = prev + dTheta;
          // On boucle sur la course affichée pour rester dans le cadre
          if (next > totalAngle) return next - totalAngle;
          if (next < -totalAngle) return next + totalAngle;
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, omega, sign, slowdown, totalAngle]);

  // ------------------------------------------------------- Dessin de l'hélice
  useEffect(() => {
    const canvas = helixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const marginL = 70;
    const marginR = 60;
    const usableW = W - marginL - marginR;
    const originY = H / 2;

    const span = turns * pitch; // course axiale totale (mm)
    // Échelle radiale : le rayon doit tenir en hauteur
    const rScale = Math.min((H / 2 - 56) / Math.max(radius, 1), 4.2);
    // Échelle axiale : la course doit tenir en largeur
    const zScale = span > 0.001 ? usableW / span : 0;
    const DEPTH = 0.32; // aplatissement de la profondeur (rendu axonométrique)

    const project = (th: number, z: number) => ({
      x: marginL + z * zScale + Math.cos(th) * radius * rScale * DEPTH,
      y: originY - Math.sin(th) * radius * rScale,
      depth: Math.cos(th),
    });

    const rPix = radius * rScale;

    // --- Enveloppe du cylindre
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(marginL - rPix * DEPTH, originY - rPix);
    ctx.lineTo(marginL + span * zScale + rPix * DEPTH, originY - rPix);
    ctx.moveTo(marginL - rPix * DEPTH, originY + rPix);
    ctx.lineTo(marginL + span * zScale + rPix * DEPTH, originY + rPix);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Hélice : segments arrière d'abord, puis l'axe, puis les segments avant
    const STEPS = Math.max(240, turns * 90);
    const back: [number, number, number, number][] = [];
    const front: [number, number, number, number][] = [];

    for (let i = 0; i < STEPS; i++) {
      const t0 = (i / STEPS) * totalAngle;
      const t1 = ((i + 1) / STEPS) * totalAngle;
      const p0 = project(t0, (pitch / (2 * Math.PI)) * t0);
      const p1 = project(t1, (pitch / (2 * Math.PI)) * t1);
      const seg: [number, number, number, number] = [p0.x, p0.y, p1.x, p1.y];
      if ((p0.depth + p1.depth) / 2 < 0) back.push(seg);
      else front.push(seg);
    }

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = COLOR_HELIX;
    ctx.beginPath();
    back.forEach(([x0, y0, x1, y1]) => {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    });
    ctx.stroke();
    ctx.restore();

    // Axe de rotation
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.moveTo(marginL - 45, originY);
    ctx.lineTo(marginL + span * zScale + 45, originY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('axe de rotation', marginL + span * zScale + 45, originY - 9);

    ctx.strokeStyle = COLOR_HELIX;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    front.forEach(([x0, y0, x1, y1]) => {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    });
    ctx.stroke();

    // --- Cotation du pas, sur la première spire
    if (span > 0.001) {
      const yPitch = originY + rPix + 26;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(marginL, yPitch - 6);
      ctx.lineTo(marginL, yPitch + 6);
      ctx.moveTo(marginL + pitch * zScale, yPitch - 6);
      ctx.lineTo(marginL + pitch * zScale, yPitch + 6);
      ctx.stroke();
      arrow(ctx, marginL, yPitch, marginL + pitch * zScale, yPitch, '#0f172a', 1.2, 7);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(
        `pas p = ${pitch.toFixed(0)} mm`,
        marginL + (pitch * zScale) / 2,
        yPitch + 20
      );
    }

    // --- Point mobile
    const current = project(theta, advance);
    const inFront = current.depth >= 0;

    ctx.save();
    ctx.globalAlpha = inFront ? 1 : 0.45;

    // Rayon reliant l'axe au point : rend la rotation lisible
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginL + advance * zScale, originY);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    if (showVelocities && vTotal > 0.01) {
      // Tangente à l'hélice au point courant (dérivée de la paramétrisation)
      const dTh = 0.001;
      const ahead = project(theta + sign * dTh, advance + (pitch / (2 * Math.PI)) * sign * dTh);
      const tx = ahead.x - current.x;
      const ty = ahead.y - current.y;
      const norm = Math.hypot(tx, ty) || 1;
      const len = 54;
      arrow(ctx, current.x, current.y, current.x + (tx / norm) * len, current.y + (ty / norm) * len, COLOR_TOTAL, 3, 10);
      ctx.fillStyle = COLOR_TOTAL;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('v', current.x + (tx / norm) * len + 6, current.y + (ty / norm) * len + 4);
    }

    ctx.fillStyle = COLOR_TOTAL;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(current.x, current.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // --- Repère de l'avance sur l'axe
    ctx.fillStyle = COLOR_AXIAL;
    ctx.beginPath();
    ctx.arc(marginL + advance * zScale, originY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${turns} spires · rayon R = ${radius} mm`, 12, 20);
    ctx.textAlign = 'right';
    ctx.fillText(
      pitch === 0 ? 'p = 0 : rotation pure, aucune translation' : `avance = ${advance.toFixed(1)} mm`,
      W - 12,
      20
    );
  }, [radius, pitch, turns, theta, advance, totalAngle, showVelocities, vTotal, sign]);

  // ---------------------------------------- Dessin du développement de l'hélice
  useEffect(() => {
    const canvas = unrolledCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const padL = 56;
    const padR = 30;
    const padB = 46;
    const padT = 26;
    const boxW = W - padL - padR;
    const boxH = H - padT - padB;

    const base = 2 * Math.PI * radius; // circonférence, mm
    const height = pitch; // pas, mm

    // Une seule échelle pour les deux côtés : le triangle reste semblable au vrai
    const s = Math.min(boxW / Math.max(base, 0.001), boxH / Math.max(height, 0.001));
    const triH = height * s;
    const bx = padL;
    // Le triangle est très plat quand p << 2piR : on le centre plutôt que de
    // le coller en bas, sinon la moitié du cadre reste vide.
    const by = padT + (boxH + triH) / 2;
    const tx = bx + base * s;
    const ty = by - triH;

    // Triangle rectangle
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, by);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();

    // Côté horizontal : ce que parcourt la rotation
    arrow(ctx, bx, by, tx, by, COLOR_TANGENTIAL, 2.5, 9);
    // Côté vertical : ce que parcourt la translation
    arrow(ctx, tx, by, tx, ty, COLOR_AXIAL, 2.5, 9);
    // Hypoténuse : le chemin réellement suivi
    arrow(ctx, bx, by, tx, ty, COLOR_TOTAL, 2.5, 10);

    // Angle d'hélice
    if (base > 0.001) {
      ctx.strokeStyle = COLOR_TOTAL;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 30, -Math.atan2(height * s, base * s), 0);
      ctx.stroke();
      ctx.fillStyle = COLOR_TOTAL;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`λ = ${helixAngle.toFixed(1)}°`, bx + 36, by - 12);
    }

    // Marqueur de progression sur la spire en cours
    const frac = (Math.abs(theta) % (2 * Math.PI)) / (2 * Math.PI);
    const mx = bx + (tx - bx) * frac;
    const my = by + (ty - by) * frac;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, by);
    ctx.moveTo(mx, my);
    ctx.lineTo(bx, my);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLOR_TOTAL;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Étiquettes
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_TANGENTIAL;
    ctx.fillText(`2πR = ${base.toFixed(1)} mm`, (bx + tx) / 2, by + 20);
    ctx.fillStyle = COLOR_AXIAL;
    const pitchLabel = `p = ${pitch.toFixed(1)} mm`;
    const fitsRight = tx + 8 + ctx.measureText(pitchLabel).width < W - 4;
    ctx.textAlign = fitsRight ? 'left' : 'right';
    ctx.fillText(pitchLabel, fitsRight ? tx + 8 : tx - 8, (by + ty) / 2 - 4);
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui';
    ctx.fillText('Une spire, déroulée à plat', 12, 18);
    ctx.fillStyle = COLOR_TOTAL;
    ctx.fillText(`L = ${turnLength.toFixed(1)} mm`, 12, H - 12);
  }, [radius, pitch, theta, helixAngle, turnLength]);

  const preset = PRESETS.find((p) => p.id === activePreset);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Mouvement hélicoïdal</h3>
        <p className="text-sm text-gray-600 mt-1">
          Une rotation autour d&apos;un axe qui entraîne une translation le long
          de ce même axe. Un tour complet fait avancer d&apos;exactement un pas.
        </p>
      </div>

      {/* Préréglages */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset && (
        <p className="text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-4 py-2 -mt-2">
          {preset.note}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Rayon R</span>
              <span className="font-mono text-gray-900">{radius} mm</span>
            </label>
            <input
              type="range"
              min={2}
              max={120}
              step={1}
              value={radius}
              onChange={(e) => {
                setRadius(Number(e.target.value));
                setActivePreset(null);
              }}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Pas p</span>
              <span className="font-mono text-gray-900">{pitch} mm/tour</span>
            </label>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={pitch}
              onChange={(e) => {
                setPitch(Number(e.target.value));
                setActivePreset(null);
              }}
              className="w-full accent-green-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              À p = 0, il ne reste que la rotation : le point décrit un cercle.
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Vitesse de rotation N</span>
              <span className="font-mono text-gray-900">{rpm} tr/min</span>
            </label>
            <input
              type="range"
              min={0}
              max={300}
              step={5}
              value={rpm}
              onChange={(e) => {
                setRpm(Number(e.target.value));
                setActivePreset(null);
              }}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Spires affichées</span>
              <span className="font-mono text-gray-900">{turns}</span>
            </label>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={turns}
              onChange={(e) => {
                setTurns(Number(e.target.value));
                setActivePreset(null);
              }}
              className="w-full accent-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="py-2 px-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {running ? '⏸ Pause' : '▶ Animer'}
            </button>
            <button
              onClick={reset}
              className="py-2 px-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              ↺ Réinitialiser
            </button>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Sens</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setClockwise(true)}
                className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  clockwise ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vissage
              </button>
              <button
                onClick={() => setClockwise(false)}
                className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  !clockwise ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dévissage
              </button>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
              Vitesse d&apos;affichage
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {SLOWDOWN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSlowdown(opt.value)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    slowdown === opt.value
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ne change que l&apos;animation. Les valeurs affichées restent celles
              à {rpm} tr/min.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showVelocities}
              onChange={(e) => setShowVelocities(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-700">Afficher la vitesse</span>
          </label>
        </div>

        {/* Vues */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <canvas ref={helixCanvasRef} width={700} height={380} className="w-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <canvas ref={unrolledCanvasRef} width={420} height={260} className="w-full" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-baseline">
                <span className="text-blue-800">Vitesse tangentielle <InlineMath math="v_t = \omega R" /></span>
                <strong className="text-blue-900 font-mono">{vTangential.toFixed(1)} mm/s</strong>
              </div>
              <div className="bg-green-50 rounded-lg p-3 flex justify-between items-baseline">
                <span className="text-green-800">Vitesse axiale <InlineMath math="v_a = p\,N" /></span>
                <strong className="text-green-900 font-mono">{vAxial.toFixed(1)} mm/s</strong>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 flex justify-between items-baseline">
                <span className="text-orange-800">Vitesse réelle <InlineMath math="v" /></span>
                <strong className="text-orange-900 font-mono">{vTotal.toFixed(1)} mm/s</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 block text-xs">Angle d&apos;hélice λ</span>
                  <strong className="text-gray-900 font-mono">{helixAngle.toFixed(1)}°</strong>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 block text-xs">ω</span>
                  <strong className="text-gray-900 font-mono">{omega.toFixed(2)} rad/s</strong>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 block text-xs">Tours effectués</span>
                  <strong className="text-gray-900 font-mono">{turnsDone.toFixed(2)}</strong>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 block text-xs">Chemin parcouru</span>
                  <strong className="text-gray-900 font-mono">{pathLength.toFixed(1)} mm</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Progression */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Départ</span>
              <span>{(progress * 100).toFixed(0)} % de la course affichée</span>
              <span>{turns} spires</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-none"
                style={{ width: `${Math.min(progress, 1) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Théorie — Mouvement hélicoïdal</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-medium text-indigo-800 mb-2">Paramétrage</h4>
            <BlockMath math="x = R\cos\theta,\quad y = R\sin\theta,\quad z = \frac{p}{2\pi}\theta" />
            <p className="text-indigo-700 mt-2">
              La rotation et la translation avancent ensemble : c&apos;est le pas
              <InlineMath math="\,p\," /> qui les lie.
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Les deux vitesses</h4>
            <BlockMath math="v_t = \omega R \qquad v_a = \frac{p\,N}{60}" />
            <p className="text-blue-700 mt-2">
              L&apos;une contourne l&apos;axe, l&apos;autre le suit. Elles sont
              perpendiculaires.
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Vitesse réelle</h4>
            <BlockMath math="v = \sqrt{v_t^{\,2} + v_a^{\,2}}" />
            <p className="text-orange-700 mt-2">
              Les deux vitesses étant perpendiculaires, elles s&apos;additionnent
              comme les côtés d&apos;un triangle rectangle.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Angle d&apos;hélice</h4>
            <BlockMath math="\tan\lambda = \frac{p}{2\pi R}" />
            <p className="text-green-700 mt-2">
              Petit λ : hélice presque plate, on tourne beaucoup pour avancer peu.
              Grand λ : hélice raide.
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">Longueur d&apos;une spire</h4>
            <BlockMath math="L = \sqrt{(2\pi R)^2 + p^2}" />
            <p className="text-purple-700 mt-2">
              C&apos;est l&apos;hypoténuse du triangle obtenu en déroulant une
              spire à plat.
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">Où on le rencontre</h4>
            <p className="text-amber-700">
              Vis et écrous, vis-mère d&apos;un tour, forets, ressorts
              hélicoïdaux, vis d&apos;Archimède, extrudeuses à vis. Chaque fois
              qu&apos;on veut convertir une rotation en avance contrôlée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelicalMotionSimulator;
