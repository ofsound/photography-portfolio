<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminDrawerCard from '$lib/components/admin/AdminDrawerCard.svelte';

  import type { ContentRevision } from '$lib/types/content';

  type Props = {
    id: string;
    revisions: ContentRevision[];
    rollbackFormAction: string;
    rollbackFormMethod?: string;
    storageKey?: string;
    limit?: number;
  };

  const {
    id,
    revisions,
    rollbackFormAction,
    rollbackFormMethod = 'POST',
    storageKey,
    limit = 10,
  }: Props = $props();

  const displayRevisions = $derived(revisions.slice(0, limit));
  const hasRevisions = $derived(revisions.length > 0);
</script>

{#if hasRevisions}
  <AdminDrawerCard {id} title="Recent Revisions" {storageKey}>
    <div class="grid gap-2">
      {#each displayRevisions as rev (rev.id)}
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            >v{rev.version_no} - {new Date(
              rev.changed_at,
            ).toLocaleString()}</span
          >
          <AdminButton
            variant="submit"
            type="submit"
            name="revision_id"
            value={rev.id}
            formaction={rollbackFormAction}
            formmethod={rollbackFormMethod}
            size="sm"
          >
            Rollback
          </AdminButton>
        </div>
      {/each}
    </div>
  </AdminDrawerCard>
{/if}
