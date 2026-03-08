<script lang="ts">
  import { getContext } from 'svelte';
  import { AnnotatedTextProperty, Node } from 'svedit';

  import { sanitizeSveditHref } from '$lib/svedit/page-document';

  const svedit = getContext('svedit') as {
    editable: boolean;
    session: {
      get: (path: Array<string | number>) => {
        src: { text: string };
        alt: { text: string };
      };
    };
  };

  const { path } = $props<{ path: Array<string | number> }>();

  const node = $derived(svedit.session.get(path));

  const src = $derived.by(() => sanitizeSveditHref(node?.src?.text?.trim()));
  const alt = $derived.by(() => node?.alt?.text?.trim() ?? '');
</script>

<Node
  {path}
  class="border-border-subtle space-y-3 rounded-md border bg-surface/40 p-3"
>
  <div
    class="border-border-subtle overflow-hidden rounded border bg-surface"
    contenteditable="false"
  >
    {#if src !== '#'}
      <img
        {src}
        {alt}
        class="h-auto max-h-[28rem] w-full object-contain"
        loading="lazy"
      />
    {:else}
      <div
        class="flex h-48 items-center justify-center text-sm text-text-subtle"
      >
        Add an image URL to preview
      </div>
    {/if}
  </div>

  {#if svedit.editable}
    <div class="border-border-subtle grid gap-2 rounded border bg-surface p-3">
      <p class="text-xs tracking-wide text-text-muted uppercase">Image URL</p>
      <AnnotatedTextProperty
        path={[...path, 'src']}
        class="rounded border border-border-strong px-2 py-1 text-sm"
        placeholder="https://example.com/image.jpg"
      />
      <p class="text-xs tracking-wide text-text-muted uppercase">Alt Text</p>
      <AnnotatedTextProperty
        path={[...path, 'alt']}
        class="rounded border border-border-strong px-2 py-1 text-sm"
        placeholder="Describe the image"
      />
    </div>
  {/if}

  <AnnotatedTextProperty
    tag="figcaption"
    path={[...path, 'caption']}
    class="text-sm leading-6 text-text-muted"
    placeholder="Caption"
  />
</Node>
