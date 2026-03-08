<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { page } from '$app/state';

  import type { Snippet } from 'svelte';

  let {
    id,
    label,
    open = $bindable(false),
    children,
  }: {
    id: string;
    label: string;
    open?: boolean;
    children?: Snippet;
  } = $props();

  let panelEl = $state<HTMLElement | null>(null);
  let previousBodyOverflow = $state<string | null>(null);
  const panelTransition = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? { y: 0, duration: 1 }
      : { y: -12, duration: 220 };
  const scrimTransition = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? { duration: 1 }
      : { duration: 180 };

  $effect(() => {
    if (typeof document === 'undefined') return;
    const inertRoots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mobile-menu-root]'),
    );

    if (open) {
      if (previousBodyOverflow === null) {
        previousBodyOverflow = document.body.style.overflow || '';
      }
      document.body.style.overflow = 'hidden';
      for (const root of inertRoots) {
        root.setAttribute('inert', '');
      }
    } else {
      document.body.style.overflow = previousBodyOverflow ?? '';
      previousBodyOverflow = null;
      for (const root of inertRoots) {
        root.removeAttribute('inert');
      }
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow ?? '';
      previousBodyOverflow = null;
      for (const root of inertRoots) {
        root.removeAttribute('inert');
      }
    };
  });

  $effect(() => {
    const routeKey = `${page.url.pathname}${page.url.search}`;
    if (routeKey && open) {
      open = false;
    }
  });

  $effect(() => {
    if (typeof window === 'undefined' || !open) return;
    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = panelEl?.querySelector<HTMLElement>(
        [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      );
      firstFocusable?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (typeof document === 'undefined' || !open) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!panelEl || !panelEl.contains(target)) return;
      if (target.closest('a[href]')) {
        open = false;
      }
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  });
</script>

<div class="relative flex items-center">
  <button
    type="button"
    aria-label={label}
    aria-controls={id}
    aria-expanded={open}
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    onclick={() => {
      open = !open;
    }}
  >
    <svg
      class="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if open}
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      {:else}
        <path d="M3 6h18" />
        <path d="M3 12h18" />
        <path d="M3 18h18" />
      {/if}
    </svg>
  </button>
</div>

<svelte:window
  onkeydown={(event) => {
    if (open && event.key === 'Escape') {
      open = false;
    }
  }}
/>

{#if open}
  <div
    class="fixed inset-x-0 top-[var(--size-mobile-header-offset)] bottom-0 z-50 md:hidden"
  >
    <button
      type="button"
      class="absolute inset-0 bg-overlay/55"
      aria-label="Close menu"
      onclick={() => {
        open = false;
      }}
      in:fade={scrimTransition()}
      out:fade={scrimTransition()}
    ></button>

    <section
      bind:this={panelEl}
      {id}
      class="chrome-panel relative origin-top border-b border-border shadow-lg"
      in:fly={panelTransition()}
      out:fly={panelTransition()}
    >
      <div
        class="max-h-[calc(100dvh-var(--size-mobile-header-offset))] overflow-y-auto p-4"
      >
        {@render children?.()}
      </div>
    </section>
  </div>
{/if}
