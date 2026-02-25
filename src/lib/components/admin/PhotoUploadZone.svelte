<script lang="ts">
  let { photoId } = $props<{ photoId: string }>();
</script>

<form method="POST" action="?/uploadImage" enctype="multipart/form-data" class="grid gap-2 rounded border border-border p-3">
  <input type="hidden" name="photo_id" value={photoId} />
  <p class="text-xs uppercase tracking-[0.12em]">Upload Image (source/; conversion async)</p>
  <div class="grid gap-2 sm:grid-cols-4">
    <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sm:col-span-2" required />
    <select name="kind" class="rounded border border-border-strong px-3 py-2 text-sm">
      <option value="additional">Additional image (default)</option>
      <option value="lead">Lead image</option>
    </select>
    <input name="alt_text" placeholder="Alt text" class="rounded border border-border-strong px-3 py-2" />
  </div>
  <p class="text-xs text-text-muted">Choose <strong>Additional image</strong> for gallery uploads. Use <strong>Lead image</strong> only for the cover image.</p>
  <div class="grid gap-2 sm:grid-cols-3">
    <input name="focal_x" type="number" min="0" max="1" step="0.001" value="0.5" class="rounded border border-border-strong px-3 py-2" />
    <input name="focal_y" type="number" min="0" max="1" step="0.001" value="0.5" class="rounded border border-border-strong px-3 py-2" />
    <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Upload</button>
  </div>
</form>
