<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import { slugify } from '$lib/utils/slug';

  export type TaxonomyItem = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  };

  export type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, string | undefined>;
  };

  const {
    title,
    singularLabel,
    idPrefix,
    items,
    form,
  }: {
    title: string;
    singularLabel: string;
    idPrefix: string;
    items: TaxonomyItem[];
    form?: FormState | null | undefined;
  } = $props();

  const typedForm = $derived(form ?? undefined);

  let createDraft = $state<{ name?: string; slug?: string }>({});
  const createName = $derived(
    createDraft.name ??
      (typedForm?.values?.id ? '' : (typedForm?.values?.name ?? '')),
  );
  const createSlug = $derived(
    createDraft.slug ??
      (typedForm?.values?.id ? '' : (typedForm?.values?.slug ?? '')),
  );
  let hasManualSlugEdit = $state(false);
  const createFieldErrors = $derived(
    typedForm?.values?.id ? {} : (typedForm?.fieldErrors ?? {}),
  );
  const activeEditId = $derived(typedForm?.values?.id ?? '');

  const onCreateNameInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    if (!hasManualSlugEdit) {
      createDraft = { ...createDraft, name: value, slug: slugify(value) };
      return;
    }
    createDraft = { ...createDraft, name: value };
  };

  const onCreateSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    hasManualSlugEdit = value.trim().length > 0;
    if (!hasManualSlugEdit) {
      createDraft = { ...createDraft, slug: slugify(createName) };
      return;
    }
    createDraft = { ...createDraft, slug: value };
  };
</script>

<AdminCreateListLayout
  {title}
  formMessage={typedForm?.message}
  formSuccess={typedForm?.success}
  create={createForm}
  list={itemList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField
        label="Name"
        id={`${idPrefix}-create-name`}
        required
        error={createFieldErrors.name}
      >
        <FormInput
          id={`${idPrefix}-create-name`}
          name="name"
          value={createName}
          oninput={onCreateNameInput}
        />
      </FormField>
      <FormField
        label="Slug"
        id={`${idPrefix}-create-slug`}
        hint="Leave blank to auto-generate."
        error={createFieldErrors.slug}
      >
        <FormInput
          id={`${idPrefix}-create-slug`}
          name="slug"
          value={createSlug}
          oninput={onCreateSlugInput}
        />
      </FormField>
    </div>
    <FormField label="Description" id={`${idPrefix}-create-description`}>
      <FormInput
        id={`${idPrefix}-create-description`}
        name="description"
        value={typedForm?.values?.id
          ? ''
          : (typedForm?.values?.description ?? '')}
      />
    </FormField>
    <FormField label="Status" id={`${idPrefix}-create-is-active`}>
      <label class="flex items-center gap-2 text-sm">
        <input
          id={`${idPrefix}-create-is-active`}
          name="is_active"
          type="checkbox"
          checked
        />
        Active
      </label>
    </FormField>
    <AdminButton type="submit" variant="leftColumnFormSubmit">
      Create {singularLabel}
    </AdminButton>
  </form>
{/snippet}

{#snippet itemList()}
  {#each items as item (item.id)}
    <AdminCard
      as="form"
      variant="gradient"
      method="POST"
      action="?/update"
      class="grid gap-3 p-4"
    >
      <input type="hidden" name="id" value={item.id} />
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Name"
          id={`${idPrefix}-edit-name-${item.id}`}
          required
          error={activeEditId === item.id
            ? typedForm?.fieldErrors?.name
            : undefined}
        >
          <FormInput
            id={`${idPrefix}-edit-name-${item.id}`}
            name="name"
            value={activeEditId === item.id
              ? (typedForm?.values?.name ?? item.name)
              : item.name}
          />
        </FormField>
        <FormField
          label="Slug"
          id={`${idPrefix}-edit-slug-${item.id}`}
          hint="Leave blank to auto-generate."
          error={activeEditId === item.id
            ? typedForm?.fieldErrors?.slug
            : undefined}
        >
          <FormInput
            id={`${idPrefix}-edit-slug-${item.id}`}
            name="slug"
            value={activeEditId === item.id
              ? (typedForm?.values?.slug ?? item.slug)
              : item.slug}
          />
        </FormField>
      </div>
      <FormField
        label="Description"
        id={`${idPrefix}-edit-description-${item.id}`}
      >
        <FormInput
          id={`${idPrefix}-edit-description-${item.id}`}
          name="description"
          value={activeEditId === item.id
            ? (typedForm?.values?.description ?? '')
            : (item.description ?? '')}
        />
      </FormField>
      <div class="flex flex-wrap items-center gap-3">
        <FormField label="Status" id={`${idPrefix}-edit-is-active-${item.id}`}>
          <label class="flex items-center gap-2 text-sm">
            <input
              id={`${idPrefix}-edit-is-active-${item.id}`}
              name="is_active"
              type="checkbox"
              checked={item.is_active}
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
