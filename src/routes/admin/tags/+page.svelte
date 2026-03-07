<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  const { data, form } = $props();
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
      <FormField label="Name" id="tag-create-name">
        <FormInput id="tag-create-name" name="name" required />
      </FormField>
      <FormField label="Slug" id="tag-create-slug" helper="Optional">
        <FormInput id="tag-create-slug" name="slug" />
      </FormField>
    </div>
    <FormField label="Description" id="tag-create-description">
      <FormInput id="tag-create-description" name="description" />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <div class="text-left">
      <AdminButton type="submit" variant="submit">Create Tag</AdminButton>
    </div>
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
        <FormField label="Name" id="tag-edit-name-{tag.id}">
          <FormInput
            id="tag-edit-name-{tag.id}"
            name="name"
            value={tag.name}
            required
          />
        </FormField>
        <FormField label="Slug" id="tag-edit-slug-{tag.id}">
          <FormInput
            id="tag-edit-slug-{tag.id}"
            name="slug"
            value={tag.slug}
            required
          />
        </FormField>
      </div>
      <FormField label="Description" id="tag-edit-description-{tag.id}">
        <FormInput
          id="tag-edit-description-{tag.id}"
          name="description"
          value={tag.description ?? ''}
        />
      </FormField>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" checked={tag.is_active} /> Active
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
