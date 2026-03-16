<script lang="ts">
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    formMessage?: string | null;
    formSuccess?: boolean;
    dataMessage?: string | null;
    dataSuccess?: boolean;
    clearDataMessageQuery?: boolean;
    leading?: import('svelte').Snippet;
    actions?: import('svelte').Snippet;
    toasts?: import('svelte').Snippet;
    afterHeader?: import('svelte').Snippet;
  }

  const {
    title,
    subtitle,
    formMessage,
    formSuccess = false,
    dataMessage,
    dataSuccess = false,
    clearDataMessageQuery = false,
    leading,
    actions,
    toasts,
    afterHeader,
  }: Props = $props();
</script>

<AdminHeader>
  <div
    class="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-4"
  >
    <div class="order-last flex flex-wrap items-center gap-4 md:order-1">
      {#if leading}
        {@render leading()}
      {/if}
      <AdminHeading>{title}</AdminHeading>
    </div>
    {#if actions}
      <div
        class="order-first flex w-full justify-center md:order-2 md:ml-auto md:w-auto"
      >
        {@render actions()}
      </div>
    {/if}
  </div>

  {#if subtitle}
    <p class="mt-2 text-sm text-text-muted">{subtitle}</p>
  {/if}

  {#if toasts}
    {@render toasts()}
  {:else}
    <AdminToastEmitter
      message={formMessage}
      type={formSuccess ? 'success' : 'error'}
    />
    <AdminToastEmitter
      message={dataMessage}
      type={dataSuccess ? 'success' : 'neutral'}
      clearQueryMessage={clearDataMessageQuery}
    />
  {/if}

  {#if afterHeader}
    {@render afterHeader()}
  {/if}
</AdminHeader>
