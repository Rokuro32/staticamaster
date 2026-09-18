import type { Config } from 'tailwindcss'

/*
 * Palette dérivée de l'identité du Cégep de Thetford :
 * noir du blason, or/kaki du champ, blanc du liseré.
 */
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    // Les thèmes de section vivent dans src/lib/catalog.ts : sans cette ligne,
    // aucune de leurs classes n'est générée.
    './src/lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // Noir du blason — légèrement chaud pour s'accorder à l'or
        ink: {
          950: '#0a0a09',
          900: '#121211',
          850: '#171716',
          800: '#1e1e1c',
          750: '#262523',
          700: '#302f2c',
          600: '#45433e',
          500: '#5e5b54',
        },
        // Or / kaki du blason — couleur d'accent de la marque
        gold: {
          50: '#faf7ee',
          100: '#f2ebd7',
          200: '#e5d9b6',
          300: '#d6c593',
          400: '#c9b37c', // teinte du blason
          500: '#b79c5f',
          600: '#9c8349',
          700: '#7c673a',
          800: '#5a4b2c',
          900: '#3a3120',
        },
        // Accents de section : une famille harmonisée autour de l'or,
        // `deep` servant sur fond clair (page d'une simulation).
        sec: {
          math: { DEFAULT: '#c9b37c', deep: '#6e5c2f' },
          statique: { DEFAULT: '#b08968', deep: '#6b4b33' },
          cinema: { DEFAULT: '#8fae84', deep: '#45603c' },
          meca: { DEFAULT: '#9aa5ae', deep: '#4a545c' },
          ondes: { DEFAULT: '#8098b8', deep: '#3f5372' },
          elec: { DEFAULT: '#dcc05a', deep: '#6e5d14' },
          moderne: { DEFAULT: '#9e8cb8', deep: '#534370' },
          nucleaire: { DEFAULT: '#c1705a', deep: '#73341f' },
          fluides: { DEFAULT: '#7fb0a4', deep: '#2f5c51' },
        },
        // Scène claire (pages de simulation)
        scene: {
          50: '#faf9f7',
          100: '#f3f1ec',
          200: '#e6e2d9',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 24px -6px var(--tw-shadow-color)',
        glow: '0 0 48px -12px var(--tw-shadow-color)',
        lift: '0 18px 40px -20px rgba(0, 0, 0, 0.85)',
      },
      backgroundImage: {
        grid: `linear-gradient(to right, rgba(201, 179, 124, 0.07) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(201, 179, 124, 0.07) 1px, transparent 1px)`,
      },
      backgroundSize: {
        grid: '44px 44px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -4%, 0) scale(1.08)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        drift: 'drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
