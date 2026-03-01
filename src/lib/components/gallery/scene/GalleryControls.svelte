<script lang="ts">
  let {
    query,
    chromeHidden,
    maxDensity,
    colCount,
    gap,
    layoutMode,
    widthMode,
    onSearchSubmit,
    onQueryInput,
    onUpdateDensity,
    onUpdateGap,
    onUpdateLayoutMode,
    onUpdateWidthMode
  } = $props<{
    query: string;
    chromeHidden: boolean;
    maxDensity: number;
    colCount: number;
    gap: number;
    layoutMode: 'uniform' | 'masonry';
    widthMode: 'full' | 'constrained';
    onSearchSubmit: (event: SubmitEvent) => void;
    onQueryInput: (value: string) => void;
    onUpdateDensity: (value: number) => void;
    onUpdateGap: (value: number) => void;
    onUpdateLayoutMode: (value: 'uniform' | 'masonry') => void;
    onUpdateWidthMode: (value: 'full' | 'constrained') => void;
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
      placeholder="Search title, description, tags, category"
      class="w-full rounded border border-border bg-transparent px-2 py-1"
    />
    <button class="rounded border border-border-strong px-2 py-1" type="submit">Search</button>
  </form>

  <div class="flex flex-wrap items-center justify-end gap-3">
    <label class="flex items-center gap-2">
      Density
      <input
        type="range"
        min="1"
        max={String(maxDensity)}
        value={colCount}
        oninput={(event) => onUpdateDensity(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <span class="tabular-nums">{colCount}</span>
    </label>

    <label class="flex items-center gap-2">
      Gap
      <input
        type="range"
        min="0"
        max="20"
        value={gap}
        oninput={(event) => onUpdateGap(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <span class="tabular-nums">{gap}px</span>
    </label>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="rounded border border-border-strong px-2 py-1 {layoutMode === 'uniform' ? 'bg-border' : 'opacity-40'}"
        onclick={() => onUpdateLayoutMode('uniform')}
        disabled={layoutMode === 'uniform'}
      >
        Uniform
      </button>
      <button
        type="button"
        class="rounded border border-border-strong px-2 py-1 {layoutMode === 'masonry' ? 'bg-border' : 'opacity-40'}"
        onclick={() => onUpdateLayoutMode('masonry')}
        disabled={layoutMode === 'masonry'}
      >
        Masonry
      </button>
    </div>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="rounded border border-border-strong px-2 py-1 {widthMode === 'full' ? 'bg-border' : 'opacity-40'}"
        onclick={() => onUpdateWidthMode('full')}
        disabled={widthMode === 'full'}
      >
        Full
      </button>
      <button
        type="button"
        class="rounded border border-border-strong px-2 py-1 {widthMode === 'constrained' ? 'bg-border' : 'opacity-40'}"
        onclick={() => onUpdateWidthMode('constrained')}
        disabled={widthMode === 'constrained'}
      >
        Constrained
      </button>
    </div>
  </div>
</div>
