import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        chrome: 'rgb(var(--color-chrome) / <alpha-value>)',
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        'surface-strong': 'rgb(var(--color-surface-strong) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'text-subtle': 'rgb(var(--color-text-subtle) / <alpha-value>)',
        'text-inverse': 'rgb(var(--color-text-inverse) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        brand: 'rgb(var(--color-brand) / <alpha-value>)',
        'brand-contrast': 'rgb(var(--color-brand-contrast) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        'success-soft': 'rgb(var(--color-success-soft) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        'warning-soft': 'rgb(var(--color-warning-soft) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--color-danger-soft) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'info-soft': 'rgb(var(--color-info-soft) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        'canvas-text': 'rgb(var(--color-canvas-text) / <alpha-value>)',
        'canvas-border': 'rgb(var(--color-canvas-border) / <alpha-value>)',
        overlay: 'rgb(var(--color-overlay) / <alpha-value>)'
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
