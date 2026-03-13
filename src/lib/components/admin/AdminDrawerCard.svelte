<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';

  type Props = {
    id: string;
    title: string;
    subtitle?: string;
    errorMessage?: string;
    storageKey?: string;
    defaultOpen?: boolean;
    children?: Snippet;
  };

  const {
    id,
    title,
    subtitle,
    errorMessage,
    storageKey,
    defaultOpen = false,
    children,
  }: Props = $props();

  let isOpen = $state(false);

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

  const toggle = () => {
    isOpen = !isOpen;
    if (storageKey) {
      localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
    }
  };
</script>

<AdminCard class="grid gap-3">
  <button
    id={toggleButtonId}
    type="button"
    class="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-muted"
    aria-expanded={isOpen}
    aria-controls={panelId}
    onclick={toggle}
  >
    <div class="grid gap-1">
      <p class="text-xs tracking-widest uppercase">{title}</p>
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

  <div id={panelId} class="grid gap-3 px-3 pb-3" hidden={!isOpen}>
    {@render children?.()}
  </div>
</AdminCard>
