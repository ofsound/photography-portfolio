<script lang="ts">
  import AdminTaxonomyCrudPage from '$lib/components/admin/AdminTaxonomyCrudPage.svelte';

  const { data, form } = $props();
</script>

<AdminTaxonomyCrudPage
  title="Categories"
  singularLabel="Category"
  idPrefix="cat"
  items={data.categories}
  reverseOnMobile
  {form}
/>
