<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import { slugify } from '$lib/utils/slug';

  type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, string | undefined>;
  };

  const { data, form } = $props();
  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );

  let createName = $state('');
  let createSlug = $state('');
  let hasManualSlugEdit = $state(false);
  const createFieldErrors = $derived(
    typedForm?.values?.id ? {} : (typedForm?.fieldErrors ?? {}),
  );
  const activeEditId = $derived(typedForm?.values?.id ?? '');

  const onCreateNameInput = () => {
    if (!hasManualSlugEdit) {
      createSlug = slugify(createName);
    }
  };

  const onCreateSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value.trim();
    hasManualSlugEdit = value.length > 0;
    if (!hasManualSlugEdit) {
      createSlug = slugify(createName);
    }
  };

  $effect(() => {
    if (typedForm?.values?.id) return;
    const nextName = typedForm?.values?.name;
    const nextSlug = typedForm?.values?.slug;
    if (typeof nextName === 'string') createName = nextName;
    if (typeof nextSlug === 'string') createSlug = nextSlug;
  });
</script>

<AdminCreateListLayout
  title="Tags"
  formMessage={form?.message}
  formSuccess={form?.success}
  create={createForm}
  list={tagList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField
        label="Name"
        id="tag-create-name"
        required
        error={createFieldErrors.name}
      >
        <FormInput
          id="tag-create-name"
          name="name"
          bind:value={createName}
          oninput={onCreateNameInput}
        />
      </FormField>
      <FormField
        label="Slug"
        id="tag-create-slug"
        hint="Leave blank to auto-generate."
        error={createFieldErrors.slug}
      >
        <FormInput
          id="tag-create-slug"
          name="slug"
          bind:value={createSlug}
          oninput={onCreateSlugInput}
        />
      </FormField>
    </div>
    <FormField label="Description" id="tag-create-description">
      <FormInput
        id="tag-create-description"
        name="description"
        value={typedForm?.values?.id
          ? ''
          : (typedForm?.values?.description ?? '')}
      />
    </FormField>
    <FormField label="Status" id="tag-create-is-active">
      <label class="flex items-center gap-2 text-sm">
        <input
          id="tag-create-is-active"
          name="is_active"
          type="checkbox"
          checked
        />
        Active
      </label>
    </FormField>
    <AdminButton type="submit" variant="leftColumnFormSubmit">
      Create Tag
    </AdminButton>
  </form>
{/snippet}

{#snippet tagList()}
  {#each data.tags as tag (tag.id)}
    <AdminCard
      as="form"
      variant="gradient"
      method="POST"
      action="?/update"
      class="grid gap-3 p-4"
    >
      <input type="hidden" name="id" value={tag.id} />
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Name"
          id="tag-edit-name-{tag.id}"
          required
          error={activeEditId === tag.id
            ? typedForm?.fieldErrors?.name
            : undefined}
        >
          <FormInput
            id="tag-edit-name-{tag.id}"
            name="name"
            value={activeEditId === tag.id
              ? (typedForm?.values?.name ?? tag.name)
              : tag.name}
          />
        </FormField>
        <FormField
          label="Slug"
          id="tag-edit-slug-{tag.id}"
          hint="Leave blank to auto-generate."
          error={activeEditId === tag.id
            ? typedForm?.fieldErrors?.slug
            : undefined}
        >
          <FormInput
            id="tag-edit-slug-{tag.id}"
            name="slug"
            value={activeEditId === tag.id
              ? (typedForm?.values?.slug ?? tag.slug)
              : tag.slug}
          />
        </FormField>
      </div>
      <FormField label="Description" id="tag-edit-description-{tag.id}">
        <FormInput
          id="tag-edit-description-{tag.id}"
          name="description"
          value={activeEditId === tag.id
            ? (typedForm?.values?.description ?? '')
            : (tag.description ?? '')}
        />
      </FormField>
      <div class="flex flex-wrap items-center gap-3">
        <FormField label="Status" id="tag-edit-is-active-{tag.id}">
          <label class="flex items-center gap-2 text-sm">
            <input
              id="tag-edit-is-active-{tag.id}"
              name="is_active"
              type="checkbox"
              checked={tag.is_active}
            />
            Active
          </label>
        </FormField>
      </div>

      <div class="flex items-center gap-2">
        <AdminButton type="submit" variant="submit">Save</AdminButton>
        <AdminButton
          variant="danger"
          type="submit"
          formaction="?/remove"
          formmethod="POST"
        >
          Delete
        </AdminButton>
      </div>
    </AdminCard>
  {/each}
{/snippet}
