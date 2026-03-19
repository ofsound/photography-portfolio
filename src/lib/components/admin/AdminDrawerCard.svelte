<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  import { browser } from '$app/environment';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';

  import type { AdminCardVariant } from '$lib/styles/admin-cards';

  const SLIDE_DURATION_MS = 280;

  type Props = {
    id: string;
    title: string;
    subtitle?: string;
    errorMessage?: string;
    storageKey?: string;
    defaultOpen?: boolean;
    variant?: AdminCardVariant;
    children?: Snippet;
  };

  const {
    id,
    title,
    subtitle,
    errorMessage,
    storageKey,
    defaultOpen = false,
    variant = 'default',
    children,
  }: Props = $props();

  let isOpen = $state(false);
  let panelEl = $state<HTMLDivElement | undefined>();

  const panelId = $derived(`${id}-panel`);
  const toggleButtonId = $derived(`${id}-toggle`);

  onMount(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      isOpen = stored === 'open';
    } else {
      isOpen = defaultOpen;
    }
  });

  const scrollPanelIntoViewAfterOpen = () => {
    if (!browser) return;
    const el = panelEl;
    if (!el?.isConnected) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    el.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'nearest',
    });
  };

  const toggle = () => {
    isOpen = !isOpen;
    if (storageKey) {
      localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
    }
  };
</script>

<AdminCard {variant} class="grid gap-3">
  <button
    id={toggleButtonId}
    type="button"
    class="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-3 py-3 text-left"
    aria-expanded={isOpen}
    aria-controls={panelId}
    onclick={toggle}
  >
    <div class="grid gap-1">
      <AdminHeading level={3} tag="span">{title}</AdminHeading>
      {#if subtitle}
        <p class="text-xs text-text-muted">{subtitle}</p>
      {/if}
      {#if errorMessage}
        <p class="text-xs text-danger">{errorMessage}</p>
      {/if}
    </div>

    <svg
      class="size-3 shrink-0 transition-transform"
      class:rotate-180={isOpen}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  </button>

  {#if isOpen}
    <div
      bind:this={panelEl}
      id={panelId}
      class="grid gap-3 px-3 pb-3"
      onintroend={scrollPanelIntoViewAfterOpen}
      transition:slide={{
        duration: SLIDE_DURATION_MS,
        easing: quintOut,
        axis: 'y',
      }}
    >
      {@render children?.()}
    </div>
  {/if}
</AdminCard>
