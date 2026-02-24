<script lang="ts">
  import HomeSlideshow from '$lib/components/HomeSlideshow.svelte';

  let { data } = $props();
</script>

<HomeSlideshow slides={data.slides} />
