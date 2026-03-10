<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { fade, fly } from 'svelte/transition';
  import {
    adminToastEntries,
    dismissAdminToast,
    type ToastEntry,
    type ToastType,
  } from '$lib/stores/admin-toast.svelte';

  interface Props {
    class?: string;
  }

  const { class: className = '' }: Props = $props();

  const prefersReducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

  const flyParams = $derived(
    prefersReducedMotion.current
      ? { y: 0, duration: 0, opacity: 1 }
      : { y: -8, duration: 280, opacity: 0 },
  );
  const fadeParams = $derived(
    prefersReducedMotion.current ? { duration: 0 } : { duration: 200 },
  );

  const toastEntries = $derived(adminToastEntries as ToastEntry[]);

  const accentColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'ring-success/25 dark:ring-success/30';
      case 'error':
        return 'ring-danger/30 dark:ring-danger/35';
      default:
        return 'ring-border dark:ring-white/10';
    }
  };

  const iconPath = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'M4.5 12.75l6 6 9-13.5';
      case 'error':
        return 'M6 18L18 6M6 6l12 12';
      default:
        return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
    }
  };

  const iconColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-danger';
      default:
        return 'text-brand';
    }
  };
</script>

<div
  class={`pointer-events-none fixed left-1/2 z-70 flex w-full max-w-md -translate-x-1/2 flex-col gap-2.5 px-3 sm:px-0 ${className}`}
  style="top: calc(var(--site-header-height, var(--size-header)) + 0.9rem)"
>
  {#each toastEntries as toast (toast.id)}
    <div
      class="pointer-events-auto"
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      in:fly={flyParams}
      out:fade={fadeParams}
    >
      <div
        class="group relative grid grid-cols-[auto_1fr_auto] items-center gap-3
                 rounded-xl bg-surface/80 px-4 py-3
                 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03)]
                 ring-[1.5px] backdrop-blur-xl
                 dark:bg-surface/70 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]
                 {accentColor(toast.type)}"
      >
        <svg
          class="size-4.5 shrink-0 {iconColor(toast.type)}"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d={iconPath(toast.type)}
          />
        </svg>

        <p class="text-[13px] leading-5 text-text">{toast.message}</p>

        <button
          type="button"
          class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md
                   text-text-subtle transition-colors
                   hover:bg-surface-muted hover:text-text
                   focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand
                   {toast.sticky
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100'}"
          aria-label="Dismiss notification"
          onclick={() => dismissAdminToast(toast.id)}
        >
          <svg
            class="size-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  {/each}
</div>
