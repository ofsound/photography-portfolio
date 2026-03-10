<script lang="ts">
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import GallerySettingsFormFields from '$lib/components/admin/GallerySettingsFormFields.svelte';

  import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';

  const { data, form } = $props();

  const settings = $derived(data.settings ?? GALLERY_SETTINGS_DEFAULTS);
  const isAdmin = $derived(data.role === 'admin');
</script>

<AdminHeader>
  <AdminHeading>Default Gallery Settings</AdminHeading>

  {#if form?.message}
    <AdminToastEmitter
      message={form.message}
      type={form && 'success' in form && form.success ? 'success' : 'error'}
    />
  {/if}
</AdminHeader>

<form method="POST" action="?/save" class="grid gap-4">
  <GallerySettingsFormFields
    {settings}
    disableTransitionPreset={!isAdmin}
    idPrefix="settings-"
  />

  <AdminButton type="submit" variant="submit">Save Settings</AdminButton>
</form>
