<script lang="ts">
  import { resolve } from '$app/paths';

  type Segment = {
    key: string;
    label: string;
    href: string;
  };

  const { segments, activeKey, ariaLabel } = $props<{
    segments: Segment[];
    activeKey: string;
    ariaLabel?: string;
  }>();
</script>

<div
  class="relative flex rounded-md bg-surface-muted"
  role="tablist"
  aria-label={ariaLabel}
>
  {#each segments as segment (segment.key)}
    <a
      href={resolve(segment.href as `/${string}`)}
      class="relative z-10 grid place-items-center rounded-md px-4 py-1.5 text-sm font-semibold tracking-wider uppercase transition-all duration-300 ease-(--ease-cinematic)"
      class:text-brand-contrast={activeKey === segment.key}
      class:text-text-subtle={activeKey !== segment.key}
      class:hover:text-text={activeKey !== segment.key}
      role="tab"
      aria-selected={activeKey === segment.key}
    >
      {#if activeKey === segment.key}
        <span class="absolute inset-0 rounded-md bg-brand"></span>
      {/if}
      <span class="relative">{segment.label}</span>
    </a>
  {/each}
</div>
