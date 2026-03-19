<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import type { ToastLinks } from '$lib/stores/admin-toast.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    formMessage?: string | null;
    formSuccess?: boolean;
    dataMessage?: string | null;
    dataSuccess?: boolean;
    clearDataMessageQuery?: boolean;
    toastLinks?: ToastLinks;
    overflow?: boolean;
    scrollListOnly?: boolean;
    reverseColumnOrder?: boolean;
    showMobileDivider?: boolean;
    class?: string;
    create: import('svelte').Snippet;
    list: import('svelte').Snippet;
    leading?: import('svelte').Snippet;
    actions?: import('svelte').Snippet;
    [key: string]: unknown;
  }

  const {
    title,
    subtitle,
    formMessage,
    formSuccess = false,
    dataMessage,
    dataSuccess = false,
    clearDataMessageQuery = false,
    toastLinks,
    overflow = false,
    scrollListOnly = false,
    reverseColumnOrder = false,
    showMobileDivider = false,
    class: className,
    create,
    list,
    leading,
    actions,
    ...rest
  }: Props = $props();

  const hasHeaderContent = $derived(!!(title ?? leading ?? actions));
</script>

{#if overflow}
  <div
    {...rest}
    class="flex flex-col {scrollListOnly
      ? 'lg:max-h-[calc(100dvh-var(--site-header-height)-8rem)] lg:min-h-0'
      : ''} {className ?? ''}"
  >
    {#if hasHeaderContent}
      <AdminPageHeader
        title={title ?? ''}
        {subtitle}
        {formMessage}
        {formSuccess}
        {dataMessage}
        {dataSuccess}
        {clearDataMessageQuery}
        {toastLinks}
        {leading}
        {actions}
      />
    {:else}
      <div class="mb-4">
        <AdminToastEmitter
          message={formMessage}
          type={formSuccess ? 'success' : 'error'}
          links={formSuccess ? toastLinks : undefined}
        />
        <AdminToastEmitter
          message={dataMessage}
          type={dataSuccess ? 'success' : 'neutral'}
          clearQueryMessage={clearDataMessageQuery}
          links={dataSuccess ? toastLinks : undefined}
        />
      </div>
    {/if}
    <section class="flex flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
      <div
        class="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-8 lg:grid-cols-[24rem_1fr] lg:grid-rows-[1fr]"
      >
        <div
          class="min-w-0 {scrollListOnly
            ? 'lg:min-h-0 lg:overflow-hidden'
            : ''}"
        >
          {@render create()}
        </div>
        <div class="flex min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          {@render list()}
        </div>
      </div>
    </section>
  </div>
{:else}
  <div {...rest} class={className ?? ''}>
    {#if hasHeaderContent}
      <AdminPageHeader
        title={title ?? ''}
        {subtitle}
        {formMessage}
        {formSuccess}
        {dataMessage}
        {dataSuccess}
        {clearDataMessageQuery}
        {toastLinks}
        {leading}
        {actions}
      />
    {:else}
      <div class="mb-4">
        <AdminToastEmitter
          message={formMessage}
          type={formSuccess ? 'success' : 'error'}
          links={formSuccess ? toastLinks : undefined}
        />
        <AdminToastEmitter
          message={dataMessage}
          type={dataSuccess ? 'success' : 'neutral'}
          clearQueryMessage={clearDataMessageQuery}
          links={dataSuccess ? toastLinks : undefined}
        />
      </div>
    {/if}
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
      {#if showMobileDivider}
        <div class="h-px shrink-0 bg-border lg:hidden" aria-hidden="true"></div>
      {/if}
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        {@render list()}
      </div>
    </section>
  </div>
{/if}
