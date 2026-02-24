<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  onMount(() => {
    if (!data.page.css_module) return;
    const styleEl = document.createElement('style');
    styleEl.dataset.cmsPage = 'about';
    styleEl.textContent = data.page.css_module;
    document.head.append(styleEl);
    return () => styleEl.remove();
  });
</script>

<section class="mx-auto max-w-[1000px] px-5 py-14">
  <h1 class="text-3xl uppercase tracking-[0.18em]">{data.page.title}</h1>
  <article class="prose mt-6 max-w-none" data-cms-page>{@html data.page.html_content}</article>
</section>
