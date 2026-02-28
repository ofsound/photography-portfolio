<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  let showAdvanced = $state(false);
</script>

<form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
  <h2 class="text-sm uppercase tracking-[0.14em]">Create Photo</h2>
  <FormField label="Title" id="create-title">
    <FormInput id="create-title" name="title" placeholder="Title" required />
  </FormField>
  <FormField label="Slug" id="create-slug">
    <FormInput id="create-slug" name="slug" placeholder="Slug" />
  </FormField>
  <FormField label="Capture date" id="create-capture_date">
    <FormInput id="create-capture_date" name="capture_date" type="text" placeholder="Capture date" />
  </FormField>
  <FormField label="Description" id="create-description">
    <FormTextarea id="create-description" name="description" rows={4} placeholder="Description" />
  </FormField>
  <FormField label="Dimensions" id="create-dimensions">
    <FormInput id="create-dimensions" name="dimensions" type="text" placeholder="Dimensions" />
  </FormField>
  <label class="flex items-center gap-2 text-sm cursor-pointer">
    <input type="checkbox" bind:checked={showAdvanced} /> Advanced
  </label>
  {#if showAdvanced}
    <div class="grid gap-3">
      <FormField label="License text" id="create-license_text">
        <FormTextarea id="create-license_text" name="license_text" rows={2} placeholder="License text" />
      </FormField>
      <FormField label="OG title" id="create-og_title">
        <FormInput id="create-og_title" name="og_title" placeholder="OG title" />
      </FormField>
      <FormField label="OG description" id="create-og_description">
        <FormTextarea id="create-og_description" name="og_description" rows={2} placeholder="OG description" />
      </FormField>
      <FormField label="OG image path" id="create-og_image_path">
        <FormInput id="create-og_image_path" name="og_image_path" placeholder="OG image path" />
      </FormField>
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

