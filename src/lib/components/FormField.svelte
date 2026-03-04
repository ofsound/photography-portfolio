<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    label: string;
    id?: string;
    helper?: string;
    class?: string;
    children: Snippet;
  };

  const { label, id, helper, class: className, children }: Props = $props();
</script>

<div class="flex flex-col gap-1 {className ?? ''}">
  {#if id}
    <label for={id} class="text-sm font-medium text-text tracking-wider">
      {label}
    </label>
  {:else}
    <span class="text-sm font-medium text-text tracking-wider">{label}</span>
  {/if}
  {@render children()}
  {#if helper}
    <p class="text-xs text-text-muted">{helper}</p>
  {/if}
</div>
