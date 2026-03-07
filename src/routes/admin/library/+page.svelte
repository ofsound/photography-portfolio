<script lang="ts">
  import AdminPhotosPage from '$lib/components/admin/photos/AdminPhotosPage.svelte';

  const { data, form }: import('./$types').PageProps = $props();
</script>

<AdminPhotosPage
  {data}
  {form}
  allScopeLabel="Library"
  allRouteBasePath="/admin/library"
/>
