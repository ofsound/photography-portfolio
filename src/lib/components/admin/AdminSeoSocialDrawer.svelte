<script lang="ts">
  import { onMount } from 'svelte';

  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';

  type Props = {
    idPrefix: string;
    storageKey: string;
    fieldErrors?: Record<string, string | undefined>;
    readonly?: boolean;
    form?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImagePath?: string;
  };

  let {
    idPrefix,
    storageKey,
    fieldErrors = {},
    readonly = false,
    form,
    seoTitle = $bindable(''),
    seoDescription = $bindable(''),
    ogTitle = $bindable(''),
    ogDescription = $bindable(''),
    ogImagePath = $bindable(''),
  }: Props = $props();

  let isOpen = $state(false);

  const fieldCount = 5;
  const panelId = $derived(`${idPrefix}-seo-social-panel`);
  const toggleButtonId = $derived(`${idPrefix}-seo-social-toggle`);
  const seoTitleId = $derived(`${idPrefix}-seo_title`);
  const seoDescriptionId = $derived(`${idPrefix}-seo_description`);
  const ogTitleId = $derived(`${idPrefix}-og_title`);
  const ogDescriptionId = $derived(`${idPrefix}-og_description`);
  const ogImagePathId = $derived(`${idPrefix}-og_image_path`);
  const filledCount = $derived.by(() =>
    [seoTitle, seoDescription, ogTitle, ogDescription, ogImagePath].reduce(
      (count, value) =>
        typeof value === 'string' && value.trim().length ? count + 1 : count,
      0,
    ),
  );
  const hasErrors = $derived(
    Boolean(
      fieldErrors.seo_title ??
      fieldErrors.seo_description ??
      fieldErrors.og_title ??
      fieldErrors.og_description ??
      fieldErrors.og_image_path,
    ),
  );

  onMount(() => {
    isOpen = localStorage.getItem(storageKey) === 'open';
  });
</script>

<AdminCard class="grid gap-3 p-3">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="grid gap-1">
      <p class="text-xs tracking-widest uppercase">SEO &amp; Social</p>
      <p class="text-xs text-text-muted">
        {filledCount}/{fieldCount} fields filled
      </p>
      {#if hasErrors}
        <p class="text-xs text-danger">Fix SEO/OG validation errors.</p>
      {/if}
    </div>

    <button
      id={toggleButtonId}
      type="button"
      class="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs tracking-widest uppercase transition-colors hover:border-border-strong hover:bg-surface-muted"
      aria-expanded={isOpen}
      aria-controls={panelId}
      onclick={() => {
        isOpen = !isOpen;
        localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
      }}
    >
      <span>{isOpen ? 'Hide' : 'Edit'}</span>
      <svg
        class="size-3 transition-transform"
        class:rotate-180={isOpen}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m3 6 5 5 5-5" />
      </svg>
    </button>
  </div>

  <div id={panelId} class="grid gap-3" hidden={!isOpen}>
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField
        label="SEO title"
        id={seoTitleId}
        error={fieldErrors.seo_title}
      >
        <FormInput
          id={seoTitleId}
          name="seo_title"
          bind:value={seoTitle}
          {readonly}
          {form}
        />
      </FormField>
      <FormField
        label="SEO description"
        id={seoDescriptionId}
        error={fieldErrors.seo_description}
      >
        <FormTextarea
          id={seoDescriptionId}
          name="seo_description"
          bind:value={seoDescription}
          rows={2}
          {readonly}
          {form}
        />
      </FormField>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <FormField label="OG title" id={ogTitleId} error={fieldErrors.og_title}>
        <FormInput
          id={ogTitleId}
          name="og_title"
          bind:value={ogTitle}
          {readonly}
          {form}
        />
      </FormField>
      <FormField
        label="OG description"
        id={ogDescriptionId}
        error={fieldErrors.og_description}
      >
        <FormTextarea
          id={ogDescriptionId}
          name="og_description"
          bind:value={ogDescription}
          rows={2}
          {readonly}
          {form}
        />
      </FormField>
    </div>

    <FormField
      label="OG image path"
      id={ogImagePathId}
      error={fieldErrors.og_image_path}
    >
      <FormInput
        id={ogImagePathId}
        name="og_image_path"
        bind:value={ogImagePath}
        {readonly}
        {form}
      />
    </FormField>
  </div>
</AdminCard>
