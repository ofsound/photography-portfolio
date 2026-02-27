<script lang="ts">
  import { goto } from '$app/navigation';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoConversionBadge from '$lib/components/admin/PhotoConversionBadge.svelte';
  import PhotoUploadZone from '$lib/components/admin/PhotoUploadZone.svelte';
  import ThumbnailCropEditor from '$lib/components/admin/ThumbnailCropEditor.svelte';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  const SLIDE_DURATION = 280;
  const FADE_DURATION = 200;
  const STAGGER_MS = 60;

  let {
    photo,
    images,
    categories,
    tags,
    selectedPhotoIds,
    selectedCategoryIds,
    selectedTagIds,
    onTaxonomyChange,
    photoConversionState,
    additionalOrder,
    selectedAdditional,
    onTogglePhotoSelected,
    onToggleAdditionalSelected,
    onAdditionalDragStart,
    onAdditionalDragOver,
    onAdditionalDropBefore,
    onAdditionalDropToEnd,
    onAdditionalDragEnd,
    initialExpanded = false,
    editorOnly = false,
    editHref,
    index = 0,
    gridMode = false,
    onPhotoDragStart,
    onPhotoDragOver,
    onPhotoDrop,
    onPhotoDragEnd,
    isDraggingPhoto = false
  } = $props<{
    photo: AdminPhoto;
    images: AdminPhotoImage[];
    categories: AdminCategory[];
    tags: AdminTag[];
    selectedPhotoIds: string[];
    selectedCategoryIds: string[];
    selectedTagIds: string[];
    onTaxonomyChange: (photoId: string, categoryIds: string[], tagIds: string[]) => void;
    photoConversionState: 'no-images' | 'pending' | 'ready' | 'mixed';
    additionalOrder: string[];
    selectedAdditional: string[];
    onTogglePhotoSelected: (photoId: string, checked: boolean) => void;
    onToggleAdditionalSelected: (photoId: string, imageId: string, checked: boolean) => void;
    onAdditionalDragStart: (photoId: string, imageId: string, event: DragEvent) => void;
    onAdditionalDragOver: (event: DragEvent) => void;
    onAdditionalDropBefore: (photoId: string, targetId: string, event: DragEvent) => void;
    onAdditionalDropToEnd: (photoId: string, event: DragEvent) => void;
    onAdditionalDragEnd: () => void;
    initialExpanded?: boolean;
    editorOnly?: boolean;
    editHref?: string;
    index?: number;
    gridMode?: boolean;
    onPhotoDragStart?: (photoId: string, event: DragEvent) => void;
    onPhotoDragOver?: (event: DragEvent) => void;
    onPhotoDrop?: (targetPhotoId: string, event: DragEvent) => void;
    onPhotoDragEnd?: () => void;
    isDraggingPhoto?: boolean;
  }>();

  const lead = $derived(images.find((image: AdminPhotoImage) => image.kind === 'lead') ?? null);
  const additionalImages = $derived(images.filter((image: AdminPhotoImage) => image.kind === 'additional'));
  const pendingImageCount = $derived(images.filter((image: AdminPhotoImage) => !image.delivery_storage_path).length);
  const readyImageCount = $derived(images.filter((image: AdminPhotoImage) => Boolean(image.delivery_storage_path)).length);
  const imageById = (imageId: string) => images.find((image: AdminPhotoImage) => image.id === imageId) ?? null;

  const imageConversionState = (image: AdminPhotoImage): 'ready' | 'converting' | 'unknown' => {
    if (image.delivery_storage_path) return 'ready';
    if (image.source_storage_path) return 'converting';
    return 'unknown';
  };

  let hasUserToggled = $state(false);
  let toggledExpanded = $state(false);
  let showAdvanced = $state(false);
  const isExpanded = $derived(
    editHref ? false : editorOnly ? true : hasUserToggled ? toggledExpanded : initialExpanded
  );

  const toggleExpanded = () => {
    if (editorOnly) return;
    if (editHref) {
      goto(editHref);
      return;
    }
    hasUserToggled = true;
    toggledExpanded = !isExpanded;
  };

  const onHeaderClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('a[href^="/photo/"]') ||
      target.closest('button')
    )
      return;
    if (editHref) {
      goto(editHref);
      return;
    }
    toggleExpanded();
  };
</script>

