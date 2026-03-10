<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- CMS content is sanitized server-side */
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import SveditPageRenderer from '$lib/components/svedit/SveditPageRenderer.svelte';
  import { createCmsScopeKey } from '$lib/utils/cms-scope';
  import {
    createDefaultSveditPageDocument,
    parseSveditPageDocument,
    serializeSveditPageDocument,
  } from '$lib/svedit/page-document';

  type CmsPageData = {
    title: string;
    slug: string;
    max_width_override_px?: number | null;
    html_content: string;
    css_module: string;
    tailwind_css?: string;
    editor_mode?: 'code' | 'svedit';
    svedit_doc?: unknown;
  };

  const {
    page,
    editable = false,
    layout,
    maxWidthPx = 1280,
  } = $props<{
    page: CmsPageData;
    editable?: boolean;
    layout?: 'page' | 'homepage-overlay';
    maxWidthPx?: number;
  }>();

  const scopeKey = $derived(createCmsScopeKey(page.slug));
  const layoutVariant = $derived(layout ?? 'page');

  const isCodeMode = $derived(page.editor_mode !== 'svedit');
  const isEditableSvedit = $derived(
    !isCodeMode && editable && Boolean(page.editor_mode === 'svedit'),
  );
  const resolvedMaxWidthPx = $derived.by(() => {
    const normalized = Math.round(Number(maxWidthPx));
    if (Number.isFinite(normalized) && normalized > 0) return normalized;
    return 1280;
  });
  const pageSectionStyle = $derived(
    layoutVariant === 'homepage-overlay'
      ? undefined
      : `max-width: min(100%, ${resolvedMaxWidthPx}px);`,
  );
  const codeSectionClass = $derived(
    layoutVariant === 'homepage-overlay'
      ? 'w-full'
      : 'mx-auto w-full px-5 py-14',
  );
  const codeArticleClass = $derived(
    layoutVariant === 'homepage-overlay'
      ? 'prose flow-root max-w-none'
      : 'prose mt-6 flow-root max-w-none',
  );
  const editableSveditSectionClass = $derived(
    layoutVariant === 'homepage-overlay'
      ? 'w-full'
      : 'mx-auto w-full px-5 py-8',
  );
  const sveditRendererSectionClass = $derived(
    layoutVariant === 'homepage-overlay' ? 'w-full' : undefined,
  );
  const serializedSveditDoc = $derived.by(() => {
    const parsedDoc = parseSveditPageDocument(page.svedit_doc);
    return serializeSveditPageDocument(
      parsedDoc.ok ? parsedDoc.document : createDefaultSveditPageDocument(),
    );
  });
</script>

<svelte:head>
  {#if isCodeMode && page.tailwind_css}
    <svelte:element this={'style'} data-cms-tailwind={scopeKey}
      >{page.tailwind_css}</svelte:element
    >
  {/if}
  {#if isCodeMode && page.css_module}
    <svelte:element this={'style'} data-cms-page={scopeKey}
      >{page.css_module}</svelte:element
    >
  {/if}
</svelte:head>

{#if isCodeMode}
  <section
    class={codeSectionClass}
    style={pageSectionStyle}
    data-cms-scope={scopeKey}
  >
    <article class={codeArticleClass}>
      {@html page.html_content}
    </article>
  </section>
{:else if isEditableSvedit}
  <section class={editableSveditSectionClass} style={pageSectionStyle}>
    <form
      id="public-svedit-form"
      method="POST"
      action="?/save"
      class="grid gap-4"
    >
      <div
        class="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-strong bg-surface/95 px-3 py-2 backdrop-blur"
      >
        <p class="text-xs tracking-widest uppercase">
          Live edit mode • Cmd/Ctrl+S to save
        </p>
        <button
          class="rounded border border-border-strong px-3 py-2 text-xs tracking-widest uppercase"
          type="submit"
        >
          Save changes
        </button>
      </div>
      <SveditEditor
        name="svedit_doc"
        value={serializedSveditDoc}
        variant="inline"
      />
    </form>
  </section>
{:else}
  <SveditPageRenderer
    {page}
    sectionClass={sveditRendererSectionClass}
    sectionStyle={pageSectionStyle}
  />
{/if}
