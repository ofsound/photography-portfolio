<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

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
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField label="Name" id="cat-create-name">
        <FormInput id="cat-create-name" name="name" required />
      </FormField>
      <FormField label="Slug" id="cat-create-slug" helper="Optional">
        <FormInput id="cat-create-slug" name="slug" />
      </FormField>
    </div>
    <FormField label="Description" id="cat-create-description">
      <FormInput id="cat-create-description" name="description" />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <div class="text-left">
      <AdminButton type="submit" variant="submit">Create Category</AdminButton>
    </div>
  </form>
{/snippet}

{#snippet categoryList()}
  {#each data.categories as category (category.id)}
    <AdminCard
      as="form"
      variant="gradient"
      method="POST"
      action="?/update"
      class="grid gap-3 p-4"
    >
      <input type="hidden" name="id" value={category.id} />
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField label="Name" id="cat-edit-name-{category.id}">
          <FormInput
            id="cat-edit-name-{category.id}"
            name="name"
            value={category.name}
            required
          />
        </FormField>
        <FormField label="Slug" id="cat-edit-slug-{category.id}">
          <FormInput
            id="cat-edit-slug-{category.id}"
            name="slug"
            value={category.slug}
            required
          />
        </FormField>
      </div>
      <FormField label="Description" id="cat-edit-description-{category.id}">
        <FormInput
          id="cat-edit-description-{category.id}"
          name="description"
          value={category.description ?? ''}
        />
      </FormField>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm">
          <input
            name="is_active"
            type="checkbox"
            checked={category.is_active}
          /> Active
        </label>
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
