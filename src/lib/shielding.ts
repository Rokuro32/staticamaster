// ---------------------------------------------------------------------------
// Blindage des rayonnements
//
// Les quatre rayonnements ne s'arrêtent pas du tout de la même façon, et c'est
// tout l'objet du modèle : il n'y a pas un « bon matériau », il y en a un par
// type de faisceau.
//
//  - α : parcours fini, très court. Une feuille de papier suffit.
//  - β : parcours fini lui aussi, mais un écran lourd fabrique du
//        rayonnement de freinage — le blindage crée alors un second problème.
//  - γ / X : atténuation exponentielle, sans parcours maximal. On ne fait que
//        diviser, jamais annuler. Le numéro atomique domine à basse énergie.
//  - neutrons : ce sont les noyaux légers qui les ralentissent. Le plomb, si
//        efficace contre les photons, ne sert presque à rien ici.
//
// Les données sont des valeurs de référence arrondies, suffisantes pour
// comparer des matériaux entre eux. Aucun dimensionnement d'installation ne
// doit en sortir : une enceinte réelle se calcule en faisceau large, avec les
// facteurs d'accumulation, les fuites et la diffusion.
//
// Ce fichier ne contient aucun dessin : il est séparé du composant pour rester
// vérifiable seul (voir scripts/verify-shielding.mjs).
// ---------------------------------------------------------------------------

export type BeamKind = 'alpha' | 'beta' | 'photon' | 'neutron';

export interface Material {
  id: string;
  label: string;
  /** Masse volumique, g/cm³ */
  rho: number;
  /** Numéro atomique effectif */
  z: number;
  /** Masse atomique effective, pour la règle de Bragg-Kleeman */
  a: number;
  /**
   * Coefficient d'atténuation massique μ/ρ, en cm²/g, une valeur par source
   * photonique. Tabulé directement plutôt qu'interpolé : entre 50 et 100 keV
   * le plomb franchit son seuil K, à 88 keV, et toute interpolation lisserait
   * une discontinuité d'un facteur quatre.
   */
  muOverRho: Record<string, number>;
  /**
   * Section efficace macroscopique de retrait pour neutrons rapides, en cm⁻¹.
   * Ordre de grandeur : la notion suppose un milieu hydrogéné derrière
   * l'écran pour thermaliser puis capturer ce qui a été ralenti.
   */
  sigmaR: number;
  /** Fraction d'hydrogène en masse — ce qui ralentit réellement les neutrons */
  hFraction: number;
  note: string;
}

export interface PhotonSource {
  id: string;
  label: string;
  /** Énergie effective, MeV */
  energy: number;
  detail: string;
}

export const PHOTON_SOURCES: PhotonSource[] = [
  { id: 'i125', label: 'Iode 125', energy: 0.03, detail: 'curiethérapie de prostate — spectre 27 à 35 keV' },
  { id: 'x100', label: 'Rayons X 100 kVp', energy: 0.04, detail: 'radiodiagnostic — énergie effective ≈ 40 keV' },
  { id: 'ir192', label: 'Iridium 192', energy: 0.38, detail: 'curiethérapie à haut débit — moyenne ≈ 380 keV' },
  { id: 'cs137', label: 'Césium 137', energy: 0.662, detail: 'raie unique à 662 keV' },
  { id: 'co60', label: 'Cobalt 60', energy: 1.25, detail: 'deux raies, 1,17 et 1,33 MeV' },
  { id: 'mv6', label: 'Faisceau 6 MV', energy: 2.0, detail: 'accélérateur — énergie effective ≈ 2 MeV' },
];

