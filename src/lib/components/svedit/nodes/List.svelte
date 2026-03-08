<script lang="ts">
  import { Node, NodeArrayProperty } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path}>
  <NodeArrayProperty
    path={[...path, 'list_items']}
    tag="ul"
    class="ml-6 list-disc space-y-2"
  />
</Node>
