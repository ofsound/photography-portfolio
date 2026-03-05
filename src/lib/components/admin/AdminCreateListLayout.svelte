<script lang="ts">
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    formMessage?: string | null;
    dataMessage?: string | null;
    listHeading?: string;
    overflow?: boolean;
    create: import('svelte').Snippet;
    list: import('svelte').Snippet;
  }

  const {
    title,
    subtitle,
    formMessage,
    dataMessage,
    listHeading,
    overflow = false,
    create,
    list,
  }: Props = $props();
</script>

<AdminHeading>{title}</AdminHeading>

{#if subtitle}
  <p class="mt-2 text-sm text-text-muted">{subtitle}</p>
{/if}

{#if formMessage}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {formMessage}
  </p>
{/if}
{#if dataMessage}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {dataMessage}
  </p>
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
        {#if listHeading}
          <h2 class="mb-2 shrink-0 text-sm tracking-widest uppercase">
            {listHeading}
          </h2>
        {/if}
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
      {#if listHeading}
        <h2 class="text-sm tracking-widest uppercase">{listHeading}</h2>
      {/if}
      {@render list()}
    </div>
  </section>
{/if}
