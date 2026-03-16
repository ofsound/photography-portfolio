<script lang="ts">
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';

  const { data } = $props();
</script>

<AdminPageHeader
  title="Audit Log"
  subtitle={`Most recent ${data.logs.length} entries.`}
/>

<AdminCard class="overflow-x-auto !bg-transparent">
  <table class="min-w-full border-collapse text-left text-xs">
    <thead
      class="border-b border-border bg-canvas/[0.03] tracking-widest uppercase"
    >
      <tr>
        <th class="px-3 py-2">When</th>
        <th class="px-3 py-2">Action</th>
        <th class="px-3 py-2">Entity</th>
        <th class="px-3 py-2">Key</th>
        <th class="px-3 py-2">Actor</th>
      </tr>
    </thead>
    <tbody>
      {#each data.logs as log (log.id)}
        <tr class="border-b border-border align-top">
          <td class="px-3 py-2 whitespace-nowrap"
            >{new Date(log.created_at).toLocaleString()}</td
          >
          <td class="px-3 py-2 uppercase">{log.action}</td>
          <td class="px-3 py-2">{log.entity_type}</td>
          <td class="px-3 py-2"><code>{log.entity_pk}</code></td>
          <td class="px-3 py-2"><code>{log.actor_user_id ?? 'system'}</code></td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</AdminCard>
