<script lang="ts">
  import CmsPageView from '$lib/components/CmsPageView.svelte';

  const { data } = $props();
</script>

<CmsPageView page={data.page} />
