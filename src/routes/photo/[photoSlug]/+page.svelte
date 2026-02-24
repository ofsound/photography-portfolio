<script lang="ts">
  import FullscreenPhoto from '$lib/components/FullscreenPhoto.svelte';

  let { data } = $props();
</script>

{#if data.photo}
  <FullscreenPhoto
    photoSlug={data.photo.slug}
    title={data.photo.title}
    description={data.photo.description}
    currentImage={data.photo.currentImage}
    leadImage={data.photo.leadImage}
    additionalImages={data.photo.additionalImages}
  />
{:else}
  <p class="p-8">Photo unavailable.</p>
{/if}
