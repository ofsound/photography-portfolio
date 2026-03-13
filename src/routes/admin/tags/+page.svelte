<script lang="ts">
  import AdminTaxonomyCrudPage from '$lib/components/admin/AdminTaxonomyCrudPage.svelte';

  const { data, form } = $props();
</script>

<AdminTaxonomyCrudPage
  title="Tags"
  singularLabel="Tag"
  idPrefix="tag"
  items={data.tags}
  reverseColumnOrder
  showCreateStatus={false}
  showMobileDivider
  {form}
/>
