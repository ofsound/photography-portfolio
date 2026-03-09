/** Shared admin button styles - single source of truth for AdminButton and any compatible elements. */

export type Size = 'xs' | 'sm' | 'md' | 'md-tall' | 'chip';
export type Variant =
  | 'default'
  | 'submit'
  | 'danger'
  | 'ghost'
  | 'toggle'
  | 'subtle'
  | 'surface';

export const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-0.5 text-xs uppercase tracking-widest',
  sm: 'px-3 py-1 text-xs uppercase tracking-widest',
  md: 'px-3 py-1 text-sm uppercase tracking-widest',
  'md-tall': 'h-11 px-3 py-1 text-base uppercase tracking-widest',
  chip: 'px-2 py-1 text-xs',
};

export const variantClasses: Record<Variant, string> = {
  default:
    'w-fit rounded border border-admin-btn-border bg-admin-btn-bg transition-colors duration-150 hover:border-admin-btn-hover hover:bg-admin-btn-hover active:border-admin-btn-active active:bg-admin-btn-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-btn-focus disabled:border-admin-btn-border-disabled disabled:bg-admin-btn-disabled disabled:cursor-not-allowed disabled:opacity-75',
  submit:
    'w-fit rounded border border-success/40 bg-success text-white transition-colors duration-150 hover:border-success-border-hover hover:bg-success-hover active:border-success-border-active active:bg-success-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-focus disabled:border-success-border-disabled disabled:bg-success-disabled disabled:cursor-not-allowed disabled:text-white/75',
  danger:
    'rounded border border-danger/60 bg-danger text-white transition-colors duration-150 hover:border-danger-border-hover hover:bg-danger-hover active:border-danger-border-active active:bg-danger-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-focus disabled:border-danger-border-disabled disabled:bg-danger-disabled disabled:cursor-not-allowed disabled:text-white/75',
  ghost:
    'rounded text-text-muted transition-colors hover:bg-border hover:text-text',
  toggle: 'rounded border border-border-strong',
  subtle: 'rounded border border-border hover:bg-surface-muted',
  surface:
    'rounded border border-border-strong bg-surface hover:bg-surface-muted',
};
