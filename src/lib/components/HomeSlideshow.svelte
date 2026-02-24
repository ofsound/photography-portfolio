<script lang="ts">
  type Slide = {
    id: string;
    imagePath: string;
    altText: string;
  };

  let { slides } = $props<{ slides: Slide[] }>();
</script>

<section class="relative h-[calc(100vh-64px)] w-full overflow-hidden">
  {#if slides.length === 0}
    <div class="grid h-full place-items-center text-sm uppercase tracking-[0.16em] text-ink/60">
      Add slideshow images in Admin -> Homepage.
    </div>
  {:else}
    {#each slides as slide, index (slide.id)}
      <figure
        class="absolute inset-0"
        style={`animation: hero-slide 18s linear infinite; animation-delay: ${index * 6}s;`}
      >
        <img
          class="h-full w-full object-cover"
          src={slide.imagePath}
          alt={slide.altText}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      </figure>
    {/each}
  {/if}

  <div class="chrome-panel absolute bottom-5 left-5 rounded px-4 py-2 text-xs uppercase tracking-[0.2em]">
    Curated Home Sequence
  </div>
</section>

<style>
  @keyframes hero-slide {
    0% {
      opacity: 0;
      transform: scale(1.01);
    }

    8% {
      opacity: 1;
      transform: scale(1.03);
    }

    28% {
      opacity: 1;
      transform: scale(1.05);
    }

    34% {
      opacity: 0;
      transform: scale(1.06);
    }

    100% {
      opacity: 0;
      transform: scale(1.06);
    }
  }
</style>
