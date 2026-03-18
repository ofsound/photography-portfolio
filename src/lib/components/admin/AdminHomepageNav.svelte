<script lang="ts">
  import { resolve } from '$app/paths';

  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminSegmentedToggle from '$lib/components/admin/AdminSegmentedToggle.svelte';

  type Segment = {
    key: string;
    label: string;
    href: string;
  };

  const { title, segments, activeKey, ariaLabel, backHref, backAriaLabel } =
    $props<{
      title: string;
      segments: Segment[];
      activeKey: string;
      ariaLabel?: string;
      backHref?: string;
      backAriaLabel?: string;
    }>();
</script>

<AdminHeader>
  <nav class="flex flex-col gap-4 md:flex-row md:justify-between md:gap-0">
    <div class="flex justify-center md:order-2">
      <AdminSegmentedToggle {segments} {activeKey} {ariaLabel} />
    </div>
    <div
      class="flex flex-col gap-3 md:order-1 md:flex-row md:items-center md:gap-3"
    >
      <div class="flex items-center gap-3">
        {#if backHref}
          <a
            href={resolve(backHref as `/${string}`)}
            class="-m-2 p-2 text-text-muted transition-colors hover:text-brand"
            aria-label={backAriaLabel ?? 'Back'}
          >
            <svg
              class="size-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10 3 5 8l5 5" />
            </svg>
          </a>
        {/if}
        <AdminHeading>{title}</AdminHeading>
      </div>
    </div>
  </nav>
</AdminHeader>
