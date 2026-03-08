<script lang="ts">
  import { AnnotatedTextProperty, Node } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path} class="text-text-main text-base leading-7">
  <AnnotatedTextProperty
    tag="p"
    class="leading-7"
    path={[...path, 'content']}
    placeholder="Write paragraph text"
  />
</Node>
