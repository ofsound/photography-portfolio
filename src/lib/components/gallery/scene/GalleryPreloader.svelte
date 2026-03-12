<script lang="ts">
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { PreloaderPreset } from '$lib/constants/preloader-preset';

  type PreloaderPhase = 'entering' | 'loading' | 'exiting' | 'done';

  const {
    visible,
    enabled,
    imagesLoaded,
    totalImages,
    fadeMs,
    preset = 'minimal',
  } = $props<{
    visible: boolean;
    enabled: boolean;
    imagesLoaded: number;
    totalImages: number;
    fadeMs: number;
    preset?: PreloaderPreset;
  }>();

  const progress = $derived(
    totalImages > 0 ? (imagesLoaded / totalImages) * 100 : 0,
  );

  let phase = $state<PreloaderPhase>('done');
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  /* --- Phase state machine ---
   * visible goes true  → enter → loading
   * visible goes false → exit  → done
   */
  $effect(() => {
    if (!mounted) return;
    const p = preset as PreloaderPreset;
    if (visible && enabled) {
      phase = 'entering';
      const entranceMs = ENTRANCE_MS[p];
      const id = setTimeout(() => {
        phase = 'loading';
      }, entranceMs);
      return () => clearTimeout(id);
    } else if (phase === 'loading' || phase === 'entering') {
      phase = 'exiting';
      const exitMs = p === 'minimal' ? fadeMs : EXIT_MS[p];
      const id = setTimeout(() => {
        phase = 'done';
      }, exitMs);
      return () => clearTimeout(id);
    }
  });

  const ENTRANCE_MS: Record<PreloaderPreset, number> = {
    minimal: 0,
    curtain: 700,
    iris: 650,
    veil: 600,
    diagonal: 700,
    filmBurn: 500,
  };

  const EXIT_MS: Record<PreloaderPreset, number> = {
    minimal: 0,
    curtain: 800,
    iris: 700,
    veil: 650,
    diagonal: 800,
    filmBurn: 600,
  };

  const active = $derived(phase !== 'done');
</script>

