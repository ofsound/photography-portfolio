<script lang="ts">
  type Size = 'sm' | 'md' | 'md-tall' | 'chip';
  type Variant = 'default' | 'success' | 'danger' | 'danger-outline' | 'info' | 'success-soft' | 'link';

  let {
    size = 'md',
    variant = 'default',
    wFit = false,
    disabled = false,
    type = 'button',
    class: className = '',
    children,
    ...restProps
  } = $props<{
    size?: Size;
    variant?: Variant;
    wFit?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    class?: string;
    children?: import('svelte').Snippet;
    [key: string]: unknown;
  }>();

  const sizeClasses: Record<Size, string> = {
    sm: 'px-2 py-1 text-xs uppercase tracking-[0.12em]',
    md: 'px-3 py-1 text-sm uppercase tracking-[0.14em]',
    'md-tall': 'h-[42px] px-3 py-1 text-base uppercase tracking-[0.14em]',
    chip: 'px-2 py-1 text-[10px]'
  };

  const variantClasses: Record<Variant, string> = {
    default: 'rounded border border-border-strong hover:bg-border',
    success: 'rounded border border-success/40 bg-success text-white',
    danger: 'rounded border border-danger/60 bg-danger text-white',
    'danger-outline': 'rounded border border-danger/60 text-danger',
    info: 'rounded border border-info/40 bg-info-soft',
    'success-soft': 'rounded border border-success/40 bg-success-soft',
    link: 'text-[10px] text-text-muted underline'
  };

  const baseClasses = 'disabled:opacity-40';
  const classes = $derived(
    [
      variant === 'link' ? '' : sizeClasses[size as Size],
      variantClasses[variant as Variant],
      baseClasses,
      wFit ? 'w-fit' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<button {type} {disabled} class={classes} {...restProps}>
  {@render children?.()}
</button>
