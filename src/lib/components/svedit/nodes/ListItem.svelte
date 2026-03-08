<script lang="ts">
  import { AnnotatedTextProperty, Node } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node {path} tag="li" class="text-text-main text-base leading-7">
  <AnnotatedTextProperty
    path={[...path, 'content']}
    class="leading-7"
    placeholder="List item"
  />
</Node>