{#if gridMode}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <div
    class="group relative flex aspect-square flex-col overflow-hidden rounded border border-border bg-surface {onPhotoDragStart ? 'cursor-move' : ''}"
    class:opacity-50={isDraggingPhoto}
    draggable={!!onPhotoDragStart}
    ondragstart={onPhotoDragStart ? (e) => onPhotoDragStart(photo.id, e) : undefined}
    ondragover={onPhotoDragOver}
    ondrop={onPhotoDrop ? (e) => onPhotoDrop(photo.id, e) : undefined}
    ondragend={onPhotoDragEnd}
    role="button"
    tabindex="0"
    onclick={(e) => {
      if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('a')) return;
      if (editHref) goto(editHref);
    }}
    onkeydown={(e) => e.key === 'Enter' && editHref && goto(editHref)}
  >
    <div class="absolute left-2 top-2 z-10 flex items-center gap-1">
      <input
        type="checkbox"
        class="size-5 rounded border-border-strong"
        checked={selectedPhotoIds.includes(photo.id)}
        onchange={(event) => onTogglePhotoSelected(photo.id, (event.currentTarget as HTMLInputElement).checked)}
        onclick={(e) => e.stopPropagation()}
      />
    </div>
    <div class="absolute right-2 top-2 z-10">
      <a
        href="/photo/{photo.slug}"
        class="rounded bg-black/50 px-2 py-1 text-[10px] text-white hover:bg-black/70"
        target="_blank"
        rel="noopener noreferrer"
        onclick={(e) => e.stopPropagation()}
      >View</a>
    </div>
    <div class="relative flex-1 overflow-hidden">
      {#if lead?.delivery_storage_path}
        <img
          src={photoPublicUrl(lead.delivery_storage_path, 400)}
          alt={lead.alt_text ?? photo.title}
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      {:else if lead}
        <div class="grid h-full w-full place-items-center rounded border border-border-strong bg-surface-muted text-[10px] uppercase text-text-muted">pending</div>
      {:else}
        <div class="grid h-full w-full place-items-center rounded border border-border-strong bg-surface-muted text-[10px] uppercase text-text-muted">no lead</div>
      {/if}
    </div>
    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
      <h2 class="truncate text-xs font-medium uppercase tracking-[0.1em] text-white">{photo.title}</h2>
      <a
        href="/photo/{photo.slug}"
        class="block truncate text-[10px] text-white/80 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        onclick={(e) => e.stopPropagation()}
      >/{photo.slug}</a>
    </div>
  </div>
{:else}
  <article class="relative grid gap-3 rounded p-4 {index % 2 === 0 ? 'bg-surface' : 'bg-surface-muted'}">
    {#if !editorOnly}
      <span class="absolute left-2 top-2 text-[10px] font-medium tabular-nums text-text-muted">{index + 1}</span>
    {/if}
    {#if !editorOnly}
      <div
        role="button"
        tabindex="0"
        class="grid cursor-pointer gap-2 rounded p-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
        onclick={onHeaderClick}
        onkeydown={(e) => e.key === 'Enter' && toggleExpanded()}
      >
        <div class="flex items-center sm:justify-center">
          <input
            type="checkbox"
            class="size-8"
            checked={selectedPhotoIds.includes(photo.id)}
            onchange={(event) => onTogglePhotoSelected(photo.id, (event.currentTarget as HTMLInputElement).checked)}
          />
        </div>

        {#if lead?.delivery_storage_path}
          <img src={photoPublicUrl(lead.delivery_storage_path, 220)} alt={lead.alt_text ?? photo.title} class="h-14 w-20 rounded object-cover" />
        {:else if lead}
          <div class="grid h-14 w-20 place-items-center rounded border border-border-strong text-[10px] uppercase">pending</div>
        {:else}
          <div class="grid h-14 w-20 place-items-center rounded border border-border-strong text-[10px] uppercase">no lead</div>
        {/if}

        <div class="min-w-0">
          <h2 class="truncate text-sm uppercase tracking-[0.12em]">{photo.title}</h2>
          <a
            href="/photo/{photo.slug}"
            class="inline-block text-xs text-text-muted hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >/{photo.slug}</a>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            onclick={toggleExpanded}
            class="flex size-8 items-center justify-center rounded text-text-muted transition-colors hover:bg-border hover:text-text"
            aria-label={editHref ? 'Open' : isExpanded ? 'Collapse' : 'Edit'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="transition-transform duration-200"
              style="transform: rotate({isExpanded ? 90 : 0}deg)"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    {/if}

  {#if isExpanded}
    <div
      transition:slide={{ duration: SLIDE_DURATION, easing: quintOut, axis: 'y' }}
      class="grid gap-3"
    >
      <div transition:fade={{ duration: FADE_DURATION, delay: 0 * STAGGER_MS, easing: quintOut }}>
        <form id="photo-update-form-{photo.id}" method="POST" action="?/update" class="grid gap-3">
      <input type="hidden" name="id" value={photo.id} />
      <div class="grid gap-2 sm:grid-cols-2">
        <input name="title" value={photo.title} placeholder="Title" class="rounded border border-border-strong px-3 py-2" required />
        <input name="slug" value={photo.slug} placeholder="Slug" class="rounded border border-border-strong px-3 py-2" required />
      </div>

      <textarea name="description" rows="3" placeholder="Description" class="rounded border border-border-strong px-3 py-2">{photo.description ?? ''}</textarea>

      <div class="grid gap-2 sm:grid-cols-3 sm:items-center">
        <input name="capture_date" type="text" value={photo.capture_date ?? ''} placeholder="Capture date" class="rounded border border-border-strong px-3 py-2" />
        <input name="dimensions" type="text" value={photo.dimensions ?? ''} placeholder="Dimensions" class="rounded border border-border-strong px-3 py-2" />
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" bind:checked={showAdvanced} /> Advanced
        </label>
      </div>
      {#if showAdvanced}
        <div class="grid gap-3">
          <label class="flex items-center gap-2 rounded border border-border-strong px-3 py-2 text-sm">
            <input type="checkbox" name="is_searchable" checked={photo.is_searchable} /> Searchable
          </label>
          <textarea name="license_text" rows="2" class="rounded border border-border-strong px-3 py-2" placeholder="License text">{photo.license_text ?? ''}</textarea>
          <input name="og_title" value={photo.og_title ?? ''} class="rounded border border-border-strong px-3 py-2" placeholder="OG title" />
          <textarea name="og_description" rows="2" class="rounded border border-border-strong px-3 py-2" placeholder="OG description">{photo.og_description ?? ''}</textarea>
          <input name="og_image_path" value={photo.og_image_path ?? ''} class="rounded border border-border-strong px-3 py-2" placeholder="OG image path" />
        </div>
      {:else}
        <input type="hidden" name="is_searchable" value={photo.is_searchable ? 'on' : ''} />
        <input type="hidden" name="license_text" value={photo.license_text ?? ''} />
        <input type="hidden" name="og_title" value={photo.og_title ?? ''} />
        <input type="hidden" name="og_description" value={photo.og_description ?? ''} />
        <input type="hidden" name="og_image_path" value={photo.og_image_path ?? ''} />
      {/if}
        </form>
      </div>

      <div transition:fade={{ duration: FADE_DURATION, delay: 1 * STAGGER_MS, easing: quintOut }}>
        <div class="grid gap-3 rounded border border-border p-3">
      <div class="grid gap-3 lg:grid-cols-2">
        <fieldset class="grid gap-2">
          <legend class="text-xs uppercase tracking-[0.12em]">Categories</legend>
          <div class="grid max-h-36 gap-1 overflow-auto">
            {#each categories as category (category.id)}
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={category.id}
                  checked={selectedCategoryIds.includes(category.id)}
                  onchange={() => {
                    const checked = !selectedCategoryIds.includes(category.id);
                    const next = checked
                      ? [...selectedCategoryIds, category.id]
                      : selectedCategoryIds.filter((id: string) => id !== category.id);
                    onTaxonomyChange(photo.id, next, selectedTagIds);
                  }}
                />
                {category.name}
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset class="grid gap-2">
          <legend class="text-xs uppercase tracking-[0.12em]">Tags</legend>
          <div class="grid max-h-36 gap-1 overflow-auto">
            {#each tags as tag (tag.id)}
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onchange={() => {
                    const checked = !selectedTagIds.includes(tag.id);
                    const next = checked
                      ? [...selectedTagIds, tag.id]
                      : selectedTagIds.filter((id: string) => id !== tag.id);
                    onTaxonomyChange(photo.id, selectedCategoryIds, next);
                  }}
                />
                {tag.name}
              </label>
            {/each}
          </div>
        </fieldset>
      </div>
        </div>
      </div>

      <div transition:fade={{ duration: FADE_DURATION, delay: 2 * STAGGER_MS, easing: quintOut }}>
        <PhotoUploadZone photoId={photo.id} existingImageCount={images.length} />
      </div>

      <div transition:fade={{ duration: FADE_DURATION, delay: 3 * STAGGER_MS, easing: quintOut }}>
        <div class="grid gap-3 p-3">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs uppercase tracking-[0.12em]">Images</p>
        <span class="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          Processing: {pendingImageCount}
        </span>
      </div>

      {#if lead}
        <div class="grid gap-2 rounded p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          {#if lead.delivery_storage_path}
            <img src={photoPublicUrl(lead.delivery_storage_path, 180)} alt={lead.alt_text ?? photo.title} class="h-12 w-16 rounded object-cover" />
          {:else}
            <div class="grid h-12 w-16 place-items-center rounded border border-border-strong text-[10px] uppercase">pending</div>
          {/if}

          <div class="text-xs">
            <div class="flex items-center gap-2 uppercase tracking-[0.12em]">
              <span>Lead Image</span>
              <PhotoConversionBadge state={imageConversionState(lead)} size="sm" />
            </div>
          </div>

          <form method="POST" action="?/removeImage">
            <input type="hidden" name="image_id" value={lead.id} />
            <AdminButton variant="danger-outline" size="sm" type="submit">Delete</AdminButton>
          </form>
        </div>

        {#if lead.delivery_storage_path}
          <details class="rounded border border-border p-3">
            <summary class="cursor-pointer text-xs uppercase tracking-[0.12em]">Edit thumbnail crop</summary>
            <div class="mt-3">
              <ThumbnailCropEditor
                imageId={lead.id}
                deliveryStoragePath={lead.delivery_storage_path}
                altText={lead.alt_text ?? photo.title}
                dimensions={lead.dimensions}
                initialCrop={{
                  thumb_crop_x: lead.thumb_crop_x,
                  thumb_crop_y: lead.thumb_crop_y,
                  thumb_crop_zoom: lead.thumb_crop_zoom
                }}
                photoId={photo.id}
              />
            </div>
          </details>
        {/if}
      {:else}
        <p class="text-sm text-text-muted">No lead image set.</p>
      {/if}

      <div class="grid gap-2">
        <p class="text-xs uppercase tracking-[0.12em]">Additional Images (drag to reorder)</p>

        {#if additionalOrder.length === 0}
          <p class="text-sm text-text-muted">No additional images.</p>
        {:else}
          <ul class="grid gap-2" ondragover={onAdditionalDragOver} ondrop={(event) => onAdditionalDropToEnd(photo.id, event)}>
            {#each additionalOrder as imageId, i}
              {@const image = imageById(imageId)}
              {#if image}
                <li
                  class="grid cursor-move gap-2 rounded p-2 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-center {i % 2 === 0 ? 'bg-surface' : 'bg-surface-muted'}"
                  draggable="true"
                  ondragstart={(event) => onAdditionalDragStart(photo.id, image.id, event)}
                  ondragover={onAdditionalDragOver}
                  ondrop={(event) => onAdditionalDropBefore(photo.id, image.id, event)}
                  ondragend={onAdditionalDragEnd}
                >
                  <label class="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedAdditional.includes(image.id)}
                      onchange={(event) => onToggleAdditionalSelected(photo.id, image.id, (event.currentTarget as HTMLInputElement).checked)}
                    />
                  </label>

                  {#if image.delivery_storage_path}
                    <img src={photoPublicUrl(image.delivery_storage_path, 160)} alt={image.alt_text ?? photo.title} class="h-12 w-16 rounded object-cover" />
                  {:else}
                    <div class="grid h-12 w-16 place-items-center rounded border border-border-strong text-[10px] uppercase">pending</div>
                  {/if}

                  <div class="text-xs">
                    <div class="flex items-center gap-2">
                      <PhotoConversionBadge state={imageConversionState(image)} size="sm" />
                    </div>
                    <div>pos: {image.position}</div>
                  </div>

                  <form method="POST" action="?/setLead">
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <AdminButton size="sm" type="submit">Set Lead</AdminButton>
                  </form>

                  <form method="POST" action="?/removeImage">
                    <input type="hidden" name="image_id" value={image.id} />
                    <AdminButton variant="danger-outline" size="sm" type="submit">Delete</AdminButton>
                  </form>
                </li>
              {/if}
            {/each}
          </ul>

          <div class="flex flex-wrap gap-2">
            <form method="POST" action="?/removeSelectedImages" class="w-fit">
              <input type="hidden" name="photo_id" value={photo.id} />
              <input type="hidden" name="selected_image_ids" value={selectedAdditional.join('\n')} />
              <AdminButton
                variant="danger-outline"
                type="submit"
                disabled={selectedAdditional.length === 0}
              >
                Delete Selected Additional
              </AdminButton>
            </form>
          </div>
        {/if}
      </div>
        </div>
      </div>

      <div transition:fade={{ duration: FADE_DURATION, delay: 4 * STAGGER_MS, easing: quintOut }} class="flex flex-wrap items-center gap-2">
        <AdminButton form="photo-update-form-{photo.id}" variant="success" type="submit">Save</AdminButton>
        <AdminButton form="photo-update-form-{photo.id}" variant="danger" type="submit" formaction="?/archive">Archive</AdminButton>
        <AdminButton form="photo-update-form-{photo.id}" type="submit" formaction="?/restore">Restore</AdminButton>
        <span class="text-xs text-text-muted">{photo.status}{#if photo.deleted_at} (archived){/if}</span>
      </div>
    </div>
  {/if}
  </article>
{/if}
