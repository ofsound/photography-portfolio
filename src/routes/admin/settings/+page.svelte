<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';

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
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Site Settings</h1>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<form method="POST" action="?/save" class="mt-6 grid max-w-[900px] gap-4 rounded border border-border p-4">
  <div class="grid gap-3 sm:grid-cols-2">
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Theme Default
      <select name="theme_default" class="rounded border border-border-strong px-3 py-2">
        <option selected={settings.theme_default === 'light'} value="light">light</option>
        <option selected={settings.theme_default === 'dark'} value="dark">dark</option>
        <option selected={settings.theme_default === 'system'} value="system">system</option>
      </select>
    </label>

    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Layout Mode
      <select name="gallery_layout_mode" class="rounded border border-border-strong px-3 py-2">
        <option selected={settings.gallery_layout_mode === 'uniform'} value="uniform">uniform</option>
        <option selected={settings.gallery_layout_mode === 'masonry'} value="masonry">masonry</option>
      </select>
    </label>
  </div>

  <div class="grid gap-3 sm:grid-cols-4">
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Desktop Default
      <input type="number" name="grid_desktop_default" value={settings.grid_desktop_default} class="rounded border border-border-strong px-3 py-2" />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Desktop Max
      <input type="number" name="grid_desktop_max" value={settings.grid_desktop_max} class="rounded border border-border-strong px-3 py-2" />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Mobile Default
      <input type="number" name="grid_mobile_default" value={settings.grid_mobile_default} class="rounded border border-border-strong px-3 py-2" />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Mobile Max
      <input type="number" name="grid_mobile_max" value={settings.grid_mobile_max} class="rounded border border-border-strong px-3 py-2" />
    </label>
  </div>

  <div class="grid gap-3 sm:grid-cols-3">
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Max Width (px)
      <input type="number" name="max_content_width_px" value={settings.max_content_width_px ?? ''} class="rounded border border-border-strong px-3 py-2" />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Uniform Thumb Ratio
      <input type="number" step="0.001" name="uniform_thumb_ratio" value={settings.uniform_thumb_ratio} class="rounded border border-border-strong px-3 py-2" />
    </label>
    <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
      Transition Preset {#if data.role !== 'admin'}(Admin){/if}
      <select name="transition_preset" class="rounded border border-border-strong px-3 py-2" disabled={data.role !== 'admin'}>
        <option selected={settings.transition_preset === 'cinematic'} value="cinematic">cinematic</option>
        <option selected={settings.transition_preset === 'snappy'} value="snappy">snappy</option>
        <option selected={settings.transition_preset === 'experimental'} value="experimental">experimental</option>
      </select>
    </label>
  </div>

  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="allow_transition_toggle" checked={settings.allow_transition_toggle} /> Allow Transition Toggle
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Tailwind Palette JSON {#if data.role !== 'admin'}(Admin){/if}
    <textarea
      name="tailwind_palette"
      rows="8"
      class="rounded border border-border-strong px-3 py-2 font-mono text-xs"
      disabled={data.role !== 'admin'}
    >{palettePretty}</textarea>
  </label>

  <AdminButton wFit type="submit">Save Settings</AdminButton>
</form>
