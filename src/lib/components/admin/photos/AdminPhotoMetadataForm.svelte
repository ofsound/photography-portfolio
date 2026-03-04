<script lang="ts">
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  let {
    photoFormId,
    title = $bindable(),
    slug = $bindable(),
    description = $bindable(),
    captureDate = $bindable(),
    onTitleInput,
    onSlugInput,
  } = $props<{
    photoFormId: string;
    title: string;
    slug: string;
    description: string;
    captureDate: string;
    onTitleInput?: (event: Event) => void;
    onSlugInput: (event: Event) => void;
  }>();
</script>

<div class="grid gap-3 sm:grid-cols-2">
  <FormField label="Title" id="edit-title-{photoFormId}">
    <FormInput
      id="edit-title-{photoFormId}"
      name="title"
      bind:value={title}
      placeholder="Title"
      oninput={onTitleInput}
      required
    />
  </FormField>
  <FormField label="Slug" id="edit-slug-{photoFormId}">
    <FormInput
      id="edit-slug-{photoFormId}"
      name="slug"
      bind:value={slug}
      placeholder="Leave blank to auto-generate from title"
      oninput={onSlugInput}
    />
  </FormField>
</div>

<div class="grid gap-3 sm:grid-cols-2">
  <FormField label="Description" id="edit-description-{photoFormId}">
    <FormTextarea
      id="edit-description-{photoFormId}"
      name="description"
      bind:value={description}
      rows={5}
      placeholder="Description"
    />
  </FormField>
  <FormField label="Date" id="edit-capture_date-{photoFormId}">
    <FormInput
      id="edit-capture_date-{photoFormId}"
      name="capture_date"
      bind:value={captureDate}
      type="text"
      placeholder="Date"
    />
  </FormField>
</div>
