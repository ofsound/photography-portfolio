<script lang="ts">
  import { onMount } from 'svelte';

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

  type ViewTransitionHandle = {
    finished: Promise<void>;
  };

  type ViewTransitionDocument = Document & {
    startViewTransition?: (update: () => void) => ViewTransitionHandle;
  };

  const DEFAULT_SLIDE_DURATION_MS = 4000;
  const DEFAULT_TRANSITION_DURATION_MS = 2000;
  const SLIDE_DURATION_MIN_MS = 1000;
  const SLIDE_DURATION_MAX_MS = 30000;
  const TRANSITION_DURATION_MIN_MS = 200;
  const TRANSITION_DURATION_MAX_MS = 10000;
  const HERO_VT_FLAG = 'homeHeroVt';

  let {
    slides,
    slideDurationMs = DEFAULT_SLIDE_DURATION_MS,
    transitionDurationMs = DEFAULT_TRANSITION_DURATION_MS
  } = $props<{
    slides: Slide[];
    slideDurationMs?: number;
    transitionDurationMs?: number;
  }>();

  let slotA = $state<Slot | null>(null);
  let slotB = $state<Slot | null>(null);
  let activeSlot = $state<0 | 1>(0);
  let currentIndex = $state(0);

  let intervalHandle: ReturnType<typeof setInterval> | undefined;
  let frameHandle: number | undefined;
  let versionSeed = 0;
  let vtInFlight = false;

  function clampInt(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  const safeSlideDurationMs = $derived(
    clampInt(slideDurationMs, SLIDE_DURATION_MIN_MS, SLIDE_DURATION_MAX_MS)
  );
  const safeTransitionDurationMs = $derived(
    Math.min(
      safeSlideDurationMs,
      clampInt(transitionDurationMs, TRANSITION_DURATION_MIN_MS, TRANSITION_DURATION_MAX_MS)
    )
  );
  const zoomDurationMs = $derived(safeSlideDurationMs + safeTransitionDurationMs);

  function hashId(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function originForSlide(slide: Slide) {
    const hash = hashId(slide.id);
    const x = 10 + (hash % 81);
    const y = 10 + (Math.floor(hash / 97) % 81);
    return `${x}% ${y}%`;
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

  function setSlot(slot: 0 | 1, index: number) {
    versionSeed += 1;

    const nextSlot: Slot = {
      index,
      version: versionSeed,
      origin: originForSlide(slides[index])
    };

    if (slot === 0) {
      slotA = nextSlot;
      return;
    }

    slotB = nextSlot;
  }

  function activateSlot(nextSlot: 0 | 1) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      activeSlot = nextSlot;
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vtDoc = document as ViewTransitionDocument;
    const canUseHeroViewTransition = !!vtDoc.startViewTransition && !reducedMotion && !vtInFlight;

    if (!canUseHeroViewTransition) {
      activeSlot = nextSlot;
      return;
    }

    vtInFlight = true;
    document.documentElement.dataset[HERO_VT_FLAG] = '1';
    document.documentElement.style.setProperty('--home-hero-vt-duration', `${safeTransitionDurationMs}ms`);

    const transition = vtDoc.startViewTransition!(() => {
      activeSlot = nextSlot;
    });

    transition.finished.finally(() => {
      vtInFlight = false;
      delete document.documentElement.dataset[HERO_VT_FLAG];
    });
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
    slides.length;
    safeSlideDurationMs;
    safeTransitionDurationMs;

    clearTimers();
    slotA = null;
    slotB = null;
    activeSlot = 0;
    currentIndex = 0;
    versionSeed = 0;
    vtInFlight = false;

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

<section class="relative h-[calc(100dvh-var(--site-header-height,54px))] w-full overflow-hidden bg-canvas">
  {#if slides.length === 0}
    <div class="grid h-full place-items-center text-sm uppercase tracking-[0.16em] text-text-subtle">
      Add slideshow images in Admin -> Homepage.
    </div>
  {:else}
    <div class="hero-stage absolute inset-0">
      <figure
        class="absolute inset-0"
        style={`opacity: ${activeSlot === 0 ? 1 : 0}; transition: opacity ${safeTransitionDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1);`}
      >
        {#if slotA}
          {#key `slot-a-${slotA.version}`}
            <img
              class={`h-full w-full object-cover ${zoomClass(slotA.index)}`}
              style={`transform-origin: ${slotA.origin}; animation-duration: ${zoomDurationMs}ms;`}
              src={slides[slotA.index].imagePath}
              alt={slides[slotA.index].altText}
              loading={slotA.index === 0 ? 'eager' : 'lazy'}
            />
          {/key}
        {/if}
      </figure>
      <figure
        class="absolute inset-0"
        style={`opacity: ${activeSlot === 1 ? 1 : 0}; transition: opacity ${safeTransitionDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1);`}
      >
        {#if slotB}
          {#key `slot-b-${slotB.version}`}
            <img
              class={`h-full w-full object-cover ${zoomClass(slotB.index)}`}
              style={`transform-origin: ${slotB.origin}; animation-duration: ${zoomDurationMs}ms;`}
              src={slides[slotB.index].imagePath}
              alt={slides[slotB.index].altText}
              loading="lazy"
            />
          {/key}
        {/if}
      </figure>
    </div>
  {/if}

  <div class="chrome-panel absolute bottom-5 left-5 rounded px-4 py-2 text-xs uppercase tracking-[0.2em]">
    Curated Home Sequence
  </div>
</section>

<style>
  @keyframes kenburns-in {
    0% {
      transform: scale(1);
    }

    100% {
      transform: scale(1.05);
    }
  }

  @keyframes kenburns-out {
    0% {
      transform: scale(1.05);
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

  .hero-stage {
    contain: paint;
    isolation: isolate;
    view-transition-name: home-hero-slide;
  }

  figure {
    will-change: opacity;
  }

  :global(html[data-home-hero-vt='1']::view-transition-old(root)),
  :global(html[data-home-hero-vt='1']::view-transition-new(root)) {
    animation: none;
  }

  :global(html[data-home-hero-vt='1']::view-transition-group(home-hero-slide)),
  :global(html[data-home-hero-vt='1']::view-transition-old(home-hero-slide)),
  :global(html[data-home-hero-vt='1']::view-transition-new(home-hero-slide)) {
    animation-duration: var(--home-hero-vt-duration, 2000ms);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
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
