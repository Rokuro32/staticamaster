// ─── Constantes physiques fondamentales ──────────────────────────
export const h    = 6.626e-34;   // Constante de Planck (J·s)
export const hbar = 1.055e-34;   // ℏ = h / 2π (J·s)
export const k    = 1.381e-23;   // Constante de Boltzmann (J/K)
export const c    = 3e8;         // Vitesse de la lumière (m/s)
export const eV   = 1.602e-19;   // Électronvolt en joules
export const me   = 9.109e-31;   // Masse de l'électron (kg)

export const CONSTANTS_INFO: Record<string, { name: string; value: string; unit: string; latex: string }> = {
  h:    { name: 'Constante de Planck', value: '6.626 × 10⁻³⁴', unit: 'J·s', latex: 'h' },
  hbar: { name: 'Constante de Planck réduite', value: '1.055 × 10⁻³⁴', unit: 'J·s', latex: '\\hbar' },
  k:    { name: 'Constante de Boltzmann', value: '1.381 × 10⁻²³', unit: 'J/K', latex: 'k_B' },
  c:    { name: 'Vitesse de la lumière', value: '3.00 × 10⁸', unit: 'm/s', latex: 'c' },
  eV:   { name: 'Électronvolt', value: '1.602 × 10⁻¹⁹', unit: 'J', latex: '\\text{eV}' },
  me:   { name: 'Masse de l\'électron', value: '9.109 × 10⁻³¹', unit: 'kg', latex: 'm_e' },
};
