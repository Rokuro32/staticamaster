'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Fond animé de l'accueil : un champ de points qui dérivent, reliés dès qu'ils
// se rapprochent. C'est le même objet que la simulation de réseaux complexes,
// en décor.
//
// Trois précautions :
//  - « réduire les animations » du système coupe l'animation, on dessine une
//    seule image fixe ;
//  - rien ne tourne quand l'onglet est en arrière-plan ;
//  - la densité suit la surface, avec un plafond, pour ne pas faire chauffer
//    un portable sur une grande fenêtre.
// ---------------------------------------------------------------------------

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/** Halo diffus qui dérive lentement, en arrière-plan des points */
interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

const LINK_DISTANCE = 140;
const MAX_DOTS = 72;
const GOLD = '201, 179, 124';

export interface HeroBackdropProps {
  className?: string;
  /** Couleur des points, en « r, g, b ». Par défaut, l'or de la marque. */
  accent?: string;
  /** Densité : les bandes de titre sont plus courtes, on y met moins de points */
  density?: 'normal' | 'sparse';
}

export function HeroBackdrop({ className, accent = GOLD, density = 'normal' }: HeroBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const dotsRef = useRef<Dot[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;

    const seed = (w: number, h: number) => {
      const divisor = density === 'sparse' ? 26000 : 16000;
      const target = Math.min(MAX_DOTS, Math.round((w * h) / divisor));
      const dots: Dot[] = [];
      for (let i = 0; i < target; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          // Vitesse de dérive, en pixels par image. C'est le réglage à
          // toucher si le fond paraît trop calme ou trop agité.
          vx: (Math.random() - 0.5) * 0.34,
          vy: (Math.random() - 0.5) * 0.34,
          r: 0.9 + Math.random() * 1.5,
        });
      }
      dotsRef.current = dots;

      // Trois halos, chacun avec sa propre dérive : c'est ce qui donne le
      // mouvement de fond, à une échelle bien plus lente que les points.
      orbsRef.current = [0, 1, 2].map((i) => ({
        x: w * (0.2 + 0.3 * i),
        y: h * (0.3 + 0.2 * (i % 2)),
        vx: (i % 2 === 0 ? 1 : -1) * (0.09 + i * 0.035),
        vy: (i === 1 ? 1 : -1) * 0.055,
        r: Math.max(130, Math.min(w, h) * (0.32 + i * 0.1)),
        alpha: 0.075 - i * 0.017,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(width, height);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const dots = dotsRef.current;
      const pointer = pointerRef.current;

      // Halos, d'abord : ils passent derrière tout le reste
      for (const orb of orbsRef.current) {
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, `rgba(${accent}, ${orb.alpha})`);
        grad.addColorStop(1, `rgba(${accent}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Liens : d'autant plus visibles que les points sont proches
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue;
          const t = 1 - Math.sqrt(d2) / LINK_DISTANCE;
          ctx.strokeStyle = `rgba(${accent}, ${t * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }

      // Points
      for (const dot of dots) {
        let alpha = 0.42;
        if (pointer) {
          const d = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
          if (d < 180) alpha += (1 - d / 180) * 0.45;
        }
        ctx.fillStyle = `rgba(${accent}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      const dots = dotsRef.current;
      const pointer = pointerRef.current;

      for (const orb of orbsRef.current) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.r) orb.x = width + orb.r;
        if (orb.x > width + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = height + orb.r;
        if (orb.y > height + orb.r) orb.y = -orb.r;
      }

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Le pointeur écarte doucement les points sur son passage
        if (pointer) {
          const dx = dot.x - pointer.x;
          const dy = dot.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d > 0.5 && d < 140) {
            const push = (1 - d / 140) * 0.35;
            dot.x += (dx / d) * push;
            dot.y += (dy / d) * push;
          }
        }

        // On réapparaît de l'autre côté plutôt que de rebondir
        if (dot.x < -20) dot.x = width + 20;
        if (dot.x > width + 20) dot.x = -20;
        if (dot.y < -20) dot.y = height + 20;
        if (dot.y > height + 20) dot.y = -20;
      }

      draw();
      rafRef.current = requestAnimationFrame(step);
    };

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    };

    const start = () => {
      if (rafRef.current === undefined) rafRef.current = requestAnimationFrame(step);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerLeave = () => { pointerRef.current = null; };

    resize();

    if (reduced) {
      draw(); // une seule image, puis plus rien ne bouge
    } else {
      start();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    observer.observe(canvas);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [accent, density]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

export default HeroBackdrop;
