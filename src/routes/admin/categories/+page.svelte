<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  let { data, form } = $props();
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Categories</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">New Category</h2>
    <FormField label="Name" id="cat-create-name">
      <FormInput id="cat-create-name" name="name" placeholder="Name" required />
    </FormField>
    <FormField label="Slug" id="cat-create-slug" helper="Optional">
      <FormInput id="cat-create-slug" name="slug" placeholder="Slug (optional)" />
    </FormField>
    <FormField label="Description" id="cat-create-description">
      <FormTextarea id="cat-create-description" name="description" placeholder="Description" />
    </FormField>
    <FormField label="Sort order" id="cat-create-sort_order">
      <FormInput id="cat-create-sort_order" name="sort_order" type="number" value="0" />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <AdminButton wFit type="submit">Create</AdminButton>
  </form>

  <div class="grid gap-3">
    {#each data.categories as category (category.id)}
      <form method="POST" action="?/update" class="grid gap-3 rounded border border-border p-4">
        <input type="hidden" name="id" value={category.id} />
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" id="cat-edit-name-{category.id}">
            <FormInput id="cat-edit-name-{category.id}" name="name" value={category.name} placeholder="Name" required />
          </FormField>
          <FormField label="Slug" id="cat-edit-slug-{category.id}">
            <FormInput id="cat-edit-slug-{category.id}" name="slug" value={category.slug} placeholder="Slug" required />
          </FormField>
        </div>
        <FormField label="Description" id="cat-edit-description-{category.id}">
          <FormTextarea id="cat-edit-description-{category.id}" name="description" value={category.description ?? ''} placeholder="Description" />
        </FormField>
        <div class="flex flex-wrap items-center gap-3">
          <FormField label="Sort order" id="cat-edit-sort_order-{category.id}">
            <FormInput id="cat-edit-sort_order-{category.id}" name="sort_order" type="number" value={String(category.sort_order)} class="w-32" />
          </FormField>
          <label class="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" checked={category.is_active} /> Active
          </label>
          <AdminButton type="submit">Save</AdminButton>
          <AdminButton variant="danger-outline" type="submit" formaction="?/remove" formmethod="POST">Delete</AdminButton>
        </div>
      </form>
    {/each}
  </div>
</section>
