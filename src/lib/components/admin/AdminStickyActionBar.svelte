<script lang="ts">
  import type { Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();
</script>

<div
  class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 backdrop-blur md:left-[220px] md:px-6"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  <div class="w-full md:max-w-[var(--admin-content-max)]">
    <div class="flex flex-wrap items-center justify-center gap-3 p-3">
      {@render children()}
    </div>
  </div>
</div>
