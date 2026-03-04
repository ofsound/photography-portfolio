<script lang="ts">
  import { fade } from 'svelte/transition';

  const { visible, enabled, imagesLoaded, totalImages, fadeMs } = $props<{
    visible: boolean;
    enabled: boolean;
    imagesLoaded: number;
    totalImages: number;
    fadeMs: number;
  }>();
</script>

{#if visible && enabled}
  <div
    transition:fade={{ duration: fadeMs }}
    class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg"
    role="status"
    aria-live="polite"
    aria-label="Loading gallery"
  >
    <div class="flex max-w-[90vw] min-w-[280px] flex-col items-center gap-4">
      <p
        class="text-xs font-semibold tracking-[0.2em] text-text-muted uppercase tabular-nums"
      >
        Loading {imagesLoaded} of {totalImages}
      </p>
      <div
        class="preloader-bar-track h-2 w-full overflow-hidden rounded-[2px] border border-border-strong"
      >
        <div
          class="preloader-bar-fill h-full rounded-[1px]"
          style="width: {totalImages > 0
            ? (imagesLoaded / totalImages) * 100
            : 0}%"
        ></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .preloader-bar-track {
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-border) 60%, transparent),
      color-mix(in srgb, var(--color-border-strong) 80%, transparent)
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.15),
      0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .preloader-bar-fill {
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-brand) 90%, white),
      var(--color-brand)
    );
    transition: width 0.12s ease-out;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
</style>
