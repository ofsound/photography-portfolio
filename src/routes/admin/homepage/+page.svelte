<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { HomepageImage, HomepageSlide } from '$lib/types/content';

  const { data, form } = $props();

  const slides = $derived(data.slides as HomepageSlide[]);
  const images = $derived(data.images as HomepageImage[]);

  let selectedIds = $state<string[]>([]);
  let slideDurationMs = $state<number>(4000);
  let transitionDurationMs = $state<number>(2000);
  let timingValidationError = $state<string | null>(null);
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
      photo_slug: fromSlides.photo_slug,
    };
  };

  const selectedSlides = $derived(
    selectedIds
      .map((id) => imageForId(id))
      .filter((s): s is HomepageSlide => s != null),
  );
  const availableImages = $derived(
    images.filter((image) => !selectedIds.includes(image.id)),
  );
  const sanitizeNumericInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;

    const cleaned = target.value.replace(/[^0-9]/g, '');
    if (target.value !== cleaned) {
      target.value = cleaned;
    }
    timingValidationError = null;
  };

  const isMissingOrZero = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed.length) return true;
    const numeric = Number(trimmed);
    return !Number.isFinite(numeric) || numeric === 0;
  };

  const onSaveSubmit = (event: SubmitEvent) => {
    const form = event.currentTarget as HTMLFormElement | null;
    if (!form) return;

    const data = new FormData(form);
    const slideDuration = String(data.get('slide_duration_ms') ?? '').trim();
    const transitionDuration = String(
      data.get('transition_duration_ms') ?? '',
    ).trim();

    if (isMissingOrZero(slideDuration) || isMissingOrZero(transitionDuration)) {
      event.preventDefault();
      timingValidationError =
        'Slide duration and transition duration must be filled and greater than 0.';
      return;
    }

    timingValidationError = null;
  };

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
    const e = event as { canceled?: boolean; operation?: { source: unknown } };
    if (e.canceled || !e.operation?.source) return;
    const source = e.operation.source as Parameters<typeof isSortable>[0];
    if (!isSortable(source)) return;
    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };
    if (initialIndex === index) return;
    const next = [...selectedIds];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    pushHistory();
    selectedIds = next;
  };
</script>

<AdminCreateListLayout
  title="Homepage"
  formMessage={form?.message}
  formSuccess={form?.success}
  overflow
  create={selectedSlidesPanel}
  list={availableImagesList}
/>

{#snippet selectedSlidesPanel()}
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-col gap-1">
        <AdminHeading level={2}>Selected Slides</AdminHeading>
        <p class="text-[10px] tracking-wider text-text-muted uppercase">
          Drag slides to reorder
        </p>
      </div>
      <div class="flex items-center gap-2">
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
              class:opacity-50={sortable.isDragging}
            >
              <AdminCard
                class="grid cursor-move gap-2 p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                {#if slide.delivery_storage_path}
                  <img
                    src={photoPublicUrl(slide.delivery_storage_path, 180)}
                    alt={slide.photo_title}
                    class="h-12 w-16 rounded object-cover"
                  />
                {:else}
                  <div
                    class="grid h-12 w-16 animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                  >
                    pending
                  </div>
                {/if}

                <div class="text-xs">
                  <div>{slide.photo_title}</div>
                </div>

                <AdminButton
                  size="xs"
                  variant="default"
                  type="button"
                  onclick={() => removeSlide(slide.id)}>Remove</AdminButton
                >
              </AdminCard>
            </li>
          {/each}
        </ul>
      </DragDropProvider>
    {/if}

    <form
      method="POST"
      action="?/save"
      class="mt-4 flex flex-col gap-3"
      onsubmit={onSaveSubmit}
    >
      <input
        type="hidden"
        name="ordered_image_ids"
        value={selectedIds.join('\n')}
      />

      <div class="flex flex-wrap items-center gap-6">
        <label
          class="grid w-fit gap-1 text-xs tracking-widest whitespace-nowrap uppercase"
        >
          Slide Duration (ms)
          <FormInput
            class="max-w-[80px] bg-transparent tracking-normal normal-case"
            type="text"
            name="slide_duration_ms"
            value={String(slideDurationMs)}
            oninput={sanitizeNumericInput}
          />
        </label>
        <label
          class="grid w-fit gap-1 text-xs tracking-widest whitespace-nowrap uppercase"
        >
          Transition Duration (ms)
          <FormInput
            class="max-w-[80px] bg-transparent tracking-normal normal-case"
            type="text"
            name="transition_duration_ms"
            value={String(transitionDurationMs)}
            oninput={sanitizeNumericInput}
          />
        </label>
      </div>

      {#if timingValidationError}
        <p class="text-text-danger text-sm">{timingValidationError}</p>
      {/if}

      <AdminButton type="submit" variant="leftColumnFormSubmit">
        Save Slides
      </AdminButton>
    </form>
  </div>
{/snippet}

{#snippet availableImagesList()}
  <ul class="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-auto">
    {#each availableImages as image (image.id)}
      <li class="w-40">
        <AdminCard
          class="group flex cursor-pointer flex-col gap-2 p-2"
          role="button"
          tabindex="0"
          onclick={() => addSlide(image.id)}
          onkeydown={(e: KeyboardEvent) =>
            e.key === 'Enter' && addSlide(image.id)}
        >
          {#if image.delivery_storage_path}
            <img
              src={photoPublicUrl(image.delivery_storage_path, 160)}
              alt={image.photo_title}
              class="aspect-square w-full rounded object-cover"
            />
          {:else}
            <div
              class="grid aspect-square w-full animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
            >
              pending
            </div>
          {/if}

          <div class="min-w-0 truncate text-xs">
            {image.photo_title}
          </div>

          <AdminButton
            size="sm"
            type="button"
            class="w-full group-hover:bg-border"
          >
            Add
          </AdminButton>
        </AdminCard>
      </li>
    {/each}
  </ul>
{/snippet}
