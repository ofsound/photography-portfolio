<script lang="ts">
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import { useAutoSlug } from '$lib/components/admin/useAutoSlug.svelte';
  import { useSortableOrder } from '$lib/components/admin/useSortableOrder.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';

  import {
    GALLERY_VISIBILITY_LABELS,
    type GalleryVisibilityStatus,
  } from '$lib/constants/gallery-visibility';
  import { buildGalleryPath } from '$lib/utils/gallery-routes';

  const { data, form } = $props();
  const sfForm = $derived(form?.form);
  const formMessage = $derived(sfForm?.message as string | undefined);
  const formSuccess = $derived(sfForm?.valid ?? false);
  const createFieldErrors = $derived.by(() => {
    const errs = sfForm?.errors ?? {};
    const result: Record<string, string | undefined> = {};
    for (const [key, val] of Object.entries(errs)) {
      result[key] = Array.isArray(val) ? val[0] : undefined;
    }
    return result;
  });

  type GalleryCard = {
    id: string;
    slug: string;
    name: string;
    nav_order: number;
    visibility_status: GalleryVisibilityStatus;
  };

  const galleries = $derived((data.galleries as GalleryCard[]) ?? []);

  const galleryCards = $derived.by(() =>
    [...galleries].sort((a, b) => {
      if (a.nav_order !== b.nav_order) return a.nav_order - b.nav_order;
      return a.name.localeCompare(b.name);
    }),
  );

  const galleryCardById = $derived(new Map(galleryCards.map((c) => [c.id, c])));
  const galleryOrder = useSortableOrder({
    getBaseIds: () => galleryCards.map((card) => card.id),
    persist: async (next) => {
      await persistOrder(next);
    },
    onPersisted: async () => {
      await invalidateAll();
    },
  });
  const orderedCardIds = $derived(galleryOrder.orderedIds);

  const orderedCards = $derived(
    orderedCardIds
      .map((cardId) => galleryCardById.get(cardId))
      .filter((card): card is GalleryCard => Boolean(card)),
  );

  const createDraft = useAutoSlug();
  let createVisibilityStatus = $state<GalleryVisibilityStatus>('public');

  $effect(() => {
    const sfData = sfForm?.data;
    if (sfData) {
      createDraft.syncFromValues(sfData as Record<string, string | undefined>);
    }

    const nextVisibility =
      sfData && 'visibility_status' in sfData
        ? sfData.visibility_status
        : undefined;
    if (
      nextVisibility === 'public' ||
      nextVisibility === 'unlisted' ||
      nextVisibility === 'archived'
    ) {
      createVisibilityStatus = nextVisibility;
    }
  });

  const persistOrder = async (next: string[]) => {
    const payload = new FormData();
    payload.append('ordered_gallery_ids', next.join('\n'));

    const response = await fetch(`${window.location.pathname}?/reorder`, {
      method: 'POST',
      body: payload,
    });

    return response.ok;
  };
</script>

<AdminCreateListLayout
  title="Galleries"
  {formMessage}
  {formSuccess}
  reverseColumnOrder
  showMobileDivider
  create={createForm}
  list={galleryList}
  actions={headerActions}
/>

{#snippet headerActions()}
  <AdminButton href="/admin/settings/defaults" size="sm"
    >Default Settings</AdminButton
  >
{/snippet}

{#snippet createForm()}
  <form method="POST" action="?/create" class="flex flex-col gap-3">
    <FormField
      label="Name"
      id="gallery-create-name"
      required
      error={createFieldErrors.name}
    >
      <FormInput
        id="gallery-create-name"
        name="name"
        bind:value={createDraft.name}
        oninput={createDraft.onNameInput}
      />
    </FormField>
    <FormField
      label="Slug"
      id="gallery-create-slug"
      error={createFieldErrors.slug}
    >
      <FormInput
        id="gallery-create-slug"
        name="slug"
        bind:value={createDraft.slug}
        oninput={createDraft.onSlugInput}
      />
    </FormField>
    <FormField label="Status" id="gallery-create-visibility_status">
      <FormSelect
        id="gallery-create-visibility_status"
        name="visibility_status"
        bind:value={createVisibilityStatus}
      >
        <option value="public">Public</option>
        <option value="unlisted">Unlisted</option>
        <option value="archived">Archived</option>
      </FormSelect>
    </FormField>
    <AdminButton type="submit" variant="submit" class="mt-4">
      Create Gallery
    </AdminButton>
  </form>
{/snippet}

{#snippet galleryList()}
  <DragDropProvider onDragEnd={galleryOrder.onDragEnd}>
    <ul class="grid gap-3">
      {#each orderedCards as card, index (card.id)}
        {@const sortable = createSortable({ id: card.id, index })}
        <li {@attach sortable.attach} class:opacity-50={sortable.isDragging}>
          <AdminCard
            as="article"
            variant={card.visibility_status === 'archived'
              ? 'striped'
              : 'gradient'}
            class="grid cursor-move gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <div
              aria-hidden="true"
              class="mr-2 hidden self-center text-text-muted sm:flex sm:items-center"
            >
              <div
                class="grid grid-cols-3 gap-1 rounded border border-border px-1.5 py-1"
              >
                {#each [0, 1, 2, 3, 4, 5] as dot (dot)}
                  <span class="h-0.5 w-0.5 rounded-full bg-text-muted/80"
                  ></span>
                {/each}
              </div>
            </div>

            <div>
              <div class="flex flex-wrap items-baseline gap-2">
                <AdminHeading level={2}>{card.name}</AdminHeading>
                <span
                  class="text-xs tracking-widest text-text-subtle uppercase"
                >
                  {GALLERY_VISIBILITY_LABELS[card.visibility_status]}
                </span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-2 text-xs">
                {#if card.visibility_status === 'archived'}
                  <p class="text-text-muted">/{card.slug}</p>
                {:else}
                  <a
                    href={resolve(buildGalleryPath(card.slug) as `/${string}`)}
                    class="cursor-pointer text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    /{card.slug}
                  </a>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <AdminButton href={`/admin/${card.slug}/photos`} size="sm"
                >EDIT PHOTOS</AdminButton
              >
              <AdminButton href={`/admin/${card.slug}/details`} size="sm"
                >EDIT DETAILS</AdminButton
              >
            </div>
          </AdminCard>
        </li>
      {/each}
    </ul>
  </DragDropProvider>
{/snippet}
