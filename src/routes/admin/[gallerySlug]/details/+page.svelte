<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminGalleryNav from '$lib/components/admin/AdminGalleryNav.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import GallerySettingsFormFields from '$lib/components/admin/GallerySettingsFormFields.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';

  const { data, form } = $props();

  const settings = $derived(data.settings ?? GALLERY_SETTINGS_DEFAULTS);
  const isAdmin = $derived(data.role === 'admin');
</script>

<AdminGalleryNav
  galleryName={data.gallery.name}
  gallerySlug={data.gallery.slug}
  currentView="details"
/>

{#if form?.message}
  <AdminStatusMessage
    type={form && 'success' in form && form.success ? 'success' : 'error'}
    class="mt-3"
  >
    {form.message}
  </AdminStatusMessage>
{/if}

<form method="POST" action="?/save" class="mt-6 grid gap-4">
  <AdminHeading level={2}>Gallery Details</AdminHeading>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Name" id="details-name">
      <FormInput
        id="details-name"
        name="name"
        value={data.gallery.name}
        required
        readonly={!isAdmin}
      />
    </FormField>
    <FormField label="Slug" id="details-slug">
      <FormInput
        id="details-slug"
        name="slug"
        value={data.gallery.slug}
        required
        readonly={!isAdmin}
      />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Description" id="details-description">
      <FormTextarea
        id="details-description"
        name="description"
        rows={3}
        value={data.gallery.description ?? ''}
        readonly={!isAdmin}
      />
    </FormField>

    <div class="grid gap-3">
      <FormField label="SEO Title" id="details-seo-title">
        <FormInput
          id="details-seo-title"
          name="seo_title"
          value={data.gallery.seo_title ?? ''}
          readonly={!isAdmin}
        />
      </FormField>
      <FormField label="SEO Description" id="details-seo-description">
        <FormTextarea
          id="details-seo-description"
          name="seo_description"
          rows={2}
          value={data.gallery.seo_description ?? ''}
          readonly={!isAdmin}
        />
      </FormField>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="is_active"
        checked={data.gallery.is_active}
        disabled={!isAdmin}
      />
      Active
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="show_in_nav"
        checked={data.gallery.show_in_nav}
        disabled={!isAdmin}
      />
      Show In Nav
    </label>
  </div>

  <AdminHeading level={2}>Gallery Settings</AdminHeading>

  <GallerySettingsFormFields
    {settings}
    disableTransitionPreset={!isAdmin}
    idPrefix="settings-"
  />

  <div class="flex flex-wrap items-center gap-2">
    <AdminButton type="submit" variant="submit">Save Details</AdminButton>
    {#if isAdmin}
      <AdminButton
        type="submit"
        variant="danger"
        formaction="?/delete"
        formmethod="POST">Delete Gallery</AdminButton
      >
    {/if}
  </div>
</form>
