<script lang="ts">
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';

  import type { GallerySettingsDefaults } from '$lib/constants/gallery-settings';

  type Props = {
    settings: GallerySettingsDefaults;
    readonly?: boolean;
    disableTransitionPreset?: boolean;
    idPrefix?: string;
  };

  const {
    settings,
    readonly = false,
    disableTransitionPreset = false,
    idPrefix = 'settings-',
  }: Props = $props();

  const p = (name: string) => `${idPrefix}${name}`;
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
</div>

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

  <FormField label="Show Search Bar" id={p('show_search_bar')} labelSrOnly>
    <label class="flex items-center gap-2 text-sm">
      <input
        id={p('show_search_bar')}
        type="checkbox"
        name="show_search_bar"
        checked={settings.show_search_bar}
        disabled={readonly}
      />
      Display search control
    </label>
  </FormField>

  <FormField
    label="Show Photograph Info"
    id={p('show_photograph_info')}
    labelSrOnly
  >
    <label class="flex items-center gap-2 text-sm">
      <input
        id={p('show_photograph_info')}
        type="checkbox"
        name="show_photograph_info"
        checked={settings.show_photograph_info}
        disabled={readonly}
      />
      Show metadata in viewer
    </label>
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
