/** Shared admin button styles - single source of truth for AdminButton and any compatible elements. */

export type Size = 'sm' | 'md' | 'md-tall' | 'chip';
export type Variant =
  | 'default'
  | 'success'
  | 'danger'
  | 'danger-outline'
  | 'info'
  | 'success-soft'
  | 'link'
  | 'ghost'
  | 'toggle'
  | 'subtle';

export const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-1 text-xs uppercase tracking-[var(--tracking-tight)]',
  md: 'px-3 py-1 text-sm uppercase tracking-[var(--tracking-label)]',
  'md-tall': 'h-[var(--size-btn-tall)] px-3 py-1 text-base uppercase tracking-[var(--tracking-label)]',
  chip: 'px-2 py-1 text-[var(--text-chip)]'
};

export const variantClasses: Record<Variant, string> = {
  default: 'rounded border border-admin-btn-border bg-admin-btn-bg hover:bg-border',
  success: 'rounded border border-success/40 bg-success text-white hover:opacity-90',
  danger: 'rounded border border-danger/60 bg-danger text-white',
  'danger-outline': 'rounded border border-danger/60 bg-danger-soft text-danger',
  info: 'rounded border border-info/40 bg-info-soft',
  'success-soft': 'rounded border border-success/40 bg-success-soft',
  link: 'text-[var(--text-chip)] text-text-muted underline',
  ghost: 'rounded text-text-muted transition-colors hover:bg-border hover:text-text',
  toggle: 'rounded border border-border-strong px-2 py-1',
  subtle: 'rounded border border-border hover:bg-surface-muted'
};

export const baseClasses = 'disabled:opacity-40';
