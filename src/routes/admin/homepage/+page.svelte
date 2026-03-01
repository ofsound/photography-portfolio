<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import { move } from '@dnd-kit/helpers';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { HomepageImage, HomepageSlide } from '$lib/types/content';

  let { data, form } = $props();

  const slides = $derived(data.slides as HomepageSlide[]);
  const images = $derived(data.images as HomepageImage[]);

  let selectedIds = $state<string[]>([]);
  let slideDurationMs = $state<number>(4000);
  let transitionDurationMs = $state<number>(2000);
  let undoStack = $state<string[][]>([]);
  let redoStack = $state<string[][]>([]);
  const historyLimit = 100;

  const pushHistory = () => {
    undoStack = [...undoStack, [...selectedIds]].slice(-historyLimit);
    redoStack = [];
  };

  const undoSelectionChange = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, [...selectedIds]].slice(-historyLimit);
    selectedIds = [...previous];
  };

  const redoSelectionChange = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, [...selectedIds]].slice(-historyLimit);
    selectedIds = [...next];
  };

  $effect(() => {
    selectedIds = slides.map((slide) => slide.photo_image_id);
    slideDurationMs = data.slideDurationMs;
    transitionDurationMs = data.transitionDurationMs;
    undoStack = [];
    redoStack = [];
  });

  const imageForId = (id: string) => {
    const fromImages = images.find((image) => image.id === id);
    if (fromImages) return fromImages;

    const fromSlides = slides.find((slide) => slide.photo_image_id === id);
    if (!fromSlides) return null;

    return {
      id: fromSlides.photo_image_id,
      kind: fromSlides.kind,
      delivery_storage_path: fromSlides.delivery_storage_path,
      photo_title: fromSlides.photo_title,
      photo_slug: fromSlides.photo_slug
    };
  };

  const selectedSlides = $derived(selectedIds.map((id) => imageForId(id)).filter((s): s is HomepageSlide => s != null));
  const availableImages = $derived(images.filter((image) => !selectedIds.includes(image.id)));

  const addSlide = (id: string) => {
    if (selectedIds.includes(id)) return;
    pushHistory();
    selectedIds = [...selectedIds, id];
  };

  const removeSlide = (id: string) => {
    if (!selectedIds.includes(id)) return;
    pushHistory();
    selectedIds = selectedIds.filter((item) => item !== id);
  };

  const onSelectedSlidesDragEnd = (event: unknown) => {
    const next = move(selectedIds, event as Parameters<typeof move>[1]);
    if (next === selectedIds) return;
    pushHistory();
    selectedIds = next;
  };
</script>

<h1 class="text-xl uppercase tracking-[var(--tracking-heading)]">Homepage Curation</h1>
<p class="mt-2 text-sm text-text-muted">Image-only slides. Add images, drag selected slides to reorder, then save.</p>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 rounded border border-border p-4">
  <h2 class="text-sm uppercase tracking-[var(--tracking-label)]">Slideshow Timing</h2>
  <form method="POST" action="?/saveTiming" class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] sm:items-end">
    <label class="grid gap-1 text-xs uppercase tracking-[var(--tracking-tight)]">
      Slide Duration (ms)
      <input
        class="rounded border border-border-strong bg-transparent px-3 py-2 text-sm normal-case tracking-normal"
        type="number"
        min="1000"
        max="30000"
        step="100"
        name="slide_duration_ms"
        bind:value={slideDurationMs}
      />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[var(--tracking-tight)]">
      Transition Duration (ms)
      <input
        class="rounded border border-border-strong bg-transparent px-3 py-2 text-sm normal-case tracking-normal"
        type="number"
        min="200"
        max="10000"
        step="100"
        name="transition_duration_ms"
        bind:value={transitionDurationMs}
      />
    </label>
    <AdminButton size="md-tall" type="submit">Save Timing</AdminButton>
  </form>
</section>

<section class="mt-6 grid gap-8 lg:grid-cols-[440px_1fr]">
  <div class="grid gap-3 rounded border border-border p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-sm uppercase tracking-[var(--tracking-label)]">Selected Slides</h2>
      <AdminButton
        size="sm"
        type="button"
        onclick={undoSelectionChange}
        disabled={undoStack.length === 0}
      >
        Undo
      </AdminButton>
      <AdminButton
        size="sm"
        type="button"
        onclick={redoSelectionChange}
        disabled={redoStack.length === 0}
      >
        Redo
      </AdminButton>
    </div>

    {#if selectedSlides.length === 0}
      <p class="text-sm text-text-muted">No slides selected.</p>
    {:else}
      <DragDropProvider onDragEnd={onSelectedSlidesDragEnd}>
        <ul class="grid gap-2">
          {#each selectedSlides as slide, index (slide.id)}
            {@const sortable = createSortable({ id: slide.id, index })}
            <li
              {@attach sortable.attach}
              class="grid cursor-move gap-2 rounded border border-border p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              class:opacity-50={sortable.isDragging}
            >
              {#if slide.delivery_storage_path}
                <img src={photoPublicUrl(slide.delivery_storage_path, 180)} alt={slide.photo_title} class="h-12 w-16 rounded object-cover" />
              {:else}
                <div class="grid h-12 w-16 place-items-center rounded border border-border-strong text-[var(--text-chip)] uppercase">pending</div>
              {/if}

              <div class="text-xs">
                <div>#{index + 1}</div>
                <div><code>{slide.id}</code></div>
                <div>{slide.photo_title} ({slide.kind})</div>
              </div>

              <AdminButton size="sm" type="button" onclick={() => removeSlide(slide.id)}>Remove</AdminButton>
            </li>
          {/each}
        </ul>
      </DragDropProvider>
    {/if}

    <form method="POST" action="?/save" class="w-fit">
      <input type="hidden" name="ordered_image_ids" value={selectedIds.join('\n')} />
      <AdminButton type="submit">Save Slides</AdminButton>
    </form>
  </div>

  <div class="rounded border border-border p-4">
    <h2 class="mb-2 text-sm uppercase tracking-[var(--tracking-label)]">Available Images</h2>
    <ul class="grid max-h-[var(--max-height-drawer)] gap-2 overflow-auto">
      {#each availableImages as image (image.id)}
        <li class="grid gap-2 rounded border border-border p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          {#if image.delivery_storage_path}
            <img src={photoPublicUrl(image.delivery_storage_path, 160)} alt={image.photo_title} class="h-12 w-16 rounded object-cover" />
          {:else}
            <div class="grid h-12 w-16 place-items-center rounded border border-border-strong text-[var(--text-chip)] uppercase">pending</div>
          {/if}

          <div class="text-xs">
            <div><code>{image.id}</code></div>
            <div>{image.photo_title} ({image.kind})</div>
          </div>

          <AdminButton size="sm" type="button" onclick={() => addSlide(image.id)}>Add</AdminButton>
        </li>
      {/each}
    </ul>
  </div>
</section>
