<script lang="ts">
  import ZoomControl from '$lib/components/ZoomControl.svelte';

  const {
    query,
    chromeHidden,
    maxDensity,
    colCount,
    onSearchSubmit,
    onQueryInput,
    onUpdateDensity
  } = $props<{
    query: string;
    chromeHidden: boolean;
    maxDensity: number;
    colCount: number;
    onSearchSubmit: (event: SubmitEvent) => void;
    onQueryInput: (value: string) => void;
    onUpdateDensity: (value: number) => void;
  }>();
</script>

<div
  class="chrome-panel sticky top-[var(--sticky-offset)] z-30 mb-5 grid gap-2 rounded px-3 py-2 text-xs uppercase tracking-[var(--tracking-heading)] transition-opacity duration-[var(--duration-chrome)] ease-out lg:grid-cols-[1fr_auto] lg:items-center"
  class:opacity-0={chromeHidden}
>
  <form class="flex flex-1 items-center gap-2" onsubmit={onSearchSubmit}>
    <input
      name="q"
      value={query}
      oninput={(event) => onQueryInput((event.currentTarget as HTMLInputElement).value)}
      placeholder="Search"
      aria-label="Search title, description, tags, category"
      class="w-full rounded border border-border bg-transparent px-2 py-1"
    />
    <button class="flex shrink-0 items-center justify-center rounded border border-border-strong p-1.5 transition-colors hover:bg-surface-muted" type="submit" aria-label="Search">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
    </button>
  </form>

  <div class="flex flex-wrap items-center justify-end gap-3">
    <ZoomControl
      label="Items per row"
      min={1}
      max={maxDensity}
      value={colCount}
      onUpdate={onUpdateDensity}
    />
  </div>
</div>
