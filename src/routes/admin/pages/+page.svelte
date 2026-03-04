<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  const { data, form } = $props();
  const pages = $derived(
    data.pages as Array<{
      id: string;
      slug: string;
      title: string;
      status: 'published' | 'archived';
      updated_at: string;
    }>,
  );
</script>

<AdminHeading>Pages</AdminHeading>
<p class="mt-2 text-sm text-text-muted">
  Create pages here, then edit each page on its own route editor.
</p>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {form.message}
  </p>
{/if}
{#if data.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {data.message}
  </p>
{/if}

<section class="mt-6 flex flex-col gap-8 lg:flex-row">
  <form
    method="POST"
    action="?/create"
    class="grid h-fit gap-3 lg:w-96 lg:shrink-0"
  >
    <FormField label="Title" id="page-create-title">
      <FormInput
        id="page-create-title"
        name="title"
        placeholder="Title"
        required
      />
    </FormField>
    <FormField label="Slug" id="page-create-slug">
      <FormInput id="page-create-slug" name="slug" placeholder="Slug" />
    </FormField>

    <FormField label="Status" id="page-create-status">
      <select
        name="status"
        id="page-create-status"
        class="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm"
      >
        <option value="published">published</option>
        <option value="archived">archived</option>
      </select>
    </FormField>

    <FormField label="HTML" id="page-create-html_content">
      <CodeEditor
        lang="html"
        name="html_content"
        placeholder="HTML"
        height="24rem"
      />
    </FormField>
    <FormField label="Scoped CSS" id="page-create-css_module">
      <CodeEditor
        lang="css"
        name="css_module"
        placeholder="Scoped CSS"
        height="12rem"
      />
    </FormField>
    <FormField label="SEO title" id="page-create-seo_title">
      <FormInput
        id="page-create-seo_title"
        name="seo_title"
        placeholder="SEO title"
      />
    </FormField>
    <FormField label="SEO description" id="page-create-seo_description">
      <FormTextarea
        id="page-create-seo_description"
        name="seo_description"
        rows={2}
        placeholder="SEO description"
      />
    </FormField>
    <FormField label="OG image path" id="page-create-og_image_path">
      <FormInput
        id="page-create-og_image_path"
        name="og_image_path"
        placeholder="OG image path"
      />
    </FormField>

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm"
        ><input name="show_in_nav" type="checkbox" /> Show in nav</label
      >
      <label class="flex items-center gap-2 text-sm"
        >Nav order <input
          type="number"
          name="nav_order"
          value="0"
          class="w-24 rounded border border-border-strong px-2 py-1"
        /></label
      >
      <AdminButton wFit type="submit">Create Page</AdminButton>
    </div>
  </form>

  <section class="flex-1">
    <h2 class="text-sm tracking-widest uppercase">Existing Pages</h2>
    {#if pages.length === 0}
      <p class="mt-2 text-sm text-text-muted">No pages yet.</p>
    {:else}
      <div class="mt-3 flex flex-col gap-2">
        {#each pages as page (page.id)}
          <AdminButton
            href={`/admin/pages/edit/${page.slug}`}
            variant="subtle"
            class="block w-full text-left"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span>{page.title} - /{page.slug}</span>
              <span class="text-xs tracking-widest text-text-subtle uppercase"
                >{page.status}</span
              >
            </div>
            <p class="mt-1 text-xs text-text-subtle">
              Updated {new Date(page.updated_at).toLocaleString()}
            </p>
          </AdminButton>
        {/each}
      </div>
    {/if}
  </section>
</section>
