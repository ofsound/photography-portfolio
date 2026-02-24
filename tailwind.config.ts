import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        chrome: 'rgb(var(--color-chrome) / <alpha-value>)'
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snappy: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        experimental: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
      }
    }
  },
  plugins: []
} satisfies Config;
