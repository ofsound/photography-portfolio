<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  type Slide = {
    id: string;
    imagePath: string;
    altText: string;
  };

  type Slot = {
    index: number;
    version: number;
    origin: string;
  };

  const DEFAULT_SLIDE_DURATION_MS = 4000;
  const DEFAULT_TRANSITION_DURATION_MS = 2000;
  const DEFAULT_ZOOM_STRENGTH_PCT = 5;
  const DEFAULT_PAN_STRENGTH_PCT = 80;
  const SLIDE_DURATION_MIN_MS = 1000;
  const SLIDE_DURATION_MAX_MS = 30000;
  const TRANSITION_DURATION_MIN_MS = 200;
  const TRANSITION_DURATION_MAX_MS = 10000;
  const ZOOM_STRENGTH_MIN_PCT = 0;
  const ZOOM_STRENGTH_MAX_PCT = 20;
  const PAN_STRENGTH_MIN_PCT = 0;
  const PAN_STRENGTH_MAX_PCT = 100;

  const {
    slides,
    slideDurationMs = DEFAULT_SLIDE_DURATION_MS,
    transitionDurationMs = DEFAULT_TRANSITION_DURATION_MS,
    zoomStrengthPct = DEFAULT_ZOOM_STRENGTH_PCT,
    panStrengthPct = DEFAULT_PAN_STRENGTH_PCT,
  } = $props<{
    slides: Slide[];
    slideDurationMs?: number;
    transitionDurationMs?: number;
    zoomStrengthPct?: number;
    panStrengthPct?: number;
  }>();

  let slotA = $state<Slot | null>(null);
  let slotB = $state<Slot | null>(null);
  let activeSlot = $state<0 | 1>(0);
  let currentIndex = $state(0);

  let intervalHandle: ReturnType<typeof setInterval> | undefined;
  let frameHandle: number | undefined;
  let versionSeed = 0;
  let hasPreloadedSlides = $state(false);
  const preloadedSlideUrls = new SvelteSet<string>();

  function clampInt(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  const safeSlideDurationMs = $derived(
    clampInt(slideDurationMs, SLIDE_DURATION_MIN_MS, SLIDE_DURATION_MAX_MS),
  );
  const safeTransitionDurationMs = $derived(
    Math.min(
      safeSlideDurationMs,
      clampInt(
        transitionDurationMs,
        TRANSITION_DURATION_MIN_MS,
        TRANSITION_DURATION_MAX_MS,
      ),
    ),
  );
  const safeZoomStrengthPct = $derived(
    clampInt(zoomStrengthPct, ZOOM_STRENGTH_MIN_PCT, ZOOM_STRENGTH_MAX_PCT),
  );
  const safePanStrengthPct = $derived(
    clampInt(panStrengthPct, PAN_STRENGTH_MIN_PCT, PAN_STRENGTH_MAX_PCT),
  );
  const zoomEndScale = $derived(1 + safeZoomStrengthPct / 100);
  const zoomDurationMs = $derived(
    safeSlideDurationMs + safeTransitionDurationMs,
  );

  function hashId(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function originForSlide(slide: Slide) {
    const amplitude = safePanStrengthPct / 2;
    const offsetX = (hashId(`${slide.id}:x`) % 2001) / 1000 - 1;
    const offsetY = (hashId(`${slide.id}:y`) % 2001) / 1000 - 1;
    const x = Math.min(100, Math.max(0, 50 + offsetX * amplitude));
    const y = Math.min(100, Math.max(0, 50 + offsetY * amplitude));
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  }

  function clearTimers() {
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle);
      intervalHandle = undefined;
    }
    if (frameHandle !== undefined && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameHandle);
      frameHandle = undefined;
    }
  }

  function preloadRemainingSlides() {
    if (
      hasPreloadedSlides ||
      typeof window === 'undefined' ||
      slides.length <= 1
    ) {
      return;
    }

    hasPreloadedSlides = true;

    for (let index = 1; index < slides.length; index += 1) {
      const imagePath = slides[index]?.imagePath;
      if (!imagePath || preloadedSlideUrls.has(imagePath)) {
        continue;
      }

      const image = new Image();
      image.decoding = 'async';
      image.src = imagePath;
      preloadedSlideUrls.add(imagePath);
    }
  }

  function setSlot(slot: 0 | 1, index: number) {
    versionSeed += 1;

    const nextSlot: Slot = {
      index,
      version: versionSeed,
      origin: originForSlide(slides[index]),
    };

    if (slot === 0) {
      slotA = nextSlot;
      return;
    }

    slotB = nextSlot;
  }

  function activateSlot(nextSlot: 0 | 1) {
    activeSlot = nextSlot;
  }

  function beginTransition() {
    if (slides.length <= 1) {
      return;
    }

    const nextIndex = (currentIndex + 1) % slides.length;
    const incomingSlot: 0 | 1 = activeSlot === 0 ? 1 : 0;
    setSlot(incomingSlot, nextIndex);
    currentIndex = nextIndex;

    if (typeof window === 'undefined') {
      activateSlot(incomingSlot);
      return;
    }

    frameHandle = window.requestAnimationFrame(() => {
      activateSlot(incomingSlot);
      frameHandle = undefined;
    });
  }

  onMount(() => {
    return () => clearTimers();
  });

  $effect(() => {
    void (slides.length,
    safeSlideDurationMs,
    safeTransitionDurationMs,
    safeZoomStrengthPct,
    safePanStrengthPct);

    clearTimers();
    slotA = null;
    slotB = null;
    activeSlot = 0;
    currentIndex = 0;
    versionSeed = 0;
    hasPreloadedSlides = false;
    preloadedSlideUrls.clear();

    if (slides.length === 0) {
      return;
    }

    setSlot(0, 0);

    if (slides.length <= 1 || typeof window === 'undefined') {
      return;
    }

    intervalHandle = setInterval(beginTransition, safeSlideDurationMs);

    return () => clearTimers();
  });

  function zoomClass(index: number) {
    return index % 2 === 0 ? 'kenburns-in' : 'kenburns-out';
  }
