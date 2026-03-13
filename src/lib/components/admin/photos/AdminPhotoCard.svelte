<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { quintOut } from 'svelte/easing';
  import { fade, slide } from 'svelte/transition';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminSeoSocialDrawer from '$lib/components/admin/AdminSeoSocialDrawer.svelte';
  import AdminPhotoCardCompact from '$lib/components/admin/photos/AdminPhotoCardCompact.svelte';
  import AdminPhotoImageManager from '$lib/components/admin/photos/AdminPhotoImageManager.svelte';
  import AdminPhotoMetadataForm from '$lib/components/admin/photos/AdminPhotoMetadataForm.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import { formControlContainerClass } from '$lib/constants/form';
  import type { GalleryCropConfigByGalleryId } from '$lib/types/gallery-crop';
  import { slugify } from '$lib/utils/slug';

  import type {
    AdminCategory,
    AdminPhoto,
    AdminPhotoImage,
    AdminTag,
  } from '$lib/types/content';

  const SLIDE_DURATION = 280;
  const FADE_DURATION = 200;
  const STAGGER_MS = 60;

  const {
    photo,
    images,
    galleryCropConfigByGalleryId,
    categories,
    tags,
    selectedPhotoIds,
    selectedCategoryIds,
    selectedTagIds,
    onTaxonomyChange,
    additionalOrder,
    onTogglePhotoSelected,
    onAdditionalReorder,
    editorOnly = false,
    editHref,
    isDraggingPhoto = false,
    formState,
  } = $props<{
    photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
    images: AdminPhotoImage[];
    galleryCropConfigByGalleryId: GalleryCropConfigByGalleryId;
    categories: AdminCategory[];
    tags: AdminTag[];
    selectedPhotoIds: string[];
    selectedCategoryIds: string[];
    selectedTagIds: string[];
    onTaxonomyChange: (
      photoId: string,
      categoryIds: string[],
      tagIds: string[],
    ) => void;
    additionalOrder: string[];
    onTogglePhotoSelected: (photoId: string, checked: boolean) => void;
    onAdditionalReorder: (
      photoId: string,
      orderedImageIds: string[],
    ) => void | Promise<void>;
    editorOnly?: boolean;
    editHref?: string;
    isDraggingPhoto?: boolean;
    formState?: {
      fieldErrors?: Record<string, string | undefined>;
      values?: Record<string, string | undefined>;
    };
  }>();

  // Local form state to avoid overwriting user edits on re-renders (e.g. taxonomy checkbox changes)
  const form = $state(
    (() => {
      const p = photo;
      return {
        title: p.title ?? '',
        slug: p.slug ?? '',
        description: p.description ?? '',
        captureDate: p.capture_date ?? '',
        dimensions: p.dimensions ?? '',
        licenseText: p.license_text ?? '',
        seoTitle: p.seo_title ?? '',
        seoDescription: p.seo_description ?? '',
        ogTitle: p.og_title ?? '',
        ogDescription: p.og_description ?? '',
        ogImagePath: p.og_image_path ?? '',
      };
    })(),
  );
  let hasManualSlugEdit = (() => {
    const p = photo;
    return (
      (p.slug ?? '').trim().length > 0 &&
      (p.slug ?? '') !== slugify(p.title ?? '')
    );
  })();
  const isDraft = $derived(photo.id === null || photo.id === undefined);
  const photoStatus = $derived(
    photo.deleted_at
      ? 'archived'
      : photo.status === 'published'
        ? 'published'
        : 'draft',
  );
  const isPublic = $derived(photoStatus === 'published');
  const photoFormId = $derived(isDraft ? 'draft' : photo.id);
  const galleryCropConfig = $derived(
    galleryCropConfigByGalleryId[photo.gallery_id] ?? {
      layoutMode: 'uniform',
      uniformThumbRatio: 1,
    },
  );
  const activeFormState = $derived.by(() => {
    if (!formState) return null;
    const targetId = formState.values?.id;
    if (!targetId) return isDraft ? formState : null;
    if (!isDraft && targetId === photo.id) return formState;
    return null;
  });
  const activeFieldErrors = $derived(activeFormState?.fieldErrors ?? {});
  const activeValues = $derived(activeFormState?.values ?? {});

  const onTitleInput = () => {
    if (hasManualSlugEdit) return;
    form.slug = slugify(form.title);
  };

  const onSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value.trim();
    hasManualSlugEdit = value.length !== 0;
    if (!hasManualSlugEdit) {
      form.slug = slugify(form.title);
    }
  };

  $effect(() => {
    if (!activeFormState) return;

    if (typeof activeValues.title === 'string') form.title = activeValues.title;
    if (typeof activeValues.slug === 'string') form.slug = activeValues.slug;
    if (typeof activeValues.description === 'string') {
      form.description = activeValues.description;
    }
    if (typeof activeValues.capture_date === 'string') {
      form.captureDate = activeValues.capture_date;
    }
    if (typeof activeValues.dimensions === 'string') {
      form.dimensions = activeValues.dimensions;
    }
    if (typeof activeValues.license_text === 'string') {
      form.licenseText = activeValues.license_text;
    }
    if (typeof activeValues.seo_title === 'string') {
      form.seoTitle = activeValues.seo_title;
    }
    if (typeof activeValues.seo_description === 'string') {
      form.seoDescription = activeValues.seo_description;
    }
    if (typeof activeValues.og_title === 'string') {
      form.ogTitle = activeValues.og_title;
    }
    if (typeof activeValues.og_description === 'string') {
      form.ogDescription = activeValues.og_description;
    }
    if (typeof activeValues.og_image_path === 'string') {
      form.ogImagePath = activeValues.og_image_path;
    }
  });
