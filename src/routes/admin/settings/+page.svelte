<script lang="ts">
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import {
    DEFAULT_BRAND_CONTRAST_DARK_HEX,
    DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
    DEFAULT_BRAND_DARK_HEX,
    DEFAULT_BRAND_LIGHT_HEX,
    isValidHexColor,
    normalizeHexColor,
  } from '$lib/constants/theme-colors';

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
      default_page_max_width_px?: number | null;
      brand_light_hex?: string;
      brand_dark_hex?: string;
      brand_contrast_light_hex?: string;
      brand_contrast_dark_hex?: string;
    };
  };

  const { data, form } = $props();
  const typedForm = $derived(
    (form as FormState | null | undefined) ?? undefined,
  );

  const fieldErrors = $derived(typedForm?.fieldErrors ?? {});
  const values = $derived(typedForm?.values ?? {});
  const isAdmin = $derived(data.role === 'admin');
  const getValue = (value: string | boolean | undefined) =>
    typeof value === 'string' ? value : undefined;
  const toColorInputValue = (value: unknown, fallback: string) => {
    const safeFallback = isValidHexColor(fallback)
      ? fallback.toLowerCase()
      : '#000000';
    const normalized = normalizeHexColor(value, safeFallback);
    return isValidHexColor(normalized) ? normalized : safeFallback;
  };
  const brandLightHexSource = $derived(
    normalizeHexColor(
      getValue(values.brand_light_hex) ?? data.typography.brand_light_hex,
      DEFAULT_BRAND_LIGHT_HEX,
    ),
  );
  const brandDarkHexSource = $derived(
    normalizeHexColor(
      getValue(values.brand_dark_hex) ?? data.typography.brand_dark_hex,
      DEFAULT_BRAND_DARK_HEX,
    ),
  );
  const brandContrastLightHexSource = $derived(
    normalizeHexColor(
      getValue(values.brand_contrast_light_hex) ??
        data.typography.brand_contrast_light_hex,
      DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
    ),
  );
  const brandContrastDarkHexSource = $derived(
    normalizeHexColor(
      getValue(values.brand_contrast_dark_hex) ??
        data.typography.brand_contrast_dark_hex,
      DEFAULT_BRAND_CONTRAST_DARK_HEX,
    ),
  );

  let brandLightHexOverride = $state<string | null>(null);
  let brandDarkHexOverride = $state<string | null>(null);
  let brandContrastLightHexOverride = $state<string | null>(null);
  let brandContrastDarkHexOverride = $state<string | null>(null);

  const brandLightHex = $derived(brandLightHexOverride ?? brandLightHexSource);
  const brandDarkHex = $derived(brandDarkHexOverride ?? brandDarkHexSource);
  const brandContrastLightHex = $derived(
    brandContrastLightHexOverride ?? brandContrastLightHexSource,
  );
  const brandContrastDarkHex = $derived(
    brandContrastDarkHexOverride ?? brandContrastDarkHexSource,
  );
  const brandLightPickerHex = $derived(
    isValidHexColor(brandLightHexOverride ?? '')
      ? brandLightHexOverride!.toLowerCase()
      : brandLightHexSource,
  );
  const brandDarkPickerHex = $derived(
    isValidHexColor(brandDarkHexOverride ?? '')
      ? brandDarkHexOverride!.toLowerCase()
      : brandDarkHexSource,
  );
  const brandContrastLightPickerHex = $derived(
    isValidHexColor(brandContrastLightHexOverride ?? '')
      ? brandContrastLightHexOverride!.toLowerCase()
      : brandContrastLightHexSource,
  );
  const brandContrastDarkPickerHex = $derived(
    isValidHexColor(brandContrastDarkHexOverride ?? '')
      ? brandContrastDarkHexOverride!.toLowerCase()
      : brandContrastDarkHexSource,
  );
</script>

