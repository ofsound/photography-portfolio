<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { quintOut } from 'svelte/easing';
  import { fade, slide } from 'svelte/transition';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminPhotoCardCompact from '$lib/components/admin/photos/AdminPhotoCardCompact.svelte';
  import AdminPhotoImageManager from '$lib/components/admin/photos/AdminPhotoImageManager.svelte';
  import AdminPhotoMetadataForm from '$lib/components/admin/photos/AdminPhotoMetadataForm.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import { formControlContainerClass } from '$lib/constants/form';
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
    categories,
    tags,
    selectedPhotoIds,
    selectedCategoryIds,
    selectedTagIds,
    onTaxonomyChange,
    additionalOrder,
    onTogglePhotoSelected,
    onAdditionalReorder,
    initialExpanded = false,
    editorOnly = false,
    editHref,
    index = 0,
    gridMode = false,
    isDraggingPhoto = false,
    formState,
  } = $props<{
    photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
    images: AdminPhotoImage[];
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
    initialExpanded?: boolean;
    editorOnly?: boolean;
    editHref?: string;
    index?: number;
    gridMode?: boolean;
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

  let hasUserToggled = $state(false);
  let toggledExpanded = $state(false);
  const isExpanded = $derived(
    editHref
      ? false
      : editorOnly
        ? true
        : hasUserToggled
          ? toggledExpanded
          : initialExpanded,
  );

  const toggleExpanded = () => {
    if (editorOnly) return;
    if (editHref) {
      goto(resolve(editHref));
      return;
    }
    hasUserToggled = true;
    toggledExpanded = !isExpanded;
  };

  const onHeaderClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('a[href*="/photo/"]') ||
      target.closest('button')
    )
      return;
    if (editHref) {
      goto(resolve(editHref));
      return;
    }
    toggleExpanded();
  };
</script>

{#if gridMode}
  <AdminPhotoCardCompact
    {photo}
    {images}
    {selectedPhotoIds}
    {onTogglePhotoSelected}
    {isPublic}
    {photoStatus}
    {gridMode}
    {editorOnly}
    {index}
    {isDraggingPhoto}
    {isExpanded}
    {editHref}
    onToggleExpanded={toggleExpanded}
    {onHeaderClick}
  />
{:else}
  <article class="relative grid gap-3 rounded">
    <AdminPhotoCardCompact
      {photo}
      {images}
      {selectedPhotoIds}
      {onTogglePhotoSelected}
      {isPublic}
      {photoStatus}
      {gridMode}
      {editorOnly}
      {index}
      {isDraggingPhoto}
      {isExpanded}
      {editHref}
      onToggleExpanded={toggleExpanded}
      {onHeaderClick}
    />

    {#if isExpanded}
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
          <div class="mt-3 flex min-w-0 gap-12">
            <div class="flex min-w-0 flex-[7] flex-col gap-3">
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
                <input
                  type="hidden"
                  name="gallery_id"
                  value={photo.gallery_id}
                />
                {#if !isDraft}
                  <input type="hidden" name="id" value={photo.id} />
                {/if}

                {#snippet dimensionsField()}
                  <FormField
                    label="Dimensions"
                    id="edit-dimensions-{photoFormId}"
                  >
                    <FormInput
                      id="edit-dimensions-{photoFormId}"
                      name="dimensions"
                      bind:value={form.dimensions}
                      type="text"
                      placeholder="Dimensions"
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
                              onTaxonomyChange(
                                photo.id,
                                selectedCategoryIds,
                                next,
                              );
                            }}
                          />
                          {tag.name}
                        </label>
                      {/each}
                    </div>
                  </FormField>
                </div>
              {:else}
                <p class="p-3 text-sm text-text-muted">
                  Upload the first image or save the draft first to add
                  categories and tags.
                </p>
              {/if}
            </div>

            <div
              transition:fade={{
                duration: FADE_DURATION,
                delay: 2 * STAGGER_MS,
                easing: quintOut,
              }}
              class="min-w-0 flex-[3]"
            >
              <div class="grid gap-3">
                <div class="grid gap-3">
                  <FormField
                    label="License text"
                    id="edit-license_text-{photoFormId}"
                  >
                    <FormTextarea
                      id="edit-license_text-{photoFormId}"
                      name="license_text"
                      bind:value={form.licenseText}
                      rows={2}
                      placeholder="License text"
                      form="photo-update-form-{photoFormId}"
                    />
                  </FormField>
                  <FormField label="OG title" id="edit-og_title-{photoFormId}">
                    <FormInput
                      id="edit-og_title-{photoFormId}"
                      name="og_title"
                      bind:value={form.ogTitle}
                      placeholder="OG title"
                      form="photo-update-form-{photoFormId}"
                    />
                  </FormField>
                  <FormField
                    label="OG description"
                    id="edit-og_description-{photoFormId}"
                  >
                    <FormTextarea
                      id="edit-og_description-{photoFormId}"
                      name="og_description"
                      bind:value={form.ogDescription}
                      rows={2}
                      placeholder="OG description"
                      form="photo-update-form-{photoFormId}"
                    />
                  </FormField>
                  <FormField
                    label="OG image path"
                    id="edit-og_image_path-{photoFormId}"
                  >
                    <FormInput
                      id="edit-og_image_path-{photoFormId}"
                      name="og_image_path"
                      bind:value={form.ogImagePath}
                      placeholder="OG image path"
                      form="photo-update-form-{photoFormId}"
                    />
                  </FormField>
                </div>
              </div>
            </div>
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
    {/if}
  </article>
{/if}