</script>

{#if editorOnly}
  <article class="relative grid gap-3 rounded">
    <div
      transition:slide={{
        duration: SLIDE_DURATION,
        easing: quintOut,
        axis: 'y',
      }}
      class="flex flex-col gap-3"
    >
      <div
        transition:fade={{
          duration: FADE_DURATION,
          delay: 0 * STAGGER_MS,
          easing: quintOut,
        }}
        class="mb-8"
      >
        <AdminPhotoImageManager
          {photo}
          {images}
          {galleryCropConfig}
          {additionalOrder}
          {onAdditionalReorder}
          draftTitle={form.title}
          draftSlug={form.slug}
        />
      </div>

      <div
        transition:fade={{
          duration: FADE_DURATION,
          delay: 1 * STAGGER_MS,
          easing: quintOut,
        }}
      >
        <AdminHeading level={2}>Details</AdminHeading>
        <div class="mt-3 flex min-w-0 flex-col gap-3">
          <form
            id="photo-update-form-{photoFormId}"
            method="POST"
            action={isDraft ? '?/create' : '?/update'}
            class="grid gap-3"
            use:enhance={() => {
              return async ({ update }) => {
                await update({ reset: false });
                await invalidateAll();
              };
            }}
          >
            <input type="hidden" name="gallery_id" value={photo.gallery_id} />
            {#if !isDraft}
              <input type="hidden" name="id" value={photo.id} />
            {/if}
            {#if photoStatus === 'published'}
              <input type="hidden" name="redirect_to_gallery" value="1" />
            {/if}

            {#snippet dimensionsField()}
              <FormField label="Dimensions" id="edit-dimensions-{photoFormId}">
                <FormInput
                  id="edit-dimensions-{photoFormId}"
                  name="dimensions"
                  bind:value={form.dimensions}
                  type="text"
                />
              </FormField>
            {/snippet}

            {#snippet licenseField()}
              <FormField
                label="License text"
                id="edit-license_text-{photoFormId}"
              >
                <FormTextarea
                  id="edit-license_text-{photoFormId}"
                  name="license_text"
                  bind:value={form.licenseText}
                  rows={2}
                />
              </FormField>
            {/snippet}

            <AdminPhotoMetadataForm
              {photoFormId}
              bind:title={form.title}
              bind:slug={form.slug}
              bind:description={form.description}
              bind:captureDate={form.captureDate}
              {onTitleInput}
              {onSlugInput}
              trailingField={dimensionsField}
              afterDescription={isDraft ? undefined : licenseField}
              fieldErrors={activeFieldErrors}
            />
          </form>

          {#if !isDraft}
            <div class="grid gap-3 sm:grid-cols-2">
              <FormField label="Categories">
                <div
                  class="grid max-h-36 gap-1 overflow-auto {formControlContainerClass}"
                >
                  {#each categories as category (category.id)}
                    <label class="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        value={category.id}
                        checked={selectedCategoryIds.includes(category.id)}
                        onchange={() => {
                          const checked = !selectedCategoryIds.includes(
                            category.id,
                          );
                          const next = checked
                            ? [...selectedCategoryIds, category.id]
                            : selectedCategoryIds.filter(
                                (id: string) => id !== category.id,
                              );
                          onTaxonomyChange(photo.id, next, selectedTagIds);
                        }}
                      />
                      {category.name}
                    </label>
                  {/each}
                </div>
              </FormField>

              <FormField label="Tags">
                <div
                  class="grid max-h-36 gap-1 overflow-auto {formControlContainerClass}"
                >
                  {#each tags as tag (tag.id)}
                    <label class="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        value={tag.id}
                        checked={selectedTagIds.includes(tag.id)}
                        onchange={() => {
                          const checked = !selectedTagIds.includes(tag.id);
                          const next = checked
                            ? [...selectedTagIds, tag.id]
                            : selectedTagIds.filter(
                                (id: string) => id !== tag.id,
                              );
                          onTaxonomyChange(photo.id, selectedCategoryIds, next);
                        }}
                      />
                      {tag.name}
                    </label>
                  {/each}
                </div>
              </FormField>
            </div>

            <div
              transition:fade={{
                duration: FADE_DURATION,
                delay: 2 * STAGGER_MS,
                easing: quintOut,
              }}
              class="grid gap-3"
            >
              <AdminSeoSocialDrawer
                idPrefix="photo-{photoFormId}"
                storageKey="admin-seo-social:photo-editor"
                fieldErrors={activeFieldErrors}
                form="photo-update-form-{photoFormId}"
                bind:seoTitle={form.seoTitle}
                bind:seoDescription={form.seoDescription}
                bind:ogTitle={form.ogTitle}
                bind:ogDescription={form.ogDescription}
                bind:ogImagePath={form.ogImagePath}
              />
            </div>
          {:else}
            <p class="p-3 text-sm text-text-muted">
              Upload the first image or save the draft first to add categories
              and tags.
            </p>
          {/if}
        </div>
      </div>

      <div
        transition:fade={{
          duration: FADE_DURATION,
          delay: 4 * STAGGER_MS,
          easing: quintOut,
        }}
        class="mt-8 flex flex-wrap items-center justify-center gap-2"
      >
        <AdminButton
          form="photo-update-form-{photoFormId}"
          variant="submit"
          type="submit"
        >
          {photoStatus === 'draft' || isDraft ? 'Save Draft' : 'Save'}
        </AdminButton>
        {#if !isDraft}
          {#if photoStatus === 'draft'}
            <AdminButton
              form="photo-update-form-{photoFormId}"
              variant="submit"
              type="submit"
              formaction="?/publish"
            >
              Publish
            </AdminButton>
          {/if}
          {#if photoStatus === 'published'}
            <AdminButton
              form="photo-update-form-{photoFormId}"
              variant="danger"
              type="submit"
              formaction="?/archive"
              onclick={(e: MouseEvent) => {
                if (
                  !window.confirm(
                    'Are you sure you want to archive this photo?',
                  )
                ) {
                  e.preventDefault();
                }
              }}>Archive</AdminButton
            >
          {/if}
          {#if photoStatus === 'archived'}
            <AdminButton
              form="photo-update-form-{photoFormId}"
              type="submit"
              variant="submit"
              formaction="?/restore">Restore</AdminButton
            >
          {/if}
        {/if}
      </div>
    </div>
  </article>
{:else}
  <AdminPhotoCardCompact
    {photo}
    {images}
    {selectedPhotoIds}
    {onTogglePhotoSelected}
    {isPublic}
    {photoStatus}
    {isDraggingPhoto}
    {editHref}
  />
{/if}
