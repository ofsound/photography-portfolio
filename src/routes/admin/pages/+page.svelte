<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  const { data, form } = $props();
  const pages = $derived(
    data.pages as Array<{
      id: string;
      slug: string;
      title: string;
      editor_mode: 'code' | 'svedit';
      status: 'published' | 'archived';
      updated_at: string;
    }>,
  );

  let createEditorMode = $state<'code' | 'svedit'>('code');
  let createSveditDoc = $state('');
</script>

<AdminCreateListLayout
  title="Pages"
  formMessage={form?.message}
  formSuccess={form?.success}
  dataMessage={data.message}
  create={createForm}
  list={pageList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
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
      <FormSelect name="status" id="page-create-status" value="published">
        <option value="published">published</option>
        <option value="archived">archived</option>
      </FormSelect>
    </FormField>
    <FormField label="Editor mode" id="page-create-editor_mode">
      <FormSelect
        name="editor_mode"
        id="page-create-editor_mode"
        bind:value={createEditorMode}
      >
        <option value="code">HTML + Scoped CSS</option>
        <option value="svedit">Svedit</option>
      </FormSelect>
    </FormField>

    {#if createEditorMode === 'code'}
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
      <input type="hidden" name="svedit_doc" value="" />
    {:else}
      <FormField label="Svedit Document" id="page-create-svedit_doc">
        <SveditEditor
          name="svedit_doc"
          bind:value={createSveditDoc}
          height="40rem"
        />
      </FormField>
      <input type="hidden" name="html_content" value="" />
      <input type="hidden" name="css_module" value="" />
    {/if}
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
      <AdminButton type="submit" variant="submit">Create Page</AdminButton>
    </div>
  </form>
{/snippet}

{#snippet pageList()}
  {#if pages.length === 0}
    <p class="mt-2 text-sm text-text-muted">No pages yet.</p>
  {:else}
    <div class="mt-3 flex flex-col gap-4">
      {#each pages as page (page.id)}
        <AdminButton
          href={`/admin/pages/edit/${page.slug}`}
          variant="subtle"
          class="block w-full text-left"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span>{page.title}</span>
            <span class="text-xs tracking-widest text-text-subtle uppercase"
              >{page.status} - {page.editor_mode}</span
            >
          </div>
          <p class="mt-1 text-xs text-text-subtle normal-case">
            Updated {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </AdminButton>
      {/each}
    </div>
  {/if}
{/snippet}