export const MATERIALS: Material[] = [
  {
    id: 'papier',
    label: 'Papier',
    rho: 0.8,
    z: 6.6,
    a: 12.0,
    muOverRho: { i125: 0.36, x100: 0.255, ir192: 0.106, cs137: 0.0847, co60: 0.0622, mv6: 0.0486 },
    sigmaR: 0.085,
    hFraction: 0.06,
    note: "Le cas d'école : une feuille arrête déjà les α, et ne fait rien du tout aux photons.",
  },
  {
    id: 'eau',
    label: 'Eau',
    rho: 1.0,
    z: 7.42,
    a: 14.3,
    muOverRho: { i125: 0.3756, x100: 0.2683, ir192: 0.108, cs137: 0.0862, co60: 0.0632, mv6: 0.0493 },
    sigmaR: 0.103,
    hFraction: 0.112,
    note: "Le tissu humain se comporte à peu de chose près comme de l'eau : c'est la référence à laquelle on compare tout le reste.",
  },
  {
    id: 'pmma',
    label: 'Plexiglas (PMMA)',
    rho: 1.19,
    z: 6.56,
    a: 12.6,
    muOverRho: { i125: 0.3355, x100: 0.245, ir192: 0.1058, cs137: 0.0845, co60: 0.062, mv6: 0.0485 },
    sigmaR: 0.11,
    hFraction: 0.08,
    note: "L'écran à β de laboratoire : assez léger pour ne presque pas produire de rayonnement de freinage.",
  },
  {
    id: 'polyethylene',
    label: 'Polyéthylène',
    rho: 0.94,
    z: 5.53,
    a: 11.0,
    muOverRho: { i125: 0.3567, x100: 0.265, ir192: 0.124, cs137: 0.0955, co60: 0.0727, mv6: 0.0566 },
    sigmaR: 0.117,
    hFraction: 0.144,
    note: "Le meilleur écran à neutrons de la liste : c'est sa teneur en hydrogène qui fait tout le travail.",
  },
  {
    id: 'beton',
    label: 'Béton',
    rho: 2.35,
    z: 11.0,
    a: 22.0,
    muOverRho: { i125: 0.83, x100: 0.4, ir192: 0.099, cs137: 0.0775, co60: 0.057, mv6: 0.0445 },
    sigmaR: 0.089,
    hFraction: 0.01,
    note: "Le matériau des salles de traitement : médiocre au gramme, mais on peut en couler des mètres pour pas cher.",
  },
  {
    id: 'aluminium',
    label: 'Aluminium',
    rho: 2.7,
    z: 13,
    a: 27.0,
    muOverRho: { i125: 1.128, x100: 0.5685, ir192: 0.0955, cs137: 0.0749, co60: 0.0548, mv6: 0.0432 },
    sigmaR: 0.079,
    hFraction: 0,
    note: "Filtration des rayons X de basse énergie, et peu de freinage : un compromis pour les β énergétiques.",
  },
  {
    id: 'acier',
    label: 'Acier',
    rho: 7.87,
    z: 26,
    a: 55.8,
    muOverRho: { i125: 8.176, x100: 3.629, ir192: 0.0958, cs137: 0.073, co60: 0.0532, mv6: 0.0425 },
    sigmaR: 0.168,
    hFraction: 0,
    note: "Structurel autant que protecteur. Au-delà du mégaélectronvolt, il ne vaut guère mieux que le béton, au gramme près.",
  },
  {
    id: 'plomb',
    label: 'Plomb',
    rho: 11.35,
    z: 82,
    a: 207.2,
    muOverRho: { i125: 30.32, x100: 14.36, ir192: 0.252, cs137: 0.112, co60: 0.0589, mv6: 0.0457 },
    sigmaR: 0.118,
    hFraction: 0,
    note: "Imbattable contre les photons de basse énergie, où l'effet photoélectrique varie comme Z⁴. Mauvais choix contre les β et les neutrons.",
  },
  {
    id: 'tungstene',
    label: 'Tungstène',
    rho: 19.3,
    z: 74,
    a: 183.8,
    muOverRho: { i125: 22.6, x100: 8.8, ir192: 0.218, cs137: 0.101, co60: 0.06, mv6: 0.0429 },
    sigmaR: 0.2,
    hFraction: 0,
    note: "Presque deux fois plus dense que le plomb : le même effet dans moitié moins d'épaisseur, pour bien plus cher.",
  },
];

export function materialById(id: string): Material {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[1];
}

