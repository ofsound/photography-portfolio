<script lang="ts">
  import { resolve } from '$app/paths';

  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import BackgroundImagePickerModal from '$lib/components/admin/BackgroundImagePickerModal.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminRevisionsDrawer from '$lib/components/admin/AdminRevisionsDrawer.svelte';
  import AdminSeoSocialDrawer from '$lib/components/admin/AdminSeoSocialDrawer.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import {
    PAGE_VISIBILITY_OPTIONS,
    type PageVisibilityStatus,
  } from '$lib/constants/page-visibility';
  import type { ContentRevision, HomepageImage } from '$lib/types/content';

  type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, string | undefined>;
  };

  const { data, form } = $props();
  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );
  const page = $derived(data.page);
  const revisions = $derived(data.revisions as ContentRevision[]);
  const images = $derived((data.images as HomepageImage[]) ?? []);
  const initialPage = () => data.page;

  let formTitle = $state(initialPage().title);
  let formSlug = $state(initialPage().slug);
  let formVisibilityStatus = $state<PageVisibilityStatus>(
    initialPage().visibility_status,
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
  let formOgTitle = $state(initialPage().og_title ?? '');
  let formOgDescription = $state(initialPage().og_description ?? '');
  let formOgImagePath = $state(initialPage().og_image_path ?? '');
  let formMaxWidthOverride = $state(
    initialPage().max_width_override_px != null
      ? String(initialPage().max_width_override_px)
      : '',
  );
  let formBgImageId = $state<string | null>(initialPage().bg_image_id ?? null);
  let formBgImageFixed = $state(initialPage().bg_image_fixed ?? false);
  let showBgPicker = $state(false);
  let showRawSveditJson = $state(false);
  let rawSveditJsonError = $state<string | null>(null);
  const fieldErrors = $derived(typedForm?.fieldErrors ?? {});
  const selectedBgImage = $derived(
    formBgImageId
      ? (images.find((image) => image.id === formBgImageId) ?? null)
      : null,
  );

  $effect(() => {
    const values = typedForm?.values;
    if (!values) return;

    if (typeof values.title === 'string') formTitle = values.title;
    if (typeof values.slug === 'string') formSlug = values.slug;
    if (typeof values.seo_title === 'string') formSeoTitle = values.seo_title;
    if (typeof values.seo_description === 'string') {
      formSeoDescription = values.seo_description;
    }
    if (typeof values.og_title === 'string') {
      formOgTitle = values.og_title;
    }
    if (typeof values.og_description === 'string') {
      formOgDescription = values.og_description;
    }
    if (typeof values.og_image_path === 'string') {
      formOgImagePath = values.og_image_path;
    }
    if (typeof values.max_width_override_px === 'string') {
      formMaxWidthOverride = values.max_width_override_px;
    }
    if (typeof values.bg_image_id === 'string') {
      formBgImageId = values.bg_image_id.trim() || null;
    }
    if (values.bg_image_fixed === 'on' || values.bg_image_fixed === 'true') {
      formBgImageFixed = true;
    } else if (
      values.bg_image_fixed === '' ||
      values.bg_image_fixed === 'false'
    ) {
      formBgImageFixed = false;
    }
    if (typeof values.html_content === 'string')
      formHtmlContent = values.html_content;
    if (typeof values.css_module === 'string')
      formCssModule = values.css_module;
    if (typeof values.svedit_doc === 'string')
      formSveditDoc = values.svedit_doc;
    if (
      values.visibility_status === 'draft' ||
      values.visibility_status === 'public' ||
      values.visibility_status === 'unlisted'
    ) {
      formVisibilityStatus = values.visibility_status;
    }
    if (values.editor_mode === 'code' || values.editor_mode === 'svedit') {
      formEditorMode = values.editor_mode;
    }
  });

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

<AdminHeader>
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
  <AdminToastEmitter
    message={form?.message ?? data.message}
    type={form?.success === true
      ? 'success'
      : form?.message
        ? 'error'
        : data.messageSuccess
          ? 'success'
          : 'neutral'}
    clearQueryMessage
  />
</AdminHeader>

<form
  id="page-edit-form"
  method="POST"
  action="?/update"
  class="grid gap-3 pb-32"
>
  <input type="hidden" name="id" value={page.id} />
  <input type="hidden" name="original_identifier" value={data.identifier} />
  <input type="hidden" name="bg_image_id" value={formBgImageId ?? ''} />
  <input
    type="hidden"
    name="bg_image_fixed"
    value={formBgImageFixed ? 'on' : ''}
  />

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField
      label="Title"
      id="page-edit-title"
      required
      error={fieldErrors.title}
    >
      <FormInput id="page-edit-title" name="title" bind:value={formTitle} />
    </FormField>
    <FormField label="Slug" id="page-edit-slug" error={fieldErrors.slug}>
      <FormInput id="page-edit-slug" name="slug" bind:value={formSlug} />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="">
      <FormField label="Visibility" id="page-edit-visibility_status">
        <FormSelect
          name="visibility_status"
          id="page-edit-visibility_status"
          bind:value={formVisibilityStatus}
        >
          {#each PAGE_VISIBILITY_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </FormSelect>
      </FormField>
    </div>
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

  <AdminSeoSocialDrawer
    idPrefix="page-edit"
    storageKey="admin-seo-social:pages-edit"
    {fieldErrors}
    bind:seoTitle={formSeoTitle}
    bind:seoDescription={formSeoDescription}
    bind:ogTitle={formOgTitle}
    bind:ogDescription={formOgDescription}
    bind:ogImagePath={formOgImagePath}
  />
  <FormField
    label="Max Width Override (px)"
    id="page-edit-max_width_override_px"
    helper="Optional. Leave blank to use the site default."
    error={fieldErrors.max_width_override_px}
  >
    <FormInput
      id="page-edit-max_width_override_px"
      name="max_width_override_px"
      type="number"
      min={1}
      step={1}
      bind:value={formMaxWidthOverride}
    />
  </FormField>

  <AdminCard class="grid gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs tracking-widest uppercase">Page Background</p>
        <p class="text-xs text-text-muted">Select a published lead image.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <AdminButton
          type="button"
          size="sm"
          onclick={() => (showBgPicker = true)}>Choose Background</AdminButton
        >
        <AdminButton
          type="button"
          size="sm"
          variant="default"
          disabled={!formBgImageId}
          onclick={() => {
            formBgImageId = null;
          }}>Remove Background</AdminButton
        >
      </div>
    </div>

    {#if fieldErrors.bg_image_id}
      <p class="text-xs text-red-600">{fieldErrors.bg_image_id}</p>
    {/if}

    {#if selectedBgImage && selectedBgImage.delivery_storage_path}
      <div class="grid w-fit gap-2 text-xs">
        <img
          src={photoPublicUrl(selectedBgImage.delivery_storage_path, 220)}
          alt={selectedBgImage.photo_title}
          class="h-20 w-28 rounded object-cover"
        />
        <p class="max-w-52 truncate">{selectedBgImage.photo_title}</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="page-edit-bg_image_fixed"
          bind:checked={formBgImageFixed}
          class="size-4 accent-brand"
        />
        <label for="page-edit-bg_image_fixed" class="text-xs">
          Fixed background — background stays fixed while content scrolls
        </label>
      </div>
    {:else if formBgImageId}
      <p class="text-xs text-text-muted">
        Selected image is no longer available in picker results.
      </p>
      <p class="text-xs text-text-subtle">ID: {formBgImageId}</p>
    {/if}
  </AdminCard>

  {#if formEditorMode === 'code'}
    <FormField
      label="HTML"
      id="page-edit-html_content"
      error={fieldErrors.html_content}
    >
      <CodeEditor
        name="html_content"
        bind:value={formHtmlContent}
        lang="html"
        lines={15}
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
    <FormField
      label="Svedit Document"
      id="page-edit-svedit_doc"
      error={fieldErrors.svedit_doc}
    >
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

  <AdminRevisionsDrawer
    id="page-edit-revisions"
    {revisions}
    rollbackFormAction="?/rollback"
    storageKey="admin-revisions:pages-edit"
  />
</form>

<div
  class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur md:left-[220px] md:px-6"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  <div class="w-full md:max-w-[1200px]">
    <AdminCard class="flex flex-wrap items-center gap-3 p-3">
      <AdminButton type="submit" variant="submit" form="page-edit-form"
        >Save</AdminButton
      >
      <AdminButton
        type="submit"
        variant="danger"
        form="page-edit-form"
        formaction="?/delete"
        formmethod="POST"
        onclick={confirmDelete}>Delete</AdminButton
      >
    </AdminCard>
  </div>
</div>

{#if showBgPicker}
  <BackgroundImagePickerModal
    {images}
    selectedId={formBgImageId}
    onselect={(id) => {
      formBgImageId = id;
      showBgPicker = false;
    }}
    onclose={() => {
      showBgPicker = false;
    }}
  />
{/if}
