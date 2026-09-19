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

const LINK_DISTANCE = 140;
const MAX_DOTS = 72;
const GOLD = '201, 179, 124';

export function HeroBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const dotsRef = useRef<Dot[]>([]);
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
      const target = Math.min(MAX_DOTS, Math.round((w * h) / 16000));
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

      // Liens : d'autant plus visibles que les points sont proches
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue;
          const t = 1 - Math.sqrt(d2) / LINK_DISTANCE;
          ctx.strokeStyle = `rgba(${GOLD}, ${t * 0.16})`;
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
        ctx.fillStyle = `rgba(${GOLD}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      const dots = dotsRef.current;
      const pointer = pointerRef.current;

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
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

export default HeroBackdrop;
