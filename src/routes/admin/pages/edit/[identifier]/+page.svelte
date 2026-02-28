<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import type { ContentRevision } from '$lib/types/content';

  let { data, form } = $props();
  const page = $derived(data.page);
  const revisions = $derived(data.revisions as ContentRevision[]);

  let formTitle = $state('');
  let formSlug = $state('');
  let formStatus = $state<'published' | 'archived'>('published');
  let formSeoTitle = $state('');
  let formHtmlContent = $state('');
  let formCssModule = $state('');
  let formSeoDescription = $state('');
  let formOgImagePath = $state('');
  let prevPageId = $state<string | null>(null);
  $effect(() => {
    const p = page;
    if (prevPageId !== p.id) {
      prevPageId = p.id;
      formTitle = p.title;
      formSlug = p.slug;
      formStatus = p.status;
      formSeoTitle = p.seo_title ?? '';
      formHtmlContent = p.html_content ?? '';
      formCssModule = p.css_module ?? '';
      formSeoDescription = p.seo_description ?? '';
      formOgImagePath = p.og_image_path ?? '';
    }
  });
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl uppercase tracking-[0.15em]">Edit Page</h1>
  <a href="/admin/pages" class="rounded border border-admin-btn-border bg-admin-btn-bg px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-border">Back to Pages</a>
</div>
<p class="mt-2 text-sm text-text-muted">Editing `/{page.slug}`</p>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<form method="POST" action="?/update" class="mt-6 grid gap-3 rounded border border-border p-4">
  <input type="hidden" name="id" value={page.id} />

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Title" id="page-edit-title">
      <FormInput id="page-edit-title" name="title" bind:value={formTitle} required />
    </FormField>
    <FormField label="Slug" id="page-edit-slug">
      <FormInput id="page-edit-slug" name="slug" bind:value={formSlug} />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Status" id="page-edit-status">
      <select name="status" id="page-edit-status" bind:value={formStatus} class="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm">
        <option value="published">published</option>
        <option value="archived">archived</option>
      </select>
    </FormField>
    <FormField label="SEO title" id="page-edit-seo_title">
      <FormInput id="page-edit-seo_title" name="seo_title" bind:value={formSeoTitle} placeholder="SEO title" />
    </FormField>
  </div>

  <FormField label="HTML" id="page-edit-html_content">
    <FormTextarea id="page-edit-html_content" name="html_content" bind:value={formHtmlContent} rows={8} class="font-mono text-xs" />
  </FormField>
  <FormField label="Scoped CSS" id="page-edit-css_module">
    <FormTextarea id="page-edit-css_module" name="css_module" bind:value={formCssModule} rows={4} class="font-mono text-xs" />
  </FormField>
  <FormField label="SEO description" id="page-edit-seo_description">
    <FormTextarea id="page-edit-seo_description" name="seo_description" bind:value={formSeoDescription} rows={2} />
  </FormField>
  <FormField label="OG image path" id="page-edit-og_image_path">
    <FormInput id="page-edit-og_image_path" name="og_image_path" bind:value={formOgImagePath} placeholder="OG image path" />
  </FormField>

  <div class="flex flex-wrap items-center gap-3">
    <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" checked={page.show_in_nav} /> Show in nav</label>
    <label class="flex items-center gap-2 text-sm">Nav order <input type="number" name="nav_order" value={page.nav_order} class="w-24 rounded border border-border-strong px-2 py-1" /></label>
    <AdminButton type="submit">Save and Return</AdminButton>
    <AdminButton type="submit" formaction="?/archive" formmethod="POST">Archive and Return</AdminButton>
    <AdminButton type="submit" formaction="?/restore" formmethod="POST">Restore and Return</AdminButton>
  </div>

  {#if revisions.length}
    <div class="rounded border border-border p-3">
      <p class="mb-2 text-xs uppercase tracking-[0.12em]">Recent Revisions</p>
      <div class="grid gap-2">
        {#each revisions.slice(0, 10) as rev (rev.id)}
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>v{rev.version_no} - {new Date(rev.changed_at).toLocaleString()}</span>
            <AdminButton
              type="submit"
              name="revision_id"
              value={rev.id}
              formaction="?/rollback"
              formmethod="POST"
              size="sm"
            >
              Rollback and Return
            </AdminButton>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</form>
