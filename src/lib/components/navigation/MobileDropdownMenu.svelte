<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { fade, fly } from 'svelte/transition';

  import type { Snippet } from 'svelte';

  let {
    id,
    label,
    open = $bindable(false),
    inertSelector = '[data-mobile-menu-root]',
    children,
  }: {
    id: string;
    label: string;
    open?: boolean;
    inertSelector?: string;
    children?: Snippet;
  } = $props();

  let isOpen = $state(Boolean(open));
  let panelEl = $state<HTMLElement | null>(null);
  let previousBodyOverflow: string | null = null;

  const setOpen = (next: boolean) => {
    isOpen = next;
    open = next;
  };
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
      document.querySelectorAll<HTMLElement>(inertSelector),
    );

    if (isOpen) {
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

  afterNavigate(() => {
    if (isOpen) {
      setOpen(false);
    }
  });

  $effect(() => {
    if (typeof window === 'undefined' || !isOpen) return;
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
</script>

<div class="relative flex items-center">
  <button
    type="button"
    aria-label={label}
    aria-controls={id}
    aria-expanded={isOpen}
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    onclick={() => {
      setOpen(!isOpen);
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
      {#if isOpen}
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
    if (isOpen && event.key === 'Escape') {
      setOpen(false);
    }
  }}
/>

{#if isOpen}
  <div
    class="fixed inset-x-0 top-[var(--size-mobile-header-offset)] z-50 h-[calc(100dvh-var(--size-mobile-header-offset))] md:hidden"
  >
    <button
      type="button"
      class="absolute inset-0 bg-overlay/55"
      aria-label="Close menu"
      onclick={() => {
        setOpen(false);
      }}
      in:fade={scrimTransition()}
      out:fade={scrimTransition()}
    ></button>

    <section
      bind:this={panelEl}
      {id}
      class="absolute inset-0 origin-top border-b border-border bg-surface-strong"
      in:fly={panelTransition()}
      out:fly={panelTransition()}
    >
      <div
        class="h-full overflow-y-auto p-4 pt-2"
      >
        {@render children?.()}
      </div>
    </section>
  </div>
{/if}
