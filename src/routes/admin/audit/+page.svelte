<script lang="ts">
  let { data } = $props();
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Audit Log</h1>
<p class="mt-2 text-sm text-ink/70">Most recent {data.logs.length} entries.</p>

<div class="mt-6 overflow-x-auto rounded border border-black/10">
  <table class="min-w-full border-collapse text-left text-xs">
    <thead class="border-b border-black/10 bg-black/[0.03] uppercase tracking-[0.12em]">
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
        <tr class="border-b border-black/10 align-top">
          <td class="px-3 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
          <td class="px-3 py-2 uppercase">{log.action}</td>
          <td class="px-3 py-2">{log.entity_type}</td>
          <td class="px-3 py-2"><code>{log.entity_pk}</code></td>
          <td class="px-3 py-2"><code>{log.actor_user_id ?? 'system'}</code></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
