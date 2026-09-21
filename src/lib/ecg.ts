// ---------------------------------------------------------------------------
// Modèle du vecteur cardiaque
//
// Tout l'électrocardiogramme tient dans un seul objet : le vecteur cardiaque
// d(t), dipôle équivalent du myocarde en train de se dépolariser. Chaque
// dérivation n'est rien d'autre que sa projection sur un axe :
//
//     V_dérivation(t) = d(t) · a_dérivation
//
// où a_dérivation est le vecteur de dérivation : une direction, mais aussi un
// module. Les dérivations augmentées ont un module plus petit que celles des
// membres, et c'est ce détail qui rend exactes les identités de Goldberger.
//
// C'est le point central de l'électrocardiographie. Comme il n'y a qu'un seul
// générateur de signal, les six tracés frontaux, la boucle vectorielle et
// l'axe électrique en découlent tous par projection — si bien que la loi
// d'Einthoven (II = I + III) est vraie ici par construction, et non parce
// qu'on l'aurait codée à la main.
//
// Convention d'angles : celle du plan frontal en clinique. 0° pointe vers le
// bras gauche du patient, +90° vers les pieds, les angles négatifs vers le
// haut. Un vecteur d'angle θ et de module M a donc pour composantes
// (M cos θ, M sin θ), et sa projection sur un axe d'angle α vaut M cos(θ − α).
//
// Ce fichier ne contient aucun dessin : il est séparé du composant pour rester
// vérifiable seul.
// ---------------------------------------------------------------------------

export const DEG = Math.PI / 180;

export interface Vec {
  x: number;
  y: number;
}

export interface Lead {
  id: string;
  angle: number; // degrés, convention frontale
  /**
   * Module du vecteur de dérivation, rapporté à celui de I.
   *
   * Il vaut 1 pour les dérivations des membres et √3/2 pour les augmentées :
   * aVR, aVL et aVF sont géométriquement 13 % moins sensibles que I, II et
   * III. C'est exactement pour compenser ça que Goldberger les « augmente »,
   * et c'est ce facteur qui rend vraies les identités aVR = −(I + II)/2,
   * aVL = (I − III)/2 et aVF = (II + III)/2.
   */
  gain: number;
  augmented: boolean;
  hint: string;
}

const AUG = Math.sqrt(3) / 2;

export const LEADS: Lead[] = [
  { id: 'I', angle: 0, gain: 1, augmented: false, hint: 'bras droit → bras gauche' },
  { id: 'II', angle: 60, gain: 1, augmented: false, hint: 'bras droit → jambe gauche' },
  { id: 'III', angle: 120, gain: 1, augmented: false, hint: 'bras gauche → jambe gauche' },
  { id: 'aVR', angle: -150, gain: AUG, augmented: true, hint: 'vers le bras droit' },
  { id: 'aVL', angle: -30, gain: AUG, augmented: true, hint: 'vers le bras gauche' },
  { id: 'aVF', angle: 90, gain: AUG, augmented: true, hint: 'vers les pieds' },
];

/**
 * Projection géométrique du vecteur cardiaque sur une direction, en mV.
 * C'est le produit scalaire avec un vecteur unitaire : la grandeur à utiliser
 * pour raisonner sur l'orientation, pas pour lire une amplitude à l'écran.
 */
export function project(d: Vec, angleDeg: number): number {
  return d.x * Math.cos(angleDeg * DEG) + d.y * Math.sin(angleDeg * DEG);
}

/**
 * Tension effectivement enregistrée par une dérivation, en mV : la projection,
 * pondérée par le module du vecteur de dérivation.
 */
export function leadVoltage(d: Vec, lead: Lead): number {
  return lead.gain * project(d, lead.angle);
}

/** Retrouve une dérivation par son nom */
export function leadById(id: string): Lead {
  const l = LEADS.find((x) => x.id === id);
  return l ?? LEADS[1];
}

export interface Timing {
  rr: number; // intervalle entre deux battements, s
  pDur: number; // durée de l'onde P, s
  pr: number; // début de P → début du QRS, s (contient le délai nodal)
  qrsDur: number; // durée du QRS, s
  qt: number; // début du QRS → fin de T, s
  pAmp: number; // mV
  qrsAmp: number; // mV, module du vecteur ventriculaire principal
  tAmp: number; // mV
  axis: number; // axe électrique moyen du QRS, degrés
  pPresent: boolean;
  stShift: number; // décalage du segment ST, mV
  /** Retard d'un ventricule sur l'autre : c'est ça qui élargit le QRS */
  bundleDelay: number; // s
  tInverted: boolean;
}

/**
 * Le QT raccourcit quand le cœur accélère — c'est tout l'objet de la
 * correction de Bazett, QTc = QT / √RR. On l'applique à l'envers pour
 * fabriquer un QT physiologique à partir d'un QTc normal.
 */
export function bazettQT(rr: number, qtc = 0.4): number {
  return qtc * Math.sqrt(rr);
}

export function normalTiming(bpm: number): Timing {
  const rr = 60 / bpm;
  return {
    rr,
    pDur: 0.09,
    pr: 0.16,
    qrsDur: 0.09,
    qt: bazettQT(rr),
    pAmp: 0.25,
    qrsAmp: 1.6,
    tAmp: 0.35,
    axis: 60,
    pPresent: true,
    stShift: 0,
    bundleDelay: 0,
    tInverted: false,
  };
}

/** Demi-sinusoïde : la brique de base de toutes les ondes */
function bump(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(Math.PI * u);
}

