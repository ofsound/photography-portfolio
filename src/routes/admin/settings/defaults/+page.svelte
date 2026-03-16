<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import GallerySettingsFormFields from '$lib/components/admin/GallerySettingsFormFields.svelte';

  import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';

  const { data, form } = $props();

  const settings = $derived(data.settings ?? GALLERY_SETTINGS_DEFAULTS);
  const isAdmin = $derived(data.role === 'admin');
</script>

<AdminPageHeader
  title="Default Gallery Settings"
  formMessage={form?.message}
  formSuccess={form?.success === true}
/>

<form method="POST" action="?/save" class="grid gap-4">
  <GallerySettingsFormFields
    {settings}
    disableTransitionPreset={!isAdmin}
    idPrefix="settings-"
  />

  <AdminButton type="submit" variant="submit">Save Settings</AdminButton>
</form>
