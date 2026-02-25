<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { HomepageImage, HomepageSlide } from '$lib/types/content';

  let { data, form } = $props();

  const slides = $derived(data.slides as HomepageSlide[]);
  const images = $derived(data.images as HomepageImage[]);

  let selectedIds = $state<string[]>([]);
  let draggingId = $state<string | null>(null);
  let refreshState = $state<'idle' | 'refreshing'>('idle');
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

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  };

  const onHistoryKeydown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (!event.metaKey && !event.ctrlKey) return;

    const key = event.key.toLowerCase();
    const redoCombo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey);
    if (redoCombo) {
      event.preventDefault();
      redoSelectionChange();
      return;
    }

    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoSelectionChange();
    }
  };

  $effect(() => {
    selectedIds = slides.map((slide) => slide.photo_image_id);
    undoStack = [];
    redoStack = [];
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

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onHistoryKeydown);
    return () => {
      window.removeEventListener('keydown', onHistoryKeydown);
    };
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

  const onDragStart = (id: string, event: DragEvent) => {
    draggingId = id;
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  };

  const moveItem = (arr: string[], from: number, to: number) => {
    const clone = [...arr];
    const [item] = clone.splice(from, 1);
    clone.splice(to, 0, item);
    return clone;
  };

  const onDropBefore = (targetId: string, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId) return;

    const from = selectedIds.indexOf(draggingId);
    const to = selectedIds.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;

    pushHistory();
    selectedIds = moveItem(selectedIds, from, to);
  };

  const onDropToEnd = (event: DragEvent) => {
    event.preventDefault();
    if (!draggingId) return;

    const from = selectedIds.indexOf(draggingId);
    if (from < 0) return;

    const next = [...selectedIds];
    const [item] = next.splice(from, 1);
    next.push(item);
    pushHistory();
    selectedIds = next;
  };

  const onDragEnd = () => {
    draggingId = null;
  };
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Homepage Curation</h1>
<p class="mt-2 text-sm text-ink/70">Image-only slides. Add images, drag selected slides to reorder, then save.</p>
<div class="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em]">
  <span class="rounded border border-black/10 px-2 py-1">Pending conversions: {data.pendingConversionCount}</span>
  {#if data.pendingConversionCount > 0}
    <span class="rounded border border-black/10 px-2 py-1">
      {refreshState === 'refreshing' ? 'Refreshing...' : 'Auto-refresh every 8s'}
    </span>
  {/if}
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-black/10 px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[440px_1fr]">
  <div class="grid gap-3 rounded border border-black/10 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-sm uppercase tracking-[0.14em]">Selected Slides</h2>
      <button
        class="rounded border border-black/20 px-2 py-1 text-xs uppercase tracking-[0.12em] disabled:opacity-40"
        type="button"
        onclick={undoSelectionChange}
        disabled={undoStack.length === 0}
      >
        Undo
      </button>
      <button
        class="rounded border border-black/20 px-2 py-1 text-xs uppercase tracking-[0.12em] disabled:opacity-40"
        type="button"
        onclick={redoSelectionChange}
        disabled={redoStack.length === 0}
      >
        Redo
      </button>
      <span class="text-xs text-ink/60">Cmd/Ctrl+Z | Cmd/Ctrl+Shift+Z | Ctrl+Y</span>
    </div>

    {#if selectedSlides.length === 0}
      <p class="text-sm text-ink/70">No slides selected.</p>
    {:else}
      <ul class="grid gap-2" ondragover={onDragOver} ondrop={onDropToEnd}>
        {#each selectedSlides as slide, index (slide.id)}
          <li
            class="grid cursor-move gap-2 rounded border border-black/10 p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            draggable="true"
            ondragstart={(event) => onDragStart(slide.id, event)}
            ondragover={onDragOver}
            ondrop={(event) => onDropBefore(slide.id, event)}
            ondragend={onDragEnd}
          >
            {#if slide.delivery_storage_path}
              <img src={photoPublicUrl(slide.delivery_storage_path, 180)} alt={slide.photo_title} class="h-12 w-16 rounded object-cover" />
            {:else}
              <div class="grid h-12 w-16 place-items-center rounded border border-black/20 text-[10px] uppercase">pending</div>
            {/if}

            <div class="text-xs">
              <div>#{index + 1}</div>
              <div><code>{slide.id}</code></div>
              <div>{slide.photo_title} ({slide.kind})</div>
            </div>

            <button class="rounded border border-black/20 px-2 py-1 text-xs uppercase tracking-[0.12em]" type="button" onclick={() => removeSlide(slide.id)}>
              Remove
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <form method="POST" action="?/save" class="w-fit">
      <input type="hidden" name="ordered_image_ids" value={selectedIds.join('\n')} />
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save Slides</button>
    </form>
  </div>

  <div class="rounded border border-black/10 p-4">
    <h2 class="mb-2 text-sm uppercase tracking-[0.14em]">Available Images</h2>
    <ul class="grid max-h-[620px] gap-2 overflow-auto">
      {#each availableImages as image (image.id)}
        <li class="grid gap-2 rounded border border-black/10 p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          {#if image.delivery_storage_path}
            <img src={photoPublicUrl(image.delivery_storage_path, 160)} alt={image.photo_title} class="h-12 w-16 rounded object-cover" />
          {:else}
            <div class="grid h-12 w-16 place-items-center rounded border border-black/20 text-[10px] uppercase">pending</div>
          {/if}

          <div class="text-xs">
            <div><code>{image.id}</code></div>
            <div>{image.photo_title} ({image.kind})</div>
          </div>

          <button class="rounded border border-black/20 px-2 py-1 text-xs uppercase tracking-[0.12em]" type="button" onclick={() => addSlide(image.id)}>
            Add
          </button>
        </li>
      {/each}
    </ul>
  </div>
</section>
