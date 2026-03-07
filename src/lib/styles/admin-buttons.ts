/** Shared admin button styles - single source of truth for AdminButton and any compatible elements. */

export type Size = 'xs' | 'sm' | 'md' | 'md-tall' | 'chip';
export type Variant =
  | 'default'
  | 'submit'
  | 'danger'
  | 'ghost'
  | 'toggle'
  | 'subtle'
  | 'pill-success'
  | 'pill-danger';

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
  danger:
    'rounded border border-danger/60 bg-danger text-white hover:opacity-90',
  ghost:
    'rounded text-text-muted transition-colors hover:bg-border hover:text-text',
  toggle: 'rounded border border-border-strong',
  subtle: 'rounded border border-border hover:bg-surface-muted',
  'pill-success':
    'rounded-full px-2.5 py-0.5 text-xs uppercase tracking-widest tabular-nums transition-all',
  'pill-danger':
    'rounded-full px-2.5 py-0.5 text-xs uppercase tracking-widest tabular-nums transition-all',
};

export const pillVariantSelectedClasses: Record<
  'pill-success' | 'pill-danger',
  string
> = {
  'pill-success': 'bg-success text-white ring-1 ring-success/40',
  'pill-danger': 'bg-danger text-white ring-1 ring-danger/40',
};

export const pillVariantUnselectedClasses: Record<
  'pill-success' | 'pill-danger',
  string
> = {
  'pill-success':
    'bg-success text-white opacity-40 ring-1 ring-success/20 hover:opacity-60 hover:ring-success/40',
  'pill-danger':
    'bg-danger text-white opacity-40 ring-1 ring-danger/20 hover:opacity-60 hover:ring-danger/40',
};
