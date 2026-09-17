// Fonctions utilitaires partagées par les simulations

/**
 * Arrondit à un nombre de décimales
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
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
 * Formate un nombre avec unité
 */
export function formatWithUnit(value: number, unit: string, decimals: number = 2): string {
  return `${roundTo(value, decimals)} ${unit}`;
}

/**
 * Classe CSS conditionnelle
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
