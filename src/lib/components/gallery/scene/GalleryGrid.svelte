<script lang="ts">
  import GalleryTiles from './GalleryTiles.svelte';
  import type { GalleryGridModel } from './gallery-grid-model';

  const { model } = $props<{ model: GalleryGridModel }>();

  const observeLoadSentinel = (
    node: HTMLElement,
    params: {
      hasMore: boolean;
      detailOpen: boolean;
      onLoadMore: () => Promise<void>;
    },
  ) => {
    let observer: IntersectionObserver | null = null;
    let current = params;

    const teardownObserver = () => {
      if (!observer) return;
      observer.disconnect();
      observer = null;
    };

    const setupObserver = () => {
      teardownObserver();
      if (!current.hasMore || current.detailOpen) return;

      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry?.isIntersecting) return;
          void current.onLoadMore();
        },
        { rootMargin: '600px 0px' },
      );
      observer.observe(node);
    };

    setupObserver();

    return {
      update(next: {
        hasMore: boolean;
        detailOpen: boolean;
        onLoadMore: () => Promise<void>;
      }) {
        current = next;
        setupObserver();
      },
      destroy() {
        teardownObserver();
      },
    };
  };
</script>

{#if model.layoutMode === 'coverage' || model.layoutMode === 'rows' || model.layoutMode === 'columns'}
  <section class="coverage-container w-full" use:model.bindCoverageSection>
    {#if model.photos.length === 0}
      <p
        class="flex h-full items-center justify-center text-sm tracking-widest text-text-muted uppercase"
      >
        No photos found.
      </p>
    {:else}
      <GalleryTiles {model} />
    {/if}
  </section>
{:else}
  <section class="mx-auto w-full px-4 py-5" style={model.sectionMaxWidthStyle}>
    {#if model.photos.length === 0}
      <p
        class="py-16 text-center text-sm tracking-widest text-text-muted uppercase"
      >
        No photos found.
      </p>
    {:else}
      <GalleryTiles {model} />

      {#if model.hasMore}
        <div
          class="h-10 w-full"
          use:observeLoadSentinel={{
            hasMore: model.hasMore,
            detailOpen: model.detailOpen,
            onLoadMore: model.onLoadMore,
          }}
        ></div>
      {/if}

      {#if model.isLoadingMore}
        <p
          class="py-4 text-center text-xs tracking-widest text-text-subtle uppercase"
        >
          Loading more
        </p>
      {/if}

      {#if model.loadError}
        <div class="py-4 text-center text-sm">
          <p>{model.loadError}</p>
          <button
            class="mt-2 rounded border border-border-strong px-3 py-1 text-xs tracking-widest uppercase"
            type="button"
            onclick={() => void model.onLoadMore()}>Retry</button
          >
        </div>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .coverage-container {
    height: calc(100vh - var(--site-header-height, 56px));
    overflow: hidden;
  }
</style>
