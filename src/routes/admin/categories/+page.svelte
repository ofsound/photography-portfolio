<script lang="ts">
  let { data, form } = $props();
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Categories</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">New Category</h2>
    <input name="name" placeholder="Name" class="rounded border border-border-strong px-3 py-2" required />
    <input name="slug" placeholder="Slug (optional)" class="rounded border border-border-strong px-3 py-2" />
    <textarea name="description" placeholder="Description" class="rounded border border-border-strong px-3 py-2"></textarea>
    <input name="sort_order" type="number" class="rounded border border-border-strong px-3 py-2" value="0" />
    <label class="flex items-center gap-2 text-sm">
      <input name="is_active" type="checkbox" checked /> Active
    </label>
    <button class="w-fit rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Create</button>
  </form>

  <div class="grid gap-3">
    {#each data.categories as category (category.id)}
      <form method="POST" action="?/update" class="grid gap-2 rounded border border-border p-4">
        <input type="hidden" name="id" value={category.id} />
        <div class="grid gap-2 sm:grid-cols-2">
          <input name="name" value={category.name} class="rounded border border-border-strong px-3 py-2" required />
          <input name="slug" value={category.slug} class="rounded border border-border-strong px-3 py-2" required />
        </div>
        <textarea name="description" class="rounded border border-border-strong px-3 py-2">{category.description ?? ''}</textarea>
        <div class="flex flex-wrap items-center gap-3">
          <input name="sort_order" type="number" value={category.sort_order} class="w-32 rounded border border-border-strong px-3 py-2" />
          <label class="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" checked={category.is_active} /> Active
          </label>
          <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save</button>
          <button class="rounded border border-danger/60 px-3 py-1 text-xs uppercase tracking-[0.14em] text-danger" type="submit" formaction="?/remove" formmethod="POST">Delete</button>
        </div>
      </form>
    {/each}
  </div>
</section>
