<script lang="ts">
  import { getContext } from 'svelte';

  const svedit = getContext('svedit') as {
    session: any;
    editable: boolean;
  };

  const selection = $derived(svedit.session.selection);
  const selectedNode = $derived(svedit.session.selected_node);

  const anchorName = $derived.by(() => {
    if (selection?.type === 'node' && selectedNode) {
      const parentPath = selection.path;
      const start = Math.min(selection.anchor_offset, selection.focus_offset);
      const end = Math.max(selection.anchor_offset, selection.focus_offset);

      // Only show overlay if exactly one node is selected
      if (end - start === 1) {
        return `--${[...parentPath, start].join('-')}`;
      }
    }
    return null;
  });
</script>

{#if svedit.editable && anchorName}
  <div
    class="selection-overlay pointer-events-none absolute z-50 rounded border-2 border-[var(--editing-stroke-color)] transition-all duration-150"
    style:position-anchor={anchorName}
  >
    <div
      class="absolute -top-5.5 -left-0.5 flex items-center bg-[var(--editing-stroke-color)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--editing-fill-color)] uppercase"
    >
      {selectedNode.type}
    </div>
  </div>
{/if}

<style>
  .selection-overlay {
    /* Fallback for browsers without full anchor positioning support */
    display: none;
  }

  @supports (anchor-name: --test) {
    .selection-overlay {
      display: block;
      top: anchor(top);
      left: anchor(left);
      right: anchor(right);
      bottom: anchor(bottom);
    }
  }
</style>
