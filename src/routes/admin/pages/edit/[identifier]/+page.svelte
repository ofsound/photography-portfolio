<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';

  import CodeEditor from '$lib/components/admin/CodeEditor.svelte';
  import SveditEditor from '$lib/components/admin/SveditEditor.svelte';
  import AdminBackLink from '$lib/components/admin/AdminBackLink.svelte';
  import BackgroundImagePickerModal from '$lib/components/admin/BackgroundImagePickerModal.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminRevisionsDrawer from '$lib/components/admin/AdminRevisionsDrawer.svelte';
  import AdminSeoSocialDrawer from '$lib/components/admin/AdminSeoSocialDrawer.svelte';
  import AdminStickyActionBar from '$lib/components/admin/AdminStickyActionBar.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import { useAdminFormState } from '$lib/components/admin/useAdminFormState.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import {
    PAGE_BACKGROUND_OPTIONS,
    type PageBackgroundBehavior,
  } from '$lib/constants/page-background';
  import {
    PAGE_VISIBILITY_OPTIONS,
    type PageVisibilityStatus,
  } from '$lib/constants/page-visibility';
  import type { ContentRevision, HomepageImage } from '$lib/types/content';

  const { data, form } = $props();
  const {
    typedForm,
    fieldErrors,
    message: formMessage,
    success: formSuccess,
  } = useAdminFormState<Record<string, string | undefined>>(() => form);
  const page = $derived(data.page);
  const revisions = $derived(data.revisions as ContentRevision[]);
  const images = $derived((data.images as HomepageImage[]) ?? []);
  const formValues = untrack(() => typedForm?.values ?? {});
  const initialPage = untrack(() => page);

  let formTitle = $state(
    typeof formValues.title === 'string' ? formValues.title : initialPage.title,
  );
  let formSlug = $state(
    typeof formValues.slug === 'string' ? formValues.slug : initialPage.slug,
  );
  let formVisibilityStatus = $state<PageVisibilityStatus>(
    formValues.visibility_status === 'draft' ||
      formValues.visibility_status === 'public' ||
      formValues.visibility_status === 'unlisted'
      ? formValues.visibility_status
      : initialPage.visibility_status,
  );
  let formSeoTitle = $state(
    typeof formValues.seo_title === 'string'
      ? formValues.seo_title
      : (initialPage.seo_title ?? ''),
  );
  let formEditorMode = $state<'code' | 'svedit'>(
    formValues.editor_mode === 'code' || formValues.editor_mode === 'svedit'
      ? formValues.editor_mode
      : initialPage.editor_mode === 'svedit'
        ? 'svedit'
        : 'code',
  );
  let formHtmlContent = $state(
    typeof formValues.html_content === 'string'
      ? formValues.html_content
      : (initialPage.html_content ?? ''),
  );
  let formCssModule = $state(
    typeof formValues.css_module === 'string'
      ? formValues.css_module
      : (initialPage.css_module ?? ''),
  );
  let formSveditDoc = $state(
    typeof formValues.svedit_doc === 'string'
      ? formValues.svedit_doc
      : initialPage.svedit_doc
        ? JSON.stringify(initialPage.svedit_doc, null, 2)
        : '',
  );
  let formSeoDescription = $state(
    typeof formValues.seo_description === 'string'
      ? formValues.seo_description
      : (initialPage.seo_description ?? ''),
  );
  let formOgTitle = $state(
    typeof formValues.og_title === 'string'
      ? formValues.og_title
      : (initialPage.og_title ?? ''),
  );
  let formOgDescription = $state(
    typeof formValues.og_description === 'string'
      ? formValues.og_description
      : (initialPage.og_description ?? ''),
  );
  let formOgImagePath = $state(
    typeof formValues.og_image_path === 'string'
      ? formValues.og_image_path
      : (initialPage.og_image_path ?? ''),
  );
  let formMaxWidthOverride = $state(
    typeof formValues.max_width_override_px === 'string'
      ? formValues.max_width_override_px
      : initialPage.max_width_override_px != null
        ? String(initialPage.max_width_override_px)
        : '',
  );
  const DEFAULT_PAGE_MAX_WIDTH_PX = 1280;
  const siteDefaultMaxWidth = $derived(
    data.siteSettings?.default_page_max_width_px ?? DEFAULT_PAGE_MAX_WIDTH_PX,
  );
  let formBgImageId = $state<string | null>(
    typeof formValues.bg_image_id === 'string'
      ? formValues.bg_image_id.trim() || null
      : (initialPage.bg_image_id ?? null),
  );
  let formBgImageFixed = $state<PageBackgroundBehavior>(
    formValues.bg_image_fixed === 'on' ||
      formValues.bg_image_fixed === 'true' ||
      formValues.bg_image_fixed === 'fixed'
      ? 'fixed'
      : formValues.bg_image_fixed === '' ||
          formValues.bg_image_fixed === 'false' ||
          formValues.bg_image_fixed === 'scroll'
        ? 'scroll'
        : initialPage.bg_image_fixed
          ? 'fixed'
          : 'scroll',
  );
  let showBgPicker = $state(false);
  let showRawSveditJson = $state(false);
  let rawSveditJsonError = $state<string | null>(null);
  const selectedBgImage = $derived(
    formBgImageId
      ? (images.find((image) => image.id === formBgImageId) ?? null)
      : null,
  );

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

