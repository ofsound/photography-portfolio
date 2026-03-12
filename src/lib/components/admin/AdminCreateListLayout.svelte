<script lang="ts">
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    formMessage?: string | null;
    formSuccess?: boolean;
    dataMessage?: string | null;
    dataSuccess?: boolean;
    clearDataMessageQuery?: boolean;
    overflow?: boolean;
    scrollListOnly?: boolean;
    reverseColumnOrder?: boolean;
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
    dataSuccess = false,
    clearDataMessageQuery = false,
    overflow = false,
    scrollListOnly = false,
    reverseColumnOrder = false,
    create,
    list,
    leading,
    actions,
  }: Props = $props();
</script>

{#if overflow}
  <div
    class="flex flex-col {scrollListOnly
      ? 'max-h-[calc(100dvh-var(--site-header-height)-8rem)] min-h-0'
      : ''}"
  >
    <AdminHeader>
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

      <AdminToastEmitter
        message={formMessage}
        type={formSuccess ? 'success' : 'error'}
      />
      <AdminToastEmitter
        message={dataMessage}
        type={dataSuccess ? 'success' : 'neutral'}
        clearQueryMessage={clearDataMessageQuery}
      />
    </AdminHeader>
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="grid min-h-0 flex-1 grid-rows-[1fr] gap-8 lg:grid-cols-[24rem_1fr]"
      >
        <div class="min-w-0 {scrollListOnly ? 'min-h-0 overflow-hidden' : ''}">
          {@render create()}
        </div>
        <div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {@render list()}
        </div>
      </div>
    </section>
  </div>
{:else}
  <AdminHeader>
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

    <AdminToastEmitter
      message={formMessage}
      type={formSuccess ? 'success' : 'error'}
    />
    <AdminToastEmitter
      message={dataMessage}
      type={dataSuccess ? 'success' : 'neutral'}
      clearQueryMessage={clearDataMessageQuery}
    />
  </AdminHeader>
  <section
    class="flex gap-8 {reverseColumnOrder
      ? 'flex-col-reverse lg:flex-row-reverse'
      : 'flex-col lg:flex-row'}"
  >
    <div
      class="min-w-0 lg:w-96 lg:shrink-0 {reverseColumnOrder
        ? '[&_form_button[type=submit]]:ml-auto'
        : ''}"
    >
      {@render create()}
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      {@render list()}
    </div>
  </section>
{/if}
