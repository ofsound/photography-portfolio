<script lang="ts">
  import { Node, NodeArrayProperty } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path} tag="section" class="grid gap-6">
  <NodeArrayProperty path={[...path, 'body']} class="grid gap-6" />
</Node>
