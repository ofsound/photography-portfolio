<script lang="ts">
  const { type } = $props<{
    path: Array<string | number>;
    type: 'position-zero-cursor-trap' | 'after-node-cursor-trap';
  }>();
</script>

<div class={type} data-type={type}>
  <div class="svedit-selectable"><br /></div>
</div>
