'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import {
  DEG,
  LEADS,
  beatMarks,
  cardiacVector,
  electricalAxis,
  leadById,
  leadExtremes,
  leadVoltage,
  normalTiming,
} from '@/lib/ecg';
import type { Timing, Vec } from '@/lib/ecg';

// ---------------------------------------------------------------------------
// Électrocardiogramme
//
// Le modèle — un seul vecteur cardiaque dont chaque dérivation est la
// projection — vit dans src/lib/ecg.ts, séparé du rendu pour rester
// vérifiable seul. Ce fichier ne fait que le dessiner.
// ---------------------------------------------------------------------------

type Mode = 'trace' | 'vecteur' | 'derivations' | 'conduction';

const MODE_LABELS: Record<Mode, string> = {
  trace: 'Tracé et mesures',
  vecteur: 'Vecteur cardiaque',
  derivations: 'Les six dérivations',
  conduction: 'Conduction et troubles',
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  trace:
    "Le tracé sur du vrai papier ECG : un petit carreau vaut 40 ms en largeur et 0,1 mV en hauteur. Les intervalles sont mesurés sur le battement lui-même, pas approchés — vous pouvez les recompter sur les carreaux.",
  vecteur:
    "Le myocarde qui se dépolarise se comporte comme un dipôle électrique. Son vecteur tourne et change de module au cours du cycle ; la trajectoire de sa pointe est la boucle vectorielle, dont l'ECG n'est qu'une ombre projetée.",
  derivations:
    "Les six dérivations du plan frontal, toutes issues du même vecteur par projection. Comme les axes I, II et III forment le triangle d'Einthoven, la relation II = I + III est une identité géométrique — le contrôle en bas la vérifie à chaque instant.",
  conduction:
    "Le trajet de l'influx, du nœud sinusal aux fibres de Purkinje. Chaque trouble est obtenu en modifiant le trajet et non le dessin du tracé : c'est le mécanisme qui déforme l'ECG, pas l'inverse.",
};

// ─── Palette ────────────────────────────────────────────────────────────────

const C = {
  paper: '#fdfaf4',
  gridSmall: 'rgba(168, 116, 74, 0.22)',
  gridLarge: 'rgba(168, 116, 74, 0.48)',
  trace: '#42301b',
  ink: '#463f36',
  muted: '#8a8179',
  p: '#b08128',
  qrs: '#b1522f',
  t: '#8d5570',
  vector: '#5f6f2a',
  accent: '#8a6a24',
  silent: '#a9a19a',
};

// ─── Papier ECG ─────────────────────────────────────────────────────────────

const PX_PER_MM = 8; // un petit carreau
const MM_PER_MV = 10; // étalonnage standard : 10 mm = 1 mV

function drawPaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = C.gridSmall;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let gx = 0; gx <= w; gx += PX_PER_MM) {
    ctx.moveTo(x + gx, y);
    ctx.lineTo(x + gx, y + h);
  }
  for (let gy = 0; gy <= h; gy += PX_PER_MM) {
    ctx.moveTo(x, y + gy);
    ctx.lineTo(x + w, y + gy);
  }
  ctx.stroke();

  ctx.strokeStyle = C.gridLarge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = 0; gx <= w; gx += PX_PER_MM * 5) {
    ctx.moveTo(x + gx, y);
    ctx.lineTo(x + gx, y + h);
  }
  for (let gy = 0; gy <= h; gy += PX_PER_MM * 5) {
    ctx.moveTo(x, y + gy);
    ctx.lineTo(x + w, y + gy);
  }
  ctx.stroke();
}

/**
 * Fond neutre, pour les vues dont l'échelle n'est ni 25 mm/s ni 10 mm/mV.
 * Y dessiner du papier millimétré laisserait croire qu'on peut y mesurer.
 */
function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseY: number
) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(168,116,74,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(70,63,54,0.22)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Le signal d'étalonnage imprimé en tête de tout ECG : 1 mV, 200 ms */
function drawCalibration(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  const h = MM_PER_MV * PX_PER_MM;
  const w = 5 * PX_PER_MM;
  ctx.strokeStyle = C.trace;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + PX_PER_MM, baseY);
  ctx.lineTo(x + PX_PER_MM, baseY - h);
  ctx.lineTo(x + PX_PER_MM + w, baseY - h);
  ctx.lineTo(x + PX_PER_MM + w, baseY);
  ctx.lineTo(x + 2 * PX_PER_MM + w, baseY);
  ctx.stroke();
}

// ─── Onglet 1 — Tracé et mesures ────────────────────────────────────────────

function TraceMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [bpm, setBpm] = useState(72);
  const [leadId, setLeadId] = useState('II');
  const [annotate, setAnnotate] = useState(true);

  const tm = useMemo(() => normalTiming(bpm), [bpm]);
  const marks = useMemo(() => beatMarks(tm), [tm]);
  const lead = leadById(leadId);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 56, r: 16, t: 34, b: 30 };
    const gW = W - pad.l - pad.r;
    const gH = H - pad.t - pad.b;
    const base = pad.t + gH * 0.62; // ligne isoélectrique

    drawPaper(ctx, pad.l, pad.t, gW, gH);

    const pxPerS = 25 * PX_PER_MM; // 25 mm/s
    const pxPerMv = MM_PER_MV * PX_PER_MM;
    const windowS = gW / pxPerS;
    const tNow = tRef.current;
    const tStart = tNow - windowS;

    // --- axe des tensions
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let mv = -1; mv <= 2; mv += 0.5) {
      const y = base - mv * pxPerMv;
      if (y > pad.t + 6 && y < pad.t + gH - 4) {
        ctx.fillText(mv.toFixed(1), pad.l - 8, y + 4);
      }
    }
    ctx.save();
    ctx.translate(16, pad.t + gH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.ink;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('mV', 0, 0);
    ctx.restore();

    // --- ligne isoélectrique
    ctx.strokeStyle = 'rgba(70,63,54,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pad.l, base);
    ctx.lineTo(pad.l + gW, base);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, gW, gH);
    ctx.clip();

    const toX = (tAbs: number) => pad.l + (tAbs - tStart) * pxPerS;

    // --- le tracé, échantillonné au pixel près
    ctx.beginPath();
    ctx.strokeStyle = C.trace;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    for (let px = 0; px <= gW; px++) {
      const tAbs = tStart + px / pxPerS;
      if (tAbs < 0) continue;
      const inBeat = ((tAbs % tm.rr) + tm.rr) % tm.rr;
      const v = leadVoltage(cardiacVector(inBeat, tm), lead);
      const x = pad.l + px;
      const y = base - v * pxPerMv;
      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // --- annotations, ancrées sur les battements eux-mêmes
    if (annotate) {
      const firstBeat = Math.floor(tStart / tm.rr);
      const lastBeat = Math.ceil(tNow / tm.rr);

      for (let n = firstBeat; n <= lastBeat; n++) {
        const t0 = n * tm.rr;
        if (t0 < 0) continue;

        const label = (name: string, tAbs: number, color: string) => {
          const x = toX(tAbs);
          if (x < pad.l + 4 || x > pad.l + gW - 4) return;
          const v = leadVoltage(cardiacVector(tAbs - t0, tm), lead);
          const yWave = base - v * pxPerMv;
          const up = v >= 0;
          const yLab = up ? yWave - 14 : yWave + 20;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, yWave + (up ? -3 : 3));
          ctx.lineTo(x, yLab + (up ? 4 : -10));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = color;
          ctx.font = 'bold 12px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, yLab);
        };

        if (tm.pPresent) label('P', t0 + marks.pPeak, C.p);
        label('QRS', t0 + marks.rPeak, C.qrs);
        label('T', t0 + marks.tPeak, C.t);

        // --- règles d'intervalles, tracées sur le battement mesuré
        const bar = (
          name: string,
          ta: number,
          tb: number,
          yOff: number,
          color: string
        ) => {
          const xa = toX(t0 + ta);
          const xb = toX(t0 + tb);
          if (xb < pad.l || xa > pad.l + gW) return;
          const y = pad.t + gH - yOff;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(xa, y - 4);
          ctx.lineTo(xa, y + 4);
          ctx.moveTo(xa, y);
          ctx.lineTo(xb, y);
          ctx.moveTo(xb, y - 4);
          ctx.lineTo(xb, y + 4);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${name} ${Math.round((tb - ta) * 1000)} ms`,
            (xa + xb) / 2,
            y - 7
          );
        };

        bar('PR', marks.pStart, marks.qrsStart, 46, C.p);
        bar('QRS', marks.qrsStart, marks.qrsEnd, 26, C.qrs);
        bar('QT', marks.qrsStart, marks.tEnd, 8, C.t);
      }
    }

    ctx.restore();

    // --- étalonnage et titre
    if (tStart < 0) drawCalibration(ctx, pad.l + 6, base);

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Dérivation ${lead.id}`, pad.l, 20);
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('25 mm/s · 10 mm/mV', pad.l + gW, 20);
    ctx.textAlign = 'center';
    ctx.fillText(
      'un petit carreau = 40 ms × 0,1 mV',
      pad.l + gW / 2,
      H - 10
    );
  }, [tm, marks, lead, annotate]);

  useEffect(() => {
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;
      if (playing) tRef.current += dt;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw]);

  const amp = useMemo(() => leadExtremes(tm, lead), [tm, lead]);

  const qtc = tm.qt / Math.sqrt(tm.rr);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={900}
        height={330}
        className="w-full max-w-[900px] mx-auto rounded-lg border border-stone-200"
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Fréquence cardiaque
          </label>
          <input
            type="range"
            min={35}
            max={180}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(+e.target.value)}
            className="w-44"
          />
          <span className="ml-2 text-sm font-mono text-stone-600">{bpm} /min</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Dérivation
          </label>
          <select
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="border border-stone-300 rounded px-2 py-1 text-sm bg-white"
          >
            {LEADS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} — {l.hint}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setPlaying(!playing)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors"
        >
          {playing ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={annotate}
            onChange={(e) => setAnnotate(e.target.checked)}
          />
          Annotations et règles
        </label>
      </div>

      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {([
              ['Intervalle RR', `${Math.round(tm.rr * 1000)} ms`, 'un grand carreau = 200 ms'],
              ['Intervalle PR', `${Math.round(tm.pr * 1000)} ms`, 'normal de 120 à 200 ms — contient le délai nodal'],
              ['Durée du QRS', `${Math.round(tm.qrsDur * 1000)} ms`, 'normal sous 120 ms, et indépendant de la fréquence'],
              ['Intervalle QT', `${Math.round(tm.qt * 1000)} ms`, 'raccourcit quand le cœur accélère'],
              ['QT corrigé (Bazett)', `${Math.round(qtc * 1000)} ms`, 'QTc = QT / √RR — c’est lui qui reste constant'],
              [`Amplitude R en ${lead.id}`, `${amp.max.toFixed(2)} mV`, 'projection du vecteur principal sur cet axe'],
              [`Amplitude S en ${lead.id}`, `${amp.min.toFixed(2)} mV`, 'négative : le vecteur basal fuit l’électrode'],
            ] as [string, string, string][]).map(([k, v, note], i) => (
              <tr key={k} className={i % 2 ? 'bg-stone-50/60' : ''}>
                <td className="px-4 py-1.5 text-stone-700">{k}</td>
                <td className="px-4 py-1.5 font-mono text-stone-900 text-right whitespace-nowrap">
                  {v}
                </td>
                <td className="px-4 py-1.5 text-xs text-stone-500">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-stone-500">
        Changez de dérivation sans rien changer d&apos;autre : le cœur fait
        exactement la même chose, seule la projection change. En aVR, qui regarde
        le cœur depuis l&apos;épaule droite, le complexe se retourne — le vecteur
        principal s&apos;éloigne de l&apos;électrode.
      </p>
    </div>
  );
}

// ─── Onglet 2 — Vecteur cardiaque et boucle ─────────────────────────────────

function VectorMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [bpm, setBpm] = useState(60);
  const [slow, setSlow] = useState(4);
  const [showLoop, setShowLoop] = useState(true);
  const [leadId, setLeadId] = useState('II');

  const tm = useMemo(() => normalTiming(bpm), [bpm]);
  const lead = leadById(leadId);

  /** La boucle vectorielle, échantillonnée une fois par battement */
  const loop = useMemo(() => {
    const pts: { t: number; v: Vec }[] = [];
    const N = 900;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * tm.rr;
      pts.push({ t, v: cardiacVector(t, tm) });
    }
    return pts;
  }, [tm]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const inBeat = ((tRef.current % tm.rr) + tm.rr) % tm.rr;
    const d = cardiacVector(inBeat, tm);
    const marks = beatMarks(tm);

    // ── partie gauche : le plan frontal
    const cx = W * 0.27;
    const cy = H * 0.5;
    const scale = 62; // px par mV

    // torse schématique
    ctx.strokeStyle = 'rgba(70,63,54,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 128, 138, 0, 0, Math.PI * 2);
    ctx.stroke();

    // axes de référence
    ctx.strokeStyle = 'rgba(70,63,54,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 128, cy);
    ctx.lineTo(cx + 128, cy);
    ctx.moveTo(cx, cy - 138);
    ctx.lineTo(cx, cy + 138);
    ctx.stroke();

    ctx.fillStyle = C.muted;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0°', cx + 140, cy + 4);
    ctx.fillText('+90°', cx, cy + 152);
    ctx.fillText('−90°', cx, cy - 144);

    // axe de la dérivation choisie
    // L'axe de la dérivation, tracé en entier. Dans la convention frontale
    // +90° pointe vers les pieds : le repère clinique a donc déjà son y vers le
    // bas, exactement comme le canevas. Aucun changement de signe.
    const ax = Math.cos(lead.angle * DEG);
    const ay = Math.sin(lead.angle * DEG);
    const onAxis = (len: number) => ({ x: cx + ax * len, y: cy + ay * len });
    const a1 = onAxis(-132);
    const a2 = onAxis(132);
    ctx.strokeStyle = 'rgba(138,106,36,0.55)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const lab = onAxis(146);
    ctx.fillStyle = C.accent;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText(lead.id, lab.x, lab.y + 4);

    // la boucle vectorielle
    if (showLoop) {
      const seg = (from: number, to: number, color: string, width: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        let started = false;
        for (let i = 0; i < loop.length; i++) {
          const pt = loop[i];
          if (pt.t < from || pt.t > to) continue;
          const x = cx + pt.v.x * scale;
          const y = cy + pt.v.y * scale;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      seg(marks.pStart, marks.pEnd, C.p, 2);
      seg(marks.qrsStart, marks.qrsEnd, C.qrs, 2.4);
      seg(marks.tStart, marks.tEnd, C.t, 2);
    }

    // le vecteur instantané
    const vx = d.x * scale;
    const vy = d.y * scale;
    const mag = Math.sqrt(d.x * d.x + d.y * d.y);
    if (mag > 0.005) {
      ctx.strokeStyle = C.vector;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + vx, cy + vy);
      ctx.stroke();

      const a = Math.atan2(vy, vx);
      ctx.beginPath();
      ctx.moveTo(cx + vx, cy + vy);
      ctx.lineTo(cx + vx - 11 * Math.cos(a - 0.4), cy + vy - 11 * Math.sin(a - 0.4));
      ctx.moveTo(cx + vx, cy + vy);
      ctx.lineTo(cx + vx - 11 * Math.cos(a + 0.4), cy + vy - 11 * Math.sin(a + 0.4));
      ctx.stroke();

      // la projection : c'est elle que l'électrode mesure
      const proj = leadVoltage(d, lead);
      const foot = onAxis(proj * scale);
      const px = foot.x;
      const py = foot.y;
      ctx.strokeStyle = 'rgba(138,106,36,0.75)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx + vx, cy + vy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Plan frontal', cx, 20);

    // ── partie droite : le tracé de la dérivation, synchronisé
    const px0 = W * 0.54;
    const pw = W - px0 - 24;
    const ph = H - 88;
    const py0 = 44;
    const baseY = py0 + ph * 0.6;
    const mvScale = ph * 0.22;
    drawPanel(ctx, px0, py0, pw, ph, baseY);

    ctx.beginPath();
    ctx.strokeStyle = C.trace;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < loop.length; i++) {
      const v = leadVoltage(loop[i].v, lead);
      const x = px0 + (loop[i].t / tm.rr) * pw;
      const y = baseY - v * mvScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // curseur
    const curX = px0 + (inBeat / tm.rr) * pw;
    ctx.strokeStyle = C.vector;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(curX, py0);
    ctx.lineTo(curX, py0 + ph);
    ctx.stroke();

    const curV = leadVoltage(d, lead);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(curX, baseY - curV * mvScale, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Dérivation ${lead.id} — la projection`, px0 + pw / 2, 24);

    // phase courante
    let phase = 'Diastole — silence électrique';
    let phaseColor = C.silent;
    if (inBeat >= marks.pStart && inBeat < marks.pEnd) {
      phase = 'Onde P — dépolarisation des oreillettes';
      phaseColor = C.p;
    } else if (inBeat >= marks.pEnd && inBeat < marks.qrsStart) {
      phase = 'Délai du nœud AV — rien ne se voit, et c’est le but';
      phaseColor = C.silent;
    } else if (inBeat >= marks.qrsStart && inBeat < marks.qrsEnd) {
      phase = 'QRS — dépolarisation des ventricules';
      phaseColor = C.qrs;
    } else if (inBeat >= marks.qrsEnd && inBeat < marks.tStart) {
      phase = 'Segment ST — plateau du potentiel d’action';
      phaseColor = C.silent;
    } else if (inBeat >= marks.tStart && inBeat < marks.tEnd) {
      phase = 'Onde T — repolarisation des ventricules';
      phaseColor = C.t;
    }

    ctx.fillStyle = phaseColor;
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(phase, W / 2, H - 14);
  }, [tm, loop, lead, showLoop]);

  useEffect(() => {
    lastRef.current = performance.now();
    const loopFn = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;
      if (playing) tRef.current += dt / slow;
      draw();
      rafRef.current = requestAnimationFrame(loopFn);
    };
    rafRef.current = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, slow, draw]);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={900}
        height={380}
        className="w-full max-w-[900px] mx-auto rounded-lg border border-stone-200"
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Ralenti
          </label>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={slow}
            onChange={(e) => setSlow(+e.target.value)}
            className="w-36"
          />
          <span className="ml-2 text-sm font-mono text-stone-600">×{slow}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Dérivation projetée
          </label>
          <select
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="border border-stone-300 rounded px-2 py-1 text-sm bg-white"
          >
            {LEADS.filter((l) => !l.augmented).map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Fréquence
          </label>
          <input
            type="range"
            min={40}
            max={120}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(+e.target.value)}
            className="w-36"
          />
          <span className="ml-2 text-sm font-mono text-stone-600">{bpm} /min</span>
        </div>
        <button
          onClick={() => setPlaying(!playing)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors"
        >
          {playing ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={showLoop}
            onChange={(e) => setShowLoop(e.target.checked)}
          />
          Boucle vectorielle
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-stone-200 p-3">
          <span className="font-semibold" style={{ color: C.p }}>
            Boucle P
          </span>
          <p className="text-stone-600 mt-1">
            Petite et lente : la masse des oreillettes est faible, donc le dipôle
            qu&apos;elles produisent l&apos;est aussi.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <span className="font-semibold" style={{ color: C.qrs }}>
            Boucle QRS
          </span>
          <p className="text-stone-600 mt-1">
            La grande boucle. Elle part à contre-sens — le septum se dépolarise
            de gauche à droite — puis balaie vers le bas et la gauche avec la
            masse ventriculaire.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <span className="font-semibold" style={{ color: C.t }}>
            Boucle T
          </span>
          <p className="text-stone-600 mt-1">
            Orientée comme le QRS, alors qu&apos;il s&apos;agit du phénomène
            inverse. La repolarisation chemine en sens contraire et porte la
            charge opposée : les deux inversions s&apos;annulent.
          </p>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Le trait doré est la projection du vecteur sur l&apos;axe choisi ; sa
        longueur, à chaque instant, est exactement l&apos;ordonnée du point qui
        avance sur le tracé de droite. Quand le vecteur devient perpendiculaire à
        l&apos;axe, la projection s&apos;annule et le tracé repasse par la ligne
        de base — sans que le cœur ne se soit tu.
        {' '}
        Seules I, II et III sont proposées ici : leur vecteur de dérivation est
        unitaire, donc la longueur lue sur le dessin est directement la tension.
        Pour aVR, aVL et aVF il faudrait encore multiplier par √3/2.
      </p>
    </div>
  );
}

// ─── Onglet 3 — Les six dérivations ─────────────────────────────────────────

function LeadsMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [axis, setAxis] = useState(60);
  const bpm = 72;

  const tm = useMemo(() => ({ ...normalTiming(bpm), axis }), [axis]);

  const computedAxis = useMemo(() => electricalAxis(tm), [tm]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const inBeat = ((tRef.current % tm.rr) + tm.rr) % tm.rr;

    // ── étoile hexaxiale à gauche
    const cx = 128;
    const cy = H / 2;
    const R = 104;

    ctx.strokeStyle = 'rgba(70,63,54,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < LEADS.length; i++) {
      const l = LEADS[i];
      const ex = Math.cos(l.angle * DEG);
      const ey = Math.sin(l.angle * DEG); // +90° vers les pieds, donc vers le bas
      ctx.strokeStyle = 'rgba(70,63,54,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - ex * R, cy - ey * R);
      ctx.lineTo(cx + ex * R, cy + ey * R);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(l.id, cx + ex * (R + 14), cy + ey * (R + 14) + 3);
    }

    // vecteur instantané
    const d = cardiacVector(inBeat, tm);
    const sc = 56;
    if (Math.sqrt(d.x * d.x + d.y * d.y) > 0.005) {
      ctx.strokeStyle = C.vector;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + d.x * sc, cy + d.y * sc);
      ctx.stroke();
    }

    // axe électrique moyen
    ctx.strokeStyle = 'rgba(177,82,47,0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(computedAxis * DEG) * R * 0.92,
      cy + Math.sin(computedAxis * DEG) * R * 0.92
    );
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Étoile hexaxiale', cx, 20);
    ctx.fillStyle = C.qrs;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(`axe mesuré ${computedAxis.toFixed(0)}°`, cx, H - 12);

    // ── six tracés à droite
    const gx = 268;
    const gw = W - gx - 16;
    const rows = 3;
    const cols = 2;
    const cellW = gw / cols;
    const cellH = (H - 46) / rows;

    for (let i = 0; i < LEADS.length; i++) {
      const l = LEADS[i];
      const r = i % rows;
      const c = Math.floor(i / rows);
      const x0 = gx + c * cellW;
      const y0 = 34 + r * cellH;
      const w = cellW - 14;
      const h = cellH - 12;

      const baseY = y0 + h * 0.58;
      const mvScale = h * 0.2;
      drawPanel(ctx, x0, y0, w, h, baseY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, w, h);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = C.trace;
      ctx.lineWidth = 1.5;
      const N = 320;
      for (let k = 0; k <= N; k++) {
        const t = (k / N) * tm.rr;
        const v = leadVoltage(cardiacVector(t, tm), l);
        const x = x0 + (t / tm.rr) * w;
        const y = baseY - v * mvScale;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const curX = x0 + (inBeat / tm.rr) * w;
      ctx.strokeStyle = 'rgba(95,111,42,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(curX, y0);
      ctx.lineTo(curX, y0 + h);
      ctx.stroke();

      ctx.restore();

      ctx.fillStyle = C.ink;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(l.id, x0 + 5, y0 + 13);
      ctx.fillStyle = C.muted;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${l.angle}°`, x0 + w - 5, y0 + 13);
    }

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Un seul cœur, six projections', gx + gw / 2, 20);
  }, [tm, computedAxis]);

  useEffect(() => {
    lastRef.current = performance.now();
    const loopFn = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;
      if (playing) tRef.current += dt / 3;
      draw();
      rafRef.current = requestAnimationFrame(loopFn);
    };
    rafRef.current = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw]);

  // Vérification d'Einthoven sur tout le battement
  const einthoven = useMemo(() => {
    let worst = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * tm.rr;
      const d = cardiacVector(t, tm);
      const res =
        leadVoltage(d, leadById('II')) -
        (leadVoltage(d, leadById('I')) + leadVoltage(d, leadById('III')));
      if (Math.abs(res) > worst) worst = Math.abs(res);
    }
    return worst;
  }, [tm]);

  const axisLabel =
    computedAxis < -30
      ? 'déviation axiale gauche'
      : computedAxis > 90
        ? 'déviation axiale droite'
        : 'axe normal (−30° à +90°)';

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={900}
        height={380}
        className="w-full max-w-[900px] mx-auto rounded-lg border border-stone-200"
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Axe du vecteur ventriculaire
          </label>
          <input
            type="range"
            min={-90}
            max={150}
            step={5}
            value={axis}
            onChange={(e) => setAxis(+e.target.value)}
            className="w-56"
          />
          <span className="ml-2 text-sm font-mono text-stone-600">{axis}°</span>
        </div>
        <button
          onClick={() => setPlaying(!playing)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors"
        >
          {playing ? '⏸ Pause' : '▶ Lecture'}
        </button>
      </div>

      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="px-4 py-1.5 text-stone-700">Axe imposé au modèle</td>
              <td className="px-4 py-1.5 font-mono text-stone-900 text-right">
                {axis}°
              </td>
              <td className="px-4 py-1.5 text-xs text-stone-500">
                orientation du vecteur ventriculaire principal
              </td>
            </tr>
            <tr className="bg-stone-50/60">
              <td className="px-4 py-1.5 text-stone-700">
                Axe retrouvé par les aires
              </td>
              <td className="px-4 py-1.5 font-mono text-stone-900 text-right">
                {computedAxis.toFixed(1)}°
              </td>
              <td className="px-4 py-1.5 text-xs text-stone-500">
                direction de l&apos;aire nette du QRS, ce que la méthode
                clinique approche en comparant I et aVF. {axisLabel}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 text-stone-700">
                Écart II − (I + III)
              </td>
              <td className="px-4 py-1.5 font-mono text-stone-900 text-right">
                {einthoven.toExponential(1)} mV
              </td>
              <td className="px-4 py-1.5 text-xs text-stone-500">
                loi d&apos;Einthoven — nul à l&apos;arrondi machine près
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-700">
        <p>
          Les axes de I, II et III sont les trois côtés du triangle
          d&apos;Einthoven, et ils vérifient â<sub>II</sub> = â<sub>I</sub> + â
          <sub>III</sub>. Comme chaque dérivation est un produit scalaire avec le
          même vecteur, la relation se transporte telle quelle sur les tensions :
          la loi d&apos;Einthoven n&apos;est pas une loi de la physiologie, c&apos;est
          de la géométrie. L&apos;écart affiché ci-dessus le montre — il ne vaut
          jamais autre chose que zéro.
        </p>
        <p className="mt-2">
          Déplacez l&apos;axe : les six tracés se déforment ensemble. Une
          dérivation devient plate quand son axe est perpendiculaire au vecteur,
          et c&apos;est précisément ce qu&apos;on cherche en clinique pour
          déterminer l&apos;axe électrique — on repère la dérivation la plus
          isoélectrique, l&apos;axe est à 90° de celle-là.
        </p>
      </div>
    </div>
  );
}

