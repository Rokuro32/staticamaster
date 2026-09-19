'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';

// ---------------------------------------------------------------------------
// Physique des réseaux complexes — d'après Newman, « Networks » (Oxford
// University Press), chapitres 6 « Mathematics of networks » et 7 « Measures
// and metrics ».
//
// Chapitre 6 : la matrice d'adjacence, les degrés, les chemins géodésiques,
// les composantes, la densité. Tout le vocabulaire.
// Chapitre 7 : ce qu'on en mesure. Les quatre centralités, le coefficient de
// clustering, l'assortativité.
//
// Les générateurs (anneau, aléatoire, petit monde, sans échelle) viennent de
// chapitres plus tardifs du livre. Ils servent ici de terrain de jeu : c'est en
// changeant la structure qu'on voit à quoi chaque mesure réagit.
// ---------------------------------------------------------------------------

type Metric =
  | 'degre'
  | 'proximite'
  | 'intermediarite'
  | 'vecteur-propre'
  | 'pagerank'
  | 'clustering'
  | 'composantes';

type Model = 'anneau' | 'aleatoire' | 'petit-monde' | 'sans-echelle' | 'etoile' | 'communautes';

interface Graph {
  n: number;
  edges: [number, number][];
  adj: number[][];
}

/** Générateur pseudo-aléatoire à graine : les réseaux restent reproductibles */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph(n: number, edgeSet: Set<string>): Graph {
  const edges: [number, number][] = [];
  const adj: number[][] = Array.from({ length: n }, () => []);
  edgeSet.forEach((key) => {
    const [a, b] = key.split('-').map(Number);
    edges.push([a, b]);
    adj[a].push(b);
    adj[b].push(a);
  });
  return { n, edges, adj };
}

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function generate(model: Model, n: number, param: number, seed: number): Graph {
  const rand = mulberry32(seed);
  const set = new Set<string>();

  if (model === 'etoile') {
    for (let i = 1; i < n; i++) set.add(key(0, i));
  } else if (model === 'anneau') {
    const k = Math.max(1, Math.round(param)); // voisins de chaque côté
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k; j++) set.add(key(i, (i + j) % n));
    }
  } else if (model === 'aleatoire') {
    // G(n, p) d'Erdős–Rényi : chaque paire reliée avec la probabilité p
    const p = param;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) if (rand() < p) set.add(key(i, j));
    }
  } else if (model === 'petit-monde') {
    // Watts–Strogatz : un anneau dont on recâble une fraction p des liens
    const k = 2;
    const p = param;
    const links: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k; j++) links.push([i, (i + j) % n]);
    }
    links.forEach(([a, b]) => {
      if (rand() < p) {
        let c = Math.floor(rand() * n);
        let guard = 0;
        while ((c === a || set.has(key(a, c))) && guard++ < 50) c = Math.floor(rand() * n);
        set.add(key(a, c));
      } else {
        set.add(key(a, b));
      }
    });
  } else if (model === 'sans-echelle') {
    // Barabási–Albert : attachement préférentiel, m liens par nouveau sommet
    const m = Math.max(1, Math.round(param));
    const targets: number[] = []; // liste où chaque sommet apparaît deg fois
    for (let i = 0; i <= m; i++) {
      for (let j = i + 1; j <= m; j++) {
        set.add(key(i, j));
        targets.push(i, j);
      }
    }
    for (let v = m + 1; v < n; v++) {
      const chosen = new Set<number>();
      let guard = 0;
      while (chosen.size < m && guard++ < 200) {
        const t = targets[Math.floor(rand() * targets.length)];
        if (t !== v) chosen.add(t);
      }
      chosen.forEach((t) => {
        set.add(key(v, t));
        targets.push(v, t);
      });
    }
  } else if (model === 'communautes') {
    // Partition plantée : dense dedans, rare dehors
    const groups = 3;
    const pIn = 0.45;
    const pOut = param;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const same = i % groups === j % groups;
        if (rand() < (same ? pIn : pOut)) set.add(key(i, j));
      }
    }
  }

  return buildGraph(n, set);
}

// ----------------------------------------------------------------- mesures

function bfs(adj: number[][], src: number): number[] {
  const d = new Array<number>(adj.length).fill(-1);
  d[src] = 0;
  const q = [src];
  for (let h = 0; h < q.length; h++) {
    const v = q[h];
    for (const w of adj[v]) if (d[w] < 0) { d[w] = d[v] + 1; q.push(w); }
  }
  return d;
}

