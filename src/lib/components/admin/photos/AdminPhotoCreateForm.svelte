<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';

  let showAdvanced = $state(false);
</script>

<form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
  <h2 class="text-sm uppercase tracking-[0.14em]">Create Photo</h2>
  <input name="title" placeholder="Title" class="rounded border border-border-strong px-3 py-2" required />
  <input name="slug" placeholder="Slug" class="rounded border border-border-strong px-3 py-2" />
  <input name="capture_date" type="text" placeholder="Capture date" class="rounded border border-border-strong px-3 py-2" />
  <textarea name="description" rows="4" placeholder="Description" class="rounded border border-border-strong px-3 py-2"></textarea>
  <input name="dimensions" type="text" placeholder="Dimensions" class="rounded border border-border-strong px-3 py-2" />
  <label class="flex items-center gap-2 text-sm cursor-pointer">
    <input type="checkbox" bind:checked={showAdvanced} /> Advanced
  </label>
  {#if showAdvanced}
    <div class="grid gap-3">
      <textarea name="license_text" rows="2" placeholder="License text" class="rounded border border-border-strong px-3 py-2"></textarea>
      <input name="og_title" placeholder="OG title" class="rounded border border-border-strong px-3 py-2" />
      <textarea name="og_description" rows="2" placeholder="OG description" class="rounded border border-border-strong px-3 py-2"></textarea>
      <input name="og_image_path" placeholder="OG image path" class="rounded border border-border-strong px-3 py-2" />
    </div>
  {:else}
    <input type="hidden" name="license_text" value="" />
    <input type="hidden" name="og_title" value="" />
    <input type="hidden" name="og_description" value="" />
    <input type="hidden" name="og_image_path" value="" />
  {/if}
  <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_searchable" checked /> Searchable</label>
  <AdminButton wFit type="submit">Create Photo</AdminButton>
</form>

