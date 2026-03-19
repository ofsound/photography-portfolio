<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import { useAutoSlug } from '$lib/components/admin/useAutoSlug.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  export type TaxonomyItem = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  };

  const {
    title,
    singularLabel,
    idPrefix,
    items,
    form,
    reverseColumnOrder,
    showCreateStatus = true,
    showMobileDivider,
  }: {
    title: string;
    singularLabel: string;
    idPrefix: string;
    items: TaxonomyItem[];
    form?: Record<string, unknown> | null | undefined;
    reverseColumnOrder?: boolean;
    showCreateStatus?: boolean;
    showMobileDivider?: boolean;
  } = $props();

  const sfForm = $derived(
    form && 'form' in form
      ? (form.form as {
          message?: unknown;
          valid?: boolean;
          errors?: Record<string, string[]>;
          data?: Record<string, unknown>;
        })
      : undefined,
  );

  const formMessage = $derived(sfForm?.message as string | undefined);
  const formSuccess = $derived(sfForm?.valid ?? false);

  const fieldErrors = $derived.by(() => {
    const errs = sfForm?.errors ?? {};
    const result: Record<string, string | undefined> = {};
    for (const [key, val] of Object.entries(errs)) {
      result[key] = Array.isArray(val) ? val[0] : undefined;
    }
    return result;
  });

  const values = $derived(
    (sfForm?.data ?? {}) as Record<string, string | undefined>,
  );

  const createDraft = useAutoSlug();
  const createName = $derived(values.id ? '' : createDraft.name);
  const createSlug = $derived(values.id ? '' : createDraft.slug);
  const createFieldErrors = $derived(values.id ? {} : fieldErrors);
  const activeEditId = $derived(values.id ?? '');

  $effect(() => {
    if (values.id) {
      createDraft.name = '';
      createDraft.slug = '';
      return;
    }

    createDraft.syncFromValues(values);
  });
</script>

<AdminCreateListLayout
  {title}
  {formMessage}
  {formSuccess}
  {reverseColumnOrder}
  {showMobileDivider}
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
          oninput={createDraft.onNameInput}
        />
      </FormField>
      <FormField
        label="Slug"
        id={`${idPrefix}-create-slug`}
        error={createFieldErrors.slug}
      >
        <FormInput
          id={`${idPrefix}-create-slug`}
          name="slug"
          value={createSlug}
          oninput={createDraft.onSlugInput}
        />
      </FormField>
    </div>
    <FormField label="Description" id={`${idPrefix}-create-description`}>
      <FormInput
        id={`${idPrefix}-create-description`}
        name="description"
        value={values.id ? '' : (values.description ?? '')}
      />
    </FormField>
    {#if showCreateStatus}
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
    {:else}
      <input type="hidden" name="is_active" value="true" />
    {/if}
    <AdminButton type="submit" variant="submit" class="mt-4">
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
          error={activeEditId === item.id ? fieldErrors.name : undefined}
        >
          <FormInput
            id={`${idPrefix}-edit-name-${item.id}`}
            name="name"
            value={activeEditId === item.id
              ? (values.name ?? item.name)
              : item.name}
          />
        </FormField>
        <FormField
          label="Slug"
          id={`${idPrefix}-edit-slug-${item.id}`}
          error={activeEditId === item.id ? fieldErrors.slug : undefined}
        >
          <FormInput
            id={`${idPrefix}-edit-slug-${item.id}`}
            name="slug"
            value={activeEditId === item.id
              ? (values.slug ?? item.slug)
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
            ? (values.description ?? '')
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
