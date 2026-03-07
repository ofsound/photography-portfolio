<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  const { data, form } = $props();

  const settings = $derived(
    data.settings ?? {
      theme_default: 'system',
      grid_desktop_default: 6,
      grid_mobile_default: 3,
      max_content_width_px: null,
      gallery_layout_mode: 'uniform',
      gallery_gap_px: 8,
      uniform_thumb_ratio: 1,
      transition_preset: 'cinematic',
      allow_transition_toggle: true,
      show_search_bar: true,
      show_photograph_info: true,
      show_thumbnail_zoom_hover: true,
    },
  );

  const selectClass =
    'w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm';
</script>

<AdminHeading>Default Gallery Settings</AdminHeading>

{#if form?.message}
  <AdminStatusMessage
    type={form && 'success' in form && form.success ? 'success' : 'error'}
    class="mt-3"
  >
    {form.message}
  </AdminStatusMessage>
{/if}

<form method="POST" action="?/save" class="mt-6 grid max-w-4xl gap-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Site Theme" id="settings-theme_default">
      <select
        name="theme_default"
        id="settings-theme_default"
        class={selectClass}
      >
        <option selected={settings.theme_default === 'system'} value="system">
          System
        </option>
        <option selected={settings.theme_default === 'light'} value="light">
          Light
        </option>
        <option selected={settings.theme_default === 'dark'} value="dark"
          >Dark</option
        >
      </select>
    </FormField>
    <FormField label="Layout Mode" id="settings-gallery_layout_mode">
      <select
        name="gallery_layout_mode"
        id="settings-gallery_layout_mode"
        class={selectClass}
      >
        <option
          selected={settings.gallery_layout_mode === 'uniform'}
          value="uniform">uniform</option
        >
        <option
          selected={settings.gallery_layout_mode === 'masonry'}
          value="masonry">masonry</option
        >
        <option
          selected={settings.gallery_layout_mode === 'coverage'}
          value="coverage">coverage</option
        >
        <option selected={settings.gallery_layout_mode === 'rows'} value="rows"
          >rows</option
        >
        <option
          selected={settings.gallery_layout_mode === 'columns'}
          value="columns">columns</option
        >
      </select>
    </FormField>
    <FormField label="Gallery gap (px)" id="settings-gallery_gap_px">
      <FormInput
        id="settings-gallery_gap_px"
        name="gallery_gap_px"
        type="number"
        min="0"
        max="20"
        value={String(settings.gallery_gap_px ?? 8)}
      />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Desktop Default" id="settings-grid_desktop_default">
      <FormInput
        id="settings-grid_desktop_default"
        name="grid_desktop_default"
        type="number"
        value={String(settings.grid_desktop_default)}
      />
    </FormField>
    <FormField label="Mobile Default" id="settings-grid_mobile_default">
      <FormInput
        id="settings-grid_mobile_default"
        name="grid_mobile_default"
        type="number"
        value={String(settings.grid_mobile_default)}
      />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-3">
    <FormField label="Max Width (px)" id="settings-max_content_width_px">
      <FormInput
        id="settings-max_content_width_px"
        name="max_content_width_px"
        type="number"
        value={settings.max_content_width_px != null
          ? String(settings.max_content_width_px)
          : ''}
      />
    </FormField>
    <FormField label="Uniform Thumb Ratio" id="settings-uniform_thumb_ratio">
      <FormInput
        id="settings-uniform_thumb_ratio"
        name="uniform_thumb_ratio"
        type="number"
        step="0.001"
        value={String(settings.uniform_thumb_ratio)}
      />
    </FormField>
    <FormField
      label={'Transition Preset' + (data.role !== 'admin' ? ' (Admin)' : '')}
      id="settings-transition_preset"
    >
      <select
        name="transition_preset"
        id="settings-transition_preset"
        class={selectClass}
        disabled={data.role !== 'admin'}
      >
        <option
          selected={settings.transition_preset === 'cinematic'}
          value="cinematic">cinematic</option
        >
        <option
          selected={settings.transition_preset === 'snappy'}
          value="snappy">snappy</option
        >
        <option
          selected={settings.transition_preset === 'experimental'}
          value="experimental">experimental</option
        >
      </select>
    </FormField>
  </div>

  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      name="allow_transition_toggle"
      checked={settings.allow_transition_toggle}
    /> Allow Transition Toggle
  </label>

  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      name="show_search_bar"
      checked={settings.show_search_bar}
    /> Show Search Bar
  </label>

  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      name="show_photograph_info"
      checked={settings.show_photograph_info}
    /> Show Photograph Info
  </label>

  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      name="show_thumbnail_zoom_hover"
      checked={settings.show_thumbnail_zoom_hover}
    /> Show Thumbnail Zoom Hover
  </label>

  <AdminButton wFit type="submit">Save Settings</AdminButton>
</form>
