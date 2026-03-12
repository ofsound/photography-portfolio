<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';

  import type { GallerySettingsDefaults } from '$lib/constants/gallery-settings';
  import { THUMBNAIL_ENTRANCE_PRESET_OPTIONS } from '$lib/constants/thumbnail-entrance';
  import { PRELOADER_PRESET_OPTIONS } from '$lib/constants/preloader-preset';
  import {
    NAV_BUTTON_PRESET_OPTIONS,
    normalizeNavButtonPreset,
    type NavButtonPreset,
  } from '$lib/constants/nav-button-preset';

  type Props = {
    settings: GallerySettingsDefaults;
    readonly?: boolean;
    disableTransitionPreset?: boolean;
    idPrefix?: string;
  };
  type NavPreviewVariant = 'prev' | 'close' | 'next';

  const {
    settings,
    readonly = false,
    disableTransitionPreset = false,
    idPrefix = 'settings-',
  }: Props = $props();

  const p = (name: string) => `${idPrefix}${name}`;
  const selectedNavButtonPreset = $derived(
    normalizeNavButtonPreset(settings.nav_button_preset),
  );
  const selectedNavButtonOption = $derived(
    NAV_BUTTON_PRESET_OPTIONS.find(
      (option) => option.id === selectedNavButtonPreset,
    ) ?? NAV_BUTTON_PRESET_OPTIONS[0],
  );

  const navPreviewBaseClass =
    'inline-flex min-h-10 items-center justify-center text-text transition-colors';
  const navPreviewStyleClass: Record<NavButtonPreset, string> = {
    whisper: 'px-2 text-sm opacity-70',
    lens: 'size-10 rounded-full border border-border-strong bg-surface text-sm',
    filmStrip: 'h-10 w-20 border border-border-strong bg-surface px-2',
    cinemark: 'px-2 text-base font-semibold tracking-widest uppercase',
    gate: 'min-h-12 bg-surface text-sm',
  };
  const navPreviewButtonClass = (variant: NavPreviewVariant) =>
    `${navPreviewBaseClass} ${navPreviewStyleClass[selectedNavButtonPreset]} ${
      selectedNavButtonPreset === 'gate'
        ? variant === 'close'
          ? 'rounded-b-lg border-x border-b border-border-strong px-3'
          : variant === 'prev'
            ? 'justify-self-start rounded-r-lg border-r border-border-strong px-3'
            : 'justify-self-end rounded-l-lg border-l border-border-strong px-3'
        : variant === 'prev'
          ? 'justify-self-start'
          : variant === 'next'
            ? 'justify-self-end'
            : 'justify-self-center'
    }`;
  const navPreviewRowClass = 'grid grid-cols-3 items-center gap-3';
  const navPreviewVariants: NavPreviewVariant[] = ['prev', 'close', 'next'];
  const navPreviewLabel = (variant: NavPreviewVariant) =>
    variant === 'prev' ? '←' : variant === 'next' ? '→' : '×';
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
  <FormField label="Gallery Theme" id={p('theme_default')} class="w-fit">
    <FormSelect
      name="theme_default"
      id={p('theme_default')}
      value={settings.theme_default}
      disabled={readonly}
      class="w-auto"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </FormSelect>
  </FormField>
  <FormField label="Layout Mode" id={p('gallery_layout_mode')} class="w-fit">
    <FormSelect
      name="gallery_layout_mode"
      id={p('gallery_layout_mode')}
      value={settings.gallery_layout_mode}
      disabled={readonly}
      class="w-auto"
    >
      <option value="uniform">uniform</option>
      <option value="masonry">masonry</option>
      <option value="coverage">coverage</option>
      <option value="rows">rows</option>
      <option value="columns">columns</option>
    </FormSelect>
  </FormField>
  <FormField label="Detail Viewer" id={p('detail_view_mode')} class="w-fit">
    <FormSelect
      name="detail_view_mode"
      id={p('detail_view_mode')}
      value={settings.detail_view_mode}
      disabled={readonly}
      class="w-auto"
    >
      <option value="classic">classic</option>
      <option value="contact_sheet">contact sheet</option>
    </FormSelect>
  </FormField>
  <FormField label="Thumb Ratio" id={p('uniform_thumb_ratio')} class="w-28">
    <FormInput
      id={p('uniform_thumb_ratio')}
      name="uniform_thumb_ratio"
      type="number"
      step="0.001"
      value={String(settings.uniform_thumb_ratio)}
      {readonly}
    />
  </FormField>
  <FormField label="Max Width (px)" id={p('max_content_width_px')} class="w-28">
    <FormInput
      id={p('max_content_width_px')}
      name="max_content_width_px"
      type="number"
      value={settings.max_content_width_px != null
        ? String(settings.max_content_width_px)
        : ''}
      {readonly}
    />
  </FormField>
</div>

