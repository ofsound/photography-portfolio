<script lang="ts">
  import FullscreenPhoto from '$lib/components/FullscreenPhoto.svelte';

  let { data } = $props();
</script>

<FullscreenPhoto
  photoSlug={data.photo.slug}
  title={data.photo.title}
  description={data.photo.description}
  currentImage={data.photo.currentImage}
  leadImage={data.photo.leadImage}
  additionalImages={data.photo.additionalImages}
/>
