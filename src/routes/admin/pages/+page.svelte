<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

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

    <FormField label="Title" id="page-create-title">
      <FormInput id="page-create-title" name="title" placeholder="Title" required />
    </FormField>
    <FormField label="Slug" id="page-create-slug">
      <FormInput id="page-create-slug" name="slug" placeholder="Slug" />
    </FormField>

    <FormField label="Status" id="page-create-status">
      <select name="status" id="page-create-status" class="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm">
        <option value="published">published</option>
        <option value="archived">archived</option>
      </select>
    </FormField>

    <FormField label="HTML" id="page-create-html_content">
      <FormTextarea id="page-create-html_content" name="html_content" rows={6} placeholder="HTML" class="font-mono text-xs" />
    </FormField>
    <FormField label="Scoped CSS" id="page-create-css_module">
      <FormTextarea id="page-create-css_module" name="css_module" rows={4} placeholder="Scoped CSS" class="font-mono text-xs" />
    </FormField>
    <FormField label="SEO title" id="page-create-seo_title">
      <FormInput id="page-create-seo_title" name="seo_title" placeholder="SEO title" />
    </FormField>
    <FormField label="SEO description" id="page-create-seo_description">
      <FormTextarea id="page-create-seo_description" name="seo_description" rows={2} placeholder="SEO description" />
    </FormField>
    <FormField label="OG image path" id="page-create-og_image_path">
      <FormInput id="page-create-og_image_path" name="og_image_path" placeholder="OG image path" />
    </FormField>

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm"><input name="show_in_nav" type="checkbox" /> Show in nav</label>
      <label class="flex items-center gap-2 text-sm"
        >Nav order <input type="number" name="nav_order" value="0" class="w-24 rounded border border-border-strong px-2 py-1" /></label
      >
      <AdminButton type="submit">Create</AdminButton>
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
