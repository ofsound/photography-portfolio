<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  const { data, form } = $props();
</script>

<AdminCreateListLayout
  title="Categories"
  formMessage={form?.message}
  formSuccess={form?.success}
  create={createForm}
  list={categoryList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <FormField label="Name" id="cat-create-name">
      <FormInput id="cat-create-name" name="name" placeholder="Name" required />
    </FormField>
    <FormField label="Slug" id="cat-create-slug" helper="Optional">
      <FormInput
        id="cat-create-slug"
        name="slug"
        placeholder="Slug (optional)"
      />
    </FormField>
    <FormField label="Description" id="cat-create-description">
      <FormTextarea
        id="cat-create-description"
        name="description"
        placeholder="Description"
      />
    </FormField>
    <FormField label="Sort order" id="cat-create-sort_order">
      <FormInput
        id="cat-create-sort_order"
        name="sort_order"
        type="number"
        value="0"
      />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <AdminButton wFit type="submit">Create Category</AdminButton>
  </form>
{/snippet}

{#snippet categoryList()}
  {#each data.categories as category (category.id)}
    <form
      method="POST"
      action="?/update"
      class="grid gap-3 rounded border border-border p-4"
    >
      <input type="hidden" name="id" value={category.id} />
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField label="Name" id="cat-edit-name-{category.id}">
          <FormInput
            id="cat-edit-name-{category.id}"
            name="name"
            value={category.name}
            placeholder="Name"
            required
          />
        </FormField>
        <FormField label="Slug" id="cat-edit-slug-{category.id}">
          <FormInput
            id="cat-edit-slug-{category.id}"
            name="slug"
            value={category.slug}
            placeholder="Slug"
            required
          />
        </FormField>
      </div>
      <FormField label="Description" id="cat-edit-description-{category.id}">
        <FormTextarea
          id="cat-edit-description-{category.id}"
          name="description"
          value={category.description ?? ''}
          placeholder="Description"
        />
      </FormField>
      <div class="flex flex-wrap items-center gap-3">
        <FormField label="Sort order" id="cat-edit-sort_order-{category.id}">
          <FormInput
            id="cat-edit-sort_order-{category.id}"
            name="sort_order"
            type="number"
            value={String(category.sort_order)}
            class="w-32"
          />
        </FormField>
        <label class="flex items-center gap-2 text-sm">
          <input
            name="is_active"
            type="checkbox"
            checked={category.is_active}
          /> Active
        </label>
      </div>

      <div class="flex items-center gap-2">
        <AdminButton type="submit">Save</AdminButton>
        <AdminButton
          variant="danger-outline"
          type="submit"
          formaction="?/remove"
          formmethod="POST"
        >
          Delete
        </AdminButton>
      </div>
    </form>
  {/each}
{/snippet}
