<script lang="ts">
  let {
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
      aria-label="Search title, description, tags, category"
      class="w-full rounded border border-border bg-transparent px-2 py-1"
    />
    <button class="rounded border border-border-strong px-2 py-1" type="submit">Search</button>
  </form>

  <div class="flex flex-wrap items-center justify-end gap-3">
    <div class="flex items-center gap-2" role="group" aria-label="Items per row">
      <span class="uppercase">Items per row</span>
      <div class="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max={maxDensity}
          value={colCount}
          class="w-8 rounded border border-border-strong bg-transparent py-0.5 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Items per row"
          oninput={(e) => {
            const v = Number((e.currentTarget as HTMLInputElement).value);
            if (!Number.isNaN(v)) onUpdateDensity(Math.max(1, Math.min(maxDensity, Math.round(v))));
          }}
          onchange={(e) => {
            const el = e.currentTarget as HTMLInputElement;
            let v = Number(el.value);
            if (Number.isNaN(v) || v < 1) v = 1;
            if (v > maxDensity) v = maxDensity;
            el.value = String(v);
            onUpdateDensity(v);
          }}
        />
        <div class="flex flex-col">
          <button
            type="button"
            class="flex h-[50%] min-h-5 w-6 items-center justify-center hover:bg-border/50 disabled:opacity-40"
            aria-label="Increase items per row"
            disabled={colCount >= maxDensity}
            onclick={() => onUpdateDensity(Math.min(maxDensity, colCount + 1))}
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-[50%] min-h-5 w-6 items-center justify-center hover:bg-border/50 disabled:opacity-40"
            aria-label="Decrease items per row"
            disabled={colCount <= 1}
            onclick={() => onUpdateDensity(Math.max(1, colCount - 1))}
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
