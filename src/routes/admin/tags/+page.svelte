<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  let { data, form } = $props();
</script>

<h1 class="text-xl uppercase tracking-[var(--tracking-heading)]">Tags</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[var(--tracking-label)]">New Tag</h2>
    <FormField label="Name" id="tag-create-name">
      <FormInput id="tag-create-name" name="name" placeholder="Name" required />
    </FormField>
    <FormField label="Slug" id="tag-create-slug" helper="Optional">
      <FormInput id="tag-create-slug" name="slug" placeholder="Slug (optional)" />
    </FormField>
    <FormField label="Description" id="tag-create-description">
      <FormTextarea id="tag-create-description" name="description" placeholder="Description" />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <AdminButton wFit type="submit">Create</AdminButton>
  </form>

  <div class="grid gap-3">
    {#each data.tags as tag (tag.id)}
      <form method="POST" action="?/update" class="grid gap-3 rounded border border-border p-4">
        <input type="hidden" name="id" value={tag.id} />
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" id="tag-edit-name-{tag.id}">
            <FormInput id="tag-edit-name-{tag.id}" name="name" value={tag.name} placeholder="Name" required />
          </FormField>
          <FormField label="Slug" id="tag-edit-slug-{tag.id}">
            <FormInput id="tag-edit-slug-{tag.id}" name="slug" value={tag.slug} placeholder="Slug" required />
          </FormField>
        </div>
        <FormField label="Description" id="tag-edit-description-{tag.id}">
          <FormTextarea id="tag-edit-description-{tag.id}" name="description" value={tag.description ?? ''} placeholder="Description" />
        </FormField>
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" checked={tag.is_active} /> Active
          </label>
          <AdminButton type="submit">Save</AdminButton>
          <AdminButton variant="danger-outline" type="submit" formaction="?/remove" formmethod="POST">Delete</AdminButton>
        </div>
      </form>
    {/each}
  </div>
</section>
