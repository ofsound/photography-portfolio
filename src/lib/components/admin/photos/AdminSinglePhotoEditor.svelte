<script lang="ts">
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { useAdminFormState } from '$lib/components/admin/useAdminFormState.svelte';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import {
    persistAdditionalOrder,
    persistTaxonomy,
  } from '$lib/components/admin/photos/persist';
  import type { GalleryCropConfigByGalleryId } from '$lib/types/gallery-crop';
  import type {
    AdminCategory,
    AdminPhoto,
    AdminPhotoImage,
    AdminTag,
  } from '$lib/types/content';

  const { data, form } = $props<{
    data: {
      photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
      categories: AdminCategory[];
      tags: AdminTag[];
      images: AdminPhotoImage[];
      galleryCropConfigByGalleryId: GalleryCropConfigByGalleryId;
      selectedCategoryIds: string[];
      selectedTagIds: string[];
      photoConversionState: 'no-images' | 'pending' | 'ready' | 'mixed';
    };
    form?: unknown;
  }>();
  const { typedForm } = useAdminFormState<Record<string, string | undefined>>(
    () => form,
  );

  const photo = $derived(data.photo);
  const categories = $derived(data.categories);
  const tags = $derived(data.tags);
  const images = $derived(data.images);
  const serverCategoryIds = $derived(data.selectedCategoryIds);
  const serverTagIds = $derived(data.selectedTagIds);

  const baseAdditionalOrder = () =>
    images
      .filter((image: AdminPhotoImage) => image.kind === 'additional')
      .sort((a: AdminPhotoImage, b: AdminPhotoImage) => a.position - b.position)
      .map((image: AdminPhotoImage) => image.id);
  const initialCategoryIds = untrack(() => [...serverCategoryIds]);
  const initialTagIds = untrack(() => [...serverTagIds]);

  let selectedPhotoIds = $state<string[]>([]);
  let orderedAdditional = $state<string[]>(baseAdditionalOrder());
  let selectedCategoryIds = $state<string[]>(initialCategoryIds);
  let selectedTagIds = $state<string[]>(initialTagIds);

  const onTogglePhotoSelected = (photoId: string, checked: boolean) => {
    if (checked) {
      selectedPhotoIds = [photoId];
      return;
    }
    selectedPhotoIds = [];
  };

  const onAdditionalReorder = async (_photoId: string, next: string[]) => {
    orderedAdditional = next;
    if (
      photo.id &&
      (await persistAdditionalOrder(
        window.location.pathname,
        photo.id,
        next,
        photo.gallery_id,
      ))
    ) {
      invalidateAll();
    }
  };

  const onTaxonomyChange = async (
    photoId: string,
    categoryIds: string[],
    tagIds: string[],
  ) => {
    selectedCategoryIds = categoryIds;
    selectedTagIds = tagIds;
    if (
      await persistTaxonomy(
        window.location.pathname,
        photoId,
        categoryIds,
        tagIds,
        photo.gallery_id,
      )
    ) {
      invalidateAll();
    }
  };
</script>

<section class="mt-6">
  <AdminPhotoCard
    {photo}
    {images}
    galleryCropConfigByGalleryId={data.galleryCropConfigByGalleryId}
    {categories}
    {tags}
    {selectedPhotoIds}
    {selectedCategoryIds}
    {selectedTagIds}
    {onTaxonomyChange}
    additionalOrder={orderedAdditional}
    {onTogglePhotoSelected}
    {onAdditionalReorder}
    editorOnly={true}
    formState={typedForm ?? undefined}
  />
</section>
