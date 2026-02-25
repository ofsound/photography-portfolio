<script lang="ts">
  import type { ContentRevision } from '$lib/types/content';

  let { data, form } = $props();
  const page = $derived(data.page);
  const revisions = $derived(data.revisions as ContentRevision[]);
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl uppercase tracking-[0.15em]">Edit Page</h1>
  <a href="/admin/pages" class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]">Back to Pages</a>
</div>
<p class="mt-2 text-sm text-text-muted">Editing `/{page.slug}`</p>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<form method="POST" action="?/update" class="mt-6 grid gap-3 rounded border border-border p-4">
  <input type="hidden" name="id" value={page.id} />

  <div class="grid gap-2 sm:grid-cols-2">
    <input name="title" value={page.title} class="rounded border border-border-strong px-3 py-2" required />
    <input name="slug" value={page.slug} class="rounded border border-border-strong px-3 py-2" />
  </div>

  <div class="grid gap-2 sm:grid-cols-2">
    <select name="status" class="rounded border border-border-strong px-3 py-2">
      <option selected={page.status === 'published'} value="published">published</option>
      <option selected={page.status === 'archived'} value="archived">archived</option>
    </select>
    <input name="seo_title" value={page.seo_title ?? ''} placeholder="SEO title" class="rounded border border-border-strong px-3 py-2" />
  </div>

  <textarea name="html_content" rows="8" class="rounded border border-border-strong px-3 py-2 font-mono text-xs">{page.html_content ?? ''}</textarea>
  <textarea name="css_module" rows="4" class="rounded border border-border-strong px-3 py-2 font-mono text-xs">{page.css_module ?? ''}</textarea>
  <textarea name="seo_description" rows="2" class="rounded border border-border-strong px-3 py-2">{page.seo_description ?? ''}</textarea>
  <input name="og_image_path" value={page.og_image_path ?? ''} class="rounded border border-border-strong px-3 py-2" placeholder="OG image path" />

  <div class="flex flex-wrap items-center gap-3">
    <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" checked={page.show_in_nav} /> Show in nav</label>
    <label class="flex items-center gap-2 text-sm">Nav order <input type="number" name="nav_order" value={page.nav_order} class="w-24 rounded border border-border-strong px-2 py-1" /></label>
    <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save and Return</button>
    <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/archive" formmethod="POST">
      Archive and Return
    </button>
    <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/restore" formmethod="POST">
      Restore and Return
    </button>
  </div>

  {#if revisions.length}
    <div class="rounded border border-border p-3">
      <p class="mb-2 text-xs uppercase tracking-[0.12em]">Recent Revisions</p>
      <div class="grid gap-2">
        {#each revisions.slice(0, 10) as rev (rev.id)}
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>v{rev.version_no} - {new Date(rev.changed_at).toLocaleString()}</span>
            <button
              type="submit"
              name="revision_id"
              value={rev.id}
              formaction="?/rollback"
              formmethod="POST"
              class="rounded border border-border-strong px-2 py-1 uppercase tracking-[0.12em]"
            >
              Rollback and Return
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</form>
