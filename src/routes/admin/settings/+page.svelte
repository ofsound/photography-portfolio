<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  let { data, form } = $props();

  const settings = $derived(
    data.settings ?? {
    theme_default: 'system',
    tailwind_palette: {},
    grid_desktop_default: 6,
    grid_mobile_default: 3,
    grid_desktop_max: 20,
    grid_mobile_max: 6,
    max_content_width_px: null,
    gallery_layout_mode: 'uniform',
    uniform_thumb_ratio: 1,
    transition_preset: 'cinematic',
    allow_transition_toggle: true
    }
  );

  const palettePretty = $derived(JSON.stringify(settings.tailwind_palette ?? {}, null, 2));

  const selectClass = 'w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm';
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Site Settings</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<form method="POST" action="?/save" class="mt-6 grid max-w-[900px] gap-4 rounded border border-border p-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <FormField label="Theme Default" id="settings-theme_default">
      <select name="theme_default" id="settings-theme_default" class={selectClass}>
        <option selected={settings.theme_default === 'light'} value="light">light</option>
        <option selected={settings.theme_default === 'dark'} value="dark">dark</option>
        <option selected={settings.theme_default === 'system'} value="system">system</option>
      </select>
    </FormField>
    <FormField label="Layout Mode" id="settings-gallery_layout_mode">
      <select name="gallery_layout_mode" id="settings-gallery_layout_mode" class={selectClass}>
        <option selected={settings.gallery_layout_mode === 'uniform'} value="uniform">uniform</option>
        <option selected={settings.gallery_layout_mode === 'masonry'} value="masonry">masonry</option>
      </select>
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-4">
    <FormField label="Desktop Default" id="settings-grid_desktop_default">
      <FormInput id="settings-grid_desktop_default" name="grid_desktop_default" type="number" value={String(settings.grid_desktop_default)} />
    </FormField>
    <FormField label="Desktop Max" id="settings-grid_desktop_max">
      <FormInput id="settings-grid_desktop_max" name="grid_desktop_max" type="number" value={String(settings.grid_desktop_max)} />
    </FormField>
    <FormField label="Mobile Default" id="settings-grid_mobile_default">
      <FormInput id="settings-grid_mobile_default" name="grid_mobile_default" type="number" value={String(settings.grid_mobile_default)} />
    </FormField>
    <FormField label="Mobile Max" id="settings-grid_mobile_max">
      <FormInput id="settings-grid_mobile_max" name="grid_mobile_max" type="number" value={String(settings.grid_mobile_max)} />
    </FormField>
  </div>

  <div class="grid gap-3 sm:grid-cols-3">
    <FormField label="Max Width (px)" id="settings-max_content_width_px">
      <FormInput id="settings-max_content_width_px" name="max_content_width_px" type="number" value={settings.max_content_width_px != null ? String(settings.max_content_width_px) : ''} />
    </FormField>
    <FormField label="Uniform Thumb Ratio" id="settings-uniform_thumb_ratio">
      <FormInput id="settings-uniform_thumb_ratio" name="uniform_thumb_ratio" type="number" step="0.001" value={String(settings.uniform_thumb_ratio)} />
    </FormField>
    <FormField label={'Transition Preset' + (data.role !== 'admin' ? ' (Admin)' : '')} id="settings-transition_preset">
      <select name="transition_preset" id="settings-transition_preset" class={selectClass} disabled={data.role !== 'admin'}>
        <option selected={settings.transition_preset === 'cinematic'} value="cinematic">cinematic</option>
        <option selected={settings.transition_preset === 'snappy'} value="snappy">snappy</option>
        <option selected={settings.transition_preset === 'experimental'} value="experimental">experimental</option>
      </select>
    </FormField>
  </div>

  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="allow_transition_toggle" checked={settings.allow_transition_toggle} /> Allow Transition Toggle
  </label>

  <FormField label={'Tailwind Palette JSON' + (data.role !== 'admin' ? ' (Admin)' : '')} id="settings-tailwind_palette">
    <FormTextarea
      id="settings-tailwind_palette"
      name="tailwind_palette"
      rows={8}
      value={palettePretty}
      class="font-mono text-xs"
      disabled={data.role !== 'admin'}
    />
  </FormField>

  <AdminButton wFit type="submit">Save Settings</AdminButton>
</form>
