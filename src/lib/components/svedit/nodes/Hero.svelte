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
        background_image: { text: string };
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
  const backgroundImage = $derived.by(() => {
    const value = node?.background_image?.text?.trim();
    return value ? sanitizeSveditHref(value) : '#';
  });

  const navigateToHref = (href: string) => {
    if (typeof window === 'undefined') return;
    window.location.assign(href);
  };
</script>

<Node
  {path}
  class="relative overflow-hidden rounded-2xl border border-border-strong bg-surface"
>
  {#if backgroundImage !== '#'}
    <div class="absolute inset-0" contenteditable="false" aria-hidden="true">
      <img
        src={backgroundImage}
        alt=""
        class="h-full w-full object-cover opacity-35"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-surface/65"></div>
    </div>
  {/if}

  <div class="relative z-10 grid gap-4 px-6 py-8 sm:px-10 sm:py-12">
    <AnnotatedTextProperty
      tag="p"
      path={[...path, 'eyebrow']}
      class="text-xs tracking-[0.18em] text-text-subtle uppercase"
      placeholder="Featured"
    />

    <AnnotatedTextProperty
      tag="h1"
      path={[...path, 'heading']}
      class="text-text-main text-3xl font-semibold tracking-tight sm:text-5xl"
      placeholder="Add your headline"
    />

    <AnnotatedTextProperty
      tag="p"
      path={[...path, 'subheading']}
      class="text-text-main/90 max-w-3xl text-base leading-7 sm:text-lg"
      placeholder="Add a supporting sentence that frames this page."
    />

    <div class="flex flex-wrap items-center gap-3 pt-2" contenteditable="false">
      {#if buttonHref !== '#'}
        <button
          type="button"
          onclick={() => navigateToHref(buttonHref)}
          class="inline-flex items-center rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium"
        >
          {buttonLabel}
        </button>
      {:else}
        <span
          class="inline-flex items-center rounded-md border border-dashed border-border-strong px-4 py-2 text-sm text-text-subtle"
        >
          Set a button URL to activate CTA
        </span>
      {/if}
    </div>

    {#if svedit.editable}
      <div
        class="border-border-subtle mt-2 grid gap-2 rounded border bg-surface/70 p-3"
      >
        <p class="text-xs tracking-wide text-text-muted uppercase">
          Button label
        </p>
        <AnnotatedTextProperty
          path={[...path, 'button_label']}
          class="rounded border border-border-strong px-2 py-1 text-sm"
          placeholder="Learn more"
        />

        <p class="text-xs tracking-wide text-text-muted uppercase">
          Button URL
        </p>
        <AnnotatedTextProperty
          path={[...path, 'button_href']}
          class="rounded border border-border-strong px-2 py-1 text-sm"
          placeholder="/contact"
        />

        <p class="text-xs tracking-wide text-text-muted uppercase">
          Background image URL
        </p>
        <AnnotatedTextProperty
          path={[...path, 'background_image']}
          class="rounded border border-border-strong px-2 py-1 text-sm"
          placeholder="https://example.com/hero.jpg"
        />
      </div>
    {/if}
  </div>
</Node>
