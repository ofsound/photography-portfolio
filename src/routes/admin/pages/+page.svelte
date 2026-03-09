<script lang="ts">
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import {
    PAGE_VISIBILITY_OPTIONS,
    PAGE_VISIBILITY_LABELS,
    type PageVisibilityStatus,
  } from '$lib/constants/page-visibility';
  import { slugify } from '$lib/utils/slug';

  const { data, form } = $props();

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

  let pendingOrder = $state<string[] | null>(null);
  let isSavingOrder = $state(false);

  const orderedCardIds = $derived(
    pendingOrder ?? pageCards.map((card) => card.id),
  );

  const orderedPages = $derived(
    orderedCardIds
      .map((cardId) => pageCardById.get(cardId))
      .filter((card): card is PageCard => Boolean(card)),
  );

  let createTitle = $state('');
  let createSlug = $state('');
  let hasManualSlugEdit = $state(false);
  let createEditorMode = $state<'code' | 'svedit'>('code');
  let createVisibilityStatus = $state<PageVisibilityStatus>('draft');

  const onCreateTitleInput = () => {
    if (!hasManualSlugEdit) {
      createSlug = slugify(createTitle);
    }
  };

  const onCreateSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value.trim();
    hasManualSlugEdit = value.length > 0;
    if (!hasManualSlugEdit) {
      createSlug = slugify(createTitle);
    }
  };

  const persistOrder = async (next: string[]) => {
    const payload = new FormData();
    payload.append('ordered_page_ids', next.join('\n'));

    const response = await fetch(`${window.location.pathname}?/reorder`, {
      method: 'POST',
      body: payload,
    });

    return response.ok;
  };

  async function onPageDragEnd(event: unknown) {
    if (isSavingOrder) return;

    const e = event as { canceled?: boolean; operation?: { source: unknown } };
    if (e.canceled || !e.operation?.source) return;

    const source = e.operation.source as Parameters<typeof isSortable>[0];
    if (!isSortable(source)) return;

    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };

    if (initialIndex === index) return;

    const next = [...orderedCardIds];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    pendingOrder = next;

    isSavingOrder = true;
    try {
      await persistOrder(next);
      await invalidateAll();
    } finally {
      isSavingOrder = false;
      pendingOrder = null;
    }
  }
</script>

<AdminCreateListLayout
  title="Pages"
  formMessage={form?.message}
  formSuccess={form?.success}
  dataMessage={data.message}
  create={createForm}
  list={pageList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <FormField label="Title" id="page-create-title">
      <FormInput
        id="page-create-title"
        name="title"
        placeholder="Title"
        bind:value={createTitle}
        required
        oninput={onCreateTitleInput}
      />
    </FormField>
    <FormField label="Slug" id="page-create-slug">
      <FormInput
        id="page-create-slug"
        name="slug"
        placeholder="Slug"
        bind:value={createSlug}
        oninput={onCreateSlugInput}
      />
    </FormField>

    <FormField label="Visibility" id="page-create-visibility_status">
      <FormSelect
        name="visibility_status"
        id="page-create-visibility_status"
        bind:value={createVisibilityStatus}
      >
        {#each PAGE_VISIBILITY_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </FormSelect>
    </FormField>
    <FormField label="Editor mode" id="page-create-editor_mode">
      <FormSelect
        name="editor_mode"
        id="page-create-editor_mode"
        bind:value={createEditorMode}
      >
        <option value="code">HTML + Scoped CSS</option>
        <option value="svedit">Svedit</option>
      </FormSelect>
    </FormField>
    <AdminButton type="submit" variant="leftColumnFormSubmit">
      Create Page
    </AdminButton>
  </form>
{/snippet}

{#snippet pageList()}
  {#if orderedPages.length === 0}
    <p class="mt-2 text-sm text-text-muted">No pages yet.</p>
  {:else}
    <DragDropProvider onDragEnd={onPageDragEnd}>
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
