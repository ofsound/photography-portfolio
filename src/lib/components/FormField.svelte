<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    label: string;
    id: string;
    helper?: string;
    children: Snippet;
  };

  let { label, id, helper, children }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <label for={id} class="text-sm font-medium text-text">
    {label}
  </label>
  {@render children()}
  {#if helper}
    <p class="text-xs text-text-muted">{helper}</p>
  {/if}
</div>
