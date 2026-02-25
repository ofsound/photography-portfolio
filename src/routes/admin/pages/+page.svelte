<script lang="ts">
  let { data, form } = $props();
  const pages = $derived(
    data.pages as Array<{ id: string; slug: string; title: string; status: 'published' | 'archived'; updated_at: string }>
  );
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Pages</h1>
<p class="mt-2 text-sm text-text-muted">Create pages here, then edit each page on its own route editor.</p>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}
{#if data.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{data.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[420px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">Create Page</h2>

    <input name="title" placeholder="Title" class="rounded border border-border-strong px-3 py-2" required />
    <input name="slug" placeholder="Slug" class="rounded border border-border-strong px-3 py-2" />

    <div class="grid gap-2 sm:grid-cols-2">
      <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
        Status
        <select name="status" class="rounded border border-border-strong px-3 py-2">
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </label>
    </div>

    <textarea name="html_content" rows="6" placeholder="HTML" class="rounded border border-border-strong px-3 py-2 font-mono text-xs"></textarea>
    <textarea
      name="css_module"
      rows="4"
      placeholder="Scoped CSS"
      class="rounded border border-border-strong px-3 py-2 font-mono text-xs"
    ></textarea>
    <input name="seo_title" placeholder="SEO title" class="rounded border border-border-strong px-3 py-2" />
    <textarea name="seo_description" rows="2" placeholder="SEO description" class="rounded border border-border-strong px-3 py-2"></textarea>
    <input name="og_image_path" placeholder="OG image path" class="rounded border border-border-strong px-3 py-2" />

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" /> Show in nav</label>
      <label class="flex items-center gap-2 text-sm"
        >Nav order <input type="number" name="nav_order" value="0" class="w-24 rounded border border-border-strong px-2 py-1" /></label
      >
      <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Create</button>
    </div>
  </form>

  <section class="rounded border border-border p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">Existing Pages</h2>
    {#if pages.length === 0}
      <p class="mt-2 text-sm text-text-muted">No pages yet.</p>
    {:else}
      <div class="mt-3 grid gap-2">
        {#each pages as page (page.id)}
          <a href={`/admin/pages/edit/${page.slug}`} class="rounded border border-border px-3 py-2 text-sm hover:bg-canvas/[0.03]">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span>/{page.slug} - {page.title}</span>
              <span class="text-xs uppercase tracking-[0.12em] text-text-subtle">{page.status}</span>
            </div>
            <p class="mt-1 text-xs text-text-subtle">Updated {new Date(page.updated_at).toLocaleString()}</p>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</section>
