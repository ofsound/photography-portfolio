export type AdminCardVariant = 'default' | 'upload-dashed' | 'gradient';
export type AdminCardAs = 'div' | 'section' | 'article' | 'form' | 'li';

export const adminCardVariantClasses: Record<AdminCardVariant, string> = {
  default: 'rounded border border-border bg-surface',
  'upload-dashed':
    'rounded-lg border-2 border-dashed border-border-strong bg-surface',
  gradient:
    'rounded border border-border bg-gradient-to-br from-surface to-surface-muted',
};
