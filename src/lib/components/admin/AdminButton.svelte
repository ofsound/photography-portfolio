<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- external/fragment use raw href; internal use resolve(href) */
  import {
    sizeClasses,
    variantClasses,
    type Size,
    type Variant,
  } from '$lib/styles/admin-buttons';
  import { resolve } from '$app/paths';

  const {
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
      ['link', 'ghost'].includes(variant) ? '' : sizeClasses[size as Size],
      variantClasses[variant as Variant],
      variant === 'toggle' && selected ? 'bg-border' : '',
      variant === 'toggle' && !selected ? 'opacity-40' : '',
      disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer',
      wFit || isLink ? 'w-fit' : '',
      className,
    ]
      .filter(Boolean)
      .join(' '),
  );

  const commonAttrs = $derived({ class: classes });
</script>

{#if isLabel}
  <label {...commonAttrs} aria-disabled={disabled} {...restProps}
    >{@render children?.()}</label
  >
{:else if isLink}
  <a
    href={href == null
      ? '#'
      : href.startsWith('http') ||
          href.startsWith('//') ||
          href.startsWith('mailto:')
        ? href
        : resolve(href)}
    {...commonAttrs}
    aria-disabled={disabled}
    {...restProps}>{@render children?.()}</a
  >
{:else}
  <button {type} {disabled} {...commonAttrs} {...restProps}
    >{@render children?.()}</button
  >
{/if}
