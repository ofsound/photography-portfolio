export type AdminCardVariant =
  | 'default'
  | 'upload-dashed'
  | 'gradient'
  | 'striped';
export type AdminCardAs = 'div' | 'section' | 'article' | 'form' | 'li';

export const adminCardVariantClasses: Record<AdminCardVariant, string> = {
  default: 'rounded border border-border bg-surface',
  'upload-dashed':
    'rounded-lg border-2 border-dashed border-border-strong bg-surface',
  gradient:
    'rounded border border-border bg-gradient-to-br from-surface to-surface-muted',
  striped:
    'rounded border border-border bg-surface-muted [background-image:repeating-linear-gradient(-45deg,transparent,transparent_6px,var(--color-admin-diagonal)_6px,var(--color-admin-diagonal)_8px)]',
};