<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
  <FormField
    label="Desktop Columns"
    id={p('grid_desktop_default')}
    class="w-fit"
  >
    <FormInput
      id={p('grid_desktop_default')}
      name="grid_desktop_default"
      type="number"
      value={String(settings.grid_desktop_default)}
      class="w-20"
      {readonly}
    />
  </FormField>
  <FormField label="Mobile Columns" id={p('grid_mobile_default')} class="w-fit">
    <FormInput
      id={p('grid_mobile_default')}
      name="grid_mobile_default"
      type="number"
      value={String(settings.grid_mobile_default)}
      class="w-20"
      {readonly}
    />
  </FormField>
  <FormField label="Gap (px)" id={p('gallery_gap_px')} class="w-fit">
    <FormInput
      id={p('gallery_gap_px')}
      name="gallery_gap_px"
      type="number"
      min="0"
      max="20"
      value={String(settings.gallery_gap_px ?? 8)}
      {readonly}
    />
  </FormField>
</div>

<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
  <FormField
    label={'Transition' + (disableTransitionPreset ? ' (Admin)' : '')}
    id={p('transition_preset')}
    class="w-fit"
  >
    <FormSelect
      name="transition_preset"
      id={p('transition_preset')}
      value={settings.transition_preset}
      disabled={readonly || disableTransitionPreset}
      class="w-auto"
    >
      <option value="cinematic">cinematic</option>
      <option value="snappy">snappy</option>
      <option value="experimental">experimental</option>
    </FormSelect>
  </FormField>
  <FormField
    label={'Thumbnail Entrance Animation' +
      (disableTransitionPreset ? ' (Admin)' : '')}
    id={p('thumbnail_entrance_preset')}
    class="w-fit"
  >
    <FormSelect
      name="thumbnail_entrance_preset"
      id={p('thumbnail_entrance_preset')}
      value={settings.thumbnail_entrance_preset}
      disabled={readonly || disableTransitionPreset}
      class="w-auto"
    >
      {#each THUMBNAIL_ENTRANCE_PRESET_OPTIONS as option (option.id)}
        <option value={option.id}>{option.id}</option>
      {/each}
    </FormSelect>
  </FormField>
  <FormField
    label={'Loading Animation' + (disableTransitionPreset ? ' (Admin)' : '')}
    id={p('preloader_preset')}
    class="w-fit"
  >
    <FormSelect
      name="preloader_preset"
      id={p('preloader_preset')}
      value={settings.preloader_preset}
      disabled={readonly || disableTransitionPreset}
      class="w-auto"
    >
      {#each PRELOADER_PRESET_OPTIONS as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </FormSelect>
  </FormField>
  <FormField
    label={'Nav Button Style' + (disableTransitionPreset ? ' (Admin)' : '')}
    id={p('nav_button_preset')}
    helper={disableTransitionPreset
      ? 'Admin-only setting. Editors can view but cannot modify this preset.'
      : selectedNavButtonOption.description}
    class="w-fit"
  >
    <FormSelect
      name="nav_button_preset"
      id={p('nav_button_preset')}
      value={selectedNavButtonPreset}
      disabled={readonly || disableTransitionPreset}
      class="w-auto"
    >
      {#each NAV_BUTTON_PRESET_OPTIONS as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </FormSelect>
  </FormField>
</div>

<AdminCard class="grid gap-3 p-3">
  <div class="flex flex-wrap items-start justify-between gap-2">
    <p class="text-xs font-medium tracking-wide text-text uppercase">
      Nav Button Style Preview
    </p>
    <p class="text-xs text-text-muted">{selectedNavButtonOption.label}</p>
  </div>

  <div class="grid gap-2 rounded border border-border bg-canvas p-2">
    <div class={navPreviewRowClass}>
      {#each navPreviewVariants as variant (variant)}
        <span class={navPreviewButtonClass(variant)} aria-hidden="true">
          {#if selectedNavButtonPreset === 'filmStrip'}
            <span class="flex h-full w-full items-center justify-center gap-2">
              <span class="size-1.5 rounded-full border border-border-strong"
              ></span>
              <span
                class:text-xs={variant === 'close'}
                class:text-base={variant !== 'close'}
                class:font-semibold={variant === 'close'}
                class:tracking-wide={variant === 'close'}
                class:uppercase={variant === 'close'}
              >
                {navPreviewLabel(variant)}
              </span>
              <span class="size-1.5 rounded-full border border-border-strong"
              ></span>
            </span>
          {:else if selectedNavButtonPreset === 'cinemark'}
            <span
              class:text-sm={variant === 'close'}
              class:text-2xl={variant !== 'close'}
            >
              {variant === 'close' ? 'Close' : navPreviewLabel(variant)}
            </span>
          {:else if selectedNavButtonPreset === 'gate'}
            <span class:font-medium={variant === 'close'}>
              {variant === 'close' ? 'Close' : navPreviewLabel(variant)}
            </span>
          {:else}
            <span
              class:text-xs={variant === 'close'}
              class:text-lg={variant !== 'close'}
              class:tracking-wide={variant === 'close'}
              class:uppercase={variant === 'close'}
            >
              {navPreviewLabel(variant)}
            </span>
          {/if}
        </span>
      {/each}
    </div>
  </div>

  <div class="grid gap-1 text-xs text-text-muted">
    {#each NAV_BUTTON_PRESET_OPTIONS as option (option.id)}
      <p class:text-text={option.id === selectedNavButtonPreset}>
        {option.label}: {option.description}
      </p>
    {/each}
  </div>
</AdminCard>

<AdminCard class="grid gap-3 p-3">
  <div class="grid gap-1">
    <p class="text-xs font-medium tracking-wide text-text uppercase">
      Contact Sheet Viewer
    </p>
    <p class="text-xs text-text-muted">
      Applied when Detail Viewer is set to contact sheet.
    </p>
  </div>

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <FormField
      label="Perspective (px)"
      id={p('contact_sheet_perspective_px')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_perspective_px')}
        name="contact_sheet_perspective_px"
        type="number"
        min="200"
        max="4000"
        value={String(settings.contact_sheet_perspective_px)}
        {readonly}
      />
    </FormField>
    <FormField
      label="Rotate X (deg)"
      id={p('contact_sheet_rotate_x_deg')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_rotate_x_deg')}
        name="contact_sheet_rotate_x_deg"
        type="number"
        step="0.1"
        min="0"
        max="45"
        value={String(settings.contact_sheet_rotate_x_deg)}
        {readonly}
      />
    </FormField>
    <FormField
      label="Rotate Y (deg)"
      id={p('contact_sheet_rotate_y_deg')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_rotate_y_deg')}
        name="contact_sheet_rotate_y_deg"
        type="number"
        step="0.1"
        min="0"
        max="45"
        value={String(settings.contact_sheet_rotate_y_deg)}
        {readonly}
      />
    </FormField>
    <FormField
      label="Travel Z (px)"
      id={p('contact_sheet_travel_z_px')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_travel_z_px')}
        name="contact_sheet_travel_z_px"
        type="number"
        min="0"
        max="1000"
        value={String(settings.contact_sheet_travel_z_px)}
        {readonly}
      />
    </FormField>
    <FormField
      label="Target Fill"
      id={p('contact_sheet_target_fill_pct')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_target_fill_pct')}
        name="contact_sheet_target_fill_pct"
        type="number"
        step="0.01"
        min="0.1"
        max="0.95"
        value={String(settings.contact_sheet_target_fill_pct)}
        {readonly}
      />
    </FormField>
    <FormField
      label="Mobile Intensity (%)"
      id={p('contact_sheet_mobile_intensity_pct')}
      class="w-full"
    >
      <FormInput
        id={p('contact_sheet_mobile_intensity_pct')}
        name="contact_sheet_mobile_intensity_pct"
        type="number"
        min="0"
        max="100"
        value={String(settings.contact_sheet_mobile_intensity_pct)}
        {readonly}
      />
    </FormField>
  </div>
</AdminCard>

<div class="mt-4 flex flex-col gap-3">
  <FormField
    label="Allow Transition Toggle"
    id={p('allow_transition_toggle')}
    labelSrOnly
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        id={p('allow_transition_toggle')}
        type="checkbox"
        name="allow_transition_toggle"
        checked={settings.allow_transition_toggle}
        disabled={readonly}
      />
      Enable toggle in gallery UI
    </label>
  </FormField>

  <FormField
    label="Show Photograph Info"
    id={p('photograph_info_mode')}
    class="w-fit"
  >
    <FormSelect
      name="photograph_info_mode"
      id={p('photograph_info_mode')}
      value={settings.photograph_info_mode}
      disabled={readonly}
      class="w-auto"
    >
      <option value="hidden">hidden</option>
      <option value="floating">floating</option>
      <option value="bottom_dock">bottom dock</option>
    </FormSelect>
  </FormField>

  <FormField
    label="Photograph Info Fields"
    id={p('show_photo_info_title')}
    labelSrOnly
  >
    <AdminCard class="grid gap-2 p-3">
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('show_photo_info_title')}
          type="checkbox"
          name="show_photo_info_title"
          checked={settings.show_photo_info_title}
          disabled={readonly}
        />
        Show title
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('show_photo_info_description')}
          type="checkbox"
          name="show_photo_info_description"
          checked={settings.show_photo_info_description}
          disabled={readonly}
        />
        Show description
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('show_photo_info_capture_date')}
          type="checkbox"
          name="show_photo_info_capture_date"
          checked={settings.show_photo_info_capture_date}
          disabled={readonly}
        />
        Show capture date
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('show_photo_info_dimensions')}
          type="checkbox"
          name="show_photo_info_dimensions"
          checked={settings.show_photo_info_dimensions}
          disabled={readonly}
        />
        Show dimensions
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('show_photo_info_license_text')}
          type="checkbox"
          name="show_photo_info_license_text"
          checked={settings.show_photo_info_license_text}
          disabled={readonly}
        />
        Show license
      </label>
    </AdminCard>
  </FormField>

  <FormField
    label="Show Thumbnail Zoom Hover"
    id={p('show_thumbnail_zoom_hover')}
    labelSrOnly
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        id={p('show_thumbnail_zoom_hover')}
        type="checkbox"
        name="show_thumbnail_zoom_hover"
        checked={settings.show_thumbnail_zoom_hover}
        disabled={readonly}
      />
      Enable hover zoom treatment
    </label>
  </FormField>
</div>
