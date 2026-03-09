<script lang="ts">
  import { onMount } from 'svelte';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import type { HomepageImage } from '$lib/types/content';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  const { images, selectedId, onselect, onclose } = $props<{
    images: HomepageImage[];
    selectedId: string | null;
    onselect: (id: string) => void;
    onclose: () => void;
  }>();

  const DIALOG_ID = 'background-image-picker-dialog';

  const getDialogEl = () => {
    const node = document.getElementById(DIALOG_ID);
    return node instanceof HTMLDialogElement ? node : null;
  };

  onMount(() => {
    getDialogEl()?.showModal();
  });

  const closeDialog = () => {
    const dialogEl = getDialogEl();
    if (dialogEl?.open) {
      dialogEl.close();
      return;
    }
    onclose();
  };

  const selectImage = (id: string) => {
    onselect(id);
    closeDialog();
  };

  const onDialogClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };
</script>

<dialog
  id={DIALOG_ID}
  class="m-auto h-[85vh] w-[min(92vw,72rem)] overflow-hidden rounded-xl border border-border-strong bg-surface p-0 text-text shadow-2xl backdrop:bg-black/60"
  onclick={onDialogClick}
  {onclose}
>
  <div class="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <AdminHeading level={2}>Choose Background</AdminHeading>
      <AdminButton size="sm" type="button" onclick={closeDialog}
        >Close</AdminButton
      >
    </div>

    {#if images.length === 0}
      <p class="text-sm text-text-muted">
        No eligible lead images are available.
      </p>
    {:else}
      <ul
        class="flex min-h-0 flex-wrap content-start gap-2 overflow-y-auto pr-1 pb-2"
      >
        {#each images as image (image.id)}
          <li class="w-40">
            <AdminCard
              variant="gradient"
              class="group grid cursor-pointer gap-2 p-2"
              role="button"
              tabindex="0"
              onclick={() => selectImage(image.id)}
              onkeydown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectImage(image.id);
                }
              }}
            >
              {#if image.delivery_storage_path}
                <img
                  src={photoPublicUrl(image.delivery_storage_path, 160)}
                  alt={image.photo_title}
                  class="aspect-square w-full rounded object-cover"
                />
              {:else}
                <div
                  class="grid aspect-square w-full animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                >
                  pending
                </div>
              {/if}

              <p class="truncate text-xs">{image.photo_title}</p>

              <AdminButton
                size="sm"
                type="button"
                class="w-full group-hover:bg-border"
                variant={selectedId === image.id ? 'submit' : 'default'}
              >
                {selectedId === image.id ? 'Selected' : 'Choose'}
              </AdminButton>
            </AdminCard>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</dialog>
