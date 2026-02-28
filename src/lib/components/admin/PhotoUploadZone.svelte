<script lang="ts">
  import {enhance} from "$app/forms";
  import {invalidateAll} from "$app/navigation";
  import AdminButton from "$lib/components/admin/AdminButton.svelte";

  let {photoId, existingImageCount = 0} = $props<{photoId: string; existingImageCount?: number}>();

  const defaultKind = $derived(existingImageCount === 0 ? "lead" : "additional");
  let fileName = $state<string | null>(null);
  let uploading = $state(false);

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    fileName = input.files?.[0]?.name ?? null;
  }
</script>

<form
  method="POST"
  action="?/uploadImage"
  enctype="multipart/form-data"
  class="grid gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface p-4"
  use:enhance={() => {
    uploading = true;
    return async ({update}) => {
      await update({reset: false});
      await invalidateAll();
      uploading = false;
      fileName = null;
    };
  }}
>
  <input type="hidden" name="photo_id" value={photoId} />
  <p class="text-xs uppercase tracking-[var(--tracking-tight)]">Upload Image</p>
  <div class="grid gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <AdminButton as="label" class="relative">
        <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required class="absolute inset-0 cursor-pointer opacity-0" onchange={handleFileChange} />
        Choose file
      </AdminButton>
      <span class="min-w-0 truncate text-sm text-text-muted">
        {fileName ?? "No file chosen"}
      </span>
    </div>
    <div class="grid gap-2 sm:grid-cols-2 sm:items-center">
      <select name="kind" class="rounded border border-border-strong px-3 py-2 text-sm">
        <option value="lead" selected={defaultKind === "lead"}>Lead image</option>
        <option value="additional" selected={defaultKind === "additional"}>Additional image</option>
      </select>
      <input name="alt_text" placeholder="Alt text" class="rounded border border-border-strong px-3 py-2" />
    </div>
  </div>
  <p class="text-xs text-text-muted">
    {#if defaultKind === "lead"}
      First image defaults to <strong>Lead</strong>
      (cover). Subsequent uploads default to Additional.
    {:else}
      Choose <strong>Additional image</strong>
      for gallery uploads. Use
      <strong>Lead image</strong>
      only for the cover.
    {/if}
  </p>
  <div class="flex justify-center">
    <AdminButton type="submit" variant="success" wFit disabled={uploading}>
      {uploading ? "Uploading…" : "Upload"}
    </AdminButton>
  </div>
</form>
