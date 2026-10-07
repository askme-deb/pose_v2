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
      // ~1px larger than Tailwind's defaults across the body-text range, for
      // readability. Headings (2xl and up) keep the default scale.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1.0625rem', { lineHeight: '1.625rem' }],
        lg: ['1.1875rem', { lineHeight: '1.75rem' }],
        xl: ['1.3125rem', { lineHeight: '1.875rem' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