// ─── Onglet 4 — Conduction et troubles ──────────────────────────────────────

interface Disorder {
  id: string;
  name: string;
  bpm: number;
  apply: (tm: Timing) => Timing;
  mechanism: string;
  sign: string;
  /** Segment du trajet de conduction qui est en cause */
  culprit: string | null;
}

const DISORDERS: Disorder[] = [
  {
    id: 'normal',
    name: 'Rythme sinusal normal',
    bpm: 72,
    apply: (tm) => tm,
    mechanism:
      "L'influx naît dans le nœud sinusal, traverse les oreillettes, marque une pause au nœud AV, puis descend par le faisceau de His et les branches jusqu'aux fibres de Purkinje.",
    sign: 'Une onde P pour chaque QRS, PR de 120 à 200 ms, QRS fin.',
    culprit: null,
  },
  {
    id: 'tachy',
    name: 'Tachycardie sinusale',
    bpm: 145,
    apply: (tm) => tm,
    mechanism:
      "Le nœud sinusal décharge plus vite. Rien d'autre ne change : le trajet est intact, seules les pauses raccourcissent.",
    sign:
      "Le QRS garde sa durée — c'est ce qui distingue une tachycardie sinusale d'une tachycardie ventriculaire. La diastole, elle, fond : c'est le remplissage qui souffre.",
    culprit: 'sa',
  },
  {
    id: 'brady',
    name: 'Bradycardie sinusale',
    bpm: 44,
    apply: (tm) => tm,
    mechanism:
      'Le nœud sinusal décharge lentement, souvent par tonus vagal — chez le sportif entraîné, c’est la règle plutôt que l’exception.',
    sign: 'Longues diastoles. Le QT s’allonge en valeur absolue, mais le QTc reste normal.',
    culprit: 'sa',
  },
  {
    id: 'bav1',
    name: 'Bloc AV du premier degré',
    bpm: 68,
    apply: (tm) => ({ ...tm, pr: 0.32 }),
    mechanism:
      'Le nœud AV conduit, mais trop lentement. Le délai nodal double sans que rien ne se perde.',
    sign: 'PR allongé au-delà de 200 ms, constant, et chaque P reste suivie de son QRS.',
    culprit: 'av',
  },
  {
    id: 'bbd',
    name: 'Bloc de branche',
    bpm: 72,
    apply: (tm) => ({ ...tm, bundleDelay: 0.055, qrsDur: 0.15 }),
    mechanism:
      "Une des deux branches ne conduit plus. Le ventricule qu'elle desservait se dépolarise de proche en proche, à partir de l'autre — beaucoup plus lentement que par les fibres de Purkinje.",
    sign:
      "QRS élargi au-delà de 120 ms et déformé : les deux ventricules ne sont plus en phase, et leurs vecteurs s'étalent au lieu de s'additionner.",
    culprit: 'branch',
  },
  {
    id: 'fa',
    name: 'Fibrillation auriculaire',
    bpm: 96,
    apply: (tm) => ({ ...tm, pPresent: false }),
    mechanism:
      "Les oreillettes ne se contractent plus de façon coordonnée : de multiples fronts y tournent en désordre. Aucun vecteur auriculaire cohérent n'en sort.",
    sign:
      "Plus d'onde P, et un rythme ventriculaire irrégulier parce que le nœud AV laisse passer au hasard.",
    culprit: 'atria',
  },
  {
    id: 'ischemie',
    name: 'Lésion sous-épicardique',
    bpm: 78,
    apply: (tm) => ({ ...tm, stShift: 0.25, tAmp: 0.5 }),
    mechanism:
      "Le myocarde lésé ne tient plus son potentiel de repos. Un courant circule pendant la diastole, et c'est en réalité la ligne de base qui se déplace — le segment ST paraît décalé par comparaison.",
    sign: 'Sus-décalage du segment ST, le signe qui déclenche une prise en charge urgente.',
    culprit: null,
  },
];

function ConductionMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const rrRef = useRef<number[]>([]);

  const [playing, setPlaying] = useState(true);
  const [disorderId, setDisorderId] = useState('normal');

  const disorder = DISORDERS.find((d) => d.id === disorderId) ?? DISORDERS[0];
  const tm = useMemo(
    () => disorder.apply(normalTiming(disorder.bpm)),
    [disorder]
  );
  const irregular = disorder.id === 'fa';

  useEffect(() => {
    tRef.current = 0;
    rrRef.current = [];
  }, [disorderId]);

  /** Instants de début des battements, en tenant compte de l'irrégularité */
  const beatStart = useCallback(
    (n: number) => {
      if (!irregular) return n * tm.rr;
      const list = rrRef.current;
      while (list.length <= n) {
        // le nœud AV laisse passer au hasard : les RR sont très dispersés
        const seed = Math.sin((list.length + 1) * 12.9898) * 43758.5453;
        const r = seed - Math.floor(seed);
        list.push(tm.rr * (0.62 + 0.78 * r));
      }
      let s = 0;
      for (let i = 0; i < n; i++) s += list[i];
      return s;
    },
    [irregular, tm.rr]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const tNow = tRef.current;

    // battement courant et temps dans le battement
    let n = 0;
    while (beatStart(n + 1) <= tNow) n++;
    const inBeat = tNow - beatStart(n);
    const marks = beatMarks(tm);

    // ── schéma de conduction à gauche
    const hx = 118;
    const hy = H / 2 + 6;

    // silhouette du cœur
    ctx.strokeStyle = 'rgba(70,63,54,0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 96);
    ctx.bezierCurveTo(hx - 96, hy + 30, hx - 80, hy - 86, hx - 28, hy - 74);
    ctx.bezierCurveTo(hx - 8, hy - 68, hx, hy - 50, hx, hy - 38);
    ctx.bezierCurveTo(hx, hy - 50, hx + 8, hy - 68, hx + 28, hy - 74);
    ctx.bezierCurveTo(hx + 80, hy - 86, hx + 96, hy + 30, hx, hy + 96);
    ctx.stroke();

    // le trajet, du nœud sinusal aux fibres
    const nodes: { id: string; x: number; y: number; label: string; at: number }[] = [
      { id: 'sa', x: hx + 30, y: hy - 56, label: 'nœud SA', at: marks.pStart },
      { id: 'atria', x: hx - 6, y: hy - 34, label: 'oreillettes', at: marks.pStart + tm.pDur * 0.5 },
      { id: 'av', x: hx + 4, y: hy - 6, label: 'nœud AV', at: marks.pEnd },
      { id: 'his', x: hx + 2, y: hy + 16, label: 'faisceau de His', at: marks.qrsStart - 0.012 },
      { id: 'branch', x: hx - 26, y: hy + 44, label: 'branches', at: marks.qrsStart },
      { id: 'purkinje', x: hx + 30, y: hy + 62, label: 'Purkinje', at: marks.qrsStart + tm.qrsDur * 0.4 },
    ];

    // le fil conducteur
    ctx.strokeStyle = 'rgba(70,63,54,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) ctx.lineTo(nodes[i].x, nodes[i].y);
    ctx.stroke();

    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      const dt = inBeat - nd.at;
      const lit = dt >= 0 && dt < 0.12 ? 1 - dt / 0.12 : 0;
      const blocked = disorder.culprit === nd.id;

      ctx.beginPath();
      ctx.arc(nd.x, nd.y, 6 + lit * 5, 0, Math.PI * 2);
      ctx.fillStyle = lit > 0 ? `rgba(177,82,47,${0.35 + 0.65 * lit})` : 'rgba(70,63,54,0.22)';
      ctx.fill();

      if (blocked) {
        ctx.strokeStyle = C.qrs;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, 13, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = blocked ? C.qrs : C.muted;
      ctx.font = `${blocked ? 'bold ' : ''}10px Inter, system-ui, sans-serif`;
      ctx.textAlign = nd.x > hx ? 'left' : 'right';
      ctx.fillText(nd.label, nd.x + (nd.x > hx ? 16 : -16), nd.y + 3);
    }

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Trajet de l’influx', hx, 20);

    // ── tracé défilant à droite
    const gx = 252;
    const gw = W - gx - 16;
    const gy = 34;
    const gh = H - 76;
    drawPaper(ctx, gx, gy, gw, gh);

    const base = gy + gh * 0.6;
    const pxPerS = 25 * PX_PER_MM;
    const pxPerMv = MM_PER_MV * PX_PER_MM; // 10 mm/mV, comme sur le papier
    const windowS = gw / pxPerS;
    const tStart = tNow - windowS;

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();

    ctx.beginPath();
    ctx.strokeStyle = C.trace;
    ctx.lineWidth = 1.7;
    for (let px = 0; px <= gw; px++) {
      const tAbs = tStart + px / pxPerS;
      if (tAbs < 0) continue;
      // à quel battement appartient cet instant ?
      let k = 0;
      while (beatStart(k + 1) <= tAbs) k++;
      const v = leadVoltage(cardiacVector(tAbs - beatStart(k), tm), leadById('II'));
      const x = gx + px;
      const y = base - v * pxPerMv;
      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // curseur de position
    ctx.strokeStyle = 'rgba(95,111,42,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx + gw - 1, gy);
    ctx.lineTo(gx + gw - 1, gy + gh);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = C.ink;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${disorder.name} — dérivation II`, gx, 20);
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('25 mm/s · 10 mm/mV', gx + gw, 20);

    ctx.textAlign = 'center';
    ctx.fillStyle = C.muted;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(
      irregular
        ? 'Rythme irrégulier : les intervalles RR varient d’un battement à l’autre'
        : `PR ${Math.round(tm.pr * 1000)} ms · QRS ${Math.round(tm.qrsDur * 1000)} ms · ${disorder.bpm} /min`,
      gx + gw / 2,
      H - 12
    );
  }, [tm, disorder, irregular, beatStart]);

  useEffect(() => {
    lastRef.current = performance.now();
    const loopFn = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;
      if (playing) tRef.current += dt;
      draw();
      rafRef.current = requestAnimationFrame(loopFn);
    };
    rafRef.current = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw]);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={900}
        height={360}
        className="w-full max-w-[900px] mx-auto rounded-lg border border-stone-200"
      />

      <div className="flex flex-wrap gap-2">
        {DISORDERS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDisorderId(d.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              d.id === disorderId
                ? 'bg-ink-900 text-gold-200'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {d.name}
          </button>
        ))}
        <button
          onClick={() => setPlaying(!playing)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors"
        >
          {playing ? '⏸ Pause' : '▶ Lecture'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-stone-200 p-4">
          <h4 className="font-semibold text-stone-800 mb-1">Mécanisme</h4>
          <p className="text-stone-600">{disorder.mechanism}</p>
        </div>
        <div className="rounded-lg border border-stone-200 p-4">
          <h4 className="font-semibold text-stone-800 mb-1">Ce qu&apos;on voit</h4>
          <p className="text-stone-600">{disorder.sign}</p>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Aucun de ces tracés n&apos;est dessiné à la main : chacun sort du même
        générateur, auquel on a seulement changé une durée de conduction ou
        retiré un vecteur. Le bloc de branche, par exemple, n&apos;élargit pas le
        QRS parce qu&apos;on l&apos;a décidé — il décale d&apos;un ventricule sur
        l&apos;autre de 55 ms, et le complexe s&apos;étale de lui-même.
      </p>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

export function ECGSimulator() {
  const [mode, setMode] = useState<Mode>('trace');

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              mode === m
                ? 'bg-brun-50 text-brun-700 border-b-2 border-brun-500'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="px-6 py-3 bg-stone-50 border-b border-stone-100">
        <p className="text-sm text-stone-600">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="p-6">
        {mode === 'trace' && <TraceMode />}
        {mode === 'vecteur' && <VectorMode />}
        {mode === 'derivations' && <LeadsMode />}
        {mode === 'conduction' && <ConductionMode />}
      </div>
    </div>
  );
}
