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
    html_content: string;
    css_module: string;
    tailwind_css?: string;
    editor_mode?: 'code' | 'svedit';
    svedit_doc?: unknown;
  };

  const { page, editable = false } = $props<{
    page: CmsPageData;
    editable?: boolean;
  }>();

  const scopeKey = $derived(createCmsScopeKey(page.slug));

  const isCodeMode = $derived(page.editor_mode !== 'svedit');
  const isEditableSvedit = $derived(
    !isCodeMode && editable && Boolean(page.editor_mode === 'svedit'),
  );
  const serializedSveditDoc = $derived.by(() => {
    const parsedDoc = parseSveditPageDocument(page.svedit_doc);
    return serializeSveditPageDocument(
      parsedDoc.ok ? parsedDoc.document : createDefaultSveditPageDocument(),
    );
  });

  $effect(() => {
    if (typeof document === 'undefined' || !isCodeMode) return;

    const styleElements: HTMLStyleElement[] = [];

    if (page.tailwind_css) {
      const tailwindStyleEl = document.createElement('style');
      tailwindStyleEl.dataset.cmsTailwind = scopeKey;
      tailwindStyleEl.textContent = page.tailwind_css;
      document.head.append(tailwindStyleEl);
      styleElements.push(tailwindStyleEl);
    }

    if (page.css_module) {
      const scopedStyleEl = document.createElement('style');
      scopedStyleEl.dataset.cmsPage = scopeKey;
      scopedStyleEl.textContent = page.css_module;
      document.head.append(scopedStyleEl);
      styleElements.push(scopedStyleEl);
    }

    if (styleElements.length === 0) return;
    return () => {
      for (const styleEl of styleElements) styleEl.remove();
    };
  });
</script>

{#if isCodeMode}
  <section class="mx-auto max-w-5xl px-5 py-14" data-cms-scope={scopeKey}>
    <article class="prose mt-6 flow-root max-w-none">
      {@html page.html_content}
    </article>
  </section>
{:else if isEditableSvedit}
  <section class="mx-auto max-w-6xl px-5 py-8">
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
  <SveditPageRenderer {page} />
{/if}
