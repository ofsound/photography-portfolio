<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';

  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import AdminSegmentedToggle from '$lib/components/admin/AdminSegmentedToggle.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  import { photoPublicUrl } from '$lib/utils/storage-url';

  import type {
    ContentRevision,
    HomepageImage,
    HomepageSlide,
  } from '$lib/types/content';

  type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, string | undefined>;
  };

  type HomePageEditorData = {
    id: string;
    title: string;
    updated_at: string;
    editor_mode: 'code' | 'svedit';
    html_content: string;
    css_module: string;
    svedit_doc: unknown;
    hero_vertical_alignment_pct: number;
    seo_title: string | null;
    seo_description: string | null;
    og_image_path: string | null;
    visibility_status: 'public' | 'unlisted' | 'draft';
  };

  const clampHeroVerticalAlignmentPct = (value: number) => {
    if (!Number.isFinite(value)) return 50;
    return Math.min(100, Math.max(0, Math.round(value)));
  };

  const { data, form } = $props();

  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );

  const section = $derived(
    data.section === 'hero' ? ('hero' as const) : ('slides' as const),
  );

  const slides = $derived(data.slides as HomepageSlide[]);
  const images = $derived(data.images as HomepageImage[]);
  const homePage = $derived(
    (data.homePage as HomePageEditorData | null) ?? null,
  );
  const revisions = $derived((data.revisions as ContentRevision[]) ?? []);

  const sections = $derived([
    { key: 'slides', label: 'Slides', href: '/admin/homepage?section=slides' },
    { key: 'hero', label: 'Hero', href: '/admin/homepage?section=hero' },
  ]);

  let selectedIds = $state<string[]>([]);
  let slideDurationMs = $state<number>(4000);
  let transitionDurationMs = $state<number>(2000);
  let undoStack = $state<string[][]>([]);
  let redoStack = $state<string[][]>([]);
  const historyLimit = 100;

  let heroVisibilityStatus = $state<'public' | 'draft'>('draft');
  let heroTitle = $state('');
  let heroEditorMode = $state<'code' | 'svedit'>('code');
  let heroHtmlContent = $state('');
  let heroCssModule = $state('');
  let heroSveditDoc = $state('');
  let heroVerticalAlignmentPct = $state(50);
  let heroSeoTitle = $state('');
  let heroSeoDescription = $state('');
  let heroOgImagePath = $state('');
  let heroEditorSeed = $state(0);
  let heroLoadedStateKey = $state<string | null>(null);
  let showRawSveditJson = $state(false);
  let rawSveditJsonError = $state<string | null>(null);

  const heroFieldErrors = $derived(typedForm?.fieldErrors ?? {});

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

  $effect(() => {
    const currentHomePage = homePage;
    if (!currentHomePage) return;
    const nextLoadedStateKey = `${currentHomePage.id}:${currentHomePage.updated_at}`;
    if (heroLoadedStateKey === nextLoadedStateKey) return;
    heroLoadedStateKey = nextLoadedStateKey;

    heroVisibilityStatus =
      currentHomePage.visibility_status === 'public' ? 'public' : 'draft';
    heroTitle = currentHomePage.title ?? '';
    heroEditorMode =
      currentHomePage.editor_mode === 'svedit' ? 'svedit' : 'code';
    heroHtmlContent = currentHomePage.html_content ?? '';
    heroCssModule = currentHomePage.css_module ?? '';
    heroSveditDoc = currentHomePage.svedit_doc
      ? JSON.stringify(currentHomePage.svedit_doc, null, 2)
      : '';
    heroVerticalAlignmentPct = clampHeroVerticalAlignmentPct(
      currentHomePage.hero_vertical_alignment_pct ?? 50,
    );
    heroSeoTitle = currentHomePage.seo_title ?? '';
    heroSeoDescription = currentHomePage.seo_description ?? '';
    heroOgImagePath = currentHomePage.og_image_path ?? '';
    showRawSveditJson = false;
    rawSveditJsonError = null;
    heroEditorSeed += 1;
  });

  $effect(() => {
    const values = typedForm?.values;
    if (!values) return;

    if (
      values.visibility_status === 'public' ||
      values.visibility_status === 'draft'
    ) {
      heroVisibilityStatus = values.visibility_status;
    }
    if (typeof values.title === 'string') heroTitle = values.title;
    if (values.editor_mode === 'code' || values.editor_mode === 'svedit') {
      heroEditorMode = values.editor_mode;
    }
    if (typeof values.html_content === 'string')
      heroHtmlContent = values.html_content;
    if (typeof values.css_module === 'string')
      heroCssModule = values.css_module;
    if (typeof values.svedit_doc === 'string')
      heroSveditDoc = values.svedit_doc;
    if (typeof values.hero_vertical_alignment_pct === 'string') {
      heroVerticalAlignmentPct = clampHeroVerticalAlignmentPct(
        Number(values.hero_vertical_alignment_pct),
      );
    }
    if (typeof values.seo_title === 'string') heroSeoTitle = values.seo_title;
    if (typeof values.seo_description === 'string') {
      heroSeoDescription = values.seo_description;
    }
    if (typeof values.og_image_path === 'string') {
      heroOgImagePath = values.og_image_path;
    }
  });

  const formatRawSveditJson = () => {
    const value = heroSveditDoc.trim();
    if (!value) {
      rawSveditJsonError = null;
      return;
    }

    try {
      heroSveditDoc = JSON.stringify(JSON.parse(value), null, 2);
      rawSveditJsonError = null;
    } catch {
      rawSveditJsonError = 'Invalid JSON. Fix syntax before formatting/saving.';
    }
  };

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

