import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
