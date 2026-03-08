<script lang="ts">
  import { AnnotatedTextProperty, Node } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node
  {path}
  class="border-border-subtle grid gap-4 rounded-xl border bg-surface/50 px-5 py-6"
>
  <AnnotatedTextProperty
    tag="h2"
    path={[...path, 'heading']}
    class="text-text-main text-2xl font-semibold tracking-tight"
    placeholder="Section heading"
  />

  <AnnotatedTextProperty
    tag="p"
    path={[...path, 'content']}
    class="text-text-main text-base leading-7"
    placeholder="Write your section body text"
  />
</Node>
