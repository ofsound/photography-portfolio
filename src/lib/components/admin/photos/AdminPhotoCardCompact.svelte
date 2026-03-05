<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';

  import { buildGalleryPhotoPath } from '$lib/utils/gallery-routes';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { AdminPhoto, AdminPhotoImage } from '$lib/types/content';

  const {
    photo,
    images,
    selectedPhotoIds,
    onTogglePhotoSelected,
    isPublic,
    photoStatus,
    gridMode,
    editorOnly,
    index,
    isDraggingPhoto,
    isExpanded,
    editHref,
    onToggleExpanded,
    onHeaderClick,
  } = $props<{
    photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
    images: AdminPhotoImage[];
    selectedPhotoIds: string[];
    onTogglePhotoSelected: (photoId: string, checked: boolean) => void;
    isPublic: boolean;
    photoStatus: 'draft' | 'published' | 'archived';
    gridMode: boolean;
    editorOnly: boolean;
    index: number;
    isDraggingPhoto: boolean;
    isExpanded: boolean;
    editHref?: string;
    onToggleExpanded: () => void;
    onHeaderClick: (e: MouseEvent) => void;
  }>();

  const lead = $derived(
    images.find((image: AdminPhotoImage) => image.kind === 'lead') ?? null,
  );
</script>

{#if gridMode}
  <div
    class="group relative flex aspect-square flex-col overflow-hidden rounded border border-border bg-surface"
    class:opacity-50={isDraggingPhoto}
    role="button"
    tabindex="0"
    onclick={(e) => {
      if (
        (e.target as HTMLElement).closest('input[type="checkbox"]') ||
        (e.target as HTMLElement).closest('a')
      )
        return;
      if (editHref) goto(resolve(editHref));
    }}
    onkeydown={(e) => e.key === 'Enter' && editHref && goto(resolve(editHref))}
  >
    <div class="absolute top-2 left-2 z-10 flex items-center gap-1">
      <input
        type="checkbox"
        class="size-5 rounded border-border-strong"
        checked={selectedPhotoIds.includes(photo.id)}
        onchange={(event) =>
          onTogglePhotoSelected(
            photo.id,
            (event.currentTarget as HTMLInputElement).checked,
          )}
        onclick={(e) => e.stopPropagation()}
      />
    </div>
    <div class="relative flex-1 overflow-hidden">
      {#if lead?.delivery_storage_path}
        <img
          src={photoPublicUrl(lead.delivery_storage_path, 400)}
          alt={lead.alt_text ?? photo.title}
          class="h-full w-full object-cover"
        />
      {:else if lead}
        <div
          class="grid h-full w-full place-items-center rounded border border-border-strong bg-surface-muted text-xs text-text-muted uppercase"
        >
          pending
        </div>
      {:else}
        <div
          class="grid h-full w-full place-items-center rounded border border-border-strong bg-surface-muted text-xs text-text-muted uppercase"
        >
          no lead
        </div>
      {/if}
    </div>
    <div
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2"
    >
      <h2 class="truncate text-xs font-medium tracking-wider text-white">
        {photo.title}
      </h2>
      {#if isPublic}
        <a
          href={resolve(
            buildGalleryPhotoPath(
              photo.gallery_slug,
              photo.slug,
            ) as `/${string}`,
          )}
          class="block truncate text-xs text-white/80 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          onclick={(e) => e.stopPropagation()}
          >/{photo.gallery_slug}/photo/{photo.slug}</a
        >
      {:else}
        <span class="block truncate text-xs text-white/75">
          {photoStatus === 'archived' ? 'Archived' : 'Private draft'}
        </span>
      {/if}
    </div>
  </div>
{:else if !editorOnly}
  <span
    class="absolute top-2 left-2 text-xs font-medium text-text-muted tabular-nums"
    >{index + 1}</span
  >
  <div
    role="button"
    tabindex="0"
    class="grid cursor-pointer gap-2 rounded p-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
    onclick={onHeaderClick}
    onkeydown={(e) => e.key === 'Enter' && onToggleExpanded()}
  >
    <div class="flex items-center sm:justify-center">
      <input
        type="checkbox"
        class="size-8"
        checked={selectedPhotoIds.includes(photo.id)}
        onchange={(event) =>
          onTogglePhotoSelected(
            photo.id,
            (event.currentTarget as HTMLInputElement).checked,
          )}
      />
    </div>

    {#if lead?.delivery_storage_path}
      <img
        src={photoPublicUrl(lead.delivery_storage_path, 220)}
        alt={lead.alt_text ?? photo.title}
        class="h-14 w-20 rounded object-cover"
      />
    {:else if lead}
      <div
        class="grid h-14 w-20 place-items-center rounded border border-border-strong text-xs uppercase"
      >
        pending
      </div>
    {:else}
      <div
        class="grid h-14 w-20 place-items-center rounded border border-border-strong text-xs uppercase"
      >
        no lead
      </div>
    {/if}

    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h2 class="truncate text-sm tracking-widest">
          {photo.title}
        </h2>
      </div>
      {#if isPublic}
        <a
          href={resolve(
            buildGalleryPhotoPath(
              photo.gallery_slug,
              photo.slug,
            ) as `/${string}`,
          )}
          class="inline-block text-xs text-text-muted hover:underline"
          target="_blank"
          rel="noopener noreferrer">/{photo.gallery_slug}/photo/{photo.slug}</a
        >
      {:else}
        <span class="inline-block text-xs text-text-muted">
          {photoStatus === 'archived'
            ? 'Archived (not public)'
            : 'Not public until published'}
        </span>
      {/if}
    </div>

    <div class="flex items-center justify-end gap-2">
      <AdminButton
        variant="ghost"
        type="button"
        onclick={onToggleExpanded}
        class="flex size-8 items-center justify-center p-0"
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
      </AdminButton>
    </div>
  </div>
{/if}
