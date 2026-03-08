<script lang="ts">
  import { Node, NodeArrayProperty } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path} tag="section" class="grid gap-8 sm:gap-10">
  <NodeArrayProperty path={[...path, 'body']} class="grid gap-8 sm:gap-10" />
</Node>
