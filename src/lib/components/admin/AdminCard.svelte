<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    adminCardVariantClasses,
    type AdminCardAs,
    type AdminCardVariant,
  } from '$lib/styles/admin-cards';

  type Props = {
    variant?: AdminCardVariant;
    as?: AdminCardAs;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const {
    variant = 'default',
    as = 'div',
    class: className = '',
    children,
    ...restProps
  }: Props = $props();

  const classes = $derived(
    [adminCardVariantClasses[variant as AdminCardVariant], className]
      .filter(Boolean)
      .join(' '),
  );
</script>

<svelte:element this={as} class={classes} {...restProps}>
  {@render children?.()}
</svelte:element>
