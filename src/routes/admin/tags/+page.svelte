<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';

  let { data, form } = $props();
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Tags</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">New Tag</h2>
    <input name="name" placeholder="Name" class="rounded border border-border-strong px-3 py-2" required />
    <input name="slug" placeholder="Slug (optional)" class="rounded border border-border-strong px-3 py-2" />
    <textarea name="description" placeholder="Description" class="rounded border border-border-strong px-3 py-2"></textarea>
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <AdminButton wFit type="submit">Create</AdminButton>
  </form>

  <div class="grid gap-3">
    {#each data.tags as tag (tag.id)}
      <form method="POST" action="?/update" class="grid gap-2 rounded border border-border p-4">
        <input type="hidden" name="id" value={tag.id} />
        <div class="grid gap-2 sm:grid-cols-2">
          <input name="name" value={tag.name} class="rounded border border-border-strong px-3 py-2" required />
          <input name="slug" value={tag.slug} class="rounded border border-border-strong px-3 py-2" required />
        </div>
        <textarea name="description" class="rounded border border-border-strong px-3 py-2">{tag.description ?? ''}</textarea>
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
