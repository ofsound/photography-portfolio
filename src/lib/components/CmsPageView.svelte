<script lang="ts">
  import { createCmsScopeKey } from '$lib/utils/cms-scope';

  type CmsPageData = {
    title: string;
    html_content: string;
    css_module: string;
    slug?: string;
  };

  let { page } = $props<{ page: CmsPageData }>();
  const scopeKey = $derived(createCmsScopeKey(page.slug));

  $effect(() => {
    if (typeof document === 'undefined' || !page.css_module) return;
    const styleEl = document.createElement('style');
    styleEl.dataset.cmsPage = scopeKey;
    styleEl.textContent = page.css_module;
    document.head.append(styleEl);
    return () => styleEl.remove();
  });
</script>

<section class="mx-auto max-w-[1000px] px-5 py-14" data-cms-scope={scopeKey}>
  <h1 class="text-3xl uppercase tracking-[0.18em]">{page.title}</h1>
  <article class="prose mt-6 max-w-none">{@html page.html_content}</article>
</section>