</script>

<section
  class="relative h-[calc(100dvh-var(--site-header-height,var(--size-header)))] w-full overflow-hidden bg-canvas"
>
  {#if slides.length === 0}
    <div
      class="grid h-full place-items-center text-sm tracking-widest text-text-subtle uppercase"
    >
      Add slideshow images in Admin -> Homepage.
    </div>
  {:else}
    <div class="absolute inset-0 isolate [contain:paint]">
      <figure
        class="absolute inset-0 will-change-[opacity]"
        style={`opacity: ${activeSlot === 0 ? 1 : 0}; transition: opacity ${safeTransitionDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1);`}
      >
        {#if slotA}
          {#key `slot-a-${slotA.version}`}
            <img
              class={`h-full w-full object-cover ${zoomClass(slotA.index)}`}
              style={`transform-origin: ${slotA.origin}; animation-duration: ${zoomDurationMs}ms; --kenburns-end-scale: ${zoomEndScale};`}
              src={slides[slotA.index].imagePath}
              alt={slides[slotA.index].altText}
              loading={slotA.index === 0 ? 'eager' : 'lazy'}
              onload={slotA.index === 0 ? preloadRemainingSlides : undefined}
            />
          {/key}
        {/if}
      </figure>
      <figure
        class="absolute inset-0 will-change-[opacity]"
        style={`opacity: ${activeSlot === 1 ? 1 : 0}; transition: opacity ${safeTransitionDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1);`}
      >
        {#if slotB}
          {#key `slot-b-${slotB.version}`}
            <img
              class={`h-full w-full object-cover ${zoomClass(slotB.index)}`}
              style={`transform-origin: ${slotB.origin}; animation-duration: ${zoomDurationMs}ms; --kenburns-end-scale: ${zoomEndScale};`}
              src={slides[slotB.index].imagePath}
              alt={slides[slotB.index].altText}
              loading="lazy"
            />
          {/key}
        {/if}
      </figure>
    </div>
  {/if}
</section>

<style>
  @keyframes kenburns-in {
    0% {
      transform: scale(1);
    }

    100% {
      transform: scale(var(--kenburns-end-scale, 1.05));
    }
  }

  @keyframes kenburns-out {
    0% {
      transform: scale(var(--kenburns-end-scale, 1.05));
    }

    100% {
      transform: scale(1);
    }
  }

  .kenburns-in,
  .kenburns-out {
    animation-fill-mode: both;
    animation-iteration-count: 1;
    animation-timing-function: linear;
    will-change: transform;
  }

  .kenburns-in {
    animation-name: kenburns-in;
  }

  .kenburns-out {
    animation-name: kenburns-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .kenburns-in,
    .kenburns-out {
      animation: none;
    }
  }
</style>
