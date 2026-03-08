<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- CMS content is sanitized server-side */
  import SveditPageRenderer from '$lib/components/svedit/SveditPageRenderer.svelte';
  import { createCmsScopeKey } from '$lib/utils/cms-scope';

  type CmsPageData = {
    title: string;
    html_content: string;
    css_module: string;
    editor_mode?: 'code' | 'svedit';
    svedit_doc?: unknown;
    slug?: string;
  };

  const { page } = $props<{ page: CmsPageData }>();
  const scopeKey = $derived(createCmsScopeKey(page.slug));

  const isCodeMode = $derived(page.editor_mode !== 'svedit');

  $effect(() => {
    if (typeof document === 'undefined' || !isCodeMode || !page.css_module)
      return;
    const styleEl = document.createElement('style');
    styleEl.dataset.cmsPage = scopeKey;
    styleEl.textContent = page.css_module;
    document.head.append(styleEl);
    return () => styleEl.remove();
  });
</script>

{#if isCodeMode}
  <section class="mx-auto max-w-5xl px-5 py-14" data-cms-scope={scopeKey}>
    <h1 class="text-3xl tracking-widest uppercase">
      {page.title}
    </h1>
    <article class="prose mt-6 max-w-none">
      {@html page.html_content}
    </article>
  </section>
{:else}
  <SveditPageRenderer {page} />
{/if}
