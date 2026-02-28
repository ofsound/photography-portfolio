<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  async function persistAdditionalOrder(photoId: string, orderedIds: string[]) {
    const formData = new FormData();
    formData.append('photo_id', photoId);
    formData.append('ordered_image_ids', orderedIds.join('\n'));
    const res = await fetch(`${window.location.pathname}?/reorderAdditionalImages`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) invalidateAll();
  }

  async function persistTaxonomy(photoId: string, categoryIds: string[], tagIds: string[]) {
    const formData = new FormData();
    formData.append('photo_id', photoId);
    for (const id of categoryIds) formData.append('category_ids', id);
    for (const id of tagIds) formData.append('tag_ids', id);
    const res = await fetch(`${window.location.pathname}?/saveRelations`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) invalidateAll();
  }

  let { data, form } = $props();

  const photo = $derived(data.photo as AdminPhoto);
  const categories = $derived(data.categories as AdminCategory[]);
  const tags = $derived(data.tags as AdminTag[]);
  const images = $derived(data.images as AdminPhotoImage[]);
  const serverCategoryIds = $derived(data.selectedCategoryIds as string[]);
  const serverTagIds = $derived(data.selectedTagIds as string[]);
  const photoConversionState = $derived(data.photoConversionState as 'no-images' | 'pending' | 'ready' | 'mixed');

  const baseAdditionalOrder = () =>
    images
      .filter((image) => image.kind === 'additional')
      .sort((a, b) => a.position - b.position)
      .map((image) => image.id);

  let selectedPhotoIds = $state<string[]>([]);
  let orderedAdditional = $state<string[]>([]);
  let selectedCategoryIds = $state<string[]>([]);
  let selectedTagIds = $state<string[]>([]);
  let draggingId = $state<string | null>(null);

  $effect(() => {
    orderedAdditional = baseAdditionalOrder();
    selectedPhotoIds = [];
    selectedCategoryIds = serverCategoryIds;
    selectedTagIds = serverTagIds;
  });

  const moveItem = (arr: string[], from: number, to: number) => {
    const clone = [...arr];
    const [item] = clone.splice(from, 1);
    clone.splice(to, 0, item);
    return clone;
  };

  const onTogglePhotoSelected = (photoId: string, checked: boolean) => {
    if (checked) {
      selectedPhotoIds = [photoId];
      return;
    }
    selectedPhotoIds = [];
  };

  const onAdditionalDragStart = (_photoId: string, imageId: string, event: DragEvent) => {
    draggingId = imageId;
    event.dataTransfer?.setData('text/plain', imageId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onAdditionalDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  };

  const onAdditionalDropBefore = (_photoId: string, targetId: string, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId) return;

    const from = orderedAdditional.indexOf(draggingId);
    const to = orderedAdditional.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;

    const next = moveItem(orderedAdditional, from, to);
    orderedAdditional = next;
    persistAdditionalOrder(photo.id, next);
  };

  const onAdditionalDropToEnd = (_photoId: string, event: DragEvent) => {
    event.preventDefault();
    if (!draggingId) return;

    const from = orderedAdditional.indexOf(draggingId);
    if (from < 0) return;

    const next = [...orderedAdditional];
    const [item] = next.splice(from, 1);
    next.push(item);
    orderedAdditional = next;
    persistAdditionalOrder(photo.id, next);
  };

  const onAdditionalDragEnd = () => {
    draggingId = null;
  };

  const onTaxonomyChange = (photoId: string, categoryIds: string[], tagIds: string[]) => {
    selectedCategoryIds = categoryIds;
    selectedTagIds = tagIds;
    persistTaxonomy(photoId, categoryIds, tagIds);
  };
</script>

<div class="flex flex-col gap-3">
  <AdminButton href="/admin/photos">Back to Photos</AdminButton>
  <h2 class="text-xl uppercase tracking-[var(--tracking-heading)]">Details</h2>
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}
{#if data.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{data.message}</p>
{/if}

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
    {onAdditionalDragStart}
    {onAdditionalDragOver}
    {onAdditionalDropBefore}
    {onAdditionalDropToEnd}
    {onAdditionalDragEnd}
    initialExpanded={true}
    editorOnly={true}
  />
</section>
