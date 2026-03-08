<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminGalleryNav from '$lib/components/admin/AdminGalleryNav.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import GallerySettingsFormFields from '$lib/components/admin/GallerySettingsFormFields.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  import {
    GALLERY_VISIBILITY_LABELS,
    GALLERY_VISIBILITY_OPTIONS,
    type GalleryVisibilityStatus,
  } from '$lib/constants/gallery-visibility';
  import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';

  const { data, form } = $props();

  const settings = $derived(data.settings ?? GALLERY_SETTINGS_DEFAULTS);
  const isAdmin = $derived(data.role === 'admin');
  let visibilityStatus = $derived<GalleryVisibilityStatus>(
    data.gallery.visibility_status,
  );
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
  <p class="text-sm text-text-muted">
    Current status: {GALLERY_VISIBILITY_LABELS[data.gallery.visibility_status]}
  </p>

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

  <div class="grid gap-2">
    <span class="text-sm font-medium tracking-wider text-text">Visibility</span>
    <div class="grid gap-2">
      {#each GALLERY_VISIBILITY_OPTIONS as option (option.value)}
        <label
          class="flex items-start gap-3 rounded border border-border p-3 transition-colors hover:border-border-strong"
        >
          <input
            type="radio"
            name="visibility_status"
            bind:group={visibilityStatus}
            value={option.value}
            disabled={!isAdmin}
            class="mt-1"
          />
          <span class="grid gap-1">
            <span class="text-sm font-medium text-text">{option.label}</span>
            <span class="text-xs text-text-muted">{option.description}</span>
          </span>
        </label>
      {/each}
    </div>
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
