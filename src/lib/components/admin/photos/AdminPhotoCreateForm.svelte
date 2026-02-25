<form method="POST" action="?/create" class="grid gap-3 rounded border border-black/10 p-4">
  <h2 class="text-sm uppercase tracking-[0.14em]">Create Photo</h2>
  <input name="title" placeholder="Title" class="rounded border border-black/20 px-3 py-2" required />
  <input name="slug" placeholder="Slug (optional)" class="rounded border border-black/20 px-3 py-2" />
  <input name="capture_date" type="date" class="rounded border border-black/20 px-3 py-2" />
  <textarea name="description" rows="4" placeholder="Description" class="rounded border border-black/20 px-3 py-2"></textarea>
  <div class="grid gap-2 sm:grid-cols-2">
    <input name="width_px" type="number" placeholder="Width px" class="rounded border border-black/20 px-3 py-2" />
    <input name="height_px" type="number" placeholder="Height px" class="rounded border border-black/20 px-3 py-2" />
  </div>
  <textarea name="license_text" rows="2" placeholder="License text" class="rounded border border-black/20 px-3 py-2"></textarea>
  <input name="og_title" placeholder="OG title" class="rounded border border-black/20 px-3 py-2" />
  <textarea name="og_description" rows="2" placeholder="OG description" class="rounded border border-black/20 px-3 py-2"></textarea>
  <input name="og_image_path" placeholder="OG image path" class="rounded border border-black/20 px-3 py-2" />
  <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_searchable" checked /> Searchable</label>
  <button class="w-fit rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Create Photo</button>
</form>

