<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  let { data, form } = $props();

  const photo = $derived(data.photo as AdminPhoto);
  const categories = $derived(data.categories as AdminCategory[]);
  const tags = $derived(data.tags as AdminTag[]);
  const images = $derived(data.images as AdminPhotoImage[]);
  const selectedCategoryIds = $derived(data.selectedCategoryIds as string[]);
  const selectedTagIds = $derived(data.selectedTagIds as string[]);
  const photoConversionState = $derived(data.photoConversionState as 'no-images' | 'pending' | 'ready' | 'mixed');

  const baseAdditionalOrder = () =>
    images
      .filter((image) => image.kind === 'additional')
      .sort((a, b) => a.position - b.position)
      .map((image) => image.id);

  let selectedPhotoIds = $state<string[]>([]);
  let orderedAdditional = $state<string[]>([]);
  let selectedAdditional = $state<string[]>([]);
  let draggingId = $state<string | null>(null);
  let refreshState = $state<'idle' | 'refreshing'>('idle');

  $effect(() => {
    orderedAdditional = baseAdditionalOrder();
    selectedAdditional = [];
    selectedPhotoIds = [];
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    if (data.pendingConversionCount <= 0) {
      refreshState = 'idle';
      return;
    }

    const timer = setInterval(async () => {
      refreshState = 'refreshing';
      await invalidateAll();
      refreshState = 'idle';
    }, 8000);

    return () => clearInterval(timer);
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

  const onToggleAdditionalSelected = (_photoId: string, imageId: string, checked: boolean) => {
    if (checked) {
      if (selectedAdditional.includes(imageId)) return;
      selectedAdditional = [...selectedAdditional, imageId];
      return;
    }
    selectedAdditional = selectedAdditional.filter((id) => id !== imageId);
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

    orderedAdditional = moveItem(orderedAdditional, from, to);
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
  };

  const onAdditionalDragEnd = () => {
    draggingId = null;
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl uppercase tracking-[0.15em]">Edit Photo</h1>
  <a href="/admin/photos" class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]">Back to Photos</a>
</div>
<div class="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em]">
  <span class="rounded border border-border px-2 py-1">Pending conversions: {data.pendingConversionCount}</span>
  {#if data.pendingConversionCount > 0}
    <span class="rounded border border-border px-2 py-1">
      {refreshState === 'refreshing' ? 'Refreshing...' : 'Auto-refresh every 8s'}
    </span>
  {/if}
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
    {photoConversionState}
    additionalOrder={orderedAdditional}
    selectedAdditional={selectedAdditional}
    {onTogglePhotoSelected}
    {onToggleAdditionalSelected}
    {onAdditionalDragStart}
    {onAdditionalDragOver}
    {onAdditionalDropBefore}
    {onAdditionalDropToEnd}
    {onAdditionalDragEnd}
    initialExpanded={true}
  />
</section>
