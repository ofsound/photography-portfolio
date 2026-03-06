<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormTextarea from '$lib/components/FormTextarea.svelte';

  const { data, form } = $props();

  const slugify = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  let createName = $state('');
  let createSlug = $state('');
  let hasManualSlugEdit = $state(false);

  const onCreateNameInput = () => {
    if (!hasManualSlugEdit) {
      createSlug = slugify(createName);
    }
  };

  const onCreateSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value.trim();
    hasManualSlugEdit = value.length > 0;
    if (!hasManualSlugEdit) {
      createSlug = slugify(createName);
    }
  };
</script>

<AdminCreateListLayout
  title="Galleries"
  formMessage={form?.message}
  listHeading="Existing Galleries"
  create={createForm}
  list={galleryList}
/>

{#snippet createForm()}
  <form method="POST" action="?/create" class="grid h-fit gap-3">
    <FormField label="Name" id="gallery-create-name">
      <FormInput
        id="gallery-create-name"
        name="name"
        bind:value={createName}
        required
        oninput={onCreateNameInput}
      />
    </FormField>
    <FormField label="Slug" id="gallery-create-slug">
      <FormInput
        id="gallery-create-slug"
        name="slug"
        bind:value={createSlug}
        oninput={onCreateSlugInput}
      />
    </FormField>
    <FormField label="Description" id="gallery-create-description">
      <FormTextarea
        id="gallery-create-description"
        name="description"
        rows={3}
      />
    </FormField>
    <FormField label="SEO Title" id="gallery-create-seo-title">
      <FormInput id="gallery-create-seo-title" name="seo_title" />
    </FormField>
    <FormField label="SEO Description" id="gallery-create-seo-description">
      <FormTextarea
        id="gallery-create-seo-description"
        name="seo_description"
        rows={2}
      />
    </FormField>
    <FormField label="Nav Order" id="gallery-create-nav-order">
      <FormInput
        id="gallery-create-nav-order"
        name="nav_order"
        type="number"
        value="0"
      />
    </FormField>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="is_active" checked />
      Active
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="show_in_nav" checked />
      Show In Nav
    </label>
    <AdminButton type="submit" wFit>Create Gallery</AdminButton>
  </form>
{/snippet}

{#snippet galleryList()}
  <article class="rounded border border-border p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-sm tracking-widest uppercase">ALL</h2>
        <p class="text-xs text-text-muted">/all</p>
      </div>
      <div class="flex items-center gap-2">
        <AdminButton href="/admin/all/photos" size="sm">Photos</AdminButton>
        <AdminButton href="/admin/all/settings" size="sm">Settings</AdminButton>
      </div>
    </div>

    <form method="POST" action="?/updateAll" class="grid gap-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField label="Nav Order" id="all-gallery-nav-order">
          <FormInput
            id="all-gallery-nav-order"
            name="nav_order"
            type="number"
            value={String(data.allScopeNav?.nav_order ?? 0)}
          />
        </FormField>
        <label class="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_in_nav"
            checked={data.allScopeNav?.show_in_nav ?? true}
          />
          Show In Nav
        </label>
      </div>
      <div class="flex flex-wrap gap-2">
        <AdminButton type="submit" wFit>Save</AdminButton>
      </div>
    </form>
  </article>

  {#each data.galleries as gallery (gallery.id)}
    <article class="rounded border border-border p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm tracking-widest uppercase">{gallery.name}</h2>
          <p class="text-xs text-text-muted">
            /{gallery.slug} • {gallery.photo_count} photo(s)
          </p>
        </div>
        <div class="flex items-center gap-2">
          <AdminButton href={`/admin/${gallery.slug}/photos`} size="sm"
            >Photos</AdminButton
          >
          <AdminButton href={`/admin/${gallery.slug}/settings`} size="sm"
            >Settings</AdminButton
          >
        </div>
      </div>

      <form method="POST" action="?/update" class="grid gap-3">
        <input type="hidden" name="gallery_id" value={gallery.id} />
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" id={`gallery-name-${gallery.id}`}>
            <FormInput
              id={`gallery-name-${gallery.id}`}
              name="name"
              value={gallery.name}
              required
            />
          </FormField>
          <FormField label="Slug" id={`gallery-slug-${gallery.id}`}>
            <FormInput
              id={`gallery-slug-${gallery.id}`}
              name="slug"
              value={gallery.slug}
              required
            />
          </FormField>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Description" id={`gallery-desc-${gallery.id}`}>
            <FormTextarea
              id={`gallery-desc-${gallery.id}`}
              name="description"
              rows={3}
              value={gallery.description ?? ''}
            />
          </FormField>
          <div class="grid gap-3">
            <FormField label="SEO Title" id={`gallery-seo-title-${gallery.id}`}>
              <FormInput
                id={`gallery-seo-title-${gallery.id}`}
                name="seo_title"
                value={gallery.seo_title ?? ''}
              />
            </FormField>
            <FormField
              label="SEO Description"
              id={`gallery-seo-description-${gallery.id}`}
            >
              <FormTextarea
                id={`gallery-seo-description-${gallery.id}`}
                name="seo_description"
                rows={2}
                value={gallery.seo_description ?? ''}
              />
            </FormField>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <FormField label="Nav Order" id={`gallery-nav-order-${gallery.id}`}>
            <FormInput
              id={`gallery-nav-order-${gallery.id}`}
              name="nav_order"
              type="number"
              value={String(gallery.nav_order)}
            />
          </FormField>
          <label class="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              checked={gallery.is_active}
            />
            Active
          </label>
          <label class="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="show_in_nav"
              checked={gallery.show_in_nav}
            />
            Show In Nav
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <AdminButton type="submit" wFit>Save</AdminButton>
        </div>
      </form>

      <form method="POST" action="?/delete" class="mt-3">
        <input type="hidden" name="gallery_id" value={gallery.id} />
        <AdminButton type="submit" variant="danger" wFit>Delete</AdminButton>
      </form>
    </article>
  {/each}
{/snippet}
