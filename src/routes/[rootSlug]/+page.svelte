<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import CmsPageView from '$lib/components/CmsPageView.svelte';

  const { data, form } = $props();

  const isSveditPage = $derived(data.customPage?.editor_mode === 'svedit');
  const canEditPublicly = $derived(Boolean(data.canEditPublicPages));
  const isEditMode = $derived(
    canEditPublicly &&
      isSveditPage &&
      (Boolean(data.initialPublicEditMode) ||
        page.url.searchParams.get('edit') === '1'),
  );

  const setEditMode = (next: boolean) => {
    if (!canEditPublicly || !isSveditPage || !data.customPage) return;

    const nextUrl = new URL(page.url);
    if (next) {
      nextUrl.searchParams.set('edit', '1');
    } else {
      nextUrl.searchParams.delete('edit');
    }

    const search = nextUrl.search;
    const target = `${nextUrl.pathname}${search}`;
    goto(resolve(target as `/${string}`), { replaceState: true });
  };

  const onKeydown = (event: KeyboardEvent) => {
    const isShortcut = event.metaKey || event.ctrlKey;
    if (!isShortcut || !canEditPublicly || !isSveditPage || !data.customPage) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.isContentEditable) return;

    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'e') {
      event.preventDefault();
      setEditMode(!isEditMode);
      return;
    }

    if (key === 's' && isEditMode) {
      const form = document.getElementById(
        'public-svedit-form',
      ) as HTMLFormElement | null;
      if (!form) return;
      event.preventDefault();
      form.requestSubmit();
    }
  };
</script>

<svelte:head>
  {#if data.viewerMode === 'gallery'}
    <title>{data.galleryScope?.name ?? 'Gallery'}</title>
  {:else if data.viewerMode === 'page' && data.customPage}
    <title>{data.customPage.title}</title>
  {/if}
</svelte:head>

<svelte:window onkeydown={onKeydown} />

{#if form?.message}
  <p class="mx-auto mt-4 max-w-5xl px-5 text-sm text-red-600">{form.message}</p>
{/if}

{#if data.viewerMode === 'page' && data.customPage}
  {#if isSveditPage && canEditPublicly}
    <div class="mx-auto max-w-5xl px-5 py-4">
      {#if isEditMode}
        <button
          type="button"
          class="rounded border border-border-strong px-3 py-2 text-xs tracking-widest uppercase"
          onclick={() => setEditMode(false)}
        >
          Exit edit mode
        </button>
      {:else}
        <button
          type="button"
          class="rounded border border-border-strong px-3 py-2 text-xs tracking-widest uppercase"
          onclick={() => setEditMode(true)}
        >
          Edit page
        </button>
      {/if}
    </div>
  {/if}

  <CmsPageView page={data.customPage} editable={isEditMode} />
{/if}
