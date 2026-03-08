<script lang="ts">
  import { getContext } from 'svelte';
  import { AnnotatedTextProperty, Node } from 'svedit';

  import { sanitizeSveditHref } from '$lib/svedit/page-document';

  const svedit = getContext('svedit') as {
    editable: boolean;
    session: {
      get: (path: Array<string | number>) => {
        button_href: { text: string };
        button_label: { text: string };
      };
    };
  };

  const { path } = $props<{ path: Array<string | number> }>();

  const node = $derived(svedit.session.get(path));

  const buttonHref = $derived.by(() =>
    sanitizeSveditHref(node?.button_href?.text?.trim()),
  );
  const buttonLabel = $derived.by(() => {
    const value = node?.button_label?.text?.trim();
    return value || 'Learn more';
  });

  const navigateToHref = (href: string) => {
    if (typeof window === 'undefined') return;
    window.location.assign(href);
  };
</script>

<Node
  {path}
  class="rounded-lg border border-border-strong bg-surface p-4 shadow-sm"
>
  <AnnotatedTextProperty
    tag="h3"
    path={[...path, 'title']}
    class="text-xl font-semibold tracking-tight"
    placeholder="Callout title"
  />

  <AnnotatedTextProperty
    tag="p"
    path={[...path, 'content']}
    class="text-text-main mt-2 leading-7"
    placeholder="Callout content"
  />

  <div class="mt-3" contenteditable="false">
    {#if buttonHref !== '#'}
      <button
        type="button"
        onclick={() => navigateToHref(buttonHref)}
        class="inline-flex items-center rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium"
      >
        {buttonLabel}
      </button>
    {:else}
      <span
        class="inline-flex items-center rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-subtle"
      >
        Set button URL to activate CTA
      </span>
    {/if}
  </div>

  {#if svedit.editable}
    <div
      class="border-border-subtle mt-3 grid gap-2 rounded border bg-surface/50 p-3"
    >
      <p class="text-xs tracking-wide text-text-muted uppercase">
        Button Label
      </p>
      <AnnotatedTextProperty
        path={[...path, 'button_label']}
        class="rounded border border-border-strong px-2 py-1 text-sm"
        placeholder="Learn more"
      />

      <p class="text-xs tracking-wide text-text-muted uppercase">Button URL</p>
      <AnnotatedTextProperty
        path={[...path, 'button_href']}
        class="rounded border border-border-strong px-2 py-1 text-sm"
        placeholder="https://example.com"
      />
    </div>
  {/if}
</Node>