export function photonSourceById(id: string): PhotonSource {
  return PHOTON_SOURCES.find((s) => s.id === id) ?? PHOTON_SOURCES[3];
}

// ─── Photons : atténuation exponentielle ────────────────────────────────────

/** Coefficient d'atténuation linéaire μ, en cm⁻¹ */
export function linearAttenuation(material: Material, sourceId: string): number {
  return material.muOverRho[sourceId] * material.rho;
}

/** Couche de demi-atténuation, en cm */
export function hvl(material: Material, sourceId: string): number {
  return Math.LN2 / linearAttenuation(material, sourceId);
}

/** Couche de dixième d'atténuation, en cm */
export function tvl(material: Material, sourceId: string): number {
  return Math.LN10 / linearAttenuation(material, sourceId);
}

/**
 * Facteur d'accumulation, en première approximation linéaire B = 1 + k·μx.
 *
 * En faisceau étroit on ne compte que les photons qui n'ont rien touché. En
 * faisceau large, les photons diffusés reviennent dans l'axe et s'ajoutent :
 * c'est ce que corrige B. Le coefficient k dépend surtout du numéro atomique,
 * parce qu'à Z élevé un photon diffusé est bien plus souvent absorbé qu'il ne
 * ressort.
 *
 * Approximation du premier ordre, valable tant que la diffusion Compton
 * domine. Une enceinte réelle se calcule avec des facteurs tabulés.
 */
export function buildup(material: Material, mux: number): number {
  const k = material.z > 40 ? 0.55 : material.z > 20 ? 1.2 : 2.0;
  return 1 + k * mux;
}

export interface PhotonResult {
  mu: number;
  mux: number;
  /** Fraction transmise en faisceau étroit */
  narrow: number;
  /** Fraction transmise en faisceau large, diffusé compris */
  broad: number;
  hvl: number;
  tvl: number;
  buildup: number;
}

export function attenuatePhotons(
  material: Material,
  sourceId: string,
  thicknessCm: number
): PhotonResult {
  const mu = linearAttenuation(material, sourceId);
  const mux = mu * thicknessCm;
  const narrow = Math.exp(-mux);
  const b = buildup(material, mux);
  return {
    mu,
    mux,
    narrow,
    broad: Math.min(1, narrow * b),
    hvl: Math.LN2 / mu,
    tvl: Math.LN10 / mu,
    buildup: b,
  };
}

/** Épaisseur qui divise le débit par `factor`, en cm */
export function thicknessForFactor(
  material: Material,
  sourceId: string,
  factor: number
): number {
  return Math.log(factor) / linearAttenuation(material, sourceId);
}

// ─── Bêta : parcours fini, et rayonnement de freinage ───────────────────────

/**
 * Parcours maximal d'un électron, en g/cm², d'après la relation empirique de
 * Katz et Penfold. Valable de 10 keV à 3 MeV environ.
 */
export function betaRangeMassic(eMaxMeV: number): number {
  const e = Math.max(0.01, Math.min(3, eMaxMeV));
  return 0.412 * Math.pow(e, 1.265 - 0.0954 * Math.log(e));
}

/** Le même parcours, dans un matériau donné, en cm */
export function betaRange(material: Material, eMaxMeV: number): number {
  return betaRangeMassic(eMaxMeV) / material.rho;
}

/**
 * Coefficient d'absorption massique des β, en cm²/g.
 *
 * Un spectre β continu s'absorbe de façon très voisine d'une exponentielle,
 * jusqu'au parcours maximal où il s'arrête net. C'est cette coïncidence que
 * décrit la relation empirique ci-dessous.
 */
export function betaAbsorption(eMaxMeV: number): number {
  return 17 / Math.pow(Math.max(0.05, eMaxMeV), 1.14);
}

/**
 * Part de l'énergie des β convertie en rayonnement de freinage.
 *
 * C'est le piège du blindage β : plus l'écran est lourd, plus il transforme
 * les électrons en photons, contre lesquels il faut alors se protéger à
 * nouveau. D'où la règle d'atelier — d'abord du plastique, puis du plomb si
 * nécessaire, jamais l'inverse.
 */
