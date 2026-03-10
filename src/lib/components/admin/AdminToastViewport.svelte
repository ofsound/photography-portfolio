<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { fade, fly } from 'svelte/transition';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
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
      : { y: -10, duration: 220, opacity: 0 },
  );
  const fadeParams = $derived(
    prefersReducedMotion.current ? { duration: 0 } : { duration: 150 },
  );
  const toastEntries = $derived(adminToastEntries as ToastEntry[]);

  const toneClasses = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-success/40 bg-success-soft text-success';
      case 'error':
        return 'border-danger/40 bg-danger-soft text-danger';
      default:
        return 'border-border bg-surface text-text';
    }
  };
</script>

<div class={`pointer-events-none sticky top-3 z-[70] h-0 ${className}`}>
  <div
    class="pointer-events-none absolute left-1/2 flex w-full max-w-lg -translate-x-1/2 flex-col gap-2 px-2 sm:px-0"
  >
    {#each toastEntries as toast (toast.id)}
      <div
        class="pointer-events-auto"
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        in:fly={flyParams}
        out:fade={fadeParams}
      >
        <AdminCard
          class={`grid grid-cols-[1fr_auto] items-start gap-3 p-3 ${toneClasses(toast.type)}`}
        >
          <p class="text-sm leading-5">{toast.message}</p>
          <AdminButton
            size="xs"
            variant="default"
            class="shrink-0"
            onclick={() => dismissAdminToast(toast.id)}
          >
            Dismiss
          </AdminButton>
        </AdminCard>
      </div>
    {/each}
  </div>
</div>
