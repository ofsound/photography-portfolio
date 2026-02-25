<script lang="ts">
  import CmsPageView from '$lib/components/CmsPageView.svelte';

  let { data } = $props();
</script>

<CmsPageView page={data.page} />