/** Algorithme de Brandes : intermédiarité exacte en O(nm) */
function betweenness(adj: number[][]): number[] {
  const n = adj.length;
  const cb = new Array<number>(n).fill(0);

  for (let s = 0; s < n; s++) {
    const stack: number[] = [];
    const pred: number[][] = Array.from({ length: n }, () => []);
    const sigma = new Array<number>(n).fill(0);
    const dist = new Array<number>(n).fill(-1);
    sigma[s] = 1;
    dist[s] = 0;
    const q = [s];

    for (let h = 0; h < q.length; h++) {
      const v = q[h];
      stack.push(v);
      for (const w of adj[v]) {
        if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
        if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
      }
    }

    const delta = new Array<number>(n).fill(0);
    for (let i = stack.length - 1; i >= 0; i--) {
      const w = stack[i];
      for (const v of pred[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      if (w !== s) cb[w] += delta[w];
    }
  }
  // Graphe non orienté : chaque chemin est compté deux fois
  return cb.map((x) => x / 2);
}

/** Centralité de vecteur propre, par itération de la puissance */
function eigenvector(graph: Graph): number[] {
  const { n, edges } = graph;
  let x = new Array<number>(n).fill(1 / Math.sqrt(n));
  for (let it = 0; it < 200; it++) {
    const y = new Array<number>(n).fill(0);
    edges.forEach(([a, b]) => { y[a] += x[b]; y[b] += x[a]; });
    const norm = Math.hypot(...y);
    if (norm < 1e-12) return x;
    x = y.map((v) => v / norm);
  }
  return x;
}

function pagerank(graph: Graph, damping = 0.85): number[] {
  const { n, adj } = graph;
  let p = new Array<number>(n).fill(1 / n);
  for (let it = 0; it < 120; it++) {
    const next = new Array<number>(n).fill((1 - damping) / n);
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      const k = adj[i].length;
      if (k === 0) { dangling += p[i]; continue; }
      const share = (damping * p[i]) / k;
      for (const j of adj[i]) next[j] += share;
    }
    if (dangling > 0) {
      const add = (damping * dangling) / n;
      for (let i = 0; i < n; i++) next[i] += add;
    }
    p = next;
  }
  return p;
}

/** Coefficient de clustering local et nombre de triangles par sommet */
function clustering(graph: Graph): { local: number[]; triangles: number[] } {
  const { n, adj } = graph;
  const sets = adj.map((l) => new Set(l));
  const local = new Array<number>(n).fill(0);
  const triangles = new Array<number>(n).fill(0);

  for (let i = 0; i < n; i++) {
    const nb = adj[i];
    const k = nb.length;
    if (k < 2) continue;
    let links = 0;
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) if (sets[nb[a]].has(nb[b])) links++;
    }
    triangles[i] = links;
    local[i] = (2 * links) / (k * (k - 1));
  }
  return { local, triangles };
}

function components(adj: number[][]): number[] {
  const n = adj.length;
  const comp = new Array<number>(n).fill(-1);
  let c = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] >= 0) continue;
    const q = [s];
    comp[s] = c;
    for (let h = 0; h < q.length; h++) {
      for (const w of adj[q[h]]) if (comp[w] < 0) { comp[w] = c; q.push(w); }
    }
    c++;
  }
  return comp;
}

/** Assortativité de degré : corrélation de Pearson sur les extrémités des liens */
function assortativity(graph: Graph): number {
  const deg = graph.adj.map((l) => l.length);
  const pairs: [number, number][] = [];
  graph.edges.forEach(([a, b]) => {
    pairs.push([deg[a], deg[b]]);
    pairs.push([deg[b], deg[a]]);
  });
  const m = pairs.length;
  if (m === 0) return NaN;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  pairs.forEach(([x, y]) => { sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; });
  const num = sxy / m - (sx / m) * (sy / m);
  const den = Math.sqrt((sxx / m - (sx / m) ** 2) * (syy / m - (sy / m) ** 2));
  return den < 1e-12 ? NaN : num / den;
}

