<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import { persistAdditionalOrder, persistTaxonomy } from '$lib/components/admin/photos/persist';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  let {
    data
  } = $props<{
    data: {
      photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
      categories: AdminCategory[];
      tags: AdminTag[];
      images: AdminPhotoImage[];
      selectedCategoryIds: string[];
      selectedTagIds: string[];
      photoConversionState: 'no-images' | 'pending' | 'ready' | 'mixed';
    };
  }>();

  const photo = $derived(data.photo);
  const categories = $derived(data.categories);
  const tags = $derived(data.tags);
  const images = $derived(data.images);
  const serverCategoryIds = $derived(data.selectedCategoryIds);
  const serverTagIds = $derived(data.selectedTagIds);
  const photoConversionState = $derived(data.photoConversionState);

  const baseAdditionalOrder = () =>
    images
      .filter((image: AdminPhotoImage) => image.kind === 'additional')
      .sort((a: AdminPhotoImage, b: AdminPhotoImage) => a.position - b.position)
      .map((image: AdminPhotoImage) => image.id);

  let selectedPhotoIds = $state<string[]>([]);
  let orderedAdditional = $state<string[]>([]);
  let selectedCategoryIds = $state<string[]>([]);
  let selectedTagIds = $state<string[]>([]);

  $effect(() => {
    orderedAdditional = baseAdditionalOrder();
    selectedPhotoIds = [];
    selectedCategoryIds = serverCategoryIds;
    selectedTagIds = serverTagIds;
  });

  const onTogglePhotoSelected = (photoId: string, checked: boolean) => {
    if (checked) {
      selectedPhotoIds = [photoId];
      return;
    }
    selectedPhotoIds = [];
  };

  const onAdditionalReorder = async (_photoId: string, next: string[]) => {
    orderedAdditional = next;
    if (photo.id && (await persistAdditionalOrder(window.location.pathname, photo.id, next))) {
      invalidateAll();
    }
  };

  const onTaxonomyChange = async (photoId: string, categoryIds: string[], tagIds: string[]) => {
    selectedCategoryIds = categoryIds;
    selectedTagIds = tagIds;
    if (await persistTaxonomy(window.location.pathname, photoId, categoryIds, tagIds)) {
      invalidateAll();
    }
  };
</script>

<section class="mt-6">
  <AdminPhotoCard
    {photo}
    {images}
    {categories}
    {tags}
    {selectedPhotoIds}
    {selectedCategoryIds}
    {selectedTagIds}
    {onTaxonomyChange}
    {photoConversionState}
    additionalOrder={orderedAdditional}
    {onTogglePhotoSelected}
    {onAdditionalReorder}
    initialExpanded={true}
    editorOnly={true}
  />
</section>
