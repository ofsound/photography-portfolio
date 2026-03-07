/** Shared admin button styles - single source of truth for AdminButton and any compatible elements. */

export type Size = 'xs' | 'sm' | 'md' | 'md-tall' | 'chip';
export type Variant =
  | 'default'
  | 'submit'
  | 'danger'
  | 'ghost'
  | 'toggle'
  | 'subtle';

export const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-0.5 text-xs uppercase tracking-widest',
  sm: 'px-3 py-1 text-xs uppercase tracking-widest',
  md: 'px-3.5 py-1 text-sm uppercase tracking-widest',
  'md-tall': 'h-11 px-3 py-1 text-base uppercase tracking-widest',
  chip: 'px-2 py-1 text-xs',
};

export const variantClasses: Record<Variant, string> = {
  default:
    'rounded border border-admin-btn-border bg-admin-btn-bg hover:bg-border',
  submit:
    'rounded border border-success/40 bg-success text-white hover:opacity-90',
  danger: 'rounded border border-danger/60 bg-danger text-white hover:opacity-90',
  ghost:
    'rounded text-text-muted transition-colors hover:bg-border hover:text-text',
  toggle: 'rounded border border-border-strong',
  subtle: 'rounded border border-border hover:bg-surface-muted',
};