<div class="flex flex-wrap items-center justify-between gap-4">
  <AdminHeading>Homepage</AdminHeading>
  <AdminSegmentedToggle
    segments={sections}
    activeKey={section}
    ariaLabel="Homepage admin sections"
  />
</div>

{#if section === 'slides'}
  <AdminCreateListLayout
    title="Slides"
    formMessage={form?.message}
    formSuccess={form?.success}
    overflow
    create={selectedSlidesPanel}
    list={availableImagesList}
  />
{:else}
  {#if form?.message}
    <AdminStatusMessage
      type={form && 'success' in form && form.success ? 'success' : 'error'}
      class="mt-3"
    >
      {form.message}
    </AdminStatusMessage>
  {/if}

  {#if homePage}
    <form
      method="POST"
      action="?/saveHero&section=hero"
      class="mt-6 grid max-w-5xl gap-3"
    >
      <input type="hidden" name="id" value={homePage.id} />
      <input type="hidden" name="slug" value="home" />

      <div class="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Title"
          id="homepage-hero-title"
          error={heroFieldErrors.title}
        >
          <FormInput
            id="homepage-hero-title"
            name="title"
            bind:value={heroTitle}
          />
        </FormField>

        <FormField label="Visibility" id="homepage-hero-visibility_status">
          <FormSelect
            name="visibility_status"
            id="homepage-hero-visibility_status"
            bind:value={heroVisibilityStatus}
          >
            <option value="public">public</option>
            <option value="draft">draft</option>
          </FormSelect>
        </FormField>

        <FormField label="Editor mode" id="homepage-hero-editor_mode">
          <FormSelect
            name="editor_mode"
            id="homepage-hero-editor_mode"
            bind:value={heroEditorMode}
          >
            <option value="code">HTML + Scoped CSS</option>
            <option value="svedit">Svedit</option>
          </FormSelect>
        </FormField>
      </div>

      <FormField
        label="Vertical Alignment"
        id="homepage-hero-vertical-alignment"
      >
        <div class="grid gap-2">
          <input
            id="homepage-hero-vertical-alignment"
            type="range"
            name="hero_vertical_alignment_pct"
            min="0"
            max="100"
            step="1"
            bind:value={heroVerticalAlignmentPct}
            class="w-full accent-brand"
          />
          <p class="text-xs text-text-muted">{heroVerticalAlignmentPct}%</p>
        </div>
      </FormField>

      <div class="grid gap-3 sm:grid-cols-2">
        <FormField label="SEO title" id="homepage-hero-seo_title">
          <FormInput
            id="homepage-hero-seo_title"
            name="seo_title"
            bind:value={heroSeoTitle}
          />
        </FormField>
        <FormField label="SEO description" id="homepage-hero-seo_description">
          <FormTextarea
            id="homepage-hero-seo_description"
            name="seo_description"
            bind:value={heroSeoDescription}
            rows={2}
          />
        </FormField>
      </div>

      <FormField label="OG image path" id="homepage-hero-og_image_path">
        <FormInput
          id="homepage-hero-og_image_path"
          name="og_image_path"
          bind:value={heroOgImagePath}
        />
      </FormField>

      {#if heroEditorMode === 'code'}
        {#key heroEditorSeed}
          <FormField
            label="HTML"
            id="homepage-hero-html_content"
            error={heroFieldErrors.html_content}
          >
            <CodeEditor
              name="html_content"
              bind:value={heroHtmlContent}
              lang="html"
              height="32rem"
            />
          </FormField>
          <FormField label="Scoped CSS" id="homepage-hero-css_module">
            <CodeEditor
              name="css_module"
              bind:value={heroCssModule}
              lang="css"
              height="16rem"
            />
          </FormField>
        {/key}
        <input type="hidden" name="svedit_doc" value="" />
      {:else}
        <FormField
          label="Svedit Document"
          id="homepage-hero-svedit_doc"
          error={heroFieldErrors.svedit_doc}
        >
          <SveditEditor
            name="svedit_doc"
            bind:value={heroSveditDoc}
            height="40rem"
          />
        </FormField>

        <div class="border-border-subtle grid gap-2 rounded border p-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded border border-border-strong px-2 py-1 text-xs tracking-widest uppercase"
              onclick={() => {
                showRawSveditJson = !showRawSveditJson;
                rawSveditJsonError = null;
              }}
            >
              {showRawSveditJson ? 'Hide Raw JSON' : 'Edit Raw JSON'}
            </button>
            {#if showRawSveditJson}
              <button
                type="button"
                class="rounded border border-border-strong px-2 py-1 text-xs tracking-widest uppercase"
                onclick={formatRawSveditJson}
              >
                Format JSON
              </button>
            {/if}
          </div>

          {#if showRawSveditJson}
            <FormTextarea
              id="homepage-hero-svedit_doc_raw"
              rows={18}
              bind:value={heroSveditDoc}
              placeholder="Paste a full Svedit JSON document here"
              class="font-mono text-xs"
            />
          {/if}

          {#if rawSveditJsonError}
            <p class="text-xs text-red-600">{rawSveditJsonError}</p>
          {/if}
        </div>

        <input type="hidden" name="html_content" value="" />
        <input type="hidden" name="css_module" value="" />
      {/if}

      <div class="flex flex-wrap items-center gap-3">
        <AdminButton type="submit" variant="submit">Save Hero</AdminButton>
      </div>

      {#if revisions.length}
        <AdminCard class="p-3">
          <p class="mb-2 text-xs tracking-widest uppercase">Recent Revisions</p>
          <div class="grid gap-2">
            {#each revisions.slice(0, 10) as rev (rev.id)}
              <div
                class="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span
                  >v{rev.version_no} - {new Date(
                    rev.changed_at,
                  ).toLocaleString()}</span
                >
                <AdminButton
                  variant="submit"
                  type="submit"
                  name="revision_id"
                  value={rev.id}
                  formaction="?/rollbackHero&section=hero"
                  formmethod="POST"
                  size="sm"
                >
                  Rollback
                </AdminButton>
              </div>
            {/each}
          </div>
        </AdminCard>
      {/if}
    </form>
  {:else}
    <p class="mt-6 text-sm text-text-muted">
      Home page record is not available yet.
    </p>
  {/if}
{/if}

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
                variant="gradient"
                class="grid cursor-move gap-2 p-2 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
              >
                <div
                  aria-hidden="true"
                  class="mx-2 hidden self-center text-text-muted sm:flex sm:items-center"
                >
                  <div
                    class="grid grid-cols-3 gap-0.5 rounded border border-border px-1 py-0.5"
                  >
                    {#each [0, 1, 2, 3, 4, 5] as dot (dot)}
                      <span class="h-0.5 w-0.5 rounded-full bg-text-muted/80"
                      ></span>
                    {/each}
                  </div>
                </div>
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
      action="?/save&section=slides"
      class="mt-4 flex flex-col gap-3"
    >
      <input
        type="hidden"
        name="ordered_image_ids"
        value={selectedIds.join('\n')}
      />

      <div class="flex flex-wrap items-end gap-6">
        <FormField
          label="Duration (ms)"
          id="homepage-slide-duration-ms"
          hint="Leave blank to use defaults; provided values are clamped."
          class="w-fit"
        >
          <FormInput
            id="homepage-slide-duration-ms"
            class="max-w-[80px] bg-transparent tracking-normal normal-case"
            type="text"
            name="slide_duration_ms"
            value={String(slideDurationMs)}
            oninput={sanitizeNumericInput}
          />
        </FormField>
        <FormField
          label="Transition (ms)"
          id="homepage-transition-duration-ms"
          hint="Leave blank to use defaults; provided values are clamped."
          class="w-fit"
        >
          <FormInput
            id="homepage-transition-duration-ms"
            class="max-w-[80px] bg-transparent tracking-normal normal-case"
            type="text"
            name="transition_duration_ms"
            value={String(transitionDurationMs)}
            oninput={sanitizeNumericInput}
          />
        </FormField>
      </div>

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
          variant="gradient"
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
