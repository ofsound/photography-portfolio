<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- external/fragment use raw href; internal use resolve(href) */
  import { resolve } from '$app/paths';

  import {
    sizeClasses,
    variantClasses,
    type Size,
    type Variant,
  } from '$lib/styles/admin-buttons';

  const {
    size = 'md',
    variant = 'default',
    disabled = false,
    type = 'button',
    selected,
    href,
    as,
    class: className = '',
    onclick,
    children,
    ...restProps
  } = $props<{
    size?: Size;
    variant?: Variant;
    disabled?: boolean;
    type?: 'button' | 'submit';
    selected?: boolean | undefined;
    href?: string;
    as?: 'button' | 'a' | 'label';
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
    [key: string]: unknown;
  }>();

  const isLabel = $derived(as === 'label');
  const isLink = $derived(Boolean(href) || as === 'a');

  const classes = $derived(
    [
      variant === 'link' ? '' : sizeClasses[size as Size],
      variantClasses[variant as Variant],
      variant === 'default' && selected === true ? 'bg-border' : '',
      variant === 'default' && selected === false ? 'opacity-40' : '',
      disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' '),
  );

  const commonAttrs = $derived({ class: classes });
</script>

{#if isLabel}
  <label {...commonAttrs} aria-disabled={disabled} {onclick} {...restProps}
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
    {onclick}
    {...restProps}>{@render children?.()}</a
  >
{:else}
  <button {type} {disabled} {...commonAttrs} {onclick} {...restProps}
    >{@render children?.()}</button
  >
{/if}
