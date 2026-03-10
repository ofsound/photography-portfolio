<script lang="ts">
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  import type { Snippet } from 'svelte';

  let {
    photoFormId,
    title = $bindable(),
    slug = $bindable(),
    description = $bindable(),
    captureDate = $bindable(),
    onTitleInput,
    onSlugInput,
    trailingField,
    fieldErrors = {},
  } = $props<{
    photoFormId: string;
    title: string;
    slug: string;
    description: string;
    captureDate: string;
    onTitleInput?: (event: Event) => void;
    onSlugInput: (event: Event) => void;
    trailingField?: Snippet;
    fieldErrors?: Record<string, string | undefined>;
  }>();
</script>

<div class="grid gap-3 sm:grid-cols-2">
  <FormField
    label="Title"
    id="edit-title-{photoFormId}"
    required
    error={fieldErrors.title}
  >
    <FormInput
      id="edit-title-{photoFormId}"
      name="title"
      bind:value={title}
      oninput={onTitleInput}
    />
  </FormField>
  <FormField label="Slug" id="edit-slug-{photoFormId}" error={fieldErrors.slug}>
    <FormInput
      id="edit-slug-{photoFormId}"
      name="slug"
      bind:value={slug}
      oninput={onSlugInput}
    />
  </FormField>
</div>

<FormField label="Description" id="edit-description-{photoFormId}">
  <FormTextarea
    id="edit-description-{photoFormId}"
    name="description"
    bind:value={description}
    rows={2}
  />
</FormField>

<div class="grid gap-3 sm:grid-cols-2">
  <FormField label="Date" id="edit-capture_date-{photoFormId}">
    <FormInput
      id="edit-capture_date-{photoFormId}"
      name="capture_date"
      bind:value={captureDate}
      type="text"
    />
  </FormField>
  {#if trailingField}
    {@render trailingField()}
  {/if}
</div>
