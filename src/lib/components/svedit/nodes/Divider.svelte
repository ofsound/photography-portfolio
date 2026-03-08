<script lang="ts">
  import { getContext } from 'svelte';
  import { Node } from 'svedit';

  const svedit = getContext('svedit') as { editable: boolean };

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path}>
  <div class="space-y-2" contenteditable="false">
    <hr class="border-border-strong" />
    {#if svedit.editable}
      <p
        class="text-center text-xs tracking-[0.2em] text-text-subtle uppercase"
      >
        Divider
      </p>
    {/if}
  </div>
</Node>