<AdminHeader>
  <AdminHeading>Site Settings</AdminHeading>

  {#if form?.message}
    <AdminToastEmitter
      message={form.message}
      type={form && 'success' in form && form.success ? 'success' : 'error'}
    />
  {/if}
</AdminHeader>

<form method="POST" action="?/saveTypography" class="grid gap-4">
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
      label="Default Max Width (px)"
      id="default-page-max-width-px"
      helper="Default/fallback max width for /search and custom pages."
      error={fieldErrors.default_page_max_width_px}
    >
      <FormInput
        id="default-page-max-width-px"
        name="default_page_max_width_px"
        type="number"
        min={1}
        step={1}
        value={values.default_page_max_width_px != null
          ? String(values.default_page_max_width_px)
          : String(data.typography.default_page_max_width_px)}
        readonly={!isAdmin}
      />
    </FormField>

    <h2
      class="mt-2 text-sm font-semibold tracking-wide text-text-muted uppercase"
    >
      Brand Colors
    </h2>

    <FormField
      label="Brand Color (Light Theme)"
      id="brand-light-hex"
      error={fieldErrors.brand_light_hex}
    >
      <div class="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <input
          id="brand-light-hex-picker"
          type="color"
          value={toColorInputValue(
            brandLightPickerHex,
            DEFAULT_BRAND_LIGHT_HEX,
          )}
          defaultValue={toColorInputValue(
            brandLightPickerHex,
            DEFAULT_BRAND_LIGHT_HEX,
          )}
          aria-label="Brand color light theme picker"
          disabled={!isAdmin}
          class="h-10 w-14 rounded border border-border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-60"
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandLightHexOverride = next.toLowerCase();
          }}
        />
        <FormInput
          id="brand-light-hex"
          name="brand_light_hex"
          value={brandLightHex}
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandLightHexOverride = next;
          }}
          placeholder={DEFAULT_BRAND_LIGHT_HEX}
          readonly={!isAdmin}
        />
      </div>
    </FormField>

    <FormField
      label="Brand Color (Dark Theme)"
      id="brand-dark-hex"
      error={fieldErrors.brand_dark_hex}
    >
      <div class="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <input
          id="brand-dark-hex-picker"
          type="color"
          value={toColorInputValue(brandDarkPickerHex, DEFAULT_BRAND_DARK_HEX)}
          defaultValue={toColorInputValue(
            brandDarkPickerHex,
            DEFAULT_BRAND_DARK_HEX,
          )}
          aria-label="Brand color dark theme picker"
          disabled={!isAdmin}
          class="h-10 w-14 rounded border border-border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-60"
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandDarkHexOverride = next.toLowerCase();
          }}
        />
        <FormInput
          id="brand-dark-hex"
          name="brand_dark_hex"
          value={brandDarkHex}
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandDarkHexOverride = next;
          }}
          placeholder={DEFAULT_BRAND_DARK_HEX}
          readonly={!isAdmin}
        />
      </div>
    </FormField>

    <FormField
      label="Brand Contrast (Light Theme)"
      id="brand-contrast-light-hex"
      error={fieldErrors.brand_contrast_light_hex}
    >
      <div class="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <input
          id="brand-contrast-light-hex-picker"
          type="color"
          value={toColorInputValue(
            brandContrastLightPickerHex,
            DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
          )}
          defaultValue={toColorInputValue(
            brandContrastLightPickerHex,
            DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
          )}
          aria-label="Brand contrast light theme picker"
          disabled={!isAdmin}
          class="h-10 w-14 rounded border border-border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-60"
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandContrastLightHexOverride = next.toLowerCase();
          }}
        />
        <FormInput
          id="brand-contrast-light-hex"
          name="brand_contrast_light_hex"
          value={brandContrastLightHex}
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandContrastLightHexOverride = next;
          }}
          placeholder={DEFAULT_BRAND_CONTRAST_LIGHT_HEX}
          readonly={!isAdmin}
        />
      </div>
    </FormField>

    <FormField
      label="Brand Contrast (Dark Theme)"
      id="brand-contrast-dark-hex"
      error={fieldErrors.brand_contrast_dark_hex}
    >
      <div class="grid gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <input
          id="brand-contrast-dark-hex-picker"
          type="color"
          value={toColorInputValue(
            brandContrastDarkPickerHex,
            DEFAULT_BRAND_CONTRAST_DARK_HEX,
          )}
          defaultValue={toColorInputValue(
            brandContrastDarkPickerHex,
            DEFAULT_BRAND_CONTRAST_DARK_HEX,
          )}
          aria-label="Brand contrast dark theme picker"
          disabled={!isAdmin}
          class="h-10 w-14 rounded border border-border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-60"
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandContrastDarkHexOverride = next.toLowerCase();
          }}
        />
        <FormInput
          id="brand-contrast-dark-hex"
          name="brand_contrast_dark_hex"
          value={brandContrastDarkHex}
          oninput={(event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            brandContrastDarkHexOverride = next;
          }}
          placeholder={DEFAULT_BRAND_CONTRAST_DARK_HEX}
          readonly={!isAdmin}
        />
      </div>
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
    <p class="text-sm text-text-muted">Only admins can edit site settings.</p>
  {/if}
</form>
