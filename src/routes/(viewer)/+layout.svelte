<script lang="ts">
  import type { Snippet } from 'svelte';
  import GalleryScene from '$lib/components/gallery/GalleryScene.svelte';
  import type { LayoutData } from './$types';

  let { data, children } = $props<{ data: LayoutData; children: Snippet }>();
</script>

<GalleryScene data={data} />

<!-- Keep child pages mounted for route matching; viewer UI is owned by this layout. -->
<div class="hidden" aria-hidden="true">{@render children()}</div>