/** Disposition par ressorts (Fruchterman-Reingold), déterministe */
function layout(graph: Graph, seed: number): { x: number; y: number }[] {
  const { n, adj } = graph;
  const rand = mulberry32(seed);
  const pos = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { x: Math.cos(a) * 0.8 + (rand() - 0.5) * 0.1, y: Math.sin(a) * 0.8 + (rand() - 0.5) * 0.1 };
  });

  const k = Math.sqrt(1 / n) * 1.6;
  for (let it = 0; it < 400; it++) {
    const temp = 0.12 * (1 - it / 400) + 0.002;
    const disp = pos.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) { dx = (rand() - 0.5) * 1e-3; dy = (rand() - 0.5) * 1e-3; d2 = 1e-6; }
        const f = (k * k) / d2;
        disp[i].x += dx * f; disp[i].y += dy * f;
        disp[j].x -= dx * f; disp[j].y -= dy * f;
      }
    }

    for (let i = 0; i < n; i++) {
      for (const j of adj[i]) {
        if (j <= i) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const f = d / k;
        disp[i].x -= dx * f; disp[i].y -= dy * f;
        disp[j].x += dx * f; disp[j].y += dy * f;
      }
    }

    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 1e-9;
      const s = Math.min(d, temp) / d;
      pos[i].x += disp[i].x * s;
      pos[i].y += disp[i].y * s;
      // on garde tout dans le cadre
      pos[i].x = Math.max(-1, Math.min(1, pos[i].x));
      pos[i].y = Math.max(-1, Math.min(1, pos[i].y));
    }
  }
  return pos;
}

// ------------------------------------------------------------------ couleurs

const RAMP_FROM = [237, 223, 192]; // or très clair
const RAMP_TO = [92, 68, 37];      // brun foncé
const COMP_COLORS = ['#c1964e', '#c96445', '#6d7a38', '#8e5270', '#556884', '#c9a227'];

