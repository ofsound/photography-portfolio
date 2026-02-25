<script lang="ts">
  import PhotoConversionBadge from '$lib/components/admin/PhotoConversionBadge.svelte';
  import PhotoUploadZone from '$lib/components/admin/PhotoUploadZone.svelte';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  let {
    photo,
    images,
    categories,
    tags,
    selectedPhotoIds,
    selectedCategoryIds,
    selectedTagIds,
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
    editorOnly = false
  } = $props<{
    photo: AdminPhoto;
    images: AdminPhotoImage[];
    categories: AdminCategory[];
    tags: AdminTag[];
    selectedPhotoIds: string[];
    selectedCategoryIds: string[];
    selectedTagIds: string[];
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
  const isExpanded = $derived(editorOnly ? true : hasUserToggled ? toggledExpanded : initialExpanded);

  const toggleExpanded = () => {
    if (editorOnly) return;
    hasUserToggled = true;
    toggledExpanded = !isExpanded;
  };
</script>

<article class="grid gap-3 rounded border border-border p-4">
  {#if !editorOnly}
    <div class="grid gap-2 rounded border border-border p-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center">
      <label class="flex items-center gap-2 text-xs uppercase tracking-[0.12em] sm:justify-center">
        <input
          type="checkbox"
          checked={selectedPhotoIds.includes(photo.id)}
          onchange={(event) => onTogglePhotoSelected(photo.id, (event.currentTarget as HTMLInputElement).checked)}
        />
        <span class="hidden sm:inline">Select</span>
      </label>

      {#if lead?.delivery_storage_path}
        <img src={photoPublicUrl(lead.delivery_storage_path, 220)} alt={lead.alt_text ?? photo.title} class="h-14 w-20 rounded object-cover" />
      {:else if lead}
        <div class="grid h-14 w-20 place-items-center rounded border border-border-strong text-[10px] uppercase">pending</div>
      {:else}
        <div class="grid h-14 w-20 place-items-center rounded border border-border-strong text-[10px] uppercase">no lead</div>
      {/if}

      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 class="truncate text-sm uppercase tracking-[0.12em]">{photo.title}</h2>
          <span class="text-[10px] uppercase tracking-[0.12em] text-text-subtle">{photo.status}{#if photo.deleted_at} (archived){/if}</span>
        </div>
        <p class="truncate text-xs text-text-muted">/{photo.slug}</p>
        <p class="text-[11px] text-text-subtle">
          {#if lead}
            {lead.delivery_storage_path ? 'Lead image ready' : 'Lead image converting'}
          {:else}
            No lead image set
          {/if}
        </p>
      </div>

      <div class="flex items-center justify-end gap-2">
        <PhotoConversionBadge state={photoConversionState} />
        <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="button" onclick={toggleExpanded}>
          {isExpanded ? 'Collapse' : 'Edit'}
        </button>
      </div>
    </div>
  {/if}

  {#if isExpanded}
    <form method="POST" action="?/update" class="grid gap-3">
      <input type="hidden" name="id" value={photo.id} />
      <div class="grid gap-2 sm:grid-cols-3">
        <input name="title" value={photo.title} class="rounded border border-border-strong px-3 py-2" required />
        <input name="slug" value={photo.slug} class="rounded border border-border-strong px-3 py-2" required />
        <input name="capture_date" type="date" value={photo.capture_date ?? ''} class="rounded border border-border-strong px-3 py-2" />
      </div>

      <textarea name="description" rows="3" class="rounded border border-border-strong px-3 py-2">{photo.description ?? ''}</textarea>

      <div class="grid gap-2 sm:grid-cols-3">
        <input name="width_px" type="number" value={photo.width_px ?? ''} placeholder="Width" class="rounded border border-border-strong px-3 py-2" />
        <input name="height_px" type="number" value={photo.height_px ?? ''} placeholder="Height" class="rounded border border-border-strong px-3 py-2" />
        <label class="flex items-center gap-2 rounded border border-border-strong px-3 py-2 text-sm">
          <input type="checkbox" name="is_searchable" checked={photo.is_searchable} /> Searchable
        </label>
      </div>

      <textarea name="license_text" rows="2" class="rounded border border-border-strong px-3 py-2" placeholder="License text">{photo.license_text ?? ''}</textarea>
      <input name="og_title" value={photo.og_title ?? ''} class="rounded border border-border-strong px-3 py-2" placeholder="OG title" />
      <textarea name="og_description" rows="2" class="rounded border border-border-strong px-3 py-2" placeholder="OG description">{photo.og_description ?? ''}</textarea>
      <input name="og_image_path" value={photo.og_image_path ?? ''} class="rounded border border-border-strong px-3 py-2" placeholder="OG image path" />

      <div class="flex flex-wrap items-center gap-2">
        <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save</button>
        <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/archive">Archive</button>
        <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/restore">Restore</button>
        <span class="text-xs text-text-muted">{photo.status}{#if photo.deleted_at} (archived){/if}</span>
      </div>
    </form>

    <form method="POST" action="?/saveRelations" class="grid gap-3 rounded border border-border p-3">
      <input type="hidden" name="photo_id" value={photo.id} />
      <div class="grid gap-3 lg:grid-cols-2">
        <fieldset class="grid gap-2">
          <legend class="text-xs uppercase tracking-[0.12em]">Categories</legend>
          <div class="grid max-h-36 gap-1 overflow-auto">
            {#each categories as category (category.id)}
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="category_ids" value={category.id} checked={selectedCategoryIds.includes(category.id)} />
                {category.name}
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset class="grid gap-2">
          <legend class="text-xs uppercase tracking-[0.12em]">Tags</legend>
          <div class="grid max-h-36 gap-1 overflow-auto">
            {#each tags as tag (tag.id)}
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="tag_ids" value={tag.id} checked={selectedTagIds.includes(tag.id)} />
                {tag.name}
              </label>
            {/each}
          </div>
        </fieldset>
      </div>

      <button class="w-fit rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save Taxonomy</button>
    </form>

    <PhotoUploadZone photoId={photo.id} />

    <div class="grid gap-3 rounded border border-border p-3">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs uppercase tracking-[0.12em]">Images</p>
        <span class="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          {lead ? 'Lead set' : 'No lead'}
        </span>
        <span class="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          Additional: {additionalImages.length}
        </span>
        <span class="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          Ready: {readyImageCount}
        </span>
        <span class="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          Processing: {pendingImageCount}
        </span>
      </div>

      {#if lead}
        <div class="grid gap-2 rounded border border-border p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
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
            <div><code>{lead.id}</code></div>
          </div>

          <form method="POST" action="?/removeImage">
            <input type="hidden" name="image_id" value={lead.id} />
            <button class="rounded border border-danger/60 px-2 py-1 text-xs uppercase tracking-[0.12em] text-danger" type="submit">Delete</button>
          </form>
        </div>
      {:else}
        <p class="text-sm text-text-muted">No lead image set.</p>
      {/if}

      <div class="grid gap-2">
        <p class="text-xs uppercase tracking-[0.12em]">Additional Images (drag to reorder)</p>

        {#if additionalOrder.length === 0}
          <p class="text-sm text-text-muted">No additional images.</p>
        {:else}
          <ul class="grid gap-2" ondragover={onAdditionalDragOver} ondrop={(event) => onAdditionalDropToEnd(photo.id, event)}>
            {#each additionalOrder as imageId}
              {@const image = imageById(imageId)}
              {#if image}
                <li
                  class="grid cursor-move gap-2 rounded border border-border p-2 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-center"
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
                      <code>{image.id}</code>
                      <PhotoConversionBadge state={imageConversionState(image)} size="sm" />
                    </div>
                    <div>pos: {image.position}</div>
                  </div>

                  <form method="POST" action="?/setLead">
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <button class="rounded border border-border-strong px-2 py-1 text-xs uppercase tracking-[0.12em]" type="submit">Set Lead</button>
                  </form>

                  <form method="POST" action="?/removeImage">
                    <input type="hidden" name="image_id" value={image.id} />
                    <button class="rounded border border-danger/60 px-2 py-1 text-xs uppercase tracking-[0.12em] text-danger" type="submit">Delete</button>
                  </form>
                </li>
              {/if}
            {/each}
          </ul>

          <div class="flex flex-wrap gap-2">
            <form method="POST" action="?/reorderAdditionalImages" class="w-fit">
              <input type="hidden" name="photo_id" value={photo.id} />
              <input type="hidden" name="ordered_image_ids" value={additionalOrder.join('\n')} />
              <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save Additional Order</button>
            </form>

            <form method="POST" action="?/removeSelectedImages" class="w-fit">
              <input type="hidden" name="photo_id" value={photo.id} />
              <input type="hidden" name="selected_image_ids" value={selectedAdditional.join('\n')} />
              <button
                class="rounded border border-danger/60 px-3 py-1 text-xs uppercase tracking-[0.14em] text-danger"
                type="submit"
                disabled={selectedAdditional.length === 0}
              >
                Delete Selected Additional
              </button>
            </form>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</article>
