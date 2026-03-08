<script lang="ts">
  import { resolve } from '$app/paths';

  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import type { ContentRevision } from '$lib/types/content';

  const { data, form } = $props();
  const page = $derived(data.page);
  const revisions = $derived(data.revisions as ContentRevision[]);
  const initialPage = () => data.page;

  let formTitle = $state(initialPage().title);
  let formSlug = $state(initialPage().slug);
  let formStatus = $state<'published' | 'archived'>(
    initialPage().status === 'archived' ? 'archived' : 'published',
  );
  let formSeoTitle = $state(initialPage().seo_title ?? '');
  let formEditorMode = $state<'code' | 'svedit'>(
    initialPage().editor_mode === 'svedit' ? 'svedit' : 'code',
  );
  let formHtmlContent = $state(initialPage().html_content ?? '');
  let formCssModule = $state(initialPage().css_module ?? '');
  let formSveditDoc = $state(
    initialPage().svedit_doc
      ? JSON.stringify(initialPage().svedit_doc, null, 2)
      : '',
  );
  let formSeoDescription = $state(initialPage().seo_description ?? '');
  let formOgImagePath = $state(initialPage().og_image_path ?? '');
  let showRawSveditJson = $state(false);
  let rawSveditJsonError = $state<string | null>(null);

  const formatRawSveditJson = () => {
    const value = formSveditDoc.trim();
    if (!value) {
      rawSveditJsonError = null;
      return;
    }

    try {
      formSveditDoc = JSON.stringify(JSON.parse(value), null, 2);
      rawSveditJsonError = null;
    } catch {
      rawSveditJsonError = 'Invalid JSON. Fix syntax before formatting/saving.';
    }
  };

  const confirmDelete = (event: MouseEvent) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      event.preventDefault();
    }
  };
</script>

<div class="flex items-center gap-3">
  <a
    href={resolve('/admin/pages')}
    class="-m-2 p-2 text-text-muted transition-colors hover:text-brand"
    aria-label="Back to Pages"
  >
    <svg
      class="size-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  </a>
  <AdminHeading>{page.title}: Edit</AdminHeading>
</div>
{#if form?.message}
  <AdminStatusMessage
    type={form && 'success' in form && form.success ? 'success' : 'error'}
    class="mt-3"
  >
    {form.message}
  </AdminStatusMessage>
{/if}

<form method="POST" action="?/update" class="mt-6 grid gap-3">
  <input type="hidden" name="id" value={page.id} />

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Title" id="page-edit-title">
      <FormInput
        id="page-edit-title"
        name="title"
        bind:value={formTitle}
        required
      />
    </FormField>
    <FormField label="Slug" id="page-edit-slug">
      <FormInput id="page-edit-slug" name="slug" bind:value={formSlug} />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Status" id="page-edit-status">
      <FormSelect name="status" id="page-edit-status" bind:value={formStatus}>
        <option value="published">published</option>
        <option value="archived">archived</option>
      </FormSelect>
    </FormField>
    <FormField label="Editor mode" id="page-edit-editor_mode">
      <FormSelect
        name="editor_mode"
        id="page-edit-editor_mode"
        bind:value={formEditorMode}
      >
        <option value="code">HTML + Scoped CSS</option>
        <option value="svedit">Svedit</option>
      </FormSelect>
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="SEO title" id="page-edit-seo_title">
      <FormInput
        id="page-edit-seo_title"
        name="seo_title"
        bind:value={formSeoTitle}
        placeholder="SEO title"
      />
    </FormField>
    <FormField label="SEO description" id="page-edit-seo_description">
      <FormTextarea
        id="page-edit-seo_description"
        name="seo_description"
        bind:value={formSeoDescription}
        rows={2}
      />
    </FormField>
  </div>
  <FormField label="OG image path" id="page-edit-og_image_path">
    <FormInput
      id="page-edit-og_image_path"
      name="og_image_path"
      bind:value={formOgImagePath}
      placeholder="OG image path"
    />
  </FormField>

  {#if formEditorMode === 'code'}
    <FormField label="HTML" id="page-edit-html_content">
      <CodeEditor
        name="html_content"
        bind:value={formHtmlContent}
        lang="html"
        height="32rem"
      />
    </FormField>
    <FormField label="Scoped CSS" id="page-edit-css_module">
      <CodeEditor
        name="css_module"
        bind:value={formCssModule}
        lang="css"
        height="16rem"
      />
    </FormField>
    <input type="hidden" name="svedit_doc" value="" />
  {:else}
    <FormField label="Svedit Document" id="page-edit-svedit_doc">
      <SveditEditor
        name="svedit_doc"
        bind:value={formSveditDoc}
        height="40rem"
      />
    </FormField>
    <div class="border-border-subtle grid gap-2 rounded border p-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded border border-border-strong px-2 py-1 text-xs tracking-widest uppercase"
          onclick={() => {
            showRawSveditJson = !showRawSveditJson;
            rawSveditJsonError = null;
          }}
        >
          {showRawSveditJson ? 'Hide Raw JSON' : 'Edit Raw JSON'}
        </button>
        {#if showRawSveditJson}
          <button
            type="button"
            class="rounded border border-border-strong px-2 py-1 text-xs tracking-widest uppercase"
            onclick={formatRawSveditJson}
          >
            Format JSON
          </button>
        {/if}
      </div>

      {#if showRawSveditJson}
        <FormTextarea
          id="page-edit-svedit_doc_raw"
          rows={18}
          bind:value={formSveditDoc}
          placeholder="Paste a full Svedit JSON document here"
          class="font-mono text-xs"
        />
      {/if}

      {#if rawSveditJsonError}
        <p class="text-xs text-red-600">{rawSveditJsonError}</p>
      {/if}
    </div>
    <input type="hidden" name="html_content" value="" />
    <input type="hidden" name="css_module" value="" />
  {/if}

  <div class="flex flex-wrap items-center gap-3">
    <label class="flex items-center gap-2 text-sm"
      ><input name="show_in_nav" type="checkbox" checked={page.show_in_nav} /> Show
      in nav</label
    >
    <label class="flex items-center gap-2 text-sm"
      >Nav order <input
        type="number"
        name="nav_order"
        value={page.nav_order}
        class="w-24 rounded border border-border-strong px-2 py-1"
      /></label
    >
    <AdminButton type="submit" variant="submit">Save</AdminButton>
    {#if page.status === 'archived'}
      <AdminButton
        type="submit"
        variant="submit"
        formaction="?/restore"
        formmethod="POST">Publish</AdminButton
      >
      <AdminButton
        type="submit"
        variant="danger"
        formaction="?/delete"
        formmethod="POST"
        onclick={confirmDelete}>Delete</AdminButton
      >
    {:else}
      <AdminButton
        type="submit"
        variant="danger"
        formaction="?/archive"
        formmethod="POST">Archive</AdminButton
      >
    {/if}
  </div>

  {#if revisions.length}
    <AdminCard class="p-3">
      <p class="mb-2 text-xs tracking-widest uppercase">Recent Revisions</p>
      <div class="grid gap-2">
        {#each revisions.slice(0, 10) as rev (rev.id)}
          <div
            class="flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <span
              >v{rev.version_no} - {new Date(
                rev.changed_at,
              ).toLocaleString()}</span
            >
            <AdminButton
              variant="submit"
              type="submit"
              name="revision_id"
              value={rev.id}
              formaction="?/rollback"
              formmethod="POST"
              size="sm"
            >
              Rollback
            </AdminButton>
          </div>
        {/each}
      </div>
    </AdminCard>
  {/if}
</form>
