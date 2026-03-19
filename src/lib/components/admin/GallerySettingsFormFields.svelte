<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';

  import type { GallerySettingsDefaults } from '$lib/constants/gallery-settings';
  import { THUMBNAIL_ENTRANCE_PRESET_OPTIONS } from '$lib/constants/thumbnail-entrance';
  import { PRELOADER_PRESET_OPTIONS } from '$lib/constants/preloader-preset';
  import {
    NAV_BUTTON_PRESET_OPTIONS,
    normalizeNavButtonPreset,
  } from '$lib/constants/nav-button-preset';

  type Props = {
    settings: GallerySettingsDefaults;
    readonly?: boolean;
    disableTransitionPreset?: boolean;
    idPrefix?: string;
    colorThemeLabel?: string;
    fieldErrors?: Record<string, string | undefined>;
    values?: Record<string, unknown>;
    motionOverrides?: {
      thumbnail_promote_duration_ms: number | string | null;
      thumbnail_promote_easing: string | null;
      thumbnail_demote_duration_ms: number | string | null;
      thumbnail_demote_easing: string | null;
    } | null;
    allowMotionOverrides?: boolean;
  };
  const {
    settings,
    readonly = false,
    disableTransitionPreset = false,
    idPrefix = 'settings-',
    colorThemeLabel = 'Color Theme',
    fieldErrors = {},
    values = {},
    motionOverrides = null,
    allowMotionOverrides = false,
  }: Props = $props();

  const p = (name: string) => `${idPrefix}${name}`;
  const stringValue = (key: string): string | undefined => {
    const value = values[key];
    return typeof value === 'string' ? value : undefined;
  };
  const motionDurationValue = (
    key: 'thumbnail_promote_duration_ms' | 'thumbnail_demote_duration_ms',
    fallback: number,
  ) => {
    const fromValues = stringValue(key);
    if (fromValues != null) return fromValues;
    if (!allowMotionOverrides) return String(fallback);
    const override = motionOverrides?.[key];
    return override == null ? '' : String(override);
  };
  const motionEasingValue = (
    key: 'thumbnail_promote_easing' | 'thumbnail_demote_easing',
    fallback: string,
  ) => {
    const fromValues = stringValue(key);
    if (fromValues != null) return fromValues;
    if (!allowMotionOverrides) return fallback;
    const override = motionOverrides?.[key];
    return typeof override === 'string' ? override : '';
  };
  let layoutModeOverride = $state<
    'uniform' | 'masonry' | 'coverage' | 'rows' | 'columns' | null
  >(null);
  let uniformThumbRatioOverride = $state<string | null>(null);
  let detailViewModeOverride = $state<'classic' | 'contact_sheet' | null>(null);
  let photographInfoModeOverride = $state<
    'hidden' | 'floating' | 'bottom_dock' | null
  >(null);
  const layoutMode = $derived(
    layoutModeOverride ?? settings.gallery_layout_mode ?? 'uniform',
  );
  const uniformThumbRatio = $derived(
    uniformThumbRatioOverride ?? String(settings.uniform_thumb_ratio),
  );
  const detailViewMode = $derived(
    detailViewModeOverride ?? settings.detail_view_mode ?? 'classic',
  );
  const photographInfoMode = $derived.by(() => {
    const nextMode =
      photographInfoModeOverride ?? settings.photograph_info_mode ?? 'floating';
    if (detailViewMode === 'contact_sheet' && nextMode === 'bottom_dock') {
      return 'floating';
    }
    return nextMode;
  });
  const onLayoutModeChange = (event: Event) => {
    const next = (event.currentTarget as HTMLSelectElement).value;
    layoutModeOverride =
      next === 'masonry' ||
      next === 'coverage' ||
      next === 'rows' ||
      next === 'columns'
        ? next
        : 'uniform';
  };
  const onUniformThumbRatioInput = (event: Event) => {
    uniformThumbRatioOverride = (event.currentTarget as HTMLInputElement).value;
  };
  const onDetailViewModeChange = (event: Event) => {
    const next = (event.currentTarget as HTMLSelectElement).value;
    detailViewModeOverride =
      next === 'contact_sheet' ? 'contact_sheet' : 'classic';
    if (
      detailViewModeOverride === 'contact_sheet' &&
      photographInfoMode === 'bottom_dock'
    ) {
      photographInfoModeOverride = 'floating';
    }
  };
  const onPhotographInfoModeChange = (event: Event) => {
    const next = (event.currentTarget as HTMLSelectElement).value;
    photographInfoModeOverride =
      next === 'hidden' || next === 'bottom_dock' ? next : 'floating';
  };
  const selectedNavButtonPreset = $derived(
    normalizeNavButtonPreset(settings.nav_button_preset),
  );
  const promoteDurationValue = $derived(
    motionDurationValue(
      'thumbnail_promote_duration_ms',
      settings.thumbnail_promote_duration_ms ?? 520,
    ),
  );
  const promoteEasingValue = $derived(
    motionEasingValue(
      'thumbnail_promote_easing',
      settings.thumbnail_promote_easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)',
    ),
  );
  const demoteDurationValue = $derived(
    motionDurationValue(
      'thumbnail_demote_duration_ms',
      settings.thumbnail_demote_duration_ms ?? 520,
    ),
  );
  const demoteEasingValue = $derived(
    motionEasingValue(
      'thumbnail_demote_easing',
      settings.thumbnail_demote_easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)',
    ),
  );
