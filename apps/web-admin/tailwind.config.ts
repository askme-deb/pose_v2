import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-library/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        violet: { 600: '#7c3aed' },
        cyan: { 500: '#06b6d4' },
      },
      fontFamily: { sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
