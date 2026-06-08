import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080810',
        surface: '#0f0f1a',
        'surface-2': '#15151f',
        border: 'rgba(255,255,255,0.06)',
        'border-strong': 'rgba(255,255,255,0.10)',
        muted: '#6b6b7b',
        // Sector delta accents
        'delta-pb': '#9B59D0',
        'delta-fast': '#27F4D2',
        'delta-slow': '#FFD600',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 1.4s ease-in-out infinite',
        'skeleton-pulse': 'skeleton-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