function rampColor(t: number): string {
  const c = RAMP_FROM.map((from, i) => Math.round(from + (RAMP_TO[i] - from) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const MODELS: { id: Model; label: string; param: string; min: number; max: number; step: number; note: string }[] = [
  { id: 'aleatoire', label: 'Aléatoire', param: 'Probabilité de lien p', min: 0.02, max: 0.4, step: 0.01,
    note: 'G(n, p) : chaque paire de sommets est reliée au hasard. Les degrés se concentrent autour de la moyenne, il n’y a pas de hub.' },
  { id: 'sans-echelle', label: 'Sans échelle', param: 'Liens par nouveau sommet m', min: 1, max: 5, step: 1,
    note: 'Attachement préférentiel : les nouveaux sommets se branchent aux plus connectés. Quelques hubs énormes, une majorité de sommets isolés en périphérie.' },
  { id: 'petit-monde', label: 'Petit monde', param: 'Probabilité de recâblage p', min: 0, max: 1, step: 0.02,
    note: 'Un anneau dont on recâble quelques liens au hasard. Il en faut très peu pour effondrer les distances tout en gardant un fort clustering.' },
  { id: 'anneau', label: 'Anneau régulier', param: 'Voisins de chaque côté k', min: 1, max: 4, step: 1,
    note: 'Tous les sommets ont le même degré. Beaucoup de triangles, mais des distances qui grandissent linéairement.' },
  { id: 'communautes', label: 'Communautés', param: 'Probabilité entre groupes', min: 0, max: 0.2, step: 0.01,
    note: 'Trois groupes denses, faiblement reliés entre eux. Les sommets qui font le pont ont une intermédiarité énorme pour un degré modeste.' },
  { id: 'etoile', label: 'Étoile', param: '—', min: 0, max: 0, step: 1,
    note: 'Le cas limite : un centre relié à tout, et rien d’autre. Centralité maximale au centre, clustering nul partout.' },
];

const METRICS: { id: Metric; label: string; chapter: string; legend: string }[] = [
  { id: 'degre', label: 'Degré', chapter: 'ch. 6',
    legend: 'Le nombre de liens d’un sommet : ki = Σj Aij. La mesure la plus simple, et souvent déjà la plus informative.' },
  { id: 'proximite', label: 'Proximité', chapter: 'ch. 7',
    legend: 'L’inverse de la distance moyenne aux autres. Un sommet central au sens de « proche de tout le monde ».' },
  { id: 'intermediarite', label: 'Intermédiarité', chapter: 'ch. 7',
    legend: 'Le nombre de chemins les plus courts qui passent par le sommet. Repère les ponts, pas les gros degrés.' },
  { id: 'vecteur-propre', label: 'Vecteur propre', chapter: 'ch. 7',
    legend: 'Être important, c’est être relié à des sommets importants. Défini récursivement : Ax = λx.' },
  { id: 'pagerank', label: 'PageRank', chapter: 'ch. 7',
    legend: 'Une marche aléatoire avec téléportation. Variante du vecteur propre qui ne s’emballe pas sur les hubs.' },
  { id: 'clustering', label: 'Clustering local', chapter: 'ch. 7',
    legend: 'La fraction des voisins d’un sommet qui sont eux-mêmes reliés. « Les amis de mes amis sont mes amis. »' },
  { id: 'composantes', label: 'Composantes', chapter: 'ch. 6',
    legend: 'Les morceaux séparés du réseau. Une couleur par composante connexe.' },
];

export function ComplexNetworksSimulator() {
  const [model, setModel] = useState<Model>('sans-echelle');
  const [n, setN] = useState(40);
  const [param, setParam] = useState(2);
  const [seed, setSeed] = useState(7);
  const [metric, setMetric] = useState<Metric>('degre');
  const [selected, setSelected] = useState<number | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matrixRef = useRef<HTMLCanvasElement>(null);
  const histRef = useRef<HTMLCanvasElement>(null);

  const activeModel = MODELS.find((m) => m.id === model)!;
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  const graph = useMemo(() => generate(model, n, param, seed), [model, n, param, seed]);
  const pos = useMemo(() => layout(graph, seed), [graph, seed]);

  const stats = useMemo(() => {
    const deg = graph.adj.map((l) => l.length);
    const m = graph.edges.length;
    const meanDeg = graph.n > 0 ? (2 * m) / graph.n : 0;
    const density = graph.n > 1 ? (2 * m) / (graph.n * (graph.n - 1)) : 0;

    const comp = components(graph.adj);
    const nComp = comp.length ? Math.max(...comp) + 1 : 0;

    // distances : moyenne et diamètre sur les paires accessibles
    let sum = 0, pairs = 0, diameter = 0;
    const closeness = new Array<number>(graph.n).fill(0);
    for (let s = 0; s < graph.n; s++) {
      const d = bfs(graph.adj, s);
      let local = 0, reach = 0;
      for (let t = 0; t < graph.n; t++) {
        if (t === s || d[t] < 0) continue;
        local += d[t]; reach++;
        sum += d[t]; pairs++;
        if (d[t] > diameter) diameter = d[t];
      }
      closeness[s] = local > 0 ? reach / local : 0;
    }

    const { local: clusterLocal, triangles } = clustering(graph);
    const triples = deg.reduce((a, k) => a + (k * (k - 1)) / 2, 0);
    const triangleTotal = triangles.reduce((a, t) => a + t, 0);
    const transitivity = triples > 0 ? triangleTotal / triples : 0;
    const meanClustering = graph.n > 0 ? clusterLocal.reduce((a, c) => a + c, 0) / graph.n : 0;

    return {
      deg, m, meanDeg, density, comp, nComp,
      meanPath: pairs > 0 ? sum / pairs : NaN,
      diameter,
      closeness,
      betweenness: betweenness(graph.adj),
      eigenvector: eigenvector(graph),
      pagerank: pagerank(graph),
      clusterLocal,
      triangles,
      transitivity,
      meanClustering,
      assortativity: assortativity(graph),
      maxDeg: deg.length ? Math.max(...deg) : 0,
    };
  }, [graph]);

  /** Valeur de la mesure courante, par sommet */
  const values = useMemo<number[]>(() => {
    switch (metric) {
      case 'degre': return stats.deg;
      case 'proximite': return stats.closeness;
      case 'intermediarite': return stats.betweenness;
      case 'vecteur-propre': return stats.eigenvector;
      case 'pagerank': return stats.pagerank;
      case 'clustering': return stats.clusterLocal;
      case 'composantes': return stats.comp;
    }
  }, [metric, stats]);

  const vMax = useMemo(() => (values.length ? Math.max(...values) : 0), [values]);

  const regenerate = useCallback(() => {
    setSeed((s) => (s * 7919 + 13) % 100000);
    setSelected(null);
  }, []);

  const pickModel = useCallback((m: Model) => {
    setModel(m);
    setSelected(null);
    const def = MODELS.find((x) => x.id === m)!;
    setParam(m === 'aleatoire' ? 0.08 : m === 'petit-monde' ? 0.1 : m === 'communautes' ? 0.02 : def.min + 1);
  }, []);

  // ------------------------------------------------------------- le réseau
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = 34;
    const toX = (x: number) => pad + ((x + 1) / 2) * (W - 2 * pad);
    const toY = (y: number) => pad + ((y + 1) / 2) * (H - 2 * pad);

    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    // Liens
    ctx.lineWidth = 1;
    graph.edges.forEach(([a, b]) => {
      const touches = selected !== null && (a === selected || b === selected);
      ctx.strokeStyle = touches ? 'rgba(124, 103, 58, .85)' : 'rgba(120, 113, 108, .28)';
      ctx.lineWidth = touches ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(toX(pos[a].x), toY(pos[a].y));
      ctx.lineTo(toX(pos[b].x), toY(pos[b].y));
      ctx.stroke();
    });

    // Sommets
    for (let i = 0; i < graph.n; i++) {
      const t = vMax > 0 ? values[i] / vMax : 0;
      const r = 4 + (metric === 'composantes' ? 3 : Math.sqrt(t) * 10);
      const fill = metric === 'composantes'
        ? COMP_COLORS[stats.comp[i] % COMP_COLORS.length]
        : rampColor(t);

      ctx.beginPath();
      ctx.arc(toX(pos[i].x), toY(pos[i].y), r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = i === selected ? 3 : 1.2;
      ctx.strokeStyle = i === selected ? '#1c1917' : 'rgba(255,255,255,.9)';
      ctx.stroke();
    }

    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${graph.n} sommets · ${stats.m} liens`, 12, H - 12);
    ctx.textAlign = 'right';
    ctx.fillText('cliquez un sommet', W - 12, H - 12);
  }, [graph, pos, values, vMax, metric, selected, stats]);

  // ----------------------------------------------- la matrice d'adjacence
  useEffect(() => {
    if (!showMatrix) return;
    const canvas = matrixRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = canvas.width;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, S, S);
    const cell = S / graph.n;
    const set = new Set(graph.edges.map(([a, b]) => key(a, b)));

    for (let i = 0; i < graph.n; i++) {
      for (let j = 0; j < graph.n; j++) {
        if (i !== j && set.has(key(i, j))) {
          const hot = selected !== null && (i === selected || j === selected);
          ctx.fillStyle = hot ? '#7c673a' : '#c1964e';
          ctx.fillRect(j * cell, i * cell, Math.max(cell - 0.5, 1), Math.max(cell - 0.5, 1));
        }
      }
    }
  }, [showMatrix, graph, selected]);

  // -------------------------------------------- la distribution des degrés
  useEffect(() => {
    const canvas = histRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#faf9f7';
    ctx.fillRect(0, 0, W, H);

    const maxK = Math.max(1, stats.maxDeg);
    const counts = new Array<number>(maxK + 1).fill(0);
    stats.deg.forEach((k) => counts[k]++);
    const maxCount = Math.max(...counts, 1);

    const pad = 22;
    const bw = (W - 2 * pad) / counts.length;
    counts.forEach((c, k) => {
      const h = (c / maxCount) * (H - 2 * pad);
      ctx.fillStyle = '#c1964e';
      ctx.fillRect(pad + k * bw, H - pad - h, Math.max(bw - 1.5, 1), h);
    });

    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('0', pad, H - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`k = ${maxK}`, W - pad, H - 8);
    ctx.textAlign = 'left';
    ctx.fillText('nombre de sommets', pad, 14);
  }, [stats]);

  // ----------------------------------------------------- clic sur un sommet
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const pad = 34;
    const toX = (x: number) => pad + ((x + 1) / 2) * (canvas.width - 2 * pad);
    const toY = (y: number) => pad + ((y + 1) / 2) * (canvas.height - 2 * pad);

    let best = -1;
    let bestD = 18 * 18;
    for (let i = 0; i < graph.n; i++) {
      const dx = toX(pos[i].x) - mx;
      const dy = toY(pos[i].y) - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    setSelected(best >= 0 ? best : null);
  };

  const fmt = (v: number, digits = 3) =>
    Number.isFinite(v) ? v.toFixed(digits) : '—';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-800">
          Réseaux complexes — structure et mesures
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          Changez la façon dont le réseau est construit, puis changez la mesure.
          C&apos;est en comparant les deux qu&apos;on voit ce que chaque
          centralité repère vraiment.
        </p>
      </div>

      {/* Modèles */}
      <div className="flex flex-wrap gap-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => pickModel(m.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              model === m.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-stone-700 bg-stone-50 border-l-4 border-stone-400 rounded-r-lg px-4 py-2 -mt-2">
        {activeModel.note}
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
              <span>Sommets n</span>
              <span className="font-mono text-stone-900">{n}</span>
            </label>
            <input
              type="range" min={8} max={80} step={1} value={n}
              onChange={(e) => { setN(Number(e.target.value)); setSelected(null); }}
              className="w-full accent-gold-600"
            />
          </div>

          {activeModel.param !== '—' && (
            <div>
              <label className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                <span>{activeModel.param}</span>
                <span className="font-mono text-stone-900">
                  {activeModel.step < 1 ? param.toFixed(2) : param}
                </span>
              </label>
              <input
                type="range"
                min={activeModel.min} max={activeModel.max} step={activeModel.step}
                value={param}
                onChange={(e) => { setParam(Number(e.target.value)); setSelected(null); }}
                className="w-full accent-gold-600"
              />
            </div>
          )}

          <button
            onClick={regenerate}
            className="w-full py-2 px-3 rounded-lg font-medium bg-gold-600 text-white hover:bg-gold-700 transition-colors"
          >
            ↺ Retirer au hasard
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMatrix}
              onChange={(e) => setShowMatrix(e.target.checked)}
              className="w-4 h-4 accent-gold-600"
            />
            <span className="text-sm text-stone-700">Matrice d&apos;adjacence</span>
          </label>

          {showMatrix && (
            <div>
              <canvas
                ref={matrixRef}
                width={260}
                height={260}
                className="w-full border border-stone-200 rounded-lg"
              />
              <p className="text-xs text-stone-500 mt-1">
                Aij = 1 si i et j sont reliés. Symétrique, diagonale nulle : le
                réseau n&apos;est ni orienté ni doté de boucles.
              </p>
            </div>
          )}

          {/* Chiffres globaux */}
          <div className="space-y-1.5 text-sm pt-2 border-t border-stone-200">
            {[
              ['Liens m', String(stats.m)],
              ['Degré moyen ⟨k⟩', fmt(stats.meanDeg, 2)],
              ['Densité ρ', fmt(stats.density, 3)],
              ['Composantes', String(stats.nComp)],
              ['Distance moyenne ℓ', fmt(stats.meanPath, 2)],
              ['Diamètre', String(stats.diameter)],
              ['Transitivité C', fmt(stats.transitivity, 3)],
              ['Clustering moyen', fmt(stats.meanClustering, 3)],
              ['Assortativité r', fmt(stats.assortativity, 3)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-stone-500">{k}</span>
                <span className="font-mono text-stone-900">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Réseau et mesures */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  metric === m.id
                    ? 'bg-gold-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {m.label}
                <span className={`ml-1.5 ${metric === m.id ? 'text-gold-200' : 'text-stone-400'}`}>
                  {m.chapter}
                </span>
              </button>
            ))}
          </div>

          <p className="text-sm text-stone-700 bg-gold-50 border-l-4 border-gold-400 rounded-r-lg px-4 py-2">
            {activeMetric.legend}
          </p>

          <div className="border-2 border-stone-200 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={720}
              height={440}
              onClick={handleClick}
              className="w-full cursor-pointer"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-stone-500 mb-1">Distribution des degrés</div>
              <canvas
                ref={histRef}
                width={340}
                height={150}
                className="w-full border border-stone-200 rounded-lg"
              />
            </div>

            <div>
              <div className="text-xs text-stone-500 mb-1">
                {selected !== null ? `Sommet ${selected}` : 'Aucun sommet sélectionné'}
              </div>
              {selected !== null ? (
                <div className="border border-stone-200 rounded-lg p-3 space-y-1 text-sm">
                  {[
                    ['Degré k', String(stats.deg[selected])],
                    ['Proximité', fmt(stats.closeness[selected])],
                    ['Intermédiarité', fmt(stats.betweenness[selected], 1)],
                    ['Vecteur propre', fmt(stats.eigenvector[selected])],
                    ['PageRank', fmt(stats.pagerank[selected], 4)],
                    ['Clustering local', fmt(stats.clusterLocal[selected])],
                    ['Triangles', String(stats.triangles[selected])],
                    ['Composante', String(stats.comp[selected] + 1)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-stone-500">{k}</span>
                      <span className="font-mono text-stone-900">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-stone-300 rounded-lg p-4 text-sm text-stone-500">
                  Cliquez un sommet dans le réseau pour voir toutes ses mesures
                  côte à côte. Un sommet peut avoir un gros degré et une
                  intermédiarité nulle, ou l&apos;inverse.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Théorie */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="font-semibold text-stone-800 mb-3">
          Théorie — Newman, chapitres 6 et 7
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-gold-50 rounded-lg p-4">
            <h4 className="font-medium text-gold-800 mb-2">Matrice d&apos;adjacence (ch. 6)</h4>
            <BlockMath math="A_{ij} = \begin{cases} 1 & \text{si } i \text{ et } j \text{ sont reliés} \\ 0 & \text{sinon} \end{cases}" />
            <p className="text-gold-700 mt-2">
              Tout le reste en découle. Le degré est une somme de ligne, et{' '}
              <InlineMath math="(A^r)_{ij}" /> compte les chemins de longueur{' '}
              <InlineMath math="r" /> entre <InlineMath math="i" /> et{' '}
              <InlineMath math="j" />.
            </p>
          </div>
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-medium text-stone-800 mb-2">Degré et densité (ch. 6)</h4>
            <BlockMath math="k_i = \sum_j A_{ij}, \quad \langle k \rangle = \frac{2m}{n}, \quad \rho = \frac{2m}{n(n-1)}" />
            <p className="text-stone-700 mt-2">
              Les réseaux réels sont presque toujours épars : <InlineMath math="\rho" />{' '}
              tend vers zéro quand le réseau grandit.
            </p>
          </div>
          <div className="bg-brun-50 rounded-lg p-4">
            <h4 className="font-medium text-brun-800 mb-2">Chemins et composantes (ch. 6)</h4>
            <p className="text-brun-700">
              La distance géodésique est le plus court chemin ; le diamètre, la
              plus grande de ces distances. Un réseau se découpe en composantes
              connexes, et l&apos;une d&apos;elles est généralement géante :
              elle contient presque tout le monde.
            </p>
          </div>
          <div className="bg-ardoise-50 rounded-lg p-4">
            <h4 className="font-medium text-ardoise-800 mb-2">Les quatre centralités (ch. 7)</h4>
            <BlockMath math="x_i = \kappa^{-1}\sum_j A_{ij}x_j" />
            <p className="text-ardoise-700 mt-2">
              Degré, proximité, intermédiarité, vecteur propre. Elles ne
              classent pas dans le même ordre : c&apos;est précisément ce qui
              les rend utiles ensemble.
            </p>
          </div>
          <div className="bg-olive-50 rounded-lg p-4">
            <h4 className="font-medium text-olive-800 mb-2">Clustering (ch. 7)</h4>
            <BlockMath math="C = \frac{3 \times (\text{nombre de triangles})}{\text{nombre de triplets connectés}}" />
            <p className="text-olive-700 mt-2">
              Dans les réseaux sociaux, <InlineMath math="C" /> vaut souvent 0,1
              à 0,5 — bien plus que dans un réseau aléatoire de même densité.
            </p>
          </div>
          <div className="bg-prune-50 rounded-lg p-4">
            <h4 className="font-medium text-prune-800 mb-2">Assortativité (ch. 7)</h4>
            <BlockMath math="r = \frac{\sum_{ij}(A_{ij} - k_ik_j/2m)\,k_ik_j}{\sum_{ij}(k_i\delta_{ij} - k_ik_j/2m)\,k_ik_j}" />
            <p className="text-prune-700 mt-2">
              <InlineMath math="r > 0" /> : les hubs se relient entre eux —
              typique des réseaux sociaux. <InlineMath math="r < 0" /> : les hubs
              se relient aux petits — typique des réseaux techniques et
              biologiques.
            </p>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-4">
          D&apos;après M. E. J. Newman, <em>Networks</em>, Oxford University
          Press. Chapitre 6 « Mathematics of networks » et chapitre 7
          « Measures and metrics ». Les modèles de génération (petit monde,
          attachement préférentiel) viennent de chapitres plus tardifs : ils ne
          servent ici que de terrain d&apos;essai pour les mesures.
        </p>
      </div>
    </div>
  );
}

export default ComplexNetworksSimulator;
