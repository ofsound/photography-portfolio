<script lang="ts">
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import { useAdminFormState } from '$lib/components/admin/useAdminFormState.svelte';
  import { useAutoSlug } from '$lib/components/admin/useAutoSlug.svelte';
  import { useSortableOrder } from '$lib/components/admin/useSortableOrder.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import {
    PAGE_VISIBILITY_LABELS,
    type PageVisibilityStatus,
  } from '$lib/constants/page-visibility';

  const { data, form } = $props();
  const { typedForm, fieldErrors: createFieldErrors } = useAdminFormState<
    Record<string, string | undefined>
  >(() => form);

  type PageCard = {
    id: string;
    slug: string;
    title: string;
    kind: string;
    editor_mode: 'code' | 'svedit';
    visibility_status: PageVisibilityStatus;
    nav_order: number;
  };

  const pages = $derived((data.pages as PageCard[]) ?? []);

  const pageCards = $derived.by(() =>
    [...pages].sort((a, b) => {
      if (a.nav_order !== b.nav_order) return a.nav_order - b.nav_order;
      return a.title.localeCompare(b.title);
    }),
  );

  const pageCardById = $derived(new Map(pageCards.map((c) => [c.id, c])));
  const pageOrder = useSortableOrder({
    getBaseIds: () => pageCards.map((card) => card.id),
    persist: async (next) => {
      await persistOrder(next);
    },
    onPersisted: async () => {
      await invalidateAll();
    },
  });
  const orderedCardIds = $derived(pageOrder.orderedIds);

  const orderedPages = $derived(
    orderedCardIds
      .map((cardId) => pageCardById.get(cardId))
      .filter((card): card is PageCard => Boolean(card)),
  );

  const createDraft = useAutoSlug();
  let createEditorMode = $state<'code' | 'svedit'>('code');

  $effect(() => {
    createDraft.syncFromValues(typedForm?.values, {
      name: 'title',
      slug: 'slug',
    });

    const nextEditorMode = typedForm?.values?.editor_mode;
    if (nextEditorMode === 'code' || nextEditorMode === 'svedit') {
      createEditorMode = nextEditorMode;
    }
  });

  const persistOrder = async (next: string[]) => {
    const payload = new FormData();
    payload.append('ordered_page_ids', next.join('\n'));

    const response = await fetch(`${window.location.pathname}?/reorder`, {
      method: 'POST',
      body: payload,
    });

    return response.ok;
  };
</script>

<AdminCreateListLayout
  title="Pages"
  formMessage={form?.message}
  formSuccess={form?.success}
  dataMessage={data.message}
  dataSuccess={data.messageSuccess}
  clearDataMessageQuery
  reverseColumnOrder
  showMobileDivider
  create={createForm}
  list={pageList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <FormField
      label="Title"
      id="page-create-title"
      required
      error={createFieldErrors.title}
    >
      <FormInput
        id="page-create-title"
        name="title"
        bind:value={createDraft.name}
        oninput={createDraft.onNameInput}
      />
    </FormField>
    <FormField
      label="Slug"
      id="page-create-slug"
      error={createFieldErrors.slug}
    >
      <FormInput
        id="page-create-slug"
        name="slug"
        bind:value={createDraft.slug}
        oninput={createDraft.onSlugInput}
      />
    </FormField>
    <FormField label="Editor mode" id="page-create-editor_mode">
      <FormSelect
        name="editor_mode"
        id="page-create-editor_mode"
        bind:value={createEditorMode}
      >
        <option value="code">HTML and CSS</option>
        <option value="svedit">Svedit</option>
      </FormSelect>
    </FormField>
    <AdminButton type="submit" variant="submit" class="mt-4">
      Create Page
    </AdminButton>
  </form>
{/snippet}

{#snippet pageList()}
  {#if orderedPages.length === 0}
    <p class="mt-2 text-sm text-text-muted">No pages yet.</p>
  {:else}
    <DragDropProvider onDragEnd={pageOrder.onDragEnd}>
      <ul class="grid gap-3">
        {#each orderedPages as page, index (page.id)}
          {@const sortable = createSortable({ id: page.id, index })}
          <li {@attach sortable.attach} class:opacity-50={sortable.isDragging}>
            <AdminCard
              as="article"
              variant={page.visibility_status === 'draft'
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
                  <AdminHeading level={2}>{page.title}</AdminHeading>
                  <span
                    class="text-xs tracking-widest text-text-subtle uppercase"
                  >
                    {PAGE_VISIBILITY_LABELS[page.visibility_status]}
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap items-baseline gap-2 text-xs">
                  <a
                    href={resolve(`/${page.slug}` as `/${string}`)}
                    class="cursor-pointer text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    /{page.slug}
                  </a>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <AdminButton href={`/admin/pages/edit/${page.slug}`} size="sm">
                  Edit Page
                </AdminButton>
              </div>
            </AdminCard>
          </li>
        {/each}
      </ul>
    </DragDropProvider>
  {/if}
{/snippet}