<AdminPageHeader
  title={`${page.title}`}
  leading={backLink}
  toasts={headerToasts}
/>

{#snippet backLink()}
  <AdminBackLink href={resolve('/admin/pages')} ariaLabel="Back to Pages" />
{/snippet}

{#snippet headerToasts()}
  <AdminToastEmitter
    message={formMessage ?? data.message}
    type={formSuccess
      ? 'success'
      : formMessage
        ? 'error'
        : data.messageSuccess
          ? 'success'
          : 'neutral'}
    clearQueryMessage
    links={formSuccess || data.messageSuccess
      ? { viewPage: resolve(`/${page.slug}`) }
      : undefined}
  />
{/snippet}

<form
  id="page-edit-form"
  method="POST"
  action="?/update"
  class="grid gap-3 pb-32"
>
  <input type="hidden" name="id" value={page.id} />
  <input type="hidden" name="original_identifier" value={data.identifier} />
  <input type="hidden" name="bg_image_id" value={formBgImageId ?? ''} />
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
        <option value="code">HTML and CSS</option>
        <option value="svedit">Svedit</option>
      </FormSelect>
    </FormField>
  </div>

  <div class="grid gap-3">
    <AdminCard variant="gradient" class="grid gap-3 p-3">
      <div class="mb-3 flex flex-col gap-2">
        <AdminHeading level={3}>Page Background</AdminHeading>
        <p class="text-xs text-text-muted">Select a published lead image.</p>
      </div>

      <div
        class={[
          'grid min-w-0 gap-3',
          selectedBgImage?.delivery_storage_path
            ? 'md:grid-cols-2 md:items-start md:gap-4'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div class="grid min-w-0 gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <AdminButton
              type="button"
              size="sm"
              onclick={() => (showBgPicker = true)}>Choose</AdminButton
            >
            <AdminButton
              type="button"
              size="sm"
              variant="default"
              disabled={!formBgImageId}
              onclick={() => {
                formBgImageId = null;
              }}>Remove</AdminButton
            >
          </div>

          {#if fieldErrors.bg_image_id}
            <p class="text-xs text-red-600">{fieldErrors.bg_image_id}</p>
          {/if}

          {#if selectedBgImage && selectedBgImage.delivery_storage_path}
            <div class="grid w-fit max-w-full gap-2 text-xs">
              <img
                src={photoPublicUrl(selectedBgImage.delivery_storage_path, 220)}
                alt={selectedBgImage.photo_title}
                class="h-20 w-28 rounded object-cover"
              />
              <p class="max-w-52 truncate">{selectedBgImage.photo_title}</p>
            </div>
          {:else if formBgImageId}
            <p class="text-xs text-text-muted">
              Selected image is no longer available in picker results.
            </p>
            <p class="text-xs text-text-subtle">ID: {formBgImageId}</p>
          {/if}
        </div>

        {#if selectedBgImage && selectedBgImage.delivery_storage_path}
          <div class="min-w-0">
            <FormField
              label="Background behavior"
              id="page-edit-bg_image_fixed"
              class="min-w-0"
            >
              <div class="grid gap-2">
                {#each PAGE_BACKGROUND_OPTIONS as option (option.value)}
                  <label
                    class="flex cursor-pointer items-start gap-3 rounded border border-border bg-surface p-3 transition-colors hover:border-border-strong"
                  >
                    <input
                      type="radio"
                      name="bg_image_fixed"
                      id={`bg-behavior-${option.value}`}
                      value={option.value}
                      bind:group={formBgImageFixed}
                      class="mt-1 size-4 accent-brand"
                    />
                    <span class="grid min-w-0 gap-1">
                      <span class="text-sm font-medium text-text"
                        >{option.label}</span
                      >
                      <span class="text-xs text-text-muted"
                        >{option.description}</span
                      >
                    </span>
                  </label>
                {/each}
              </div>
            </FormField>
          </div>
        {/if}
      </div>
    </AdminCard>

    <div class="grid gap-3 md:grid-cols-2 md:items-start">
      <FormField
        label="Max Width Override (px)"
        id="page-edit-max_width_override_px"
        hint="Optional. Leave blank to use the site default ({siteDefaultMaxWidth}px)."
        error={fieldErrors.max_width_override_px}
        class="min-w-0"
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
    </div>
  </div>

  {#if formEditorMode === 'code'}
    <FormField
      label="HTML and Tailwind"
      id="page-edit-html_content"
      error={fieldErrors.html_content}
      class="min-w-0"
    >
      <CodeEditor
        name="html_content"
        bind:value={formHtmlContent}
        lang="html"
        lines={15}
      />
    </FormField>
    <FormField label="CSS" id="page-edit-css_module" class="min-w-0">
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
</form>

<AdminStickyActionBar>
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
</AdminStickyActionBar>

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
