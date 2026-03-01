<script lang="ts">
  import { fade } from 'svelte/transition';

  let {
    visible,
    enabled,
    imagesLoaded,
    totalImages,
    fadeMs
  } = $props<{
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
    class="preloader-overlay"
    role="status"
    aria-live="polite"
    aria-label="Loading gallery"
  >
    <div class="preloader-content">
      <p class="preloader-text">Loading {imagesLoaded} of {totalImages}</p>
      <div class="preloader-bar-track">
        <div
          class="preloader-bar-fill"
          style="width: {totalImages > 0 ? (imagesLoaded / totalImages) * 100 : 0}%"
        ></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .preloader-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
  }

  .preloader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    min-width: 280px;
    max-width: 90vw;
  }

  .preloader-text {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .preloader-bar-track {
    width: 100%;
    height: 8px;
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-border) 60%, transparent),
      color-mix(in srgb, var(--color-border-strong) 80%, transparent)
    );
    border: 1px solid var(--color-border-strong);
    border-radius: 2px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.15),
      0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .preloader-bar-fill {
    height: 100%;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--color-brand) 90%, white), var(--color-brand));
    border-radius: 1px;
    transition: width 0.12s ease-out;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
</style>
