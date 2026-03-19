<script lang="ts">
  import { Node, NodeArrayProperty } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path}>
  <NodeArrayProperty
    path={[...path, 'list_items']}
    tag="ul"
    class="ml-6 flex list-disc flex-col gap-2"
  />
</Node>
