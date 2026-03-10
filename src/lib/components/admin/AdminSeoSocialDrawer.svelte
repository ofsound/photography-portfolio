<script lang="ts">
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import AdminDrawerCard from '$lib/components/admin/AdminDrawerCard.svelte';

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

  const fieldCount = 5;
  const drawerId = $derived(`${idPrefix}-seo-social`);
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
</script>

<AdminDrawerCard
  id={drawerId}
  title="SEO &amp; Social"
  subtitle={`${filledCount}/${fieldCount} fields filled`}
  errorMessage={hasErrors ? 'Fix SEO/OG validation errors.' : undefined}
  {storageKey}
>
  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="SEO title" id={seoTitleId} error={fieldErrors.seo_title}>
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
</AdminDrawerCard>
