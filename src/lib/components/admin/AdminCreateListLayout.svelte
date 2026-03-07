<script lang="ts">
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    formMessage?: string | null;
    formSuccess?: boolean;
    dataMessage?: string | null;
    overflow?: boolean;
    create: import('svelte').Snippet;
    list: import('svelte').Snippet;
    leading?: import('svelte').Snippet;
    actions?: import('svelte').Snippet;
  }

  const {
    title,
    subtitle,
    formMessage,
    formSuccess = false,
    dataMessage,
    overflow = false,
    create,
    list,
    leading,
    actions,
  }: Props = $props();
</script>

<div class="flex items-center gap-3">
  {#if leading}
    {@render leading()}
  {/if}
  <AdminHeading>{title}</AdminHeading>
  {#if actions}
    {@render actions()}
  {/if}
</div>

{#if subtitle}
  <p class="mt-2 text-sm text-text-muted">{subtitle}</p>
{/if}

{#if formMessage}
  <AdminStatusMessage type={formSuccess ? 'success' : 'error'} class="mt-3">
    {formMessage}
  </AdminStatusMessage>
{/if}
{#if dataMessage}
  <AdminStatusMessage type="neutral" class="mt-3">
    {dataMessage}
  </AdminStatusMessage>
{/if}

{#if overflow}
  <section class="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
    <div
      class="grid min-h-0 flex-1 grid-rows-[1fr] gap-8 lg:grid-cols-[24rem_1fr]"
    >
      <div class="min-w-0">
        {@render create()}
      </div>
      <div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {@render list()}
      </div>
    </div>
  </section>
{:else}
  <section class="mt-6 flex flex-col gap-8 lg:flex-row">
    <div class="min-w-0 lg:w-96 lg:shrink-0">
      {@render create()}
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      {@render list()}
    </div>
  </section>
{/if}
