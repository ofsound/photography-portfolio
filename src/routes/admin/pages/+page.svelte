<script lang="ts">
  import type { ContentRevision } from '$lib/types/content';

  let { data, form } = $props();

  const revisionsByPage = $derived(
    (data.revisions as ContentRevision[]).reduce((acc: Record<string, ContentRevision[]>, revision) => {
      if (!acc[revision.entity_pk]) acc[revision.entity_pk] = [];
      acc[revision.entity_pk].push(revision);
      return acc;
    }, {})
  );
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Pages</h1>
<p class="mt-2 text-sm text-ink/70">Strict HTML allowlist. `iframe` blocked. Save publishes immediately.</p>

{#if form?.message}
  <p class="mt-3 rounded border border-black/10 px-3 py-2 text-sm">{form.message}</p>
{/if}

<section class="mt-6 grid gap-8 lg:grid-cols-[440px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-black/10 p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">Create Page</h2>

    <input name="title" placeholder="Title" class="rounded border border-black/20 px-3 py-2" required />
    <input name="slug" placeholder="Slug (custom only)" class="rounded border border-black/20 px-3 py-2" />

    <div class="grid gap-2 sm:grid-cols-2">
      <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
        Kind
        <select name="kind" class="rounded border border-black/20 px-3 py-2">
          <option value="custom">custom</option>
          <option value="home">home</option>
          <option value="about">about</option>
          <option value="contact">contact</option>
        </select>
      </label>

      <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
        Status
        <select name="status" class="rounded border border-black/20 px-3 py-2">
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </label>
    </div>

    <textarea name="html_content" rows="6" placeholder="HTML" class="rounded border border-black/20 px-3 py-2 font-mono text-xs"></textarea>
    <textarea name="css_module" rows="4" placeholder="Scoped CSS" class="rounded border border-black/20 px-3 py-2 font-mono text-xs"></textarea>
    <input name="seo_title" placeholder="SEO title" class="rounded border border-black/20 px-3 py-2" />
    <textarea name="seo_description" rows="2" placeholder="SEO description" class="rounded border border-black/20 px-3 py-2"></textarea>
    <input name="og_image_path" placeholder="OG image path" class="rounded border border-black/20 px-3 py-2" />

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" /> Show in nav</label>
      <label class="flex items-center gap-2 text-sm">Nav order <input type="number" name="nav_order" value="0" class="w-24 rounded border border-black/20 px-2 py-1" /></label>
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Create</button>
    </div>
  </form>

  <div class="grid gap-4">
    {#each data.pages as page (page.id)}
      <form method="POST" action="?/update" class="grid gap-3 rounded border border-black/10 p-4">
        <input type="hidden" name="id" value={page.id} />
        <div class="grid gap-2 sm:grid-cols-3">
          <input name="title" value={page.title} class="rounded border border-black/20 px-3 py-2" required />
          <input name="slug" value={page.slug} class="rounded border border-black/20 px-3 py-2" />
          <select name="kind" class="rounded border border-black/20 px-3 py-2">
            <option selected={page.kind === 'custom'} value="custom">custom</option>
            <option selected={page.kind === 'home'} value="home">home</option>
            <option selected={page.kind === 'about'} value="about">about</option>
            <option selected={page.kind === 'contact'} value="contact">contact</option>
          </select>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <select name="status" class="rounded border border-black/20 px-3 py-2">
            <option selected={page.status === 'published'} value="published">published</option>
            <option selected={page.status === 'archived'} value="archived">archived</option>
          </select>
          <input name="seo_title" value={page.seo_title ?? ''} placeholder="SEO title" class="rounded border border-black/20 px-3 py-2" />
        </div>

        <textarea name="html_content" rows="6" class="rounded border border-black/20 px-3 py-2 font-mono text-xs">{page.html_content ?? ''}</textarea>
        <textarea name="css_module" rows="3" class="rounded border border-black/20 px-3 py-2 font-mono text-xs">{page.css_module ?? ''}</textarea>
        <textarea name="seo_description" rows="2" class="rounded border border-black/20 px-3 py-2">{page.seo_description ?? ''}</textarea>
        <input name="og_image_path" value={page.og_image_path ?? ''} class="rounded border border-black/20 px-3 py-2" placeholder="OG image path" />

        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" checked={page.show_in_nav} /> Show in nav</label>
          <label class="flex items-center gap-2 text-sm">Nav order <input type="number" name="nav_order" value={page.nav_order} class="w-24 rounded border border-black/20 px-2 py-1" /></label>
          <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save</button>
          <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/archive" formmethod="POST">Archive</button>
          <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/restore" formmethod="POST">Restore</button>
        </div>

        {#if revisionsByPage[page.id]?.length}
          <div class="rounded border border-black/10 p-3">
            <p class="mb-2 text-xs uppercase tracking-[0.12em]">Recent Revisions</p>
            <div class="grid gap-2">
              {#each revisionsByPage[page.id].slice(0, 5) as rev (rev.id)}
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>v{rev.version_no} - {new Date(rev.changed_at).toLocaleString()}</span>
                  <button type="submit" name="revision_id" value={rev.id} formaction="?/rollback" class="rounded border border-black/20 px-2 py-1 uppercase tracking-[0.12em]">Rollback</button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </form>
    {/each}
  </div>
</section>