{#if active}
  <!--
    Each preset renders its own full-screen overlay + progress.
    The minimal preset preserves the exact original behavior.
  -->

  {#if preset === 'minimal'}
    <!-- ═══════════════ MINIMAL (original) ═══════════════ -->
    <div
      transition:fade={{ duration: fadeMs }}
      class="preloader-root"
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="preloader-inner">
        <p class="preloader-text">{imagesLoaded} / {totalImages}</p>
        <div class="bar-track">
          <div class="bar-fill" style="width: {progress}%"></div>
        </div>
      </div>
    </div>
  {:else if preset === 'curtain'}
    <!-- ═══════════════ CURTAIN ═══════════════ -->
    <div
      class="preloader-root"
      class:curtain-entering={phase === 'entering'}
      class:curtain-loading={phase === 'loading'}
      class:curtain-exiting={phase === 'exiting'}
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="curtain-panel curtain-panel--left"></div>
      <div class="curtain-panel curtain-panel--right"></div>
      <div
        class="curtain-content"
        class:curtain-content--visible={phase === 'loading'}
      >
        <p class="preloader-text">{imagesLoaded} / {totalImages}</p>
        <div class="bar-track bar-track--narrow">
          <div class="bar-fill" style="width: {progress}%"></div>
        </div>
      </div>
      <div
        class="curtain-seam"
        class:curtain-seam--visible={phase === 'loading'}
      ></div>
    </div>
  {:else if preset === 'iris'}
    <!-- ═══════════════ IRIS ═══════════════ -->
    <div
      class="preloader-root"
      class:iris-entering={phase === 'entering'}
      class:iris-loading={phase === 'loading'}
      class:iris-exiting={phase === 'exiting'}
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="iris-mask"></div>
      <div
        class="iris-content"
        class:iris-content--visible={phase === 'loading'}
      >
        <div class="iris-ring-wrap">
          <svg class="iris-ring" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--color-border)"
              stroke-width="2"
              opacity="0.3"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--color-brand)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-dasharray={339.292}
              stroke-dashoffset={339.292 - (339.292 * progress) / 100}
              class="iris-progress-ring"
            />
          </svg>
          <span class="iris-pct">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  {:else if preset === 'veil'}
    <!-- ═══════════════ VEIL ═══════════════ -->
    <div
      class="preloader-root"
      class:veil-entering={phase === 'entering'}
      class:veil-loading={phase === 'loading'}
      class:veil-exiting={phase === 'exiting'}
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="veil-gradient"></div>
      <div
        class="veil-content"
        class:veil-content--visible={phase === 'loading'}
      >
        <p class="preloader-text preloader-text--veil">
          {imagesLoaded} / {totalImages}
        </p>
        <div class="bar-track bar-track--veil">
          <div class="bar-fill bar-fill--veil" style="width: {progress}%"></div>
        </div>
      </div>
    </div>
  {:else if preset === 'diagonal'}
    <!-- ═══════════════ DIAGONAL ═══════════════ -->
    <div
      class="preloader-root"
      class:diag-entering={phase === 'entering'}
      class:diag-loading={phase === 'loading'}
      class:diag-exiting={phase === 'exiting'}
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="diag-panel diag-panel--tl"></div>
      <div class="diag-panel diag-panel--br"></div>
      <div
        class="diag-content"
        class:diag-content--visible={phase === 'loading'}
      >
        <p class="preloader-text">{imagesLoaded} / {totalImages}</p>
        <div class="bar-track bar-track--diag">
          <div class="bar-fill" style="width: {progress}%"></div>
        </div>
      </div>
    </div>
  {:else if preset === 'filmBurn'}
    <!-- ═══════════════ FILM BURN ═══════════════ -->
    <div
      class="preloader-root"
      class:burn-entering={phase === 'entering'}
      class:burn-loading={phase === 'loading'}
      class:burn-exiting={phase === 'exiting'}
      role="status"
      aria-live="polite"
      aria-label="Loading gallery"
    >
      <div class="burn-flash"></div>
      <div class="burn-grain"></div>
      <div
        class="burn-content"
        class:burn-content--visible={phase === 'loading'}
      >
        <p class="preloader-text preloader-text--burn">
          {imagesLoaded} / {totalImages}
        </p>
        <div class="bar-track bar-track--burn">
          <div class="bar-fill bar-fill--burn" style="width: {progress}%"></div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* ═══════════════════════════════════════
     SHARED
     ═══════════════════════════════════════ */
  .preloader-root {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    overflow: hidden;
  }

  .preloader-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 90vw;
    min-width: 280px;
  }

  .preloader-text {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .bar-track {
    height: 8px;
    width: 100%;
    min-width: 280px;
    overflow: hidden;
    border-radius: 2px;
    border: 1px solid var(--color-border-strong);
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-border) 60%, transparent),
      color-mix(in srgb, var(--color-border-strong) 80%, transparent)
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.15),
      0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .bar-track--narrow {
    height: 3px;
    min-width: 200px;
    max-width: 260px;
    border-radius: 1.5px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 1px;
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--color-brand) 90%, white),
      var(--color-brand)
    );
    transition: width 0.12s ease-out;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }

  /* ═══════════════════════════════════════
     CURTAIN
     ═══════════════════════════════════════ */
  .curtain-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    background: var(--color-bg);
    z-index: 1;
    will-change: transform;
  }

  .curtain-panel--left {
    left: 0;
    transform-origin: left center;
  }

  .curtain-panel--right {
    right: 0;
    transform-origin: right center;
  }

  /* Entrance: panels slide IN from off-screen */
  .curtain-entering .curtain-panel--left {
    animation: curtain-slide-in-left 700ms cubic-bezier(0.16, 1, 0.3, 1)
      forwards;
  }
  .curtain-entering .curtain-panel--right {
    animation: curtain-slide-in-right 700ms cubic-bezier(0.16, 1, 0.3, 1)
      forwards;
  }

  /* Loading: panels stay */
  .curtain-loading .curtain-panel--left {
    transform: translateX(0);
  }
  .curtain-loading .curtain-panel--right {
    transform: translateX(0);
  }

  /* Exit: panels PART revealing content */
  .curtain-exiting .curtain-panel--left {
    animation: curtain-part-left 800ms cubic-bezier(0.7, 0, 0.3, 1) forwards;
  }
  .curtain-exiting .curtain-panel--right {
    animation: curtain-part-right 800ms cubic-bezier(0.7, 0, 0.3, 1) forwards;
  }

  .curtain-seam {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: var(--color-border);
    z-index: 2;
    opacity: 0;
    transform: scaleY(0);
    transform-origin: center;
  }

  .curtain-seam--visible {
    animation: curtain-seam-reveal 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .curtain-content {
    position: relative;
    z-index: 3;
    opacity: 0;
    transform: translateY(8px);
  }

  .curtain-content--visible {
    animation: preloader-content-in 400ms 180ms cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  .curtain-exiting .curtain-content {
    animation: preloader-content-out 250ms ease-in forwards;
  }

  @keyframes curtain-slide-in-left {
    from {
      transform: translateX(-105%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes curtain-slide-in-right {
    from {
      transform: translateX(105%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes curtain-part-left {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-105%);
    }
  }
  @keyframes curtain-part-right {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(105%);
    }
  }
  @keyframes curtain-seam-reveal {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
    to {
      opacity: 0.5;
      transform: scaleY(1);
    }
  }

  /* ═══════════════════════════════════════
     IRIS
     ═══════════════════════════════════════ */
  .iris-mask {
    position: absolute;
    inset: 0;
    background: var(--color-bg);
    z-index: 1;
  }

  /* Entrance: circle expands from center via clip-path */
  .iris-entering .iris-mask {
    animation: iris-open 650ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* Loading: full coverage */
  .iris-loading .iris-mask {
    clip-path: circle(75% at 50% 50%);
  }

  /* Exit: circle contracts then snaps open */
  .iris-exiting .iris-mask {
    animation: iris-close 700ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
  }

  .iris-content {
    position: relative;
    z-index: 2;
    opacity: 0;
    transform: scale(0.85);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .iris-content--visible {
    animation: iris-content-in 500ms 200ms cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  .iris-exiting .iris-content {
    animation: iris-content-out 280ms ease-in forwards;
  }

  .iris-ring-wrap {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .iris-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .iris-progress-ring {
    transition: stroke-dashoffset 0.15s ease-out;
  }

  .iris-pct {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  @keyframes iris-open {
    from {
      clip-path: circle(0% at 50% 50%);
    }
    to {
      clip-path: circle(75% at 50% 50%);
    }
  }
  @keyframes iris-close {
    0% {
      clip-path: circle(75% at 50% 50%);
    }
    55% {
      clip-path: circle(2% at 50% 50%);
    }
    100% {
      clip-path: circle(150% at 50% 50%);
    }
  }
  @keyframes iris-content-in {
    from {
      opacity: 0;
      transform: scale(0.85);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes iris-content-out {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.7);
    }
  }

  /* ═══════════════════════════════════════
     VEIL
     ═══════════════════════════════════════ */
  .veil-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      var(--color-bg) 0%,
      color-mix(in srgb, var(--color-bg) 96%, transparent) 60%,
      color-mix(in srgb, var(--color-bg) 85%, transparent) 100%
    );
    z-index: 1;
    will-change: transform, filter;
  }

  /* Entrance: descends from above */
  .veil-entering .veil-gradient {
    animation: veil-descend 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .veil-loading .veil-gradient {
    transform: translateY(0);
    opacity: 1;
  }

  /* Exit: dissolves upward with blur trailing edge */
  .veil-exiting .veil-gradient {
    animation: veil-dissolve 650ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .veil-content {
    position: relative;
    z-index: 2;
    opacity: 0;
    transform: translateY(-12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .veil-content--visible {
    animation: preloader-content-in 450ms 150ms cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  .veil-exiting .veil-content {
    animation: veil-content-out 350ms cubic-bezier(0.4, 0, 1, 1) forwards;
  }

  .preloader-text--veil {
    letter-spacing: 0.3em;
  }

  .bar-track--veil {
    max-width: 220px;
    height: 2px;
    border: none;
    background: color-mix(in srgb, var(--color-border) 40%, transparent);
    box-shadow: none;
    border-radius: 1px;
  }

  .bar-fill--veil {
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-brand) 50%, transparent);
  }

  @keyframes veil-descend {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  @keyframes veil-dissolve {
    0% {
      transform: translateY(0);
      opacity: 1;
      filter: blur(0);
    }
    50% {
      transform: translateY(-30%);
      opacity: 0.6;
      filter: blur(6px);
    }
    100% {
      transform: translateY(-100%);
      opacity: 0;
      filter: blur(12px);
    }
  }
  @keyframes veil-content-out {
    from {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
      filter: blur(4px);
    }
  }

  /* ═══════════════════════════════════════
     DIAGONAL
     ═══════════════════════════════════════ */
  .diag-panel {
    position: absolute;
    width: 150%;
    height: 150%;
    background: var(--color-bg);
    z-index: 1;
    will-change: transform;
  }

  .diag-panel--tl {
    top: -25%;
    left: -25%;
    transform-origin: top left;
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  .diag-panel--br {
    bottom: -25%;
    right: -25%;
    transform-origin: bottom right;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
  }

  /* Entrance: triangles sweep in */
  .diag-entering .diag-panel--tl {
    animation: diag-in-tl 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .diag-entering .diag-panel--br {
    animation: diag-in-br 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .diag-loading .diag-panel--tl {
    transform: translate(0, 0);
  }
  .diag-loading .diag-panel--br {
    transform: translate(0, 0);
  }

  /* Exit: triangles slide apart with rotation */
  .diag-exiting .diag-panel--tl {
    animation: diag-out-tl 800ms cubic-bezier(0.7, 0, 0.3, 1) forwards;
  }
  .diag-exiting .diag-panel--br {
    animation: diag-out-br 800ms cubic-bezier(0.7, 0, 0.3, 1) forwards;
  }

  .diag-content {
    position: relative;
    z-index: 2;
    opacity: 0;
    transform: translateY(6px) rotate(-2deg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .diag-content--visible {
    animation: diag-content-in 400ms 200ms cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  .diag-exiting .diag-content {
    animation: preloader-content-out 250ms ease-in forwards;
  }

  .bar-track--diag {
    max-width: 200px;
    height: 3px;
    border-radius: 1.5px;
    transform: rotate(-3deg);
  }

  @keyframes diag-in-tl {
    from {
      transform: translate(-100%, -100%);
    }
    to {
      transform: translate(0, 0);
    }
  }
  @keyframes diag-in-br {
    from {
      transform: translate(100%, 100%);
    }
    to {
      transform: translate(0, 0);
    }
  }
  @keyframes diag-out-tl {
    from {
      transform: translate(0, 0) rotate(0);
    }
    to {
      transform: translate(-100%, -100%) rotate(-4deg);
    }
  }
  @keyframes diag-out-br {
    from {
      transform: translate(0, 0) rotate(0);
    }
    to {
      transform: translate(100%, 100%) rotate(4deg);
    }
  }
  @keyframes diag-content-in {
    from {
      opacity: 0;
      transform: translateY(6px) rotate(-2deg);
    }
    to {
      opacity: 1;
      transform: translateY(0) rotate(0);
    }
  }

  /* ═══════════════════════════════════════
     FILM BURN
     ═══════════════════════════════════════ */
  .burn-flash {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.8) 30%,
      var(--color-bg) 80%
    );
    will-change: opacity;
    opacity: 0;
  }

  .burn-grain {
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    mix-blend-mode: overlay;
    pointer-events: none;
  }

  /* Entrance: white-hot flash expands then settles */
  .burn-entering .burn-flash {
    animation: burn-flash-in 500ms ease-out forwards;
  }
  .burn-entering .burn-grain {
    animation: burn-grain-in 500ms 200ms ease-out forwards;
  }

  .burn-loading .burn-flash {
    opacity: 0;
  }
  .burn-loading .burn-grain {
    opacity: 0.08;
  }

  /* Exit: another searing flash that recedes */
  .burn-exiting .burn-flash {
    animation: burn-flash-out 600ms ease-in-out forwards;
  }
  .burn-exiting .burn-grain {
    animation: burn-grain-out 400ms ease-in forwards;
  }

  .burn-content {
    position: relative;
    z-index: 3;
    opacity: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .burn-content--visible {
    animation: preloader-content-in 400ms 250ms cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  .burn-exiting .burn-content {
    animation: burn-content-out 200ms ease-in forwards;
  }

  .preloader-text--burn {
    color: var(--color-text);
    letter-spacing: 0.15em;
  }

  .bar-track--burn {
    max-width: 240px;
    height: 2px;
    border: none;
    background: color-mix(in srgb, var(--color-border) 30%, transparent);
    box-shadow: none;
    border-radius: 1px;
  }

  .bar-fill--burn {
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--color-brand) 80%, white),
      var(--color-brand),
      color-mix(in srgb, var(--color-brand) 80%, white)
    );
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-brand) 40%, transparent);
  }

  @keyframes burn-flash-in {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    40% {
      opacity: 1;
      transform: scale(1.1);
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }
  @keyframes burn-grain-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.08;
    }
  }
  @keyframes burn-flash-out {
    0% {
      opacity: 0;
      transform: scale(1);
    }
    35% {
      opacity: 0.9;
      transform: scale(1.05);
    }
    70% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 0;
      transform: scale(2);
    }
  }
  @keyframes burn-grain-out {
    from {
      opacity: 0.08;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes burn-content-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: scale(1.05);
      filter: blur(2px);
    }
  }

  /* ═══════════════════════════════════════
     SHARED KEYFRAMES
     ═══════════════════════════════════════ */
  @keyframes preloader-content-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes preloader-content-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translateY(-6px);
    }
  }

  /* ═══════════════════════════════════════
     REDUCED MOTION
     ═══════════════════════════════════════ */
  @media (prefers-reduced-motion: reduce) {
    .preloader-root,
    .preloader-root * {
      animation-duration: 0ms !important;
      animation-delay: 0ms !important;
      transition-duration: 0ms !important;
    }
  }
</style>
