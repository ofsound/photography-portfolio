<script lang="ts">
  import { baseClasses, sizeClasses, variantClasses } from '$lib/styles/admin-buttons';
  import type { Size, Variant } from '$lib/styles/admin-buttons';

  let {
    size = 'md',
    variant = 'default',
    wFit = false,
    disabled = false,
    type = 'button',
    selected = false,
    href,
    as,
    class: className = '',
    children,
    ...restProps
  } = $props<{
    size?: Size;
    variant?: Variant;
    wFit?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    selected?: boolean;
    href?: string;
    as?: 'button' | 'a' | 'label';
    class?: string;
    children?: import('svelte').Snippet;
    [key: string]: unknown;
  }>();

  const isLabel = $derived(as === 'label');
  const isLink = $derived(Boolean(href) || as === 'a');

  const classes = $derived(
    [
      ['link', 'ghost', 'toggle'].includes(variant) ? '' : sizeClasses[size as Size],
      variantClasses[variant as Variant],
      variant === 'toggle' && selected ? 'bg-border' : '',
      variant === 'toggle' && !selected ? 'opacity-40' : '',
      baseClasses,
      wFit || isLink ? 'w-fit' : '',
      isLabel ? 'cursor-pointer' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );

  const commonAttrs = $derived({ class: classes });
</script>

{#if isLabel}
  <label {...commonAttrs} {...restProps}>{@render children?.()}</label>
{:else if isLink}
  <a href={href ?? '#'} {...commonAttrs} {...restProps}>{@render children?.()}</a>
{:else}
  <button {type} {disabled} {...commonAttrs} {...restProps}>{@render children?.()}</button>
{/if}