export function bremsstrahlungYield(material: Material, eMaxMeV: number): number {
  return Math.min(1, 3.5e-4 * material.z * eMaxMeV);
}

export interface BetaResult {
  range: number;
  rangeMassic: number;
  stopped: boolean;
  /** Fraction de β transmise */
  transmitted: number;
  /** Part de l'énergie incidente ressortant en rayonnement de freinage */
  brems: number;
}

export function attenuateBeta(
  material: Material,
  eMaxMeV: number,
  thicknessCm: number
): BetaResult {
  const range = betaRange(material, eMaxMeV);
  const massic = thicknessCm * material.rho;
  const t = Math.exp(-betaAbsorption(eMaxMeV) * massic);
  const stopped = thicknessCm >= range;
  return {
    range,
    rangeMassic: betaRangeMassic(eMaxMeV),
    stopped,
    transmitted: stopped ? 0 : t,
    // Le freinage n'est produit que par les électrons effectivement arrêtés
    brems: bremsstrahlungYield(material, eMaxMeV) * (1 - (stopped ? 0 : t)),
  };
}

// ─── Alpha : un parcours, et c'est tout ─────────────────────────────────────

/** Parcours d'une particule α dans l'air, en cm, à 15 °C et 1 atm */
export function alphaRangeAir(eMeV: number): number {
  return eMeV < 4 ? 0.56 * eMeV : 1.24 * eMeV - 2.62;
}

/**
 * Le même parcours dans un matériau, en cm, par la règle de Bragg-Kleeman :
 * à énergie égale, le parcours varie comme √A / ρ.
 */
export function alphaRange(material: Material, eMeV: number): number {
  const rAir = alphaRangeAir(eMeV);
  const rhoAir = 1.205e-3;
  const aAir = 14.6;
  return rAir * (rhoAir / material.rho) * Math.sqrt(material.a / aAir);
}

export interface AlphaResult {
  range: number;
  rangeAir: number;
  stopped: boolean;
  transmitted: number;
}

export function attenuateAlpha(
  material: Material,
  eMeV: number,
  thicknessCm: number
): AlphaResult {
  const range = alphaRange(material, eMeV);
  return {
    range,
    rangeAir: alphaRangeAir(eMeV),
    // Les α n'ont pas de queue de transmission : tous s'arrêtent ensemble, à
    // la dispersion de parcours près.
    stopped: thicknessCm >= range,
    transmitted: thicknessCm >= range ? 0 : 1,
  };
}

// ─── Neutrons rapides : retrait ─────────────────────────────────────────────

export interface NeutronResult {
  sigma: number;
  transmitted: number;
  /** Épaisseur qui divise le flux par dix, en cm */
  tvl: number;
  /** Ce que l'hydrogène du matériau fait au ralentissement, de 0 à 1 */
  moderation: number;
}

export function attenuateNeutrons(
  material: Material,
  thicknessCm: number
): NeutronResult {
  const sigma = material.sigmaR;
  return {
    sigma,
    transmitted: Math.exp(-sigma * thicknessCm),
    tvl: Math.LN10 / sigma,
    moderation: Math.min(1, material.hFraction / 0.144),
  };
}

// ─── Comparaison entre matériaux ────────────────────────────────────────────

/**
 * Épaisseur de chaque matériau qui donne la même atténuation que `refCm` du
 * matériau de référence. Sert à répondre à la seule question qui compte en
 * pratique : combien faut-il d'un matériau pour remplacer l'autre ?
 */
export function equivalentThickness(
  reference: Material,
  refCm: number,
  sourceId: string
): { material: Material; cm: number; kgPerM2: number }[] {
  const target = linearAttenuation(reference, sourceId) * refCm;
  return MATERIALS.map((m) => {
    const cm = target / linearAttenuation(m, sourceId);
    return { material: m, cm, kgPerM2: cm * m.rho * 10 };
  });
}
