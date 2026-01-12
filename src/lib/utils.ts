// Fonctions utilitaires

import { v4 as uuidv4 } from 'uuid';

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Générateur de nombres pseudo-aléatoires avec seed
 * Utilise l'algorithme Mulberry32
 */
export function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Génère un nombre aléatoire dans une plage avec un pas
 */
export function randomInRange(
  min: number,
  max: number,
  step: number,
  random: () => number
): number {
  const steps = Math.floor((max - min) / step);
  const randomStep = Math.floor(random() * (steps + 1));
  return min + randomStep * step;
}

/**
 * Arrondit à un nombre de décimales
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Vérifie si deux nombres sont égaux avec une tolérance
 */
export function isApproximatelyEqual(
  value: number,
  expected: number,
  tolerance: number,
  toleranceType: 'percent' | 'absolute'
): boolean {
  if (toleranceType === 'absolute') {
    return Math.abs(value - expected) <= tolerance;
  } else {
    // Tolérance en pourcentage
    if (expected === 0) {
      return Math.abs(value) <= tolerance / 100;
    }
    const percentError = Math.abs((value - expected) / expected) * 100;
    return percentError <= tolerance;
  }
}

/**
 * Calcule l'erreur en pourcentage
 */
export function percentError(value: number, expected: number): number {
  if (expected === 0) {
    return value === 0 ? 0 : Infinity;
  }
  return Math.abs((value - expected) / expected) * 100;
}

/**
 * Convertit des degrés en radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convertit des radians en degrés
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalise un angle en degrés entre 0 et 360
 */
export function normalizeAngle(degrees: number): number {
  degrees = degrees % 360;
  return degrees < 0 ? degrees + 360 : degrees;
}

/**
 * Calcule la distance entre deux points
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Vérifie si deux angles sont similaires (en degrés)
 */
export function anglesAreSimilar(
  angle1: number,
  angle2: number,
  tolerance: number = 5
): boolean {
  const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
  return diff <= tolerance || diff >= 360 - tolerance;
}

/**
 * Formate un nombre avec unité
 */
export function formatWithUnit(value: number, unit: string, decimals: number = 2): string {
  return `${roundTo(value, decimals)} ${unit}`;
}

/**
 * Parse une réponse numérique avec unité
 */
export function parseNumericAnswer(input: string): { value: number | null; unit: string } {
  const cleaned = input.trim();
  const match = cleaned.match(/^([+-]?\d*\.?\d+)\s*(.*)$/);

  if (!match) {
    return { value: null, unit: '' };
  }

  return {
    value: parseFloat(match[1]),
    unit: match[2].trim(),
  };
}

/**
 * Normalise une unité pour comparaison
 */
export function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('newtons', 'n')
    .replace('newton', 'n')
    .replace('n·m', 'nm')
    .replace('n.m', 'nm')
    .replace('n*m', 'nm')
    .replace('mpa', 'mpa')
    .replace('megapascal', 'mpa')
    .replace('pascals', 'pa')
    .replace('pascal', 'pa')
    .replace('meters', 'm')
    .replace('meter', 'm')
    .replace('mètres', 'm')
    .replace('mètre', 'm')
    .replace('kilonewtons', 'kn')
    .replace('kilonewton', 'kn');
}

/**
 * Vérifie si deux unités sont équivalentes
 */
export function unitsAreEquivalent(unit1: string, unit2: string): boolean {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
}

/**
 * Crée un seed reproductible à partir d'une date et d'un ID
 */
export function createSeed(questionId: string, dateString?: string): number {
  const str = questionId + (dateString || new Date().toISOString().split('T')[0]);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Mélange un tableau avec un seed
 */
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Formate un temps en secondes en mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calcule le score basé sur le temps (bonus pour rapidité)
 */
export function calculateTimeBonus(timeSpent: number, maxTime: number): number {
  if (timeSpent >= maxTime) return 0;
  const ratio = 1 - timeSpent / maxTime;
  return Math.round(ratio * 20); // Max 20 points bonus
}

/**
 * Classe CSS conditionnelle
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