/**
 * Onde T asymétrique : elle monte lentement et redescend vite. Le décalage du
 * sommet vers la fin n'est pas cosmétique — c'est la signature de la
 * repolarisation, qui progresse de l'épicarde vers l'endocarde.
 */
function tBump(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(Math.PI * Math.pow(u, 1.35));
}

/**
 * Le vecteur cardiaque à l'instant t d'un battement (t = 0 au début de l'onde
 * P), en mV dans le plan frontal.
 *
 * La séquence suit l'anatomie : dépolarisation auriculaire, silence pendant le
 * délai nodal, trois vecteurs successifs pour les ventricules (septum, paroi
 * libre, base), plateau, puis repolarisation.
 */
export function cardiacVector(t: number, tm: Timing): Vec {
  const d: Vec = { x: 0, y: 0 };

  const push = (m: number, a: number) => {
    d.x += m * Math.cos(a * DEG);
    d.y += m * Math.sin(a * DEG);
  };

  // --- Onde P : dépolarisation des oreillettes, axe voisin de +60°
  if (tm.pPresent && t >= 0 && t < tm.pDur) {
    push(tm.pAmp * bump(t / tm.pDur), 60);
  }

  // --- Entre la fin de P et le début du QRS : rien.
  // Ce silence est le délai du nœud auriculo-ventriculaire. C'est lui qui
  // laisse aux ventricules le temps de se remplir, et c'est lui qu'un bloc
  // allonge.

  const qrsStart = tm.pr;
  const qrsEnd = qrsStart + tm.qrsDur;

  if (t >= qrsStart && t < qrsEnd) {
    const u = (t - qrsStart) / tm.qrsDur;

    // septum, de gauche à droite : petit vecteur à contre-sens
    if (u < 0.2) push(0.18 * tm.qrsAmp * bump(u / 0.2), tm.axis - 160);

    // paroi libre des ventricules : le gros vecteur, celui qui donne le R
    if (u >= 0.12 && u < 0.72) {
      const uu = (u - 0.12) / 0.6;
      // un ventricule en retard sur l'autre : les deux contributions se
      // décalent au lieu de s'additionner, et le complexe s'élargit
      if (tm.bundleDelay > 0) {
        const shift = tm.bundleDelay / tm.qrsDur;
        push(0.55 * tm.qrsAmp * bump(uu), tm.axis - 25);
        push(0.55 * tm.qrsAmp * bump(uu - shift), tm.axis + 35);
      } else {
        push(tm.qrsAmp * bump(uu), tm.axis);
      }
    }

    // base des ventricules, en dernier : vecteur vers le haut, donne le S
    if (u >= 0.66) push(0.22 * tm.qrsAmp * bump((u - 0.66) / 0.34), tm.axis + 150);
  }

  // --- Segment ST : plateau du potentiel d'action, donc silence électrique.
  // Un décalage ici signale une lésion du myocarde.
  const tDur = 0.44 * tm.qt;
  const tStart = qrsStart + tm.qt - tDur;

  if (tm.stShift !== 0 && t >= qrsEnd && t < tStart) {
    push(tm.stShift, tm.axis);
  }

  // --- Onde T : repolarisation ventriculaire.
  // Elle est concordante avec le QRS, ce qui surprend toujours : la
  // repolarisation chemine en sens inverse de la dépolarisation, mais elle
  // porte aussi la charge opposée, et les deux inversions se compensent.
  if (t >= tStart && t < tStart + tDur) {
    const m = tm.tAmp * tBump((t - tStart) / tDur);
    push(tm.tInverted ? -m : m, tm.axis - 15);
  }

  return d;
}

export interface BeatMarks {
  pStart: number;
  pEnd: number;
  qrsStart: number;
  qrsEnd: number;
  tStart: number;
  tEnd: number;
  tPeak: number;
  pPeak: number;
  rPeak: number;
}

/** Repères temporels d'un battement, pour les annotations */
export function beatMarks(tm: Timing): BeatMarks {
  const qrsStart = tm.pr;
  const tDur = 0.44 * tm.qt;
  const tStart = qrsStart + tm.qt - tDur;
  return {
    pStart: 0,
    pEnd: tm.pDur,
    qrsStart,
    qrsEnd: qrsStart + tm.qrsDur,
    tStart,
    tEnd: tStart + tDur,
    tPeak: tStart + 0.61 * tDur,
    pPeak: tm.pDur / 2,
    rPeak: qrsStart + 0.42 * tm.qrsDur,
  };
}

/**
 * Aire nette du QRS projetée sur une direction. L'axe électrique moyen est la
 * direction de la somme vectorielle des aires — c'est sa définition, et c'est
 * ce que la méthode clinique approche en comparant I et aVF.
 */
export function netQRSArea(tm: Timing, angleDeg: number): number {
  const marks = beatMarks(tm);
  let s = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const t = marks.qrsStart + ((i + 0.5) / N) * tm.qrsDur;
    s += project(cardiacVector(t, tm), angleDeg);
  }
  return (s / N) * tm.qrsDur;
}

/** Axe électrique retrouvé à partir des aires, en degrés */
export function electricalAxis(tm: Timing): number {
  return Math.atan2(netQRSArea(tm, 90), netQRSArea(tm, 0)) / DEG;
}

/** Amplitudes extrêmes enregistrées par une dérivation sur un battement, mV */
export function leadExtremes(tm: Timing, lead: Lead): { max: number; min: number } {
  let max = 0;
  let min = 0;
  const N = 1200;
  for (let i = 0; i < N; i++) {
    const v = leadVoltage(cardiacVector((i / N) * tm.rr, tm), lead);
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return { max, min };
}
