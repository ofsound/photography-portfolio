<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminGalleryNav from '$lib/components/admin/AdminGalleryNav.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminSeoSocialDrawer from '$lib/components/admin/AdminSeoSocialDrawer.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import GallerySettingsFormFields from '$lib/components/admin/GallerySettingsFormFields.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  import {
    GALLERY_VISIBILITY_OPTIONS,
    type GalleryVisibilityStatus,
  } from '$lib/constants/gallery-visibility';
  import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';

  type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, string | undefined>;
  };

  const { data, form } = $props();
  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );

  const settings = $derived(data.settings ?? GALLERY_SETTINGS_DEFAULTS);
  const isAdmin = $derived(data.role === 'admin');
  const fieldErrors = $derived(typedForm?.fieldErrors ?? {});
  const values = $derived(typedForm?.values ?? {});
  const isGalleryVisibilityStatus = (
    value: unknown,
  ): value is GalleryVisibilityStatus =>
    value === 'public' || value === 'unlisted' || value === 'archived';
  const selectedVisibilityStatus = $derived.by(() => {
    const next = values.visibility_status;
    if (isGalleryVisibilityStatus(next)) return next;
    return data.gallery.visibility_status;
  });
  const seoTitleValue = $derived(
    values.seo_title ?? data.gallery.seo_title ?? '',
  );
  const seoDescriptionValue = $derived(
    values.seo_description ?? data.gallery.seo_description ?? '',
  );
  const ogTitleValue = $derived(values.og_title ?? data.gallery.og_title ?? '');
  const ogDescriptionValue = $derived(
    values.og_description ?? data.gallery.og_description ?? '',
  );
  const ogImagePathValue = $derived(
    values.og_image_path ?? data.gallery.og_image_path ?? '',
  );
</script>

<AdminGalleryNav
  galleryName={data.gallery.name}
  gallerySlug={data.gallery.slug}
  currentView="details"
/>

{#if form?.message}
  <AdminToastEmitter
    message={form.message}
    type={form && 'success' in form && form.success ? 'success' : 'error'}
  />
{/if}

<form method="POST" action="?/save" class="grid gap-2">
  <AdminHeading level={2}>Gallery Details</AdminHeading>

  <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
    <div class="grid min-w-0 gap-3 sm:flex-1">
      <FormField
        label="Name"
        id="details-name"
        required
        error={fieldErrors.name}
      >
        <FormInput
          id="details-name"
          name="name"
          value={values.name ?? data.gallery.name}
          readonly={!isAdmin}
        />
      </FormField>
      <FormField label="Slug" id="details-slug" error={fieldErrors.slug}>
        <FormInput
          id="details-slug"
          name="slug"
          value={values.slug ?? data.gallery.slug}
          readonly={!isAdmin}
        />
      </FormField>
      <FormField label="Description" id="details-description">
        <FormTextarea
          id="details-description"
          name="description"
          rows={3}
          value={values.description ?? data.gallery.description ?? ''}
          readonly={!isAdmin}
        />
      </FormField>
    </div>

    <div class="grid min-w-0 gap-2 sm:flex-1">
      <FormField label="Visibility" id="details-visibility">
        <div class="grid gap-2">
          {#each GALLERY_VISIBILITY_OPTIONS as option (option.value)}
            <label
              class="flex items-start gap-3 rounded border border-border bg-surface p-3 transition-colors hover:border-border-strong"
            >
              <input
                type="radio"
                name="visibility_status"
                value={option.value}
                checked={selectedVisibilityStatus === option.value}
                disabled={!isAdmin}
                class="mt-1"
              />
              <span class="grid gap-1">
                <span class="text-sm font-medium text-text">{option.label}</span
                >
                <span class="text-xs text-text-muted">{option.description}</span
                >
              </span>
            </label>
          {/each}
        </div>
      </FormField>
    </div>
  </div>

  <AdminSeoSocialDrawer
    idPrefix="details"
    storageKey="admin-seo-social:gallery-details"
    {fieldErrors}
    readonly={!isAdmin}
    seoTitle={seoTitleValue}
    seoDescription={seoDescriptionValue}
    ogTitle={ogTitleValue}
    ogDescription={ogDescriptionValue}
    ogImagePath={ogImagePathValue}
  />

  <hr class="my-8 border-border" />
  <AdminHeading class="mb-4" level={2}>Gallery Settings</AdminHeading>

  <GallerySettingsFormFields
    {settings}
    disableTransitionPreset={!isAdmin}
    idPrefix="settings-"
  />

  <div class="mt-6 flex flex-wrap items-center gap-2">
    <AdminButton type="submit" variant="submit">Save Details</AdminButton>
    {#if isAdmin}
      <AdminButton
        type="button"
        variant="danger"
        onclick={() => {
          if (confirm('Are you sure you want to delete this gallery?')) {
            const f = document.createElement('form');
            f.method = 'POST';
            f.action = '?/delete';
            document.body.appendChild(f);
            f.submit();
          }
        }}>Delete Gallery</AdminButton
      >
    {/if}
  </div>
</form>