</script>

<div class="grid gap-6">
  <AdminCard variant="gradient" class="flex flex-col gap-5 p-3">
    <AdminHeading level={2}>Thumbnail Settings</AdminHeading>
    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label="Layout Mode"
        id={p('gallery_layout_mode')}
        class="w-fit"
      >
        <FormSelect
          name="gallery_layout_mode"
          id={p('gallery_layout_mode')}
          value={layoutMode}
          onchange={onLayoutModeChange}
          disabled={readonly}
          class="w-auto"
        >
          <option value="uniform">Uniform</option>
          <option value="masonry">Masonry</option>
          <option value="coverage">Coverage</option>
          <option value="rows">Rows</option>
          <option value="columns">Columns</option>
        </FormSelect>
      </FormField>
      {#if layoutMode === 'uniform'}
        <FormField
          label="Thumb Ratio"
          id={p('uniform_thumb_ratio')}
          class="w-28"
        >
          <FormInput
            id={p('uniform_thumb_ratio')}
            name="uniform_thumb_ratio"
            type="number"
            step="0.001"
            value={uniformThumbRatio}
            oninput={onUniformThumbRatioInput}
            {readonly}
          />
        </FormField>
      {:else}
        <input
          type="hidden"
          name="uniform_thumb_ratio"
          value={uniformThumbRatio}
        />
      {/if}
      {#if layoutMode === 'uniform' || layoutMode === 'masonry'}
        <FormField
          label="Max Width (px)"
          id={p('max_content_width_px')}
          class="w-28"
        >
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
      {:else}
        <input type="hidden" name="max_content_width_px" value="" />
      {/if}
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label="Desktop Columns"
        id={p('grid_desktop_default')}
        class="w-fit"
      >
        <div class="w-[6ch]">
          <FormInput
            id={p('grid_desktop_default')}
            name="grid_desktop_default"
            type="number"
            value={String(settings.grid_desktop_default)}
            {readonly}
          />
        </div>
      </FormField>
      <FormField
        label="Mobile Columns"
        id={p('grid_mobile_default')}
        class="w-fit"
      >
        <div class="w-[6ch]">
          <FormInput
            id={p('grid_mobile_default')}
            name="grid_mobile_default"
            type="number"
            value={String(settings.grid_mobile_default)}
            {readonly}
          />
        </div>
      </FormField>
      <FormField label="Gap (px)" id={p('gallery_gap_px')} class="w-fit">
        <div class="w-[6ch]">
          <FormInput
            id={p('gallery_gap_px')}
            name="gallery_gap_px"
            type="number"
            min="0"
            max="20"
            value={String(settings.gallery_gap_px ?? 8)}
            {readonly}
          />
        </div>
      </FormField>
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label={'Entrance Animation' +
          (disableTransitionPreset ? ' (Admin)' : '')}
        id={p('thumbnail_entrance_preset')}
        class="w-fit"
      >
        <div class="w-[12ch]">
          <FormSelect
            name="thumbnail_entrance_preset"
            id={p('thumbnail_entrance_preset')}
            value={settings.thumbnail_entrance_preset}
            disabled={readonly || disableTransitionPreset}
          >
            {#each THUMBNAIL_ENTRANCE_PRESET_OPTIONS as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </FormSelect>
        </div>
      </FormField>
      <FormField
        label={'Stagger (ms)' + (disableTransitionPreset ? ' (Admin)' : '')}
        id={p('thumbnail_entrance_stagger_ms')}
        class="w-fit"
      >
        <div class="w-[8ch]">
          <FormInput
            id={p('thumbnail_entrance_stagger_ms')}
            name="thumbnail_entrance_stagger_ms"
            type="number"
            min="10"
            max="200"
            step="5"
            value={String(settings.thumbnail_entrance_stagger_ms ?? 40)}
            disabled={readonly || disableTransitionPreset}
          />
        </div>
      </FormField>
      <FormField
        label={'Duration (ms)' + (disableTransitionPreset ? ' (Admin)' : '')}
        id={p('thumbnail_entrance_duration_ms')}
        class="w-fit"
      >
        <div class="w-[8ch]">
          <FormInput
            id={p('thumbnail_entrance_duration_ms')}
            name="thumbnail_entrance_duration_ms"
            type="number"
            min="100"
            max="1200"
            step="10"
            value={String(settings.thumbnail_entrance_duration_ms ?? 520)}
            disabled={readonly || disableTransitionPreset}
          />
        </div>
      </FormField>
    </div>

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
  </AdminCard>

  <AdminCard variant="gradient" class="flex flex-col gap-5 p-3">
    <AdminHeading level={2}>Gallery Settings</AdminHeading>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField label={colorThemeLabel} id={p('theme_default')} class="w-fit">
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
      <FormField label="Detail Viewer" id={p('detail_view_mode')} class="w-fit">
        <FormSelect
          name="detail_view_mode"
          id={p('detail_view_mode')}
          value={detailViewMode}
          onchange={onDetailViewModeChange}
          disabled={readonly}
          class="w-auto"
        >
          <option value="classic">Classic</option>
          <option value="contact_sheet">Contact Sheet</option>
        </FormSelect>
      </FormField>
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label={'Loading Animation' +
          (disableTransitionPreset ? ' (Admin)' : '')}
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
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label="Promote Duration (ms)"
        id={p('thumbnail_promote_duration_ms')}
        hint={allowMotionOverrides
          ? 'Leave blank to inherit defaults.'
          : 'Must be 1 - 5000 ms.'}
        error={fieldErrors.thumbnail_promote_duration_ms}
        class="w-fit"
      >
        <div class="w-[9ch]">
          <FormInput
            id={p('thumbnail_promote_duration_ms')}
            name="thumbnail_promote_duration_ms"
            type="number"
            min="1"
            max="5000"
            step="1"
            value={promoteDurationValue}
            {readonly}
          />
        </div>
      </FormField>
      <FormField
        label="Promote Easing"
        id={p('thumbnail_promote_easing')}
        hint={allowMotionOverrides
          ? 'Leave blank to inherit defaults. Example: cubic-bezier(0.16, 1, 0.3, 1)'
          : 'Example: cubic-bezier(0.16, 1, 0.3, 1)'}
        error={fieldErrors.thumbnail_promote_easing}
        class="min-w-[18rem] flex-1"
      >
        <FormInput
          id={p('thumbnail_promote_easing')}
          name="thumbnail_promote_easing"
          value={promoteEasingValue}
          {readonly}
        />
      </FormField>
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label="Demote Duration (ms)"
        id={p('thumbnail_demote_duration_ms')}
        hint={allowMotionOverrides
          ? 'Leave blank to inherit defaults.'
          : 'Must be 1 - 5000 ms.'}
        error={fieldErrors.thumbnail_demote_duration_ms}
        class="w-fit"
      >
        <div class="w-[9ch]">
          <FormInput
            id={p('thumbnail_demote_duration_ms')}
            name="thumbnail_demote_duration_ms"
            type="number"
            min="1"
            max="5000"
            step="1"
            value={demoteDurationValue}
            {readonly}
          />
        </div>
      </FormField>
      <FormField
        label="Demote Easing"
        id={p('thumbnail_demote_easing')}
        hint={allowMotionOverrides
          ? 'Leave blank to inherit defaults. Example: cubic-bezier(0.16, 1, 0.3, 1)'
          : 'Example: cubic-bezier(0.16, 1, 0.3, 1)'}
        error={fieldErrors.thumbnail_demote_easing}
        class="min-w-[18rem] flex-1"
      >
        <FormInput
          id={p('thumbnail_demote_easing')}
          name="thumbnail_demote_easing"
          value={demoteEasingValue}
          {readonly}
        />
      </FormField>
    </div>

    {#if detailViewMode === 'classic'}
      <AdminCard class="grid gap-3 p-3">
        <div class="grid gap-1">
          <p class="text-xs font-medium tracking-wide text-text uppercase">
            Classic Detail Letterbox Inset
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
          >
            <FormField
              label="Horizontal Inset (%)"
              id={p('classic_detail_h_inset_pct')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('classic_detail_h_inset_pct')}
                  name="classic_detail_h_inset_pct"
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={String(settings.classic_detail_h_inset_pct)}
                  {readonly}
                />
              </div>
            </FormField>
            <FormField
              label="Vertical Inset (%)"
              id={p('classic_detail_v_inset_pct')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('classic_detail_v_inset_pct')}
                  name="classic_detail_v_inset_pct"
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={String(settings.classic_detail_v_inset_pct)}
                  {readonly}
                />
              </div>
            </FormField>
          </div>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
          >
            <FormField
              label="Vertical Position (%)"
              id={p('classic_detail_v_position_pct')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('classic_detail_v_position_pct')}
                  name="classic_detail_v_position_pct"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={String(settings.classic_detail_v_position_pct)}
                  {readonly}
                />
              </div>
            </FormField>
            <FormField
              label="Border Width (px)"
              id={p('classic_detail_border_px')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('classic_detail_border_px')}
                  name="classic_detail_border_px"
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={String(settings.classic_detail_border_px)}
                  {readonly}
                />
              </div>
            </FormField>
          </div>
        </div>
      </AdminCard>
    {:else}
      <input
        type="hidden"
        name="classic_detail_h_inset_pct"
        value={String(settings.classic_detail_h_inset_pct)}
      />
      <input
        type="hidden"
        name="classic_detail_v_inset_pct"
        value={String(settings.classic_detail_v_inset_pct)}
      />
      <input
        type="hidden"
        name="classic_detail_v_position_pct"
        value={String(settings.classic_detail_v_position_pct)}
      />
      <input
        type="hidden"
        name="classic_detail_border_px"
        value={String(settings.classic_detail_border_px)}
      />
    {/if}

    {#if detailViewMode === 'contact_sheet'}
      <AdminCard class="grid gap-3 p-3">
        <div class="grid gap-1">
          <p class="text-xs font-medium tracking-wide text-text uppercase">
            Contact Sheet Viewer
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
          >
            <FormField
              label="Perspective (px)"
              id={p('contact_sheet_perspective_px')}
              class="w-fit"
            >
              <div class="w-[8ch]">
                <FormInput
                  id={p('contact_sheet_perspective_px')}
                  name="contact_sheet_perspective_px"
                  type="number"
                  min="200"
                  max="4000"
                  value={String(settings.contact_sheet_perspective_px)}
                  {readonly}
                />
              </div>
            </FormField>
            <FormField
              label="Rotate X (deg)"
              id={p('contact_sheet_rotate_x_deg')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('contact_sheet_rotate_x_deg')}
                  name="contact_sheet_rotate_x_deg"
                  type="number"
                  step="1"
                  min="0"
                  max="45"
                  value={String(settings.contact_sheet_rotate_x_deg)}
                  {readonly}
                />
              </div>
            </FormField>
            <FormField
              label="Rotate Y (deg)"
              id={p('contact_sheet_rotate_y_deg')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('contact_sheet_rotate_y_deg')}
                  name="contact_sheet_rotate_y_deg"
                  type="number"
                  step="1"
                  min="0"
                  max="45"
                  value={String(settings.contact_sheet_rotate_y_deg)}
                  {readonly}
                />
              </div>
            </FormField>
          </div>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
          >
            <FormField
              label="Travel Z (px)"
              id={p('contact_sheet_travel_z_px')}
              class="w-fit"
            >
              <div class="w-[9ch]">
                <FormInput
                  id={p('contact_sheet_travel_z_px')}
                  name="contact_sheet_travel_z_px"
                  type="number"
                  min="0"
                  max="1000"
                  value={String(settings.contact_sheet_travel_z_px)}
                  {readonly}
                />
              </div>
            </FormField>
            <FormField
              label="Target Fill"
              id={p('contact_sheet_target_fill_pct')}
              class="w-fit"
            >
              <div class="w-[7ch]">
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
              </div>
            </FormField>
            <FormField
              label="Mobile Intensity (%)"
              id={p('contact_sheet_mobile_intensity_pct')}
              class="w-fit"
            >
              <div class="w-[6ch]">
                <FormInput
                  id={p('contact_sheet_mobile_intensity_pct')}
                  name="contact_sheet_mobile_intensity_pct"
                  type="number"
                  min="0"
                  max="100"
                  value={String(settings.contact_sheet_mobile_intensity_pct)}
                  {readonly}
                />
              </div>
            </FormField>
          </div>
        </div>
      </AdminCard>
    {:else}
      <input
        type="hidden"
        name="contact_sheet_perspective_px"
        value={String(settings.contact_sheet_perspective_px)}
      />
      <input
        type="hidden"
        name="contact_sheet_rotate_x_deg"
        value={String(settings.contact_sheet_rotate_x_deg)}
      />
      <input
        type="hidden"
        name="contact_sheet_rotate_y_deg"
        value={String(settings.contact_sheet_rotate_y_deg)}
      />
      <input
        type="hidden"
        name="contact_sheet_travel_z_px"
        value={String(settings.contact_sheet_travel_z_px)}
      />
      <input
        type="hidden"
        name="contact_sheet_target_fill_pct"
        value={String(settings.contact_sheet_target_fill_pct)}
      />
      <input
        type="hidden"
        name="contact_sheet_mobile_intensity_pct"
        value={String(settings.contact_sheet_mobile_intensity_pct)}
      />
    {/if}
  </AdminCard>

  <AdminCard variant="gradient" class="flex flex-col gap-5 p-3">
    <AdminHeading level={2}>Info Settings</AdminHeading>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField label="Show Info" id={p('photograph_info_mode')} class="w-fit">
        <FormSelect
          name="photograph_info_mode"
          id={p('photograph_info_mode')}
          value={photographInfoMode}
          onchange={onPhotographInfoModeChange}
          disabled={readonly}
          class="w-auto"
        >
          <option value="hidden">Hidden</option>
          <option value="floating">Floating</option>
          {#if detailViewMode !== 'contact_sheet'}
            <option value="bottom_dock">Bottom Dock</option>
          {/if}
        </FormSelect>
      </FormField>

      {#if photographInfoMode === 'floating'}
        <FormField
          label="Floating Panel Position"
          id={p('floating_panel_position')}
          class="w-fit"
        >
          <FormSelect
            name="floating_panel_position"
            id={p('floating_panel_position')}
            value={settings.floating_panel_position}
            disabled={readonly}
            class="w-auto"
          >
            <option value="bottom_left">Bottom Left</option>
            <option value="top_right">Top Right</option>
            <option value="bottom_right">Bottom Right</option>
          </FormSelect>
        </FormField>
      {/if}
    </div>

    <FormField label="Visible Elements" id={p('show_photo_info_title')}>
      <AdminCard class="grid w-60 gap-2 p-3">
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
          Show date
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
        <label class="flex items-center gap-2 text-sm">
          <input
            id={p('show_photo_info_position')}
            type="checkbox"
            name="show_photo_info_position"
            checked={settings.show_photo_info_position}
            disabled={readonly}
          />
          Show position (1/N)
        </label>
      </AdminCard>
    </FormField>
  </AdminCard>

  <AdminCard variant="gradient" class="flex flex-col gap-5 p-3">
    <AdminHeading level={2}>Nav Settings</AdminHeading>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5"
    >
      <FormField
        label={'Nav Button Style' + (disableTransitionPreset ? ' (Admin)' : '')}
        id={p('nav_button_preset')}
        hint={disableTransitionPreset
          ? 'Admin-only setting. Editors can view but cannot modify this preset.'
          : undefined}
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

    <FormField
      label="Loop Gallery Navigation"
      id={p('loop_gallery_navigation')}
      labelSrOnly
    >
      <label class="flex items-center gap-2 text-sm">
        <input
          id={p('loop_gallery_navigation')}
          type="checkbox"
          name="loop_gallery_navigation"
          checked={settings.loop_gallery_navigation}
          disabled={readonly}
        />
        Loop gallery navigation
      </label>
    </FormField>
  </AdminCard>
</div>
