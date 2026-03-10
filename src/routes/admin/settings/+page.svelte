<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  type FormState = {
    message?: string;
    success?: boolean;
    fieldErrors?: Record<string, string | undefined>;
    values?: {
      public_font_import_url?: string;
      public_font_family?: string;
      admin_font_import_url?: string;
      admin_font_family?: string;
      show_search_link_in_nav?: boolean;
    };
  };

  const { data, form } = $props();
  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );

  const fieldErrors = $derived(typedForm?.fieldErrors ?? {});
  const values = $derived(typedForm?.values ?? {});
  const isAdmin = $derived(data.role === 'admin');
</script>

<AdminHeading>Site Settings</AdminHeading>

{#if form?.message}
  <AdminToastEmitter
    message={form.message}
    type={form && 'success' in form && form.success ? 'success' : 'error'}
  />
{/if}

<form method="POST" action="?/saveTypography" class="mt-6 grid gap-4">
  <div class="grid gap-3">
    <FormField
      label="Public Google Font Import URL"
      id="public-font-import-url"
      error={fieldErrors.public_font_import_url}
    >
      <FormInput
        id="public-font-import-url"
        name="public_font_import_url"
        value={values.public_font_import_url ??
          data.typography.public_font_import_url}
        readonly={!isAdmin}
      />
    </FormField>

    <FormField
      label="Public Font Family"
      id="public-font-family"
      helper="Example: 'Gabarito', 'sans-serif'"
      error={fieldErrors.public_font_family}
    >
      <FormInput
        id="public-font-family"
        name="public_font_family"
        value={values.public_font_family ?? data.typography.public_font_family}
        readonly={!isAdmin}
      />
    </FormField>

    <FormField
      label="Admin Google Font Import URL"
      id="admin-font-import-url"
      error={fieldErrors.admin_font_import_url}
    >
      <FormInput
        id="admin-font-import-url"
        name="admin_font_import_url"
        value={values.admin_font_import_url ??
          data.typography.admin_font_import_url}
        readonly={!isAdmin}
      />
    </FormField>

    <FormField
      label="Admin Font Family"
      id="admin-font-family"
      helper="Example: 'Inter', 'sans-serif'"
      error={fieldErrors.admin_font_family}
    >
      <FormInput
        id="admin-font-family"
        name="admin_font_family"
        value={values.admin_font_family ?? data.typography.admin_font_family}
        readonly={!isAdmin}
      />
    </FormField>

    <FormField
      label="Show Search Link in Nav"
      id="show-search-link-in-nav"
      labelSrOnly
    >
      <label class="flex items-center gap-2 text-sm">
        <input
          id="show-search-link-in-nav"
          type="checkbox"
          name="show_search_link_in_nav"
          checked={Boolean(
            values.show_search_link_in_nav ??
            data.typography.show_search_link_in_nav,
          )}
          disabled={!isAdmin}
        />
        Show Search Link in Nav
      </label>
    </FormField>
  </div>

  {#if isAdmin}
    <AdminButton type="submit" variant="submit">Save Settings</AdminButton>
  {:else}
    <p class="text-sm text-text-muted">
      Only admins can edit typography settings.
    </p>
  {/if}
</form>
